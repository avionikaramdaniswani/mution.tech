import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, FlaskConical, Play, Timer, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { csrfFetch } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";

type Model = { id: string; label: string; provider: string };
type ApiKey = { id: number; name: string; keyPrefix: string; isActive: boolean };
type Result = { content: string; model: string; finishReason: string | null; usage: { inputTokens: number; outputTokens: number; totalTokens: number; credits: number | null }; latencyMs: number };

export default function PlaygroundPage() {
  const { toast } = useToast();
  const [keyId, setKeyId] = useState(""); const [model, setModel] = useState("");
  const [system, setSystem] = useState("You are a helpful assistant."); const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState("0.7"); const [maxTokens, setMaxTokens] = useState("1024");
  const [result, setResult] = useState<Result | null>(null); const [loading, setLoading] = useState(false);
  const { data: models = [] } = useQuery<Model[]>({ queryKey: ["catalog"], queryFn: async () => { const r = await fetch("/api/catalog"); if (!r.ok) throw new Error(); return r.json(); } });
  const { data: keys = [] } = useQuery<ApiKey[]>({ queryKey: ["api-keys"], queryFn: async () => { const r = await fetch("/api/api-keys", { credentials: "include" }); if (!r.ok) throw new Error(); return r.json(); } });
  const run = async () => {
    if (!keyId || !model || !prompt.trim()) { toast({ title: "Pilih API key, model, dan isi prompt", variant: "destructive" }); return; }
    setLoading(true); setResult(null);
    try {
      const r = await csrfFetch("/api/playground/chat", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyId: Number(keyId), model, system, prompt, temperature: Number(temperature), maxTokens: Number(maxTokens) }) });
      const contentType = r.headers.get("content-type") ?? "";
      if (!r.ok || !contentType.includes("text/event-stream") || !r.body) throw new Error(`Playground tidak tersedia (${r.status}).`);
      const reader = r.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let completed = false;
      while (!completed) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n"); buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          if (block.startsWith(":")) continue;
          const event = block.split("\n").find(line => line.startsWith("event: "))?.slice(7);
          const raw = block.split("\n").find(line => line.startsWith("data: "))?.slice(6);
          if (!raw) continue; const data = JSON.parse(raw);
          if (event === "error") throw new Error(data.error?.message ?? data.error ?? "Request AI gagal");
          if (event === "result") { setResult(data); completed = true; break; }
        }
      }
      if (!completed) throw new Error("Koneksi Playground terputus sebelum respons selesai.");
    } catch (error) { toast({ title: "Playground gagal", description: error instanceof Error ? error.message : "Coba lagi", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  return <div className="mx-auto max-w-7xl space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Developer Tools</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><FlaskConical className="h-7 w-7 text-primary" /> AI Playground</h1><p className="mt-1 text-sm text-muted-foreground">Uji model aktif melalui gateway yang sama. Penggunaan memotong saldo dan tercatat pada API key pilihanmu.</p></div>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Konfigurasi</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>API Key</Label><Select value={keyId} onValueChange={setKeyId}><SelectTrigger><SelectValue placeholder="Pilih API key" /></SelectTrigger><SelectContent>{keys.filter(k => k.isActive).map(k => <SelectItem key={k.id} value={String(k.id)}>{k.name} · {k.keyPrefix}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Model</Label><Select value={model} onValueChange={setModel}><SelectTrigger><SelectValue placeholder="Pilih model" /></SelectTrigger><SelectContent>{models.map(m => <SelectItem key={m.id} value={m.id}>{m.label} · {m.provider}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-2"><Label>System prompt</Label><Textarea value={system} onChange={e => setSystem(e.target.value)} rows={3} /></div><div className="space-y-2"><Label>Pesan</Label><Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={7} placeholder="Tulis sesuatu untuk diuji..." /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Temperature</Label><Input type="number" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} /></div><div className="space-y-2"><Label>Max tokens</Label><Input type="number" min="1" max="16384" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} /></div></div><Button className="w-full" disabled={loading} onClick={run}><Play className="mr-2 h-4 w-4" />{loading ? "Menjalankan..." : "Jalankan test"}</Button></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4" /> Hasil</CardTitle></CardHeader><CardContent>{loading ? <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">Menunggu respons model...</div> : result ? <div className="space-y-4"><div className="min-h-56 whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-7">{result.content || "(Respons kosong)"}</div><div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><div className="rounded-md border p-3"><p className="text-muted-foreground">Input</p><p className="mt-1 font-bold">{result.usage.inputTokens} token</p></div><div className="rounded-md border p-3"><p className="text-muted-foreground">Output</p><p className="mt-1 font-bold">{result.usage.outputTokens} token</p></div><div className="rounded-md border p-3"><p className="flex items-center gap-1 text-muted-foreground"><Coins className="h-3 w-3" /> Biaya</p><p className="mt-1 font-bold">{result.usage.credits ?? "-"} kredit</p></div><div className="rounded-md border p-3"><p className="flex items-center gap-1 text-muted-foreground"><Timer className="h-3 w-3" /> Latency</p><p className="mt-1 font-bold">{result.latencyMs} ms</p></div></div></div> : <div className="flex min-h-72 items-center justify-center text-center text-sm text-muted-foreground">Hasil respons dan rincian penggunaan akan tampil di sini.</div>}</CardContent></Card></div></div>;
}
