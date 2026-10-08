import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, FlaskConical, Play, Timer, Coins, Settings2, User, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { csrfFetch } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Model = { id: string; label: string; provider: string };
type ApiKey = { id: number; name: string; keyPrefix: string; isActive: boolean };
type Message = { role: "user" | "assistant" | "system"; content: string };
type Result = { content: string; model: string; finishReason: string | null; usage: { inputTokens: number; outputTokens: number; totalTokens: number; credits: number | null }; latencyMs: number };

export default function PlaygroundPage() {
  const { toast } = useToast();
  
  // Settings state
  const [keyId, setKeyId] = useState("");
  const [model, setModel] = useState("");
  const [system, setSystem] = useState("You are a helpful assistant.");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("1024");
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: models = [] } = useQuery<Model[]>({ 
    queryKey: ["catalog"], 
    queryFn: async () => { const r = await fetch("/api/catalog"); if (!r.ok) throw new Error(); return r.json(); } 
  });
  
  const { data: keys = [] } = useQuery<ApiKey[]>({ 
    queryKey: ["api-keys"], 
    queryFn: async () => { const r = await fetch("/api/api-keys", { credentials: "include" }); if (!r.ok) throw new Error(); return r.json(); } 
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const runChat = async (userPrompt: string) => {
    if (!keyId || !model || !userPrompt.trim()) { 
      toast({ title: "Pilih API key, model, dan isi pesan", variant: "destructive" }); 
      return; 
    }
    
    // Add user message to state
    const newMessages: Message[] = [...messages, { role: "user", content: userPrompt.trim() }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setLastResult(null);
    
    try {
      // Build request messages array including system prompt if it exists
      const requestMessages = [];
      if (system.trim()) {
        requestMessages.push({ role: "system", content: system.trim() });
      }
      requestMessages.push(...newMessages);
      
      const r = await csrfFetch("/api/playground/chat", { 
        method: "POST", 
        credentials: "include", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          keyId: Number(keyId), 
          model, 
          messages: requestMessages, 
          temperature: Number(temperature), 
          maxTokens: Number(maxTokens) 
        }) 
      });
      
      const contentType = r.headers.get("content-type") ?? "";
      if (!r.ok || !contentType.includes("text/event-stream") || !r.body) {
        let detail = "";
        try { const body = await r.json(); detail = typeof body?.error === "string" ? body.error : typeof body?.error?.message === "string" ? body.error.message : ""; } catch { /* body bukan JSON */ }
        throw new Error(detail || `Playground tidak tersedia (${r.status}).`);
      }
      
      const reader = r.body.getReader(); 
      const decoder = new TextDecoder(); 
      let buffer = ""; 
      let completed = false;
      
      // Temporary state for the streaming assistant message
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
          if (event === "result") { 
            setLastResult(data); 
            // Update immediately using data
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1].content = data.content || "(Respons kosong)";
              return next;
            });
            completed = true; 
            break; 
          }
        }
      }
      
      if (!completed) throw new Error("Koneksi Playground terputus sebelum respons selesai.");
      
    } catch (error) { 
      // Remove the empty assistant message if it failed
      setMessages(prev => {
        if (prev[prev.length - 1].role === "assistant" && !prev[prev.length - 1].content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      toast({ title: "Playground gagal", description: error instanceof Error ? error.message : "Coba lagi", variant: "destructive" }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !loading) runChat(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setLastResult(null);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col mx-auto max-w-6xl">
      <div className="flex items-center justify-between pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Developer Tools</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold"><FlaskConical className="h-6 w-6 text-primary" /> AI Playground</h1>
        </div>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <Button variant="outline" onClick={clearChat} disabled={loading}>Clear Chat</Button>
          )}
          <Button variant={isSettingsOpen ? "secondary" : "outline"} onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
            <Settings2 className="h-4 w-4 mr-2" /> Settings
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col rounded-xl border bg-background shadow-sm overflow-hidden relative">
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                <Bot className="h-12 w-12 mb-4 text-primary opacity-50" />
                <p className="text-lg font-medium">Mulai percakapan baru</p>
                <p className="text-sm">Pilih API key, model, lalu kirim pesan.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-4 max-w-4xl mx-auto", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("h-8 w-8 shrink-0 rounded-full flex items-center justify-center", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-orange-100 text-orange-600 dark:bg-orange-900/30")}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn("flex flex-col gap-1 min-w-0 max-w-[85%]", msg.role === "user" ? "items-end" : "items-start")}>
                    <div className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-full", 
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-muted rounded-tl-sm border"
                    )}>
                      {msg.role === "assistant" ? (
                        msg.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Berpikir...</span>
                        )
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-4 bg-background border-t">
            <div className="max-w-4xl mx-auto relative flex items-end gap-2">
              <Textarea 
                placeholder="Kirim pesan ke AI... (Shift+Enter untuk baris baru)" 
                className="min-h-[52px] max-h-72 w-full resize-none rounded-xl bg-muted/50 pr-12 text-sm leading-relaxed"
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 288)}px`;
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <Button 
                onClick={() => {
                  if (input.trim() && !loading) runChat(input);
                }}
                disabled={!input.trim() || loading}
                size="icon"
                className="absolute bottom-2 right-2 h-9 w-9 rounded-lg"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Last Result Stats */}
            {lastResult && (
              <div className="max-w-4xl mx-auto mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground font-medium">
                <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {lastResult.latencyMs}ms</span>
                <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {lastResult.usage.credits ?? "-"} cr</span>
                <span>{lastResult.usage.totalTokens} tokens (IN: {lastResult.usage.inputTokens} | OUT: {lastResult.usage.outputTokens})</span>
                {lastResult.finishReason && <span>Status: {lastResult.finishReason}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Settings */}
        {isSettingsOpen && (
          <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
            <div className="rounded-xl border bg-card p-5 space-y-5">
              <h3 className="font-semibold text-sm">Konfigurasi Model</h3>
              
              <div className="space-y-2">
                <Label className="text-xs">API Key</Label>
                <Select value={keyId} onValueChange={setKeyId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih API key" /></SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {keys.filter(k => k.isActive).map(k => <SelectItem key={k.id} value={String(k.id)} className="text-xs">{k.name} · {k.keyPrefix}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih model" /></SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {models.map(m => <SelectItem key={m.id} value={m.id} className="text-xs">{m.label} · {m.provider}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">System Prompt</Label>
                <Textarea 
                  value={system} 
                  onChange={e => setSystem(e.target.value)} 
                  rows={4} 
                  className="text-xs resize-none"
                  placeholder="Instruksi untuk AI..." 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Temperature</Label>
                  <Input type="number" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Tokens</Label>
                  <Input type="number" min="1" max="16384" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
