import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, FlaskConical, Play, Timer, Coins, Settings2, User, Loader2, Send, Plus, MessageSquare, Trash2, X, Paperclip, ImageIcon, PanelLeftClose, PanelLeft, ArrowLeft } from "lucide-react";
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

type Model = { id: string; label: string; provider: string };
type ApiKey = { id: number; name: string; keyPrefix: string; isActive: boolean };
type MessagePart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type MessageContent = string | MessagePart[];
type Message = { role: "user" | "assistant" | "system"; content: MessageContent };
type Result = { content: string; model: string; finishReason: string | null; usage: { inputTokens: number; outputTokens: number; totalTokens: number; credits: number | null }; latencyMs: number };
type Session = { id: number; title: string; updatedAt: string };
type SessionDetail = Session & { model: string; systemPrompt: string; temperature: string; maxTokens: string; apiKeyId: number; messages: Message[] };

export default function PlaygroundPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Settings state
  const [keyId, setKeyId] = useState("");
  const [model, setModel] = useState("");
  const [system, setSystem] = useState("You are a helpful assistant.");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("1024");
  
  // Chat state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Data Fetching
  const { data: models = [] } = useQuery<Model[]>({ queryKey: ["catalog"], queryFn: async () => { const r = await fetch("/api/catalog"); if (!r.ok) throw new Error(); return r.json(); } });
  const { data: keys = [] } = useQuery<ApiKey[]>({ queryKey: ["api-keys"], queryFn: async () => { const r = await fetch("/api/api-keys", { credentials: "include" }); if (!r.ok) throw new Error(); return r.json(); } });
  const { data: sessions = [] } = useQuery<Session[]>({ queryKey: ["playground-sessions"], queryFn: async () => { const r = await fetch("/api/playground/sessions", { credentials: "include" }); if (!r.ok) throw new Error(); return r.json(); } });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, selectedImage]);

  const loadSession = async (id: number) => {
    try {
      setLoading(true);
      const r = await fetch(`/api/playground/sessions/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error();
      const data: SessionDetail = await r.json();
      setSessionId(data.id);
      setMessages(data.messages || []);
      setModel(data.model || "");
      setSystem(data.systemPrompt || "");
      setTemperature(data.temperature || "0.7");
      setMaxTokens(data.maxTokens || "1024");
      setKeyId(data.apiKeyId ? String(data.apiKeyId) : "");
      setLastResult(null);
      setSelectedImage(null);
      // Auto-close sidebar on mobile after selecting chat
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
        model, systemPrompt: system, temperature, maxTokens, keyId: Number(keyId)
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

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setLastResult(null);
    setSelectedImage(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Ukuran file terlalu besar", description: "Maksimal 5MB", variant: "destructive" });
      return;
    }
    
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      
      const r = await csrfFetch("/api/playground/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Gagal upload gambar");
      }
      
      const data = await r.json();
      setSelectedImage(data.url);
    } catch (error: any) {
      toast({ title: "Gagal upload", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const runChat = async () => {
    const userPrompt = input.trim();
    if (!keyId || !model || (!userPrompt && !selectedImage)) { 
      toast({ title: "Pilih API key, model, dan isi pesan/gambar", variant: "destructive" }); return; 
    }
    
    let currentId = sessionId;
    setInput("");
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setLoading(true);
    setLastResult(null);
    
    try {
      if (!currentId) {
        currentId = await createSession(userPrompt || "Gambar Upload");
        setSessionId(currentId);
      }

      let userContent: MessageContent = userPrompt;
      if (imageToSend) {
        userContent = [
          { type: "image_url", image_url: { url: imageToSend } }
        ];
        if (userPrompt) {
          userContent.push({ type: "text", text: userPrompt });
        }
      }

      const newMessages: Message[] = [...messages, { role: "user", content: userContent }];
      setMessages(newMessages);
      
      const requestMessages = [];
      if (system.trim()) requestMessages.push({ role: "system", content: system.trim() });
      requestMessages.push(...newMessages);
      
      const r = await csrfFetch("/api/playground/chat", { 
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ keyId: Number(keyId), model, messages: requestMessages, temperature: Number(temperature), maxTokens: Number(maxTokens) }) 
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
      let finalContent = "";
      
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
            finalContent = data.content || "(Respons kosong)";
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1].content = finalContent;
              return next;
            });
            completed = true; 
            break; 
          }
        }
      }
      
      if (!completed) throw new Error("Koneksi Playground terputus.");
      
      if (currentId) {
        await saveMessages(currentId, [...newMessages, { role: "assistant", content: finalContent }]);
      }
      
    } catch (error) { 
      setMessages(prev => {
        if (prev[prev.length - 1]?.role === "assistant" && !prev[prev.length - 1].content) return prev.slice(0, -1);
        return prev;
      });
      toast({ title: "Request gagal", description: error instanceof Error ? error.message : "Coba lagi", variant: "destructive" }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || selectedImage) && !loading && !isUploading) runChat();
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden font-sans">
      
      {/* Left Sidebar: Collapsible History */}
      <div className={cn(
        "flex flex-col border-r bg-muted/10 transition-all duration-300 ease-in-out shrink-0",
        isSidebarOpen ? "w-72" : "w-0 overflow-hidden border-none"
      )}>
        <div className="flex items-center justify-between p-3 border-b shrink-0 min-w-[288px]">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Button onClick={startNewChat} variant="outline" className="flex-1 ml-2 mr-2 bg-background shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setIsSidebarOpen(false)}>
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 min-w-[288px]">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Riwayat Percakapan</div>
          {sessions.length === 0 ? (
            <div className="text-center p-4 text-xs text-muted-foreground mt-4">Belum ada riwayat</div>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => loadSession(s.id)}
                className={cn(
                  "group flex items-center justify-between px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-colors",
                  sessionId === s.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-3 truncate">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </div>
                <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        
        {/* Top Navigation / Configuration Bar */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur z-10 shrink-0">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setIsSidebarOpen(true)}>
                <PanelLeft className="h-5 w-5" />
              </Button>
            )}
            
            <div className="hidden sm:flex items-center gap-3">
              {/* API Key Selector */}
              <Select value={keyId} onValueChange={setKeyId}>
                <SelectTrigger className="h-9 w-[180px] bg-muted/50 border-0 focus:ring-0 shadow-none text-sm font-medium">
                  <SelectValue placeholder="Pilih API Key" />
                </SelectTrigger>
                <SelectContent>
                  {keys.filter(k => k.isActive).map(k => <SelectItem key={k.id} value={String(k.id)}>{k.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Model Selector */}
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-9 w-[200px] bg-muted/50 border-0 focus:ring-0 shadow-none text-sm font-medium">
                  <SelectValue placeholder="Pilih Model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                  <Settings2 className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Advanced Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Mobile overrides for API Key & Model */}
                  <div className="sm:hidden space-y-2">
                    <Label className="text-xs">API Key</Label>
                    <Select value={keyId} onValueChange={setKeyId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih API key" /></SelectTrigger>
                      <SelectContent>
                        {keys.filter(k => k.isActive).map(k => <SelectItem key={k.id} value={String(k.id)}>{k.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:hidden space-y-2">
                    <Label className="text-xs">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih model" /></SelectTrigger>
                      <SelectContent>
                        {models.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">System Prompt</Label>
                    <Textarea value={system} onChange={e => setSystem(e.target.value)} rows={4} className="text-sm resize-none" placeholder="Instruksi untuk AI..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Temperature</Label>
                      <Input type="number" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Max Tokens</Label>
                      <Input type="number" min="1" max="16384" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} className="h-9" />
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-4xl mx-auto px-4 py-8 pb-10 space-y-8 min-h-full flex flex-col justify-end">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center my-auto text-muted-foreground opacity-60">
                <FlaskConical className="h-16 w-16 mb-4 text-primary opacity-50" />
                <h2 className="text-2xl font-bold mb-2">AI Playground</h2>
                <p className="text-center text-sm">Pilih API key dan model di atas, lalu mulai percakapan.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-4 w-full", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("h-8 w-8 shrink-0 rounded-full flex items-center justify-center mt-1", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-orange-100 text-orange-600 dark:bg-orange-900/30")}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn("flex flex-col gap-1 min-w-0 max-w-[85%]", msg.role === "user" ? "items-end" : "items-start")}>
                    <div className={cn("px-5 py-3.5 rounded-3xl text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-full", 
                      msg.role === "user" 
                        ? "bg-muted text-foreground rounded-br-sm" 
                        : "bg-transparent text-foreground"
                    )}>
                      {typeof msg.content === "string" ? (
                        msg.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        ) : (
                          <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Berpikir...</span>
                        )
                      ) : (
                        <div className="space-y-4">
                          {msg.content.map((part, i) => (
                            <div key={i}>
                              {part.type === "text" && <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>}
                              {part.type === "image_url" && (
                                <img src={part.image_url.url} alt="Uploaded" className="max-w-[280px] rounded-xl shadow-sm border border-primary/20" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Input Area */}
        <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-background via-background to-transparent shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col gap-2 relative">
            
            {/* Image Preview Area */}
            {selectedImage && (
              <div className="relative inline-block self-start ml-4 mb-1">
                <div className="absolute -top-2 -right-2 z-10 bg-background rounded-full p-0.5 shadow-sm border">
                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-destructive hover:text-destructive-foreground" onClick={removeSelectedImage}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <img src={selectedImage} alt="Preview" className="h-24 w-auto rounded-xl border object-cover shadow-sm" />
              </div>
            )}

            {isUploading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground self-start ml-4 mb-2 bg-muted px-3 py-1.5 rounded-full">
                <Loader2 className="h-3 w-3 animate-spin" /> Sedang mengupload gambar...
              </div>
            )}
            
            {/* Main Input Box */}
            <div className="relative flex items-end gap-2 bg-muted/40 rounded-3xl p-2 pl-4 border shadow-sm focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
              <input 
                type="file" 
                accept="image/*" 
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
                title="Kirim Gambar"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              <Textarea 
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
              
              <Button 
                onClick={runChat} 
                disabled={(!input.trim() && !selectedImage) || loading || isUploading} 
                size="icon" 
                className="h-10 w-10 shrink-0 rounded-full mb-0.5 transition-transform active:scale-95"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          
          {/* Metadata Footer */}
          {lastResult && (
            <div className="max-w-4xl mx-auto mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground font-medium opacity-70">
              <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {lastResult.latencyMs}ms</span>
              <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {lastResult.usage.credits ?? "-"} cr</span>
              <span>{lastResult.usage.totalTokens} tokens (IN: {lastResult.usage.inputTokens} | OUT: {lastResult.usage.outputTokens})</span>
              {lastResult.finishReason && <span>Status: {lastResult.finishReason}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
