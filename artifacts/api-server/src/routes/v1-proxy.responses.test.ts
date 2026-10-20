import assert from "node:assert/strict";
import { test } from "node:test";
import { flattenResponsesTools, streamChatToResponses } from "./proxy/handlers/responses";

const adapter = {
  flattenResponsesTools,
  streamChatToResponses,
};

function createResponse(): any {
  const events: any[] = [];
  return {
    events,
    write(chunk: string) {
      const data = chunk.split("\ndata: ")[1]?.trim();
      if (data) events.push(JSON.parse(data));
    },
    end() {},
  };
}

function sseStream(chunks: object[]) {
  const bytes = new TextEncoder().encode(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n");
  let sent = false;
  return {
    getReader() {
      return {
        async read() {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: bytes };
        },
      };
    },
  } as any;
}

const base = { id: "resp_test", msgId: "msg_test", createdAt: 1, model: "gpt-test" };

test("tool-only custom exec stream emits no placeholder message and starts output at zero", async () => {
  const { namespaceMap } = adapter.flattenResponsesTools([{ type: "namespace", name: "functions", tools: [{ type: "custom", name: "exec", parameters: { type: "object", properties: { cmd: { type: "string" } }, required: ["cmd"] } }] }]);
  const response = createResponse();
  await adapter.streamChatToResponses(sseStream([
    { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "functionsexec", arguments: JSON.stringify({ cmd: "Get-ChildItem" }) } }] } }] },
  ]).getReader(), response, base.id, base.msgId, base.createdAt, base.model, namespaceMap);

  assert.equal(response.events.some((event: any) => event.item?.type === "message"), false);
  const added = response.events.find((event: any) => event.type === "response.output_item.added" && event.item?.type === "custom_tool_call");
  assert.equal(added.output_index, 0);
  const done = response.events.find((event: any) => event.type === "response.output_item.done");
  assert.equal(done.output_index, 0);
  assert.equal(done.item.input, 'await tools.exec_command({"cmd":"Get-ChildItem"});');
  const completed = response.events.find((event: any) => event.type === "response.completed");
  assert.deepEqual(completed.response.output.map((item: any) => item.type), ["custom_tool_call"]);
});

test("tool-only local shell stream emits command call at output zero", async () => {
  const { namespaceMap } = adapter.flattenResponsesTools([{ type: "local_shell" }]);
  const response = createResponse();
  await adapter.streamChatToResponses(sseStream([
    { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_2", function: { name: "local_shell", arguments: JSON.stringify({ cmd: "Get-ChildItem" }) } }] } }] },
  ]).getReader(), response, base.id, base.msgId, base.createdAt, base.model, namespaceMap);

  const done = response.events.find((event: any) => event.type === "response.output_item.done");
  assert.equal(done.output_index, 0);
  assert.deepEqual(done.item.action.command, ["powershell", "-NoProfile", "-Command", "Get-ChildItem"]);
});

test("text-only stream emits message at output zero", async () => {
  const response = createResponse();
  await adapter.streamChatToResponses(sseStream([
    { choices: [{ delta: { content: "Hello" } }] },
  ]).getReader(), response, base.id, base.msgId, base.createdAt, base.model, new Map());

  const done = response.events.find((event: any) => event.type === "response.output_item.done");
  assert.equal(done.output_index, 0);
  assert.equal(done.item.content[0].text, "Hello");
});

test("mixed stream keeps text first and tool output index contiguous", async () => {
  const { namespaceMap } = adapter.flattenResponsesTools([{ type: "local_shell" }]);
  const response = createResponse();
  await adapter.streamChatToResponses(sseStream([
    { choices: [{ delta: { content: "Working" } }] },
    { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_3", function: { name: "local_shell", arguments: JSON.stringify({ cmd: "dir" }) } }] } }] },
  ]).getReader(), response, base.id, base.msgId, base.createdAt, base.model, namespaceMap);

  const done = response.events.filter((event: any) => event.type === "response.output_item.done");
  assert.deepEqual(done.map((event: any) => event.output_index), [0, 1]);
  assert.deepEqual(done.map((event: any) => event.item.type), ["message", "local_shell_call"]);
});

test("standalone custom tool is flattened and restored as custom call", () => {
  const { chatTools, namespaceMap } = adapter.flattenResponsesTools([{ type: "custom", name: "run_js", description: "Execute JS", format: { type: "text" } }]);
  assert.equal(chatTools[0].function.name, "run_js");
  assert.equal(namespaceMap.get("run_js")?.toolType, "custom");
  assert.equal(namespaceMap.get("run_js")?.namespace, "");
});
