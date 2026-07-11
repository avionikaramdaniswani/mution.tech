import { useState } from "react";
import { Copy, Check, Key, Code, Terminal, BookOpen, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { DEFAULT_MODEL_ID, MODEL_CATALOG } from "@workspace/model-catalog";

type OsTab = "linux" | "powershell" | "cmd";
type ActiveTab = "quickstart" | "openai" | "openai-node" | "claude-code" | "curl";

function OsTabs({ linux, powershell, cmd }: { linux: string; powershell: string; cmd: string }) {
  const [active, setActive] = useState<OsTab>("linux");
  const tabs: { key: OsTab; label: string }[] = [
    { key: "linux", label: "Linux / macOS" },
    { key: "powershell", label: "PowerShell" },
    { key: "cmd", label: "CMD" },
  ];
  const code = active === "linux" ? linux : active === "powershell" ? powershell : cmd;
  return (
    <div className="rounded-lg my-4 overflow-hidden" style={{ background: "#0f1117", border: "1px solid #2a2d3a" }}>
      <div className="flex" style={{ borderBottom: "1px solid #2a2d3a", background: "#161922" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className="px-3 py-2 text-xs font-medium transition-colors"
            style={{
              borderRight: "1px solid #2a2d3a",
              color: active === t.key ? "#f1f5f9" : "#64748b",
              background: active === t.key ? "#0f1117" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <CopyBtn text={code} />
        <pre className="overflow-x-auto px-4 py-4 text-xs font-mono leading-relaxed" style={{ color: "#e2e8f0" }}>{code}</pre>
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded border border-border bg-background hover:bg-muted transition-colors"
      aria-label="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-lg my-4 overflow-hidden" style={{ background: "#0f1117", border: "1px solid #2a2d3a" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid #2a2d3a", background: "#161922" }}>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#64748b" }}>{lang}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-xs font-mono leading-relaxed" style={{ color: "#e2e8f0" }}>{code}</pre>
    </div>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground mt-6 mb-3">{children}</h3>;
}

function TableOfContents({ activeTab, onTabChange }: { activeTab: ActiveTab; onTabChange: (tab: ActiveTab) => void }) {
  const sections: { id: ActiveTab; label: string; icon: any }[] = [
    { id: "quickstart", label: "Quick Start", icon: Zap },
    { id: "openai", label: "Python", icon: Code },
    { id: "openai-node", label: "Node.js", icon: Code },
    { id: "claude-code", label: "Claude Code", icon: Terminal },
    { id: "curl", label: "cURL", icon: Terminal },
  ];

  return (
    <nav className="sticky top-20">
      <div className="space-y-0.5">
        <div className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Menu
        </div>
        {sections.map((section) => {
          const isActive = activeTab === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onTabChange(section.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <section.icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function DocsPage() {
  const { user } = useAuth();
  const base = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "https://mution.tech";
  const [activeTab, setActiveTab] = useState<ActiveTab>("quickstart");
  const defaultModel = DEFAULT_MODEL_ID;

  return (
    <div className="flex gap-6 max-w-6xl mx-auto">
      {/* Main Content */}
      <main className="flex-1 min-w-0 pb-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Dokumentasi API</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Mution AI API</h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            API yang kompatibel dengan OpenAI SDK dan Claude Code. Satu key, semua model.
          </p>
          {(!user?.credits || user.credits <= 0) && (
            <div className="mt-5 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Kredit kamu habis. <Link href="/billing" className="text-foreground underline underline-offset-2">Top up di sini {"->"}</Link>
              </p>
            </div>
          )}
        </div>

        {/* Content Sections */}
        <div className="prose prose-sm max-w-none">
          {activeTab === "quickstart" && (
            <div>
              <h2 className="text-2xl font-bold mb-5 text-foreground">Quick Start</h2>
              <p className="text-foreground/70 mb-5">Dua langkah untuk mulai menggunakan Mution AI API:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <Link href="/api-keys">
                  <div className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2 font-semibold mb-1 text-foreground">
                      <Key className="h-4 w-4" />
                      <span>1. Generate API Key</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Buat key di halaman API Keys</p>
                  </div>
                </Link>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 font-semibold mb-1 text-foreground">
                    <Code className="h-4 w-4" />
                    <span>2. Gunakan di kode</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Ikuti contoh di bagian SDK</p>
                </div>
              </div>

              <H3>Base URL & Endpoint</H3>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground">Endpoint</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground">Kompatibel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [`${base}/v1/chat/completions`, "OpenAI SDK, LangChain, LlamaIndex, dll"],
                      [`${base}/v1/messages`, "Anthropic SDK, Claude Code"],
                      [`${base}/v1/models`, "List model tersedia"],
                      [`${base}/v1/embeddings`, "Embedding API"],
                    ].map(([ep, compat]) => (
                      <tr key={ep} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground/90">{ep}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{compat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <H3>Model Tersedia</H3>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground">Model ID</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground">Provider</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODEL_CATALOG.map((model) => (
                      <tr key={model.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground/90">{model.id}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{model.provider}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{model.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "openai" && (
            <div>
              <h2 className="text-2xl font-bold mb-5 text-foreground">OpenAI SDK (Python)</h2>
              <CodeBlock lang="bash" code="pip install openai" />

              <H3>Chat Completion</H3>
              <CodeBlock lang="python" code={`from openai import OpenAI

client = OpenAI(
    api_key="mk_live_YOUR_KEY_HERE",
    base_url="${base}/v1"
)

response = client.chat.completions.create(
    model="${defaultModel}",
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
    model="${defaultModel}",
    messages=[{"role": "user", "content": "Ceritakan tentang Python"}],
    max_tokens=512,
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)`} />
            </div>
          )}

          {activeTab === "openai-node" && (
            <div>
              <h2 className="text-2xl font-bold mb-5 text-foreground">OpenAI SDK (Node.js / TypeScript)</h2>
              <CodeBlock lang="bash" code="npm install openai" />
              <CodeBlock lang="typescript" code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "mk_live_YOUR_KEY_HERE",
  baseURL: "${base}/v1",
});

const response = await client.chat.completions.create({
  model: "${defaultModel}",
  messages: [
    { role: "system", content: "Kamu adalah asisten yang helpful." },
    { role: "user", content: "Apa itu TypeScript?" },
  ],
});

console.log(response.choices[0].message.content);`} />
            </div>
          )}

          {activeTab === "claude-code" && (
            <div>
              <h2 className="text-2xl font-bold mb-5 text-foreground">Claude Code</h2>
              <p className="text-foreground/70 mb-5">
                Claude Code adalah CLI dari Anthropic untuk coding dengan AI. Mution mendukung format Anthropic Messages API
                secara penuh, termasuk streaming - sehingga Claude Code bisa langsung dipakai dengan API key Mution.
              </p>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm mb-5">
                <p className="font-medium text-foreground mb-2">Catatan Penting</p>
                <p className="text-foreground/70 text-xs leading-relaxed">
                  Claude Code v2+ akan menampilkan prompt login saat pertama dijalankan. Environment variables harus di-set sebelum menjalankan <code className="bg-background px-1 py-0.5 rounded border border-border text-foreground/90">claude</code> agar login prompt tidak muncul. Kalau sudah terlanjur muncul, tekan <kbd className="bg-background px-1.5 py-0.5 rounded border border-border font-mono text-[10px]">Esc</kbd> lalu set env var dulu, baru jalankan ulang.
                </p>
              </div>

              <H3>1. Install Claude Code</H3>
              <CodeBlock lang="bash" code="npm install -g @anthropic-ai/claude-code" />

              <H3>2. Set environment variables</H3>
              <p className="text-foreground/70 text-sm mb-3">Isi dengan API key Mution kamu:</p>
              <OsTabs
                linux={`export ANTHROPIC_BASE_URL="${base}"
export ANTHROPIC_AUTH_TOKEN="mk_live_YOUR_KEY_HERE"
export ANTHROPIC_API_KEY="mk_live_YOUR_KEY_HERE"`}
                powershell={`$env:ANTHROPIC_BASE_URL = "${base}"
$env:ANTHROPIC_AUTH_TOKEN = "mk_live_YOUR_KEY_HERE"
$env:ANTHROPIC_API_KEY = "mk_live_YOUR_KEY_HERE"`}
                cmd={`set ANTHROPIC_BASE_URL=${base}
set ANTHROPIC_AUTH_TOKEN=mk_live_YOUR_KEY_HERE
set ANTHROPIC_API_KEY=mk_live_YOUR_KEY_HERE`}
              />

              <p className="text-xs mt-4 text-foreground/70 mb-3">
                Untuk menyimpan permanen:
              </p>
              <OsTabs
                linux={`echo 'export ANTHROPIC_BASE_URL="${base}"' >> ~/.zshrc
echo 'export ANTHROPIC_AUTH_TOKEN="mk_live_YOUR_KEY_HERE"' >> ~/.zshrc
echo 'export ANTHROPIC_API_KEY="mk_live_YOUR_KEY_HERE"' >> ~/.zshrc
source ~/.zshrc

# Untuk bash ganti ~/.zshrc dengan ~/.bashrc`}
                powershell={`[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "${base}", "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "mk_live_YOUR_KEY_HERE", "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "mk_live_YOUR_KEY_HERE", "User")

# Restart PowerShell setelah ini`}
                cmd={`setx ANTHROPIC_BASE_URL "${base}"
setx ANTHROPIC_AUTH_TOKEN "mk_live_YOUR_KEY_HERE"
setx ANTHROPIC_API_KEY "mk_live_YOUR_KEY_HERE"

REM Buka CMD baru setelah ini`}
              />

              <H3>3. Jalankan Claude Code</H3>
              <OsTabs
                linux="claude"
                powershell="claude"
                cmd="claude"
              />

              <H3>Anthropic SDK (Python)</H3>
              <CodeBlock lang="bash" code="pip install anthropic" />
              <CodeBlock lang="python" code={`import anthropic

client = anthropic.Anthropic(
    api_key="mk_live_YOUR_KEY_HERE",
    base_url="${base}",
)

message = client.messages.create(
    model="${defaultModel}",
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
  model: "${defaultModel}",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Halo!" }],
});

console.log(message.content[0].type === "text" ? message.content[0].text : "");`} />
            </div>
          )}

          {activeTab === "curl" && (
            <div>
              <h2 className="text-2xl font-bold mb-5 text-foreground">cURL</h2>
              <H3>OpenAI-compatible</H3>
              <CodeBlock lang="bash" code={`curl "${base}/v1/chat/completions" \\
  -H "Authorization: Bearer mk_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${defaultModel}",
    "messages": [{"role": "user", "content": "Halo!"}],
    "max_tokens": 256
  }'`} />

              <H3>Anthropic Messages API</H3>
              <CodeBlock lang="bash" code={`curl "${base}/v1/messages" \\
  -H "x-api-key: mk_live_YOUR_KEY_HERE" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${defaultModel}",
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Halo!"}]
  }'`} />
            </div>
          )}


        </div>
      </main>

      {/* Sidebar TOC - Right Side */}
      <aside className="hidden lg:block w-44 flex-shrink-0">
        <TableOfContents activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>
    </div>
  );
}
