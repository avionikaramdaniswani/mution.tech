import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, FlaskConical, Timer, Coins, Settings2, User, Loader2, Send, Plus, MessageSquare, Trash2, X, Paperclip, PanelLeftClose, PanelLeft, ArrowLeft, Wallet, FileText, FileCode, Download, Square, ArrowDown, Copy, Check, Code2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { csrfFetch } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { formatCredits, creditColor } from "@/components/layout/shared";

type Model = { id: string; label: string; provider: string };
type ApiKey = { id: number; name: string; keyPrefix: string; isActive: boolean };
type AttachedFile = { url: string; name: string; size: number; mimeType: string; textContent?: string };
type MessagePart = 
  | { type: "text"; text: string } 
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { url: string; name: string; size: number; mimeType: string; textContent?: string } };
type MessageContent = string | MessagePart[];
type Message = { role: "user" | "assistant" | "system"; content: MessageContent; metadata?: { model: string; tokens: number; credits: number | null; latencyMs: number } };
type Result = { content: string; model: string; finishReason: string | null; usage: { inputTokens: number; outputTokens: number; totalTokens: number; credits: number | null }; latencyMs: number };
type Session = { id: number; title: string; updatedAt: string };
type SessionDetail = Session & { model: string; systemPrompt: string; temperature: string; maxTokens: string; apiKeyId: number; messages: Message[] };

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(mimeType?: string, name?: string): boolean {
  if (mimeType && mimeType.startsWith("image/")) return true;
  if (name && /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name)) return true;
  return false;
}

function isCodeFile(name?: string): boolean {
  if (!name) return false;
  return /\.(js|jsx|ts|tsx|py|html|css|json|yaml|yml|sql|sh|php|java|c|cpp|cs|go|rs|rb|vue|svelte)$/i.test(name);
}

function isTextLikeFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  return /\.(txt|md|csv|json|yaml|yml|xml|log|js|jsx|ts|tsx|py|html|css|sql|sh|php|java|c|cpp|cs|go|rs|rb|env|conf|ini)$/i.test(file.name);
}

function getMessageText(content: MessageContent): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p): p is { type: "text"; text: string } => p.type === "text" && Boolean(p.text))
      .map(p => p.text)
      .join("\n");
  }
  return "";
}

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeString);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = codeString;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="not-prose my-3.5 rounded-2xl overflow-hidden border border-border/70 bg-muted/40 dark:bg-zinc-900/90 shadow-2xs">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/70 dark:bg-zinc-800/60 text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-1.5 font-mono lowercase">
          <Code2 className="h-3.5 w-3.5 text-primary" />
          <span>{language || "code"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-background/80 hover:text-foreground text-muted-foreground transition-all duration-150 font-sans text-xs cursor-pointer"
          title="Salin kode"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Salin kode</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-foreground dark:text-zinc-100 bg-transparent m-0 scrollbar-thin">
        <code>{children}</code>
      </pre>
    </div>
  );
}

const markdownComponents = {
  pre({ children }: any) {
    return <>{children}</>;
  },
  code({ node, inline, className, children, ...props }: any) {
    const isInline = inline || (!className && !String(children).includes("\n"));
    if (isInline) {
      return (
        <code className="bg-primary/[0.08] dark:bg-primary/[0.15] text-primary border border-primary/20 px-1.5 py-0.5 rounded-md text-[13px] font-mono font-medium mx-0.5" {...props}>
          {children}
        </code>
      );
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  }
};

export default function PlaygroundPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  
  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Settings state
  const [keyId, setKeyId] = useState("");
  const [model, setModel] = useState("");
  const [system, setSystem] = useState("You are a helpful assistant.");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("8192");
  
  // Chat state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabledRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleCopyMessage = async (idx: number, text: string) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedIdx(idx);
      setTimeout(() => {
        setCopiedIdx(prev => (prev === idx ? null : prev));
      }, 2000);
      toast({ title: "Pesan disalin ke clipboard" });
    } catch {
      toast({ title: "Gagal menyalin pesan", variant: "destructive" });
    }
  };
  
  // Data Fetching
  const { data: models = [] } = useQuery<Model[]>({ queryKey: ["catalog"], queryFn: async () => { const r = await fetch("/api/catalog"); if (!r.ok) throw new Error(); return r.json(); } });
  const { data: keys = [] } = useQuery<ApiKey[]>({ queryKey: ["api-keys"], queryFn: async () => { const r = await fetch("/api/api-keys", { credentials: "include" }); if (!r.ok) throw new Error(); return r.json(); } });
  const { data: sessions = [] } = useQuery<Session[]>({ queryKey: ["playground-sessions"], queryFn: async () => { const r = await fetch("/api/playground/sessions", { credentials: "include" }); if (!r.ok) throw new Error(); return r.json(); } });

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    isAutoScrollEnabledRef.current = isNearBottom;
    setShowScrollBottom(!isNearBottom && messages.length > 0);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    isAutoScrollEnabledRef.current = true;
    setShowScrollBottom(false);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAutoScrollEnabledRef.current) {
      scrollToBottom(loading ? "auto" : "smooth");
    }
  }, [messages, loading, attachments]);

  const loadSession = async (id: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    try {
      setLoading(true);
      const r = await fetch(`/api/playground/sessions/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error();
      const data: SessionDetail = await r.json();
      setSessionId(data.id);
      setMessages(data.messages || []);
      setModel(data.model || "");
      setSystem(data.systemPrompt || "");
      setTemperature(data.temperature ? String(data.temperature).replace(",", ".") : "0.7");
      setMaxTokens(data.maxTokens ? String(data.maxTokens) : "8192");
      setKeyId(data.apiKeyId ? String(data.apiKeyId) : "");
      setLastResult(null);
      setAttachments([]);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch {
      toast({ title: "Gagal memuat obrolan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (userMsg: string) => {
    const r = await csrfFetch("/api/playground/sessions", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        title: userMsg.slice(0, 30) + (userMsg.length > 30 ? "..." : ""),
        model, systemPrompt: system, temperature: String(temperature).replace(",", "."), maxTokens: String(maxTokens), keyId: Number(keyId)
      })
    });
    if (!r.ok) throw new Error("Gagal membuat sesi");
    const data = await r.json();
    queryClient.invalidateQueries({ queryKey: ["playground-sessions"] });
    return data.id as number;
  };

  const saveMessages = async (id: number, msgs: Message[]) => {
    await csrfFetch(`/api/playground/sessions/${id}`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs })
    });
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await csrfFetch(`/api/playground/sessions/${id}`, { method: "DELETE", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["playground-sessions"] });
      if (sessionId === id) startNewChat();
      toast({ title: "Obrolan dihapus" });
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  const startRenaming = (s: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditTitle(s.title);
  };

  const saveRename = async (id: number, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }
    try {
      await csrfFetch(`/api/playground/sessions/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      queryClient.invalidateQueries({ queryKey: ["playground-sessions"] });
      toast({ title: "Judul berhasil diubah" });
    } catch {
      toast({ title: "Gagal mengubah judul", variant: "destructive" });
    } finally {
      setEditingSessionId(null);
    }
  };

  const startNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSessionId(null);
    setMessages([]);
    setLastResult(null);
    setAttachments([]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Ukuran file terlalu besar", description: `File ${file.name} melebihi batas 10MB`, variant: "destructive" });
        return;
      }
    }
    
    try {
      setIsUploading(true);
      const uploaded: AttachedFile[] = [];

      for (const file of files) {
        let textContent: string | undefined = undefined;
        if (isTextLikeFile(file) && file.size < 500 * 1024) {
          try {
            textContent = await file.text();
          } catch (err) {
            console.error("Gagal membaca teks file:", err);
          }
        }

        const formData = new FormData();
        formData.append("file", file);
        
        const r = await csrfFetch("/api/playground/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || `Gagal upload file ${file.name}`);
        }
        
        const data = await r.json();
        uploaded.push({
          url: data.url,
          name: data.name || file.name,
          size: data.size || file.size,
          mimeType: data.mimeType || file.type,
          textContent: data.textContent || textContent,
        });
      }

      setAttachments(prev => [...prev, ...uploaded]);
    } catch (error: any) {
      toast({ title: "Gagal upload", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    const target = attachments[index];
    if (target?.url) {
      csrfFetch("/api/playground/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target.url }),
      }).catch(err => console.error("Gagal hapus file storage:", err));
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const runChat = async () => {
    const userPrompt = input.trim();
    if (!keyId || !model || (!userPrompt && attachments.length === 0)) { 
      toast({ title: "Pilih API key, model, dan isi pesan atau lampirkan file", variant: "destructive" }); return; 
    }
    
    let currentId = sessionId;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const attachmentsToSend = [...attachments];
    setAttachments([]);
    setLoading(true);
    setLastResult(null);
    isAutoScrollEnabledRef.current = true;
    setShowScrollBottom(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedAssistantText = "";
    let finalContent = "";
    let newMessagesForSave: Message[] = [];
    
    try {
      if (!currentId) {
        const titleFallback = attachmentsToSend[0]?.name ? `File: ${attachmentsToSend[0].name}` : "Chat Baru";
        currentId = await createSession(userPrompt || titleFallback);
        setSessionId(currentId);
      }

      // Build content parts for local display & session storage
      const userParts: MessagePart[] = [];
      for (const att of attachmentsToSend) {
        if (isImageFile(att.mimeType, att.name)) {
          userParts.push({ type: "image_url", image_url: { url: att.url } });
        } else {
          userParts.push({
            type: "file",
            file: { 
              url: att.url, 
              name: att.name, 
              size: att.size, 
              mimeType: att.mimeType,
              textContent: att.textContent,
            }
          });
        }
      }

      // Only add text part if the user actually typed a prompt (keeps chat bubbles visually clean)
      if (userPrompt) {
        userParts.push({ type: "text", text: userPrompt });
      }

      const userContent: MessageContent = userParts.length === 1 && userParts[0].type === "text"
        ? userParts[0].text
        : userParts;

      const newMessages: Message[] = [...messages, { role: "user", content: userContent }];
      newMessagesForSave = newMessages;
      setMessages(newMessages);
      
      // Sanitize messages for OpenAI chat completions API upstream
      // Injects the extracted document text into AI context so the model actually reads it
      const sanitizedMessages = newMessages.map(m => {
        if (Array.isArray(m.content)) {
          const validParts: any[] = [];
          let docTextAccumulator = "";

          for (const part of m.content) {
            if (part.type === "image_url") {
              validParts.push(part);
            } else if (part.type === "file") {
              if (part.file.textContent) {
                docTextAccumulator += `\n\n--- [DOKUMEN TERLAMPIR: ${part.file.name}] ---\n${part.file.textContent}\n--- [AKHIR DOKUMEN: ${part.file.name}] ---`;
              }
            } else if (part.type === "text" && part.text) {
              validParts.push(part);
            }
          }

          if (docTextAccumulator) {
            const existingTextIdx = validParts.findIndex(p => p.type === "text");
            if (existingTextIdx >= 0) {
              validParts[existingTextIdx] = {
                type: "text",
                text: `${docTextAccumulator.trim()}\n\n${validParts[existingTextIdx].text}`
              };
            } else {
              validParts.push({
                type: "text",
                text: `${docTextAccumulator.trim()}\n\nTolong baca, pahami, dan analisis isi dokumen di atas.`
              });
            }
          }

          return {
            role: m.role,
            content: validParts.length === 1 && validParts[0].type === "text" ? validParts[0].text : validParts
          };
        }
        return { role: m.role, content: m.content };
      });

      const requestMessages = [];
      if (system.trim()) requestMessages.push({ role: "system", content: system.trim() });
      requestMessages.push(...sanitizedMessages);
      
      const parsedTemp = parseFloat(String(temperature).replace(",", "."));
      const safeTemp = isNaN(parsedTemp) ? 0.7 : Math.min(2, Math.max(0, parsedTemp));
      const parsedTokens = parseInt(String(maxTokens), 10);
      const safeTokens = isNaN(parsedTokens) || parsedTokens <= 0 ? 8192 : Math.min(65536, Math.max(1, parsedTokens));

      const r = await csrfFetch("/api/playground/chat", { 
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ keyId: Number(keyId), model, messages: requestMessages, temperature: safeTemp, maxTokens: safeTokens }),
        signal: controller.signal
      });
      
      const contentType = r.headers.get("content-type") ?? "";
      if (!r.ok || !contentType.includes("text/event-stream") || !r.body) {
        let detail = "";
        try { const body = await r.json(); detail = typeof body?.error === "string" ? body.error : typeof body?.error?.message === "string" ? body.error.message : ""; } catch {}
        throw new Error(detail || `Playground tidak tersedia (${r.status}).`);
      }
      
      const reader = r.body.getReader(); 
      const decoder = new TextDecoder(); 
      let buffer = ""; 
      let completed = false;
      
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      
      while (!completed) {
        const { done, value } = await reader.read(); 
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n"); 
        buffer = blocks.pop() ?? "";
        
        for (const block of blocks) {
          if (block.startsWith(":")) continue;
          const event = block.split("\n").find(line => line.startsWith("event: "))?.slice(7);
          const raw = block.split("\n").find(line => line.startsWith("data: "))?.slice(6);
          if (!raw) continue; 
          const data = JSON.parse(raw);
          
          if (event === "error") throw new Error(data.error?.message ?? data.error ?? "Request AI gagal");
          
          if (event === "chunk") {
            const delta = data.text || "";
            if (delta) {
              accumulatedAssistantText += delta;
              setMessages(prev => {
                const next = [...prev];
                if (next.length > 0 && next[next.length - 1].role === "assistant") {
                  next[next.length - 1] = {
                    ...next[next.length - 1],
                    content: accumulatedAssistantText
                  };
                }
                return next;
              });
              if (isAutoScrollEnabledRef.current) {
                messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
              }
            }
          }

          if (event === "result") { 
            setLastResult(data); 
            finalContent = data.content || accumulatedAssistantText || "(Respons kosong)";
            setMessages(prev => {
              const next = [...prev];
              if (next.length > 0 && next[next.length - 1].role === "assistant") {
                next[next.length - 1] = {
                  role: "assistant",
                  content: finalContent,
                  metadata: {
                    model: data.model,
                    tokens: data.usage.totalTokens,
                    credits: data.usage.credits,
                    latencyMs: data.latencyMs
                  }
                };
              }
              return next;
            });
            if (isAutoScrollEnabledRef.current) {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
            completed = true; 
            break; 
          }
        }
      }
      
      if (!completed && !accumulatedAssistantText) {
        throw new Error("Koneksi Playground terputus.");
      }
      
      const contentToSave = finalContent || accumulatedAssistantText;
      if (currentId && contentToSave) {
        await saveMessages(currentId, [...newMessages, { role: "assistant", content: contentToSave }]);
      }
      
    } catch (error: any) { 
      if (error?.name === "AbortError") {
        if (currentId && accumulatedAssistantText) {
          await saveMessages(currentId, [...newMessagesForSave, { role: "assistant", content: accumulatedAssistantText }]).catch(() => {});
        }
        return;
      }
      setMessages(prev => {
        if (prev[prev.length - 1]?.role === "assistant" && !prev[prev.length - 1].content) return prev.slice(0, -1);
        return prev;
      });
      toast({ title: "Request gagal", description: error instanceof Error ? error.message : "Coba lagi", variant: "destructive" }); 
    } finally { 
      abortControllerRef.current = null;
      setLoading(false); 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || attachments.length > 0) && !loading && !isUploading) runChat();
    }
  };

  return (
    <div className="flex h-screen w-screen bg-muted/20 dark:bg-zinc-950 overflow-hidden font-sans">
      
      {/* Left Sidebar: Collapsible History */}
      <div className={cn(
        "flex flex-col bg-background border-r transition-all duration-300 ease-in-out shrink-0 z-20 shadow-sm",
        isSidebarOpen ? "w-72" : "w-0 overflow-hidden border-none shadow-none"
      )}>
        <div className="flex items-center justify-between p-3 border-b shrink-0 min-w-[288px]">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground text-xs font-medium rounded-lg">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg" onClick={() => setIsSidebarOpen(false)} title="Tutup sidebar">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* New Chat Button: Model ChatGPT / Claude di atas riwayat chat */}
        <div className="p-3 pb-1 shrink-0 min-w-[288px]">
          <Button 
            onClick={startNewChat} 
            variant="outline" 
            className="w-full justify-start gap-2.5 h-10 px-3 rounded-xl border border-border/70 hover:bg-muted text-foreground font-medium text-sm shadow-none transition-colors group"
          >
            <div className="h-5 w-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <span>Chat Baru</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-w-[288px]">
          <div className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2 px-2 mt-1">Riwayat Percakapan</div>
          {sessions.length === 0 ? (
            <div className="text-center p-4 text-xs text-muted-foreground mt-4">Belum ada riwayat</div>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => {
                  if (editingSessionId !== s.id) loadSession(s.id);
                }}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 text-sm rounded-xl cursor-pointer transition-colors",
                  sessionId === s.id 
                    ? "bg-primary/10 text-primary font-medium border border-primary/20" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {editingSessionId === s.id ? (
                  <div className="flex items-center gap-1.5 w-full py-0.5" onClick={e => e.stopPropagation()}>
                    <Input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveRename(s.id, e);
                        if (e.key === "Escape") setEditingSessionId(null);
                      }}
                      autoFocus
                      className="h-7 text-xs px-2 py-0 rounded-lg bg-background border-primary/50 focus-visible:ring-1 flex-1"
                    />
                    <button
                      type="button"
                      onClick={e => saveRename(s.id, e)}
                      className="h-6 w-6 rounded-md hover:bg-primary/10 text-primary flex items-center justify-center shrink-0 cursor-pointer"
                      title="Simpan"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setEditingSessionId(null); }}
                      className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground flex items-center justify-center shrink-0 cursor-pointer"
                      title="Batal"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-1">
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100" />
                      <span className="truncate">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
                      <button 
                        onClick={(e) => startRenaming(s, e)} 
                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-all cursor-pointer"
                        title="Ubah nama"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={(e) => deleteSession(s.id, e)} 
                        className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-all cursor-pointer"
                        title="Hapus obrolan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        
        {/* Top Navigation / Configuration Bar */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-10 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full" onClick={() => setIsSidebarOpen(true)}>
                <PanelLeft className="h-5 w-5" />
              </Button>
            )}
            
            <div className="hidden sm:flex items-center gap-3">
              {/* API Key Selector */}
              <Select value={keyId} onValueChange={setKeyId}>
                <SelectTrigger className="h-9 w-[180px] bg-muted/50 border-0 focus:ring-1 focus:ring-primary shadow-none text-sm font-medium rounded-full px-4">
                  <SelectValue placeholder="Pilih API Key" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {keys.filter(k => k.isActive).map(k => <SelectItem key={k.id} value={String(k.id)}>{k.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Model Selector */}
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-9 w-[200px] bg-muted/50 border-0 focus:ring-1 focus:ring-primary shadow-none text-sm font-medium rounded-full px-4">
                  <SelectValue placeholder="Pilih Model" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Balance Badge */}
            {user && (
              <div
                className="hidden sm:flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dbe8f3] bg-[#f8fbff]/90 px-3 py-1.5 transition-colors hover:border-[#c9d8e7] hover:bg-[#eef8ff] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-muted/40 shadow-sm"
                title="Kredit kamu"
              >
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold tabular-nums" style={{ color: creditColor(user?.credits) }}>
                  {formatCredits(user?.credits)}
                </span>
              </div>
            )}
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full shadow-sm">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Pengaturan Lanjutan</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="sm:hidden space-y-2">
                    <Label className="text-xs font-medium">API Key</Label>
                    <Select value={keyId} onValueChange={setKeyId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih API key" /></SelectTrigger>
                      <SelectContent className="max-h-[250px] overflow-y-auto">
                        {keys.filter(k => k.isActive).map(k => <SelectItem key={k.id} value={String(k.id)}>{k.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:hidden space-y-2">
                    <Label className="text-xs font-medium">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih model" /></SelectTrigger>
                      <SelectContent className="max-h-[250px] overflow-y-auto">
                        {models.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">System Prompt</Label>
                    <Textarea value={system} onChange={e => setSystem(e.target.value)} rows={4} className="text-sm resize-none rounded-xl" placeholder="Instruksi untuk AI..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Temperature</Label>
                      <Input 
                        type="text" 
                        inputMode="decimal" 
                        placeholder="0.7" 
                        value={temperature} 
                        onChange={e => setTemperature(e.target.value.replace(",", "."))} 
                        className="h-9 rounded-lg" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Max Tokens</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="65536" 
                        placeholder="8192" 
                        value={maxTokens} 
                        onChange={e => setMaxTokens(e.target.value)} 
                        className="h-9 rounded-lg" 
                      />
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Chat Messages */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto pb-4">
          <div className="max-w-4xl mx-auto px-4 py-8 pb-10 space-y-8 min-h-full flex flex-col justify-end">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center my-auto text-muted-foreground opacity-60">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <FlaskConical className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">AI Playground</h2>
                <p className="text-center text-sm">Pilih API key dan model di atas, lalu mulai percakapan.</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const msgText = getMessageText(msg.content);
                return (
                  <div key={idx} className={cn("flex gap-4 w-full group", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn("h-8 w-8 shrink-0 rounded-full flex items-center justify-center shadow-sm border mt-1", 
                      msg.role === "user" ? "bg-muted text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/25"
                    )}>
                      {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    
                    <div className={cn("flex flex-col gap-1.5 min-w-0 max-w-[85%]", msg.role === "user" ? "items-end" : "items-start")}>
                      {/* Render Content Array / String correctly without wrapping images in bubbles */}
                      {typeof msg.content === "string" ? (
                        msg.content ? (
                           <div className={cn("px-5 py-3.5 rounded-[1.5rem] text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-full shadow-sm", 
                            msg.role === "user" 
                              ? "bg-primary/[0.08] dark:bg-primary/[0.14] border border-primary/20 dark:border-primary/25 text-foreground rounded-tr-sm prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-primary" 
                              : "bg-background border border-border text-foreground rounded-tl-sm"
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="px-5 py-3.5 rounded-[1.5rem] bg-background border rounded-tl-sm shadow-sm flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Berpikir...
                          </div>
                        )
                      ) : (
                        <div className={cn("flex flex-col gap-2.5 w-full", msg.role === "user" ? "items-end" : "items-start")}>
                          {msg.content.map((part, i) => {
                            if (part.type === "image_url") {
                              return (
                                <div key={i} className="relative rounded-2xl overflow-hidden shadow-sm border border-border/50 bg-background p-1 max-w-[320px]">
                                  <a href={part.image_url.url} target="_blank" rel="noreferrer" title="Buka gambar penuh">
                                    <img src={part.image_url.url} alt="Lampiran gambar" className="rounded-xl object-cover hover:opacity-95 transition-opacity" />
                                  </a>
                                </div>
                              );
                            }
                            if (part.type === "file") {
                              return (
                                <a
                                  key={i}
                                  href={part.file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-3 p-3 rounded-2xl border bg-background/95 hover:bg-muted/60 transition-colors shadow-sm max-w-sm group text-foreground"
                                >
                                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    {isCodeFile(part.file.name) ? <FileCode className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                      {part.file.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      <span>{formatFileSize(part.file.size)}</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1 text-[11px] text-primary/80 group-hover:underline">
                                        <Download className="h-3 w-3" /> Unduh
                                      </span>
                                    </div>
                                  </div>
                                </a>
                              );
                            }
                            if (part.type === "text" && part.text) {
                              return (
                                <div key={i} className={cn("px-5 py-3.5 rounded-[1.5rem] text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-full shadow-sm", 
                                  msg.role === "user" 
                                    ? "bg-primary/[0.08] dark:bg-primary/[0.14] border border-primary/20 dark:border-primary/25 text-foreground rounded-tr-sm prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-primary" 
                                    : "bg-background border border-border text-foreground rounded-tl-sm"
                                )}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{part.text}</ReactMarkdown>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                      
                      {/* Action Bar: Metadata & Copy Button */}
                      {msgText && (
                        <div className={cn("flex items-center gap-2 mt-0.5 px-1", msg.role === "user" ? "justify-end" : "justify-start flex-wrap")}>
                          {msg.role === "assistant" && msg.metadata && (
                            <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-medium text-muted-foreground mr-1">
                              <span className="flex items-center gap-1">
                                <Bot className="h-3 w-3" /> {msg.metadata.model}
                              </span>
                              <span className="flex items-center gap-1">
                                <Coins className="h-3 w-3" /> {msg.metadata.credits ?? 0} cr
                              </span>
                              <span>{msg.metadata.tokens} tokens</span>
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" /> {(msg.metadata.latencyMs / 1000).toFixed(1)}s
                              </span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyMessage(idx, msgText)}
                            className={cn(
                              "flex items-center gap-1 text-[11px] font-medium transition-all py-0.5 px-1.5 rounded-md hover:bg-muted/70 cursor-pointer",
                              copiedIdx === idx ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground hover:text-foreground opacity-80 group-hover:opacity-100"
                            )}
                            title="Salin pesan"
                          >
                            {copiedIdx === idx ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Input Area */}
        <div className="px-4 pb-6 pt-2 shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col gap-2 relative">
            
            {/* Scroll to Bottom Floating Button */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 h-8 w-8 rounded-full bg-background/90 backdrop-blur border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
                title="Scroll ke bawah"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}
            
            {/* Attachments Preview Area */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 ml-3 mb-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -top-2 -right-2 z-10 bg-background rounded-full p-0.5 shadow-md border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-destructive hover:text-destructive-foreground p-0"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {isImageFile(att.mimeType, att.name) ? (
                      <div className="bg-background p-1 rounded-xl shadow-sm border border-border/60">
                        <img src={att.url} alt={att.name} className="h-20 w-20 rounded-lg object-cover" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 px-3 py-2 bg-background rounded-xl border border-border/60 shadow-sm max-w-[220px]">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {isCodeFile(att.name) ? <FileCode className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{att.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isUploading && (
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground self-start ml-4 mb-2 bg-background border px-3 py-1.5 rounded-full shadow-sm">
                <Loader2 className="h-3 w-3 animate-spin" /> Sedang mengunggah file...
              </div>
            )}
            
            {/* Main Input Box */}
            <div className="relative flex items-end gap-2 bg-background rounded-3xl p-2 pl-4 border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
              <input 
                type="file" 
                multiple
                accept="image/*,.pdf,.txt,.md,.json,.csv,.py,.js,.ts,.tsx,.jsx,.html,.css,.doc,.docx,.yaml,.yml,.sql,.log" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground mb-0.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || isUploading}
                title="Lampirkan File (Gambar, PDF, Dokumen, Kode)"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              <Textarea 
                ref={textareaRef}
                placeholder="Kirim pesan ke AI... (Shift+Enter baris baru)" 
                className="min-h-[44px] max-h-72 w-full resize-none border-0 bg-transparent py-3 focus-visible:ring-0 shadow-none text-[15px] leading-relaxed scrollbar-hide"
                rows={1} value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 288)}px`;
                }}
                onKeyDown={handleKeyDown} disabled={loading || isUploading}
              />
              
              {loading ? (
                <Button 
                  onClick={handleStop} 
                  type="button"
                  variant="destructive"
                  size="icon" 
                  className="h-10 w-10 shrink-0 rounded-full mb-0.5 transition-transform active:scale-95 shadow-sm"
                  title="Hentikan pembuatan respons (Stop)"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              ) : (
                <Button 
                  onClick={runChat} 
                  disabled={(!input.trim() && attachments.length === 0) || isUploading} 
                  size="icon" 
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-full mb-0.5 transition-all active:scale-95 shadow-sm",
                    input.trim() || attachments.length > 0 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "bg-muted text-muted-foreground opacity-60 hover:bg-muted"
                  )}
                  title="Kirim pesan"
                >
                  <Send className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
