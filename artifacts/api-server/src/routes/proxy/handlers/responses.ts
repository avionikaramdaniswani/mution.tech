import type { Request, Response } from "express";
import crypto from "crypto";
import { logger } from "../../../lib/logger";
import type { Provider } from "../types";
import { DEFAULT_OUTPUT_TOKENS } from "../types";
import { authenticate } from "../services/auth";
import {
  updateApiRequestLog,
  classifyErrorType,
  upstreamBodySnippet,
} from "../services/logging";
import {
  estimateReserveCredits,
  reserveCredits,
  finalizeReservation,
  refundUnfinalizedReservation,
  extractCachedTokens,
  estimateFallbackTokens,
  updateApiRequestUsageLog,
} from "../services/billing";
import {
  getProviders,
  refreshProviderSettingsForProxy,
  _disabledProviders,
  filterProvidersForModel,
  orderProvidersForAttempts,
  upstreamModelFor,
  markCooldown,
} from "../services/providers";

export function responsesToolToChatTool(tool: any): any {
  if (tool?.type === "function" && !tool.function) {
    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }
  return tool;
}

export function responsesToolChoiceToChat(toolChoice: any): any {
  if (!toolChoice || typeof toolChoice === "string") return toolChoice;
  if (toolChoice.type === "function" && !toolChoice.function) {
    return { type: "function", function: { name: toolChoice.name } };
  }
  return toolChoice;
}

export type NamespaceMap = Map<string, { namespace: string; name: string; toolType?: "function" | "custom" }>;

export function flattenResponsesTools(tools: any[]): { chatTools: any[]; namespaceMap: NamespaceMap } {
  const chatTools: any[] = [];
  const namespaceMap: NamespaceMap = new Map();
  let hasShellTool = false;

  for (const tool of tools) {
    if (!tool || typeof tool !== "object") continue;
    if (tool.type === "function") {
      chatTools.push(responsesToolToChatTool(tool));
      continue;
    }
    if (tool.type === "custom" && tool.name) {
      const toolName = String(tool.name);
      namespaceMap.set(toolName, { namespace: "", name: toolName, toolType: "custom" });
      chatTools.push({
        type: "function",
        function: {
          name: toolName,
          description: tool.description,
          parameters: tool.parameters ?? { type: "object", properties: {}, additionalProperties: true },
        },
      });
      continue;
    }
    if (tool.type === "local_shell") {
      hasShellTool = true;
      continue;
    }
    if (tool.type === "namespace" && Array.isArray(tool.tools)) {
      for (const nested of tool.tools) {
        if (!nested || !nested.name) continue;
        if (nested.type !== "function" && nested.type !== "custom") continue;
        const flatName = `${tool.name ?? ""}${nested.name}`;
        const toolType: "function" | "custom" = nested.type === "custom" ? "custom" : "function";
        namespaceMap.set(flatName, { namespace: tool.name ?? "", name: nested.name, toolType });
        if (tool.name && nested.name) {
          namespaceMap.set(nested.name, { namespace: tool.name, name: nested.name, toolType });
        }

        let parameters = nested.parameters;
        let description = nested.description;
        if (nested.name === "exec") {
          hasShellTool = true;
          parameters = {
            type: "object",
            properties: {
              cmd: {
                type: "string",
                description: "The shell command to run in powershell or bash terminal (e.g. Get-ChildItem, dir, ls, cat)",
              },
              command: {
                type: "array",
                items: { type: "string" },
                description: "Command line arguments array",
              },
            },
            required: ["cmd"],
          };
          description = description || "Execute a command in the user's local terminal/shell.";
        }

        chatTools.push({
          type: "function",
          function: { name: flatName, description, parameters },
        });
      }
      continue;
    }
    logger.warn({ toolType: tool.type }, "Dropping unsupported Responses API tool type for generic provider");
  }

  if (hasShellTool) {
    const existingNames = new Set(chatTools.map(t => t.function?.name));
    if (!existingNames.has("local_shell")) {
      chatTools.push({
        type: "function",
        function: {
          name: "local_shell",
          description: "Execute a command in the user's local terminal/shell to inspect directory contents, read files, run scripts, or execute tools.",
          parameters: {
            type: "object",
            properties: {
              command: {
                type: "array",
                items: { type: "string" },
                description: "The command line array to execute, e.g. [\"powershell\", \"-Command\", \"Get-ChildItem\"] or [\"cat\", \"package.json\"]",
              },
            },
            required: ["command"],
          },
        },
      });
    }
    if (!existingNames.has("exec_command")) {
      chatTools.push({
        type: "function",
        function: {
          name: "exec_command",
          description: "Runs a command in the user's local terminal/shell.",
          parameters: {
            type: "object",
            properties: {
              cmd: {
                type: "string",
                description: "The shell command to run in powershell or terminal",
              },
            },
            required: ["cmd"],
          },
        },
      });
    }
  }

  return { chatTools, namespaceMap };
}

/**
 * Extract a plain-text string from a tool output value.
 * Handles strings, arrays of output items, and objects with text/stdout/stderr.
 * Falls back to JSON.stringify for unknown shapes.
 */
function extractToolOutputText(output: any): string {
  if (typeof output === "string") return output;
  if (output == null) return "[no output]";
  if (Array.isArray(output)) {
    return output
      .map((o: any) => {
        if (typeof o === "string") return o;
        if (o && (o.type === "text" || o.type === "output_text")) return o.text ?? "";
        if (o && (o.stdout || o.stderr)) return [o.stdout, o.stderr].filter(Boolean).join("\n");
        return JSON.stringify(o);
      })
      .join("\n");
  }
  if (typeof output === "object") {
    if ("text" in output) return String(output.text);
    if ("stdout" in output || "stderr" in output) {
      return [output.stdout, output.stderr].filter(Boolean).join("\n") || `[exit code: ${output.exit_code ?? 0}]`;
    }
  }
  return JSON.stringify(output);
}

export function responsesBodyToChatBody(body: any): { chatBody: any; namespaceMap: NamespaceMap } {
  const messages: any[] = [];

  if (typeof body.instructions === "string" && body.instructions) {
    messages.push({ role: "system", content: body.instructions });
  }

  if (typeof body.input === "string") {
    messages.push({ role: "user", content: body.input });
  } else if (Array.isArray(body.input)) {
    for (const item of body.input) {
      if (!item || typeof item !== "object") continue;

      if (item.type === "additional_tools") {
        continue;
      }

      if (item.type === "local_shell_call") {
        const cmd = item.action?.command ?? item.command ?? [];
        const cmdArray = Array.isArray(cmd) ? cmd : [String(cmd)];
        let rawCmd = cmdArray.join(" ");
        if (cmdArray.length >= 4 && cmdArray[0].toLowerCase().includes("powershell") && cmdArray[2].toLowerCase() === "-command") {
          rawCmd = cmdArray.slice(3).join(" ");
        }
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [{
            id: item.call_id ?? item.id,
            type: "function",
            function: {
              name: "exec_command",
              arguments: JSON.stringify({ cmd: rawCmd, command: cmdArray }),
            },
          }],
        });
        continue;
      }

      if (item.type === "local_shell_call_output") {
        let textOutput = "";
        if (typeof item.output === "string") {
          textOutput = item.output;
        } else if (item.output && typeof item.output === "object") {
          if (Array.isArray(item.output)) {
            textOutput = item.output
              .map((o: any) => (typeof o === "string" ? o : [o.stdout, o.stderr].filter(Boolean).join("\n")))
              .join("\n");
          } else if ("stdout" in item.output || "stderr" in item.output) {
            textOutput = [item.output.stdout, item.output.stderr].filter(Boolean).join("\n") || `[exit code: ${item.output.exit_code ?? 0}]`;
          } else {
            textOutput = JSON.stringify(item.output);
          }
        }
        messages.push({
          role: "tool",
          tool_call_id: item.call_id ?? item.id,
          content: textOutput,
        });
        continue;
      }

      if (item.type === "function_call") {
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [{
            id: item.call_id ?? item.id,
            type: "function",
            function: { name: item.name, arguments: item.arguments ?? "{}" },
          }],
        });
        continue;
      }

      if (item.type === "function_call_output") {
        messages.push({
          role: "tool",
          tool_call_id: item.call_id,
          content: extractToolOutputText(item.output),
        });
        continue;
      }

      if (item.type === "custom_tool_call") {
        const flatName = item.namespace ? `${item.namespace}${item.name}` : item.name;
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [{
            id: item.call_id ?? item.id,
            type: "function",
            function: {
              name: flatName,
              arguments: typeof item.input === "string" ? item.input : JSON.stringify(item.input ?? {}),
            },
          }],
        });
        continue;
      }

      if (item.type === "custom_tool_call_output") {
        messages.push({
          role: "tool",
          tool_call_id: item.call_id ?? item.id,
          content: extractToolOutputText(item.output),
        });
        continue;
      }

      let content: any = item.content;
      if (Array.isArray(content)) {
        content = content.map((p: any) => {
          if (p.type === "input_text" || p.type === "output_text") return { type: "text", text: p.text ?? "" };
          return p;
        });
        if (content.every((p: any) => p.type === "text")) {
          content = content.map((p: any) => p.text).join("");
        }
      }
      messages.push({ role: item.role ?? "user", content: content ?? "" });
    }
  }

  // Post-process: merge consecutive assistant tool-call-only messages
  // Chat Completions API requires all tool_calls from the same turn in one message
  const mergedMessages: any[] = [];
  for (const msg of messages) {
    const prev = mergedMessages.length > 0 ? mergedMessages[mergedMessages.length - 1] : null;
    if (
      prev &&
      prev.role === "assistant" &&
      msg.role === "assistant" &&
      prev.content === null &&
      msg.content === null &&
      Array.isArray(prev.tool_calls) &&
      Array.isArray(msg.tool_calls)
    ) {
      prev.tool_calls.push(...msg.tool_calls);
    } else {
      mergedMessages.push(msg);
    }
  }

  const rawTools: any[] = [];
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    rawTools.push(...body.tools);
  }
  if (Array.isArray(body.input)) {
    for (const item of body.input) {
      if (item && item.type === "additional_tools" && Array.isArray(item.tools)) {
        rawTools.push(...item.tools);
      }
    }
  }

  let chatTools: any[] = [];
  let namespaceMap: NamespaceMap = new Map();
  if (rawTools.length > 0) {
    const flattened = flattenResponsesTools(rawTools);
    chatTools = flattened.chatTools;
    namespaceMap = flattened.namespaceMap;
  }

  const chatBody = {
    model: body.model,
    messages: mergedMessages,
    stream: true,
    ...(chatTools.length > 0 ? { tools: chatTools } : {}),
    ...(body.tool_choice != null ? { tool_choice: responsesToolChoiceToChat(body.tool_choice) } : {}),
    ...(body.max_output_tokens != null ? { max_tokens: body.max_output_tokens } : {}),
    ...(body.temperature != null ? { temperature: body.temperature } : {}),
    ...(body.top_p != null ? { top_p: body.top_p } : {}),
    ...(body.presence_penalty != null ? { presence_penalty: body.presence_penalty } : {}),
    ...(body.frequency_penalty != null ? { frequency_penalty: body.frequency_penalty } : {}),
  };

  return { chatBody, namespaceMap };
}

export function resolveTargetTool(name: string, namespaceMap: NamespaceMap): { namespace: string | null; name: string; toolType: "custom" | "function" | "local_shell" } {
  const direct = namespaceMap.get(name);
  if (direct) {
    return { namespace: direct.namespace, name: direct.name, toolType: direct.toolType ?? "function" };
  }
  const execTool = namespaceMap.get("functionsexec") || namespaceMap.get("exec");
  if (execTool && (name === "local_shell" || name === "exec_command" || name === "functionsexec" || name === "exec")) {
    return { namespace: execTool.namespace, name: execTool.name, toolType: "custom" };
  }
  if (name === "local_shell") {
    return { namespace: null, name: "local_shell", toolType: "local_shell" };
  }
  return { namespace: null, name, toolType: "function" };
}

export function formatExecScript(argsStr: string): string {
  const trimmed = (argsStr || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("await ") || trimmed.startsWith("tools.") || trimmed.startsWith("//") || trimmed.includes(";")) {
    return trimmed;
  }
  try {
    const parsed = JSON.parse(trimmed);
    let cmd = "";
    if (typeof parsed.cmd === "string" && parsed.cmd.trim()) {
      cmd = parsed.cmd.trim();
    } else if (typeof parsed.code === "string" && parsed.code.trim()) {
      cmd = parsed.code.trim();
    } else if (typeof parsed.command === "string" && parsed.command.trim()) {
      cmd = parsed.command.trim();
    } else if (Array.isArray(parsed.command)) {
      cmd = parsed.command.join(" ");
    } else if (Array.isArray(parsed.cmd)) {
      cmd = parsed.cmd.join(" ");
    }
    if (cmd) {
      return `await tools.exec_command(${JSON.stringify({ cmd })});`;
    }
  } catch {}
  return trimmed;
}

export function parseLocalShellCommand(argsStr: string, _name?: string): string[] {
  try {
    const parsed = JSON.parse(argsStr || "{}");
    if (typeof parsed.cmd === "string" && parsed.cmd.trim()) {
      return ["powershell", "-NoProfile", "-Command", parsed.cmd.trim()];
    }
    if (typeof parsed.code === "string" && parsed.code.trim()) {
      return ["powershell", "-NoProfile", "-Command", parsed.code.trim()];
    }
    if (Array.isArray(parsed.cmd)) return parsed.cmd;
    if (Array.isArray(parsed.command)) return parsed.command;
    if (typeof parsed.command === "string" && parsed.command.trim()) {
      return ["powershell", "-NoProfile", "-Command", parsed.command.trim()];
    }
    if (Array.isArray(parsed.action?.command)) return parsed.action.command;
  } catch {}
  return [];
}

export function extractEmbeddedExecCommand(t: string): string | null {
  const marker = t.indexOf("to=functions.exec");
  const marker2 = t.indexOf("to=exec_command");
  const startIdx = marker !== -1 ? marker : marker2;
  if (startIdx === -1) return null;
  const jsonStart = t.indexOf("{", startIdx);
  if (jsonStart === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = jsonStart; i < t.length; i++) {
    const ch = t[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const raw = t.slice(jsonStart, i + 1);
          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed.cmd === "string" && parsed.cmd.trim()) return parsed.cmd.trim();
          } catch {}
          break;
        }
      }
    }
  }
  return null;
}

export function chatMessageToResponsesOutput(message: any, msgId: string, namespaceMap: NamespaceMap): any[] {
  const output: any[] = [];
  const toolCalls = message?.tool_calls;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    for (const call of toolCalls) {
      const callName = call.function?.name ?? "";
      const rawArgs = call.function?.arguments ?? "{}";
      const target = resolveTargetTool(callName, namespaceMap);

      if (target.toolType === "custom") {
        const input = target.name === "exec" ? formatExecScript(rawArgs) : rawArgs;
        output.push({
          type: "custom_tool_call",
          id: `ctc_${call.id ?? crypto.randomUUID().replace(/-/g, "")}`,
          call_id: call.id,
          name: target.name,
          ...(target.namespace != null ? { namespace: target.namespace } : {}),
          input,
          status: "completed",
        });
      } else if (target.toolType === "local_shell") {
        output.push({
          type: "local_shell_call",
          id: `lsc_${call.id ?? crypto.randomUUID().replace(/-/g, "")}`,
          call_id: call.id,
          status: "completed",
          action: {
            type: "exec",
            command: parseLocalShellCommand(rawArgs, callName),
          },
        });
      } else {
        output.push({
          type: "function_call",
          id: `fc_${call.id ?? crypto.randomUUID().replace(/-/g, "")}`,
          call_id: call.id,
          name: target.name,
          ...(target.namespace != null ? { namespace: target.namespace } : {}),
          arguments: rawArgs,
          status: "completed",
        });
      }
    }
  }
  const text = message?.content;
  if (typeof text === "string" && text.length > 0) {
    const embeddedCmd = output.length === 0 ? extractEmbeddedExecCommand(text) : null;
    if (embeddedCmd) {
      const hasExec = namespaceMap.get("functionsexec") || namespaceMap.get("exec");
      const callId = `call_${crypto.randomUUID().replace(/-/g, "")}`;
      if (hasExec) {
        output.push({
          type: "custom_tool_call",
          id: `ctc_${callId}`,
          call_id: callId,
          name: "exec",
          namespace: "functions",
          input: `await tools.exec_command(${JSON.stringify({ cmd: embeddedCmd })});`,
          status: "completed",
        });
      } else {
        output.push({
          type: "local_shell_call",
          id: `lsc_${callId}`,
          call_id: callId,
          status: "completed",
          action: {
            type: "exec",
            command: ["powershell", "-NoProfile", "-Command", embeddedCmd],
          },
        });
      }
    } else {
      output.push({
        type: "message",
        id: msgId,
        status: "completed",
        role: "assistant",
        content: [{ type: "output_text", text, annotations: [] }],
      });
    }
  }
  return output;
}

export function chatResponseToResponsesBody(
  data: any,
  respId: string,
  msgId: string,
  createdAt: number,
  namespaceMap: NamespaceMap,
): any {
  const message = data.choices?.[0]?.message;
  const output = chatMessageToResponsesOutput(message, msgId, namespaceMap);
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  const cachedTokens = extractCachedTokens(data.usage);
  return {
    id: respId,
    object: "response",
    created_at: createdAt,
    status: "completed",
    error: null,
    incomplete_details: null,
    instructions: null,
    max_output_tokens: null,
    model: data.model ?? "unknown",
    output,
    parallel_tool_calls: true,
    previous_response_id: null,
    reasoning: { effort: null, summary: null },
    store: false,
    temperature: data.temperature ?? 1,
    text: { format: { type: "text" } },
    tool_choice: "auto",
    tools: [],
    top_p: 1,
    truncation: "disabled",
    usage: {
      input_tokens: inputTokens,
      input_tokens_details: { cached_tokens: cachedTokens },
      output_tokens: outputTokens,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: inputTokens + outputTokens,
    },
    user: null,
    metadata: {},
  };
}

export function responsesSseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function streamChatToResponses(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  res: Response,
  respId: string,
  msgId: string,
  createdAt: number,
  model: string,
  namespaceMap: NamespaceMap,
): Promise<{ inputTokens: number; outputTokens: number; cachedTokens: number }> {
  res.write(responsesSseEvent("response.created", {
    type: "response.created",
    response: { id: respId, object: "response", created_at: createdAt, status: "in_progress", model, output: [], usage: null },
  }));

  const decoder = new TextDecoder();
  let sseBuf = "";
  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let messageOutputIndex: number | null = null;

  type PendingCall = { outputIndex: number; id: string; name: string; arguments: string; addedSent?: boolean };
  const pendingCalls = new Map<number, PendingCall>();
  let nextOutputIndex = 0;

  const startMessage = () => {
    if (messageOutputIndex !== null) return;
    messageOutputIndex = nextOutputIndex++;
    res.write(responsesSseEvent("response.output_item.added", {
      type: "response.output_item.added",
      output_index: messageOutputIndex,
      item: { type: "message", id: msgId, status: "in_progress", role: "assistant", content: [] },
    }));
    res.write(responsesSseEvent("response.content_part.added", {
      type: "response.content_part.added",
      item_id: msgId, output_index: messageOutputIndex, content_index: 0,
      part: { type: "output_text", text: "", annotations: [] },
    }));
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuf += decoder.decode(value, { stream: true });
    const lines = sseBuf.split("\n");
    sseBuf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
      try {
        const d = JSON.parse(line.slice(6));
        const delta = d.choices?.[0]?.delta;
        const textDelta = delta?.content;
        if (typeof textDelta === "string" && textDelta) {
          startMessage();
          fullText += textDelta;
          res.write(responsesSseEvent("response.output_text.delta", {
            type: "response.output_text.delta",
            item_id: msgId, output_index: messageOutputIndex!, content_index: 0, delta: textDelta,
          }));
        }
        const toolCallDeltas = delta?.tool_calls;
        if (Array.isArray(toolCallDeltas)) {
          for (const tc of toolCallDeltas) {
            const idx = tc.index ?? 0;
            let call = pendingCalls.get(idx);
            if (!call) {
              call = { outputIndex: nextOutputIndex++, id: tc.id ?? `call_${idx}`, name: tc.function?.name ?? "", arguments: "", addedSent: false };
              pendingCalls.set(idx, call);
            }
            if (tc.function?.name) call.name = tc.function.name;
            if (tc.id) call.id = tc.id;

            const argDelta = tc.function?.arguments;
            if (typeof argDelta === "string" && argDelta) call.arguments += argDelta;

            const callOutputIndex = call.outputIndex;
            nextOutputIndex = Math.max(nextOutputIndex, callOutputIndex + 1);
            if (!call.addedSent && call.name) {
              call.addedSent = true;
              const target = resolveTargetTool(call.name, namespaceMap);
              const itemId = target.toolType === "custom" ? `ctc_${call.id}` : target.toolType === "local_shell" ? `lsc_${call.id}` : `fc_${call.id}`;
              const item = target.toolType === "custom"
                ? { type: "custom_tool_call", id: itemId, call_id: call.id, name: target.name, ...(target.namespace != null ? { namespace: target.namespace } : {}), input: "", status: "in_progress" }
                : target.toolType === "local_shell"
                  ? { type: "local_shell_call", id: itemId, call_id: call.id, status: "in_progress", action: { type: "exec", command: [] } }
                  : { type: "function_call", id: itemId, call_id: call.id, name: target.name, ...(target.namespace != null ? { namespace: target.namespace } : {}), arguments: "", status: "in_progress" };
              res.write(responsesSseEvent("response.output_item.added", { type: "response.output_item.added", output_index: callOutputIndex, item }));
            }

            if (typeof argDelta === "string" && argDelta) {
              const target = resolveTargetTool(call.name, namespaceMap);
              if (target.toolType === "custom" && target.name !== "exec") {
                res.write(responsesSseEvent("response.custom_tool_call_input.delta", {
                  type: "response.custom_tool_call_input.delta", item_id: `ctc_${call.id}`, output_index: callOutputIndex, delta: argDelta,
                }));
              } else if (target.toolType === "function") {
                res.write(responsesSseEvent("response.function_call_arguments.delta", {
                  type: "response.function_call_arguments.delta", item_id: `fc_${call.id}`, output_index: callOutputIndex, delta: argDelta,
                }));
              }
            }
          }
        }
        if (d.usage) {
          inputTokens = d.usage.prompt_tokens ?? inputTokens;
          outputTokens = d.usage.completion_tokens ?? outputTokens;
          cachedTokens = extractCachedTokens(d.usage) || cachedTokens;
        }
      } catch { }
    }
  }

  const output: any[] = [];
  let embeddedExecCmd: string | null = null;
  if (pendingCalls.size === 0 && fullText) {
    embeddedExecCmd = extractEmbeddedExecCommand(fullText);
  }

  if (fullText && messageOutputIndex !== null) {
    res.write(responsesSseEvent("response.output_text.done", {
      type: "response.output_text.done",
      item_id: msgId, output_index: messageOutputIndex, content_index: 0, text: fullText,
    }));
    res.write(responsesSseEvent("response.content_part.done", {
      type: "response.content_part.done",
      item_id: msgId, output_index: messageOutputIndex, content_index: 0,
      part: { type: "output_text", text: fullText, annotations: [] },
    }));
    const messageItem = { type: "message", id: msgId, status: "completed", role: "assistant", content: [{ type: "output_text", text: fullText, annotations: [] }] };
    res.write(responsesSseEvent("response.output_item.done", { type: "response.output_item.done", output_index: messageOutputIndex, item: messageItem }));
    output.push(messageItem);
  }

  if (embeddedExecCmd) {
    const hasExec = namespaceMap.get("functionsexec") || namespaceMap.get("exec");
    const callId = `call_${crypto.randomUUID().replace(/-/g, "")}`;
    if (hasExec) {
      const input = `await tools.exec_command(${JSON.stringify({ cmd: embeddedExecCmd })});`;
      const callItem = {
        type: "custom_tool_call",
        id: `ctc_${callId}`,
        call_id: callId,
        name: "exec",
        namespace: "functions",
        input,
        status: "completed",
      };
      res.write(responsesSseEvent("response.output_item.added", {
        type: "response.output_item.added",
        output_index: nextOutputIndex,
        item: { ...callItem, status: "in_progress", input: "" },
      }));
      res.write(responsesSseEvent("response.custom_tool_call_input.done", {
        type: "response.custom_tool_call_input.done",
        item_id: `ctc_${callId}`,
        output_index: nextOutputIndex,
        input,
      }));
      res.write(responsesSseEvent("response.output_item.done", {
        type: "response.output_item.done",
        output_index: nextOutputIndex++,
        item: callItem,
      }));
      output.push(callItem);
    } else {
      const callItem = {
        type: "local_shell_call",
        id: `lsc_${callId}`,
        call_id: callId,
        status: "completed",
        action: {
          type: "exec",
          command: ["powershell", "-NoProfile", "-Command", embeddedExecCmd],
        },
      };
      res.write(responsesSseEvent("response.output_item.added", {
        type: "response.output_item.added",
        output_index: nextOutputIndex,
        item: { ...callItem, status: "in_progress" },
      }));
      res.write(responsesSseEvent("response.output_item.done", {
        type: "response.output_item.done",
        output_index: nextOutputIndex++,
        item: callItem,
      }));
      output.push(callItem);
    }
  }

  for (const call of pendingCalls.values()) {
    const target = resolveTargetTool(call.name, namespaceMap);
    const callOutputIndex = call.outputIndex;
    if (!call.addedSent) {
      if (target.toolType === "custom") {
        res.write(responsesSseEvent("response.output_item.added", {
          type: "response.output_item.added",
          output_index: callOutputIndex,
          item: { type: "custom_tool_call", id: `ctc_${call.id}`, call_id: call.id, name: target.name, ...(target.namespace != null ? { namespace: target.namespace } : {}), input: "", status: "in_progress" },
        }));
      } else if (target.toolType === "local_shell") {
        res.write(responsesSseEvent("response.output_item.added", {
          type: "response.output_item.added",
          output_index: callOutputIndex,
          item: { type: "local_shell_call", id: `lsc_${call.id}`, call_id: call.id, status: "in_progress", action: { type: "exec", command: [] } },
        }));
      } else {
        res.write(responsesSseEvent("response.output_item.added", {
          type: "response.output_item.added",
          output_index: callOutputIndex,
          item: { type: "function_call", id: `fc_${call.id}`, call_id: call.id, name: target.name, ...(target.namespace != null ? { namespace: target.namespace } : {}), arguments: "", status: "in_progress" },
        }));
      }
    }

    if (target.toolType === "custom") {
      const finalInput = target.name === "exec" ? formatExecScript(call.arguments) : call.arguments;
      res.write(responsesSseEvent("response.custom_tool_call_input.done", {
        type: "response.custom_tool_call_input.done",
        item_id: `ctc_${call.id}`, output_index: callOutputIndex, input: finalInput,
      }));
      const callItem = {
        type: "custom_tool_call",
        id: `ctc_${call.id}`,
        call_id: call.id,
        name: target.name,
        ...(target.namespace != null ? { namespace: target.namespace } : {}),
        input: finalInput,
        status: "completed",
      };
      res.write(responsesSseEvent("response.output_item.done", { type: "response.output_item.done", output_index: callOutputIndex, item: callItem }));
      output.push(callItem);
    } else if (target.toolType === "local_shell") {
      const callItem = {
        type: "local_shell_call",
        id: `lsc_${call.id}`,
        call_id: call.id,
        status: "completed",
        action: {
          type: "exec",
          command: parseLocalShellCommand(call.arguments, call.name),
        },
      };
      res.write(responsesSseEvent("response.output_item.done", { type: "response.output_item.done", output_index: callOutputIndex, item: callItem }));
      output.push(callItem);
    } else {
      res.write(responsesSseEvent("response.function_call_arguments.done", {
        type: "response.function_call_arguments.done",
        item_id: `fc_${call.id}`, output_index: callOutputIndex, arguments: call.arguments,
      }));
      const callItem = { type: "function_call", id: `fc_${call.id}`, call_id: call.id, name: target.name, ...(target.namespace != null ? { namespace: target.namespace } : {}), arguments: call.arguments, status: "completed" };
      res.write(responsesSseEvent("response.output_item.done", { type: "response.output_item.done", output_index: callOutputIndex, item: callItem }));
      output.push(callItem);
    }
  }

  res.write(responsesSseEvent("response.completed", {
    type: "response.completed",
    response: {
      id: respId, object: "response", created_at: createdAt, status: "completed", model,
      output,
      usage: {
        input_tokens: inputTokens,
        input_tokens_details: { cached_tokens: cachedTokens },
        output_tokens: outputTokens,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: inputTokens + outputTokens,
      },
    },
  }));
  res.end();

  return { inputTokens, outputTokens, cachedTokens };
}

export async function proxyResponses(req: Request, res: Response): Promise<void> {
  const row = await authenticate(req, res);
  if (!row) return;
  const { key, user } = row;

  let providers: Provider[];
  try { providers = getProviders(); } catch (e: any) {
    updateApiRequestLog(res, { errorType: "api_error" });
    res.status(503).json({ error: { message: e.message, type: "server_error" } });
    return;
  }
  await refreshProviderSettingsForProxy();
  providers = providers.filter((p) => !_disabledProviders.has(p.id));
  if (providers.length === 0) {
    updateApiRequestLog(res, { errorType: "api_error" });
    res.status(503).json({ error: { message: "All AI providers are disabled", type: "server_error" } });
    return;
  }

  const { chatBody, namespaceMap } = responsesBodyToChatBody(req.body);
  const originalModel = chatBody.model ?? "unknown";
  const isStream = chatBody.stream === true;
  providers = filterProvidersForModel(providers, originalModel);
  providers = orderProvidersForAttempts(providers);
  updateApiRequestLog(res, { model: originalModel });
  if (providers.length === 0) {
    res.status(503).json({ error: { message: `Model ${originalModel} is disabled on all providers`, type: "model_unavailable" } });
    return;
  }

  if (key.allowedModels && key.allowedModels.length > 0 && !key.allowedModels.includes(originalModel)) {
    updateApiRequestLog(res, { errorType: "forbidden" });
    res.status(403).json({ error: { message: `API key is not allowed to use model: ${originalModel}`, type: "forbidden" } });
    return;
  }

  const requestedOutputTokens = chatBody.max_tokens ?? DEFAULT_OUTPUT_TOKENS;
  const reservation = await reserveCredits(
    user.id, key.id,
    estimateReserveCredits(chatBody, originalModel, requestedOutputTokens),
    originalModel,
  );
  if (!reservation) {
    updateApiRequestLog(res, { errorType: "insufficient_quota" });
    res.status(402).json({ error: { message: "Insufficient credits or API key credit limit for this request", type: "insufficient_quota" } });
    return;
  }
  let reservationClosed = false;

  const respId = `resp_${crypto.randomUUID().replace(/-/g, "")}`;
  const msgId  = `msg_${crypto.randomUUID().replace(/-/g, "")}`;
  const createdAt = Math.floor(Date.now() / 1000);

  try {
    for (let attempt = 0; attempt < providers.length; attempt++) {
      const provider = providers[attempt];
      const providerBody: any = { ...chatBody, model: upstreamModelFor(provider, originalModel) };
      if (providerBody.stream === true) {
        providerBody.stream_options = { ...(providerBody.stream_options || {}), include_usage: true };
      }
      updateApiRequestLog(res, { providerId: provider.id });
      logger.info({ provider: provider.id }, "Proxying Responses API → /chat/completions");

      try {
        const upstream = await fetch(`${provider.openaiBase}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${provider.apiKey}` },
          body: JSON.stringify(providerBody),
        });

        const contentType = upstream.headers.get("content-type") ?? "";

        if (isStream && contentType.includes("text/event-stream")) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          const reader = upstream.body?.getReader();
          if (!reader) { res.end(); return; }
          const { inputTokens, outputTokens, cachedTokens } = await streamChatToResponses(reader, res, respId, msgId, createdAt, originalModel, namespaceMap);
          const tokens = (inputTokens + outputTokens) || estimateFallbackTokens(chatBody);
          const breakdown = (inputTokens + outputTokens > 0)
            ? { inputTokens, outputTokens, cachedTokens }
            : undefined;
          updateApiRequestUsageLog(res, tokens, originalModel, breakdown, !!reservation?.tokenPackageId);
          reservationClosed = await finalizeReservation(reservation, tokens, originalModel, breakdown);
          if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
          return;

        } else if (contentType.includes("application/json")) {
          if (!upstream.ok && (upstream.status === 429 || upstream.status >= 500)) {
            markCooldown(provider);
            if (attempt < providers.length - 1) continue;
          }
          const data = await upstream.json() as any;
          if (!upstream.ok) {
            updateApiRequestLog(res, { errorType: classifyErrorType(upstream.status) });
            res.status(upstream.status).json(data);
            return;
          }
          const responsesBody = chatResponseToResponsesBody(data, respId, msgId, createdAt, namespaceMap);
          res.status(200).json(responsesBody);
          const inputTokens = data.usage?.prompt_tokens ?? 0;
          const outputTokens = data.usage?.completion_tokens ?? 0;
          const cachedTokens = extractCachedTokens(data.usage);
          const tokens = (data.usage?.total_tokens ?? (inputTokens + outputTokens)) || estimateFallbackTokens(chatBody);
          const breakdown = (inputTokens + outputTokens > 0)
            ? { inputTokens, outputTokens, cachedTokens }
            : undefined;
          updateApiRequestUsageLog(res, tokens, data.model ?? originalModel, breakdown, !!reservation?.tokenPackageId);
          reservationClosed = await finalizeReservation(reservation, tokens, data.model ?? originalModel, breakdown);
          if (!reservationClosed) updateApiRequestLog(res, { errorType: "billing_finalize_failed" });
          return;

        } else {
          const text = await upstream.text();
          logger.error({ provider: provider.id, status: upstream.status, body: text.slice(0, 300) }, "Responses proxy: unexpected content-type");
          if (upstream.status === 429 || upstream.status >= 500) {
            markCooldown(provider);
            if (attempt < providers.length - 1) continue;
          }
          updateApiRequestLog(res, { errorType: "upstream_non_json" });
          res.status(502).json({ error: { message: `Upstream error (${upstream.status})${upstreamBodySnippet(text)}`, type: "server_error" } });
          return;
        }
      } catch (err) {
        logger.error({ err, provider: provider.id }, "Responses proxy error");
        markCooldown(provider);
        if (attempt >= providers.length - 1) {
          updateApiRequestLog(res, { errorType: "upstream_error" });
          if (!res.headersSent) res.status(502).json({ error: { message: "All upstream providers failed", type: "server_error" } });
          return;
        }
      }
    }
  } finally {
    if (!reservationClosed) await refundUnfinalizedReservation(reservation);
  }
}
