import { useState } from "react";
import { Copy, Check, Key, Zap, Code, Terminal, BookOpen, ExternalLink, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

type OsTab = "linux" | "powershell" | "cmd";

function OsTabs({ linux, powershell, cmd }: { linux: string; powershell: string; cmd: string }) {
  const [active, setActive] = useState<OsTab>("linux");
  const tabs: { key: OsTab; label: string; icon: string }[] = [
    { key: "linux", label: "Linux / macOS", icon: "🐧" },
    { key: "powershell", label: "Windows PowerShell", icon: "🟦" },
    { key: "cmd", label: "Windows CMD", icon: "⬛" },
  ];
  const code = active === "linux" ? linux : active === "powershell" ? powershell : cmd;
  const lang = active === "linux" ? "bash" : active === "powershell" ? "powershell" : "cmd";
  return (
    <div className="rounded-lg border border-border/50 bg-[#0d1117] my-3 overflow-hidden">
      <div className="flex border-b border-border/50">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors border-r border-border/50 last:border-0 ${
              active === t.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="relative">
        <span className="absolute top-2.5 right-10 text-[10px] text-muted-foreground font-mono">{lang}</span>
        <CopyBtn text={code} />
        <pre className="overflow-x-auto px-4 pt-4 pb-4 text-xs font-mono text-zinc-300 leading-relaxed">{code}</pre>
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-lg bg-[#0d1117] border border-border/50 my-3">
      <div className="absolute top-2.5 left-3 flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
        <span className="ml-1 text-[10px] text-muted-foreground font-mono">{lang}</span>
      </div>
      <CopyBtn text={code} />
      <pre className="overflow-x-auto px-4 pt-9 pb-4 text-xs font-mono text-zinc-300 leading-relaxed">{code}</pre>
    </div>
  );
}

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold mb-4 pb-2 border-b border-border/50">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mt-5 mb-2">{children}</h3>;
}

export default function DocsPage() {
  const { user } = useAuth();
  const base = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "https://mution.tech";

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Dokumentasi</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Mution AI API</h1>
        <p className="text-muted-foreground mt-2">
          API yang kompatibel dengan OpenAI SDK dan Claude Code. Satu key, semua model.
        </p>
        {!user?.credits || user.credits <= 0 ? (
          <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            ⚠️ Kredit kamu habis. <Link href="/billing" className="underline underline-offset-2">Top up di sini →</Link>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            ✅ Kredit aktif: <span className="font-semibold">Rp {(user.credits).toLocaleString("id-ID")}</span> — siap digunakan.
          </div>
        )}
      </div>

      {/* Quick start */}
      <Section id="quickstart" title="Quick Start" icon={Zap}>
        <p>Dua langkah untuk mulai:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/api-keys">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 cursor-pointer hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-2 text-primary font-medium mb-1">
                <Key className="h-4 w-4" />
                1. Generate API Key
              </div>
              <p className="text-xs text-muted-foreground">Buat key di halaman API Keys →</p>
            </div>
          </Link>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 font-medium mb-1 text-foreground">
              <Code className="h-4 w-4 text-muted-foreground" />
              2. Gunakan di kode kamu
            </div>
            <p className="text-xs text-muted-foreground">Ikuti contoh di bawah ini.</p>
          </div>
        </div>

        <H3>Base URL & Endpoint</H3>
        <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-foreground">Endpoint</th>
                <th className="text-left px-4 py-2 font-medium text-foreground">Kompatibel</th>
              </tr>
            </thead>
            <tbody>
              {[
                [`${base}/v1/chat/completions`, "OpenAI SDK, LangChain, LlamaIndex, dll"],
                [`${base}/v1/messages`, "Anthropic SDK, Claude Code"],
                [`${base}/v1/models`, "List model tersedia"],
                [`${base}/v1/embeddings`, "Embedding API"],
              ].map(([ep, compat]) => (
                <tr key={ep} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 font-mono text-primary">{ep}</td>
                  <td className="px-4 py-2 text-muted-foreground">{compat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Models */}
      <Section id="models" title="Model Tersedia" icon={Zap}>
        <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-foreground">Model ID</th>
                <th className="text-left px-4 py-2 font-medium text-foreground">Provider</th>
                <th className="text-left px-4 py-2 font-medium text-foreground">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["claude-opus-4-6", "Anthropic", "Claude terbaru, sangat powerful"],
                ["claude-opus-4-5", "Anthropic", "Claude Opus 4.5"],
                ["gpt-5.5", "OpenAI", "GPT terbaru"],
                ["glm-5.2", "Zhipu AI", "Model cepat & hemat"],
              ].map(([model, prov, desc]) => (
                <tr key={model} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 font-mono text-primary">{model}</td>
                  <td className="px-4 py-2 text-muted-foreground">{prov}</td>
                  <td className="px-4 py-2 text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs">
          Untuk list model terbaru, panggil <code className="bg-muted px-1 py-0.5 rounded text-primary">GET {base}/v1/models</code>
        </p>
      </Section>

      {/* OpenAI SDK */}
      <Section id="openai" title="OpenAI SDK (Python)" icon={Code}>
        <CodeBlock lang="bash" code="pip install openai" />

        <H3>Chat Completion</H3>
        <CodeBlock lang="python" code={`from openai import OpenAI

client = OpenAI(
    api_key="mk_live_YOUR_KEY_HERE",
    base_url="${base}/v1"
)

response = client.chat.completions.create(
    model="claude-opus-4-6",
    messages=[
        {"role": "system", "content": "Kamu adalah asisten yang helpful."},
        {"role": "user", "content": "Apa itu machine learning?"}
    ],
    max_tokens=1024
)

print(response.choices[0].message.content)`} />

        <H3>Streaming</H3>
        <CodeBlock lang="python" code={`from openai import OpenAI

client = OpenAI(
    api_key="mk_live_YOUR_KEY_HERE",
    base_url="${base}/v1"
)

with client.chat.completions.stream(
    model="claude-opus-4-6",
    messages=[{"role": "user", "content": "Ceritakan tentang Python"}],
    max_tokens=512,
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)`} />
      </Section>

      {/* OpenAI SDK Node.js */}
      <Section id="openai-node" title="OpenAI SDK (Node.js / TypeScript)" icon={Code}>
        <CodeBlock lang="bash" code="npm install openai" />
        <CodeBlock lang="typescript" code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "mk_live_YOUR_KEY_HERE",
  baseURL: "${base}/v1",
});

const response = await client.chat.completions.create({
  model: "claude-opus-4-6",
  messages: [
    { role: "system", content: "Kamu adalah asisten yang helpful." },
    { role: "user", content: "Apa itu TypeScript?" },
  ],
});

console.log(response.choices[0].message.content);`} />
      </Section>

      {/* Claude Code */}
      <Section id="claude-code" title="Claude Code" icon={Terminal}>
        <p>
          Claude Code adalah CLI dari Anthropic untuk coding dengan AI. Mution mendukung format Anthropic Messages API
          secara penuh, termasuk streaming — sehingga Claude Code bisa langsung dipakai dengan API key Mution.
        </p>

        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-400 space-y-1">
          <p><strong>⚠️ Penting — baca dulu sebelum mulai:</strong></p>
          <p>Claude Code v2+ akan menampilkan prompt login saat pertama dijalankan. Env var <strong>harus di-set sebelum</strong> menjalankan <code className="text-yellow-300">claude</code> agar login prompt tidak muncul. Kalau sudah terlanjur muncul, tekan <kbd className="bg-yellow-500/20 px-1 rounded">Esc</kbd> lalu set env var dulu, baru jalankan ulang.</p>
        </div>

        <H3>1. Install Claude Code</H3>
        <CodeBlock lang="bash" code="npm install -g @anthropic-ai/claude-code" />

        <H3>2. Set env var sebelum menjalankan claude</H3>
        <p>Tiga variabel wajib di-set. Isi <code className="bg-muted px-1 py-0.5 rounded text-primary text-xs">mk_live_...</code> dengan API key Mution kamu:</p>
        <OsTabs
          linux={`export ANTHROPIC_BASE_URL="${base}"\nexport ANTHROPIC_AUTH_TOKEN="mk_live_YOUR_KEY_HERE"\nexport ANTHROPIC_API_KEY="mk_live_YOUR_KEY_HERE"`}
          powershell={`$env:ANTHROPIC_BASE_URL = "${base}"\n$env:ANTHROPIC_AUTH_TOKEN = "mk_live_YOUR_KEY_HERE"\n$env:ANTHROPIC_API_KEY = "mk_live_YOUR_KEY_HERE"`}
          cmd={`set ANTHROPIC_BASE_URL=${base}\nset ANTHROPIC_AUTH_TOKEN=mk_live_YOUR_KEY_HERE\nset ANTHROPIC_API_KEY=mk_live_YOUR_KEY_HERE`}
        />

        <p className="text-xs">
          Agar permanen (tidak perlu set ulang setiap buka terminal):
        </p>
        <OsTabs
          linux={`echo 'export ANTHROPIC_BASE_URL="${base}"' >> ~/.zshrc\necho 'export ANTHROPIC_AUTH_TOKEN="mk_live_YOUR_KEY_HERE"' >> ~/.zshrc\necho 'export ANTHROPIC_API_KEY="mk_live_YOUR_KEY_HERE"' >> ~/.zshrc\nsource ~/.zshrc\n\n# Untuk bash ganti ~/.zshrc dengan ~/.bashrc`}
          powershell={`# Simpan permanen untuk user ini (berlaku setelah restart PowerShell)\n[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "${base}", "User")\n[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "mk_live_YOUR_KEY_HERE", "User")\n[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "mk_live_YOUR_KEY_HERE", "User")\n\n# Tutup dan buka ulang PowerShell setelah ini`}
          cmd={`setx ANTHROPIC_BASE_URL "${base}"\nsetx ANTHROPIC_AUTH_TOKEN "mk_live_YOUR_KEY_HERE"\nsetx ANTHROPIC_API_KEY "mk_live_YOUR_KEY_HERE"\n\nREM Buka jendela CMD baru setelah menjalankan perintah di atas`}
        />

        <H3>3. Jalankan Claude Code</H3>
        <OsTabs
          linux="claude"
          powershell="claude"
          cmd="claude"
        />

        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-400 space-y-1">
          <p><strong>✅ Kalau berhasil:</strong> Claude Code langsung masuk tanpa prompt login dan terhubung ke <code className="text-green-300">{base}/v1/messages</code>.</p>
          <p>Kredit terpotong <strong>10 kredit per 1.000 token</strong> dari akun Mution kamu.</p>
        </div>

        <H3>Anthropic SDK (Python)</H3>
        <CodeBlock lang="bash" code="pip install anthropic" />
        <CodeBlock lang="python" code={`import anthropic

client = anthropic.Anthropic(
    api_key="mk_live_YOUR_KEY_HERE",
    base_url="${base}",
)

message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    system="Kamu adalah asisten yang helpful.",
    messages=[
        {"role": "user", "content": "Halo! Siapa kamu?"}
    ]
)

print(message.content[0].text)`} />

        <H3>Anthropic SDK (TypeScript)</H3>
        <CodeBlock lang="bash" code="npm install @anthropic-ai/sdk" />
        <CodeBlock lang="typescript" code={`import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: "mk_live_YOUR_KEY_HERE",
  baseURL: "${base}",
});

const message = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Halo!" }],
});

console.log(message.content[0].type === "text" ? message.content[0].text : "");`} />
      </Section>

      {/* cURL */}
      <Section id="curl" title="cURL" icon={Terminal}>
        <H3>OpenAI-compatible</H3>
        <CodeBlock lang="bash" code={`curl "${base}/v1/chat/completions" \\
  -H "Authorization: Bearer mk_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-opus-4-6",
    "messages": [{"role": "user", "content": "Halo!"}],
    "max_tokens": 256
  }'`} />

        <H3>Anthropic Messages API</H3>
        <CodeBlock lang="bash" code={`curl "${base}/v1/messages" \\
  -H "x-api-key: mk_live_YOUR_KEY_HERE" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-opus-4-6",
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Halo!"}]
  }'`} />
      </Section>

      {/* Pricing */}
      <Section id="pricing" title="Tarif Kredit" icon={Zap}>
        <p>Kredit dipotong berdasarkan jumlah token yang digunakan.</p>
        <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-foreground">Penggunaan</th>
                <th className="text-left px-4 py-2 font-medium text-foreground">Kredit terpotong</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1.000 token", "10 kredit (Rp 10)"],
                ["10.000 token", "100 kredit (Rp 100)"],
                ["100.000 token", "1.000 kredit (Rp 1.000)"],
              ].map(([usage, cost]) => (
                <tr key={usage} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 text-foreground">{usage}</td>
                  <td className="px-4 py-2 text-muted-foreground">{cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Pantau penggunaan dan sisa kredit di halaman <Link href="/api-keys" className="text-primary underline underline-offset-2">API Keys</Link> dan{" "}
          <Link href="/billing" className="text-primary underline underline-offset-2">Billing</Link>.
        </p>

        <div className="rounded-lg border border-border/50 bg-card p-4 mt-2">
          <p className="font-medium text-foreground mb-1 text-xs">Butuh bantuan?</p>
          <p className="text-xs">
            Email: <a href="mailto:supportmution@gmail.com" className="text-primary">supportmution@gmail.com</a>
            <span className="mx-2 text-border">·</span>
            WA: <a href="https://wa.me/6285709557572" className="text-primary" target="_blank" rel="noreferrer">+62 857-0955-7572</a>
          </p>
        </div>
      </Section>

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
        <ExternalLink className="h-3.5 w-3.5" />
        <span>API ini didukung oleh <a href="https://agentrouter.org" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">AgentRouter</a> — LLM gateway open-source.</span>
      </div>
    </div>
  );
}
