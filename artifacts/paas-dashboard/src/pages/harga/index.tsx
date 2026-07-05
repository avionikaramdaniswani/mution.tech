import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Component, Database, Server, Cpu, Zap, CreditCard, ChevronRight } from "lucide-react";
import { MODEL_CATALOG, groupModelsByProvider } from "@workspace/model-catalog";

const plans = [
  {
    key: "hobby",
    name: "Hobby",
    price: null,
    priceLabel: "Gratis",
    priceSub: "Selamanya",
    credits: 5000,
    creditsLabel: "5.000 kredit",
    creditsSub: "sekali saat daftar",
    highlight: false,
    cta: "Mulai Gratis",
    ctaHref: "/register",
    features: [
      "2 slot deploy proyek",
      "RAM 256 MB - 1 GB",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 26000,
    priceLabel: "Rp 26.000",
    priceSub: "per bulan",
    credits: 25000,
    creditsLabel: "25.000 kredit",
    creditsSub: "per siklus, rollover saat upgrade",
    highlight: true,
    cta: "Mulai Pro",
    ctaHref: "/register",
    features: [
      "Unlimited slot proyek",
      "RAM hingga 4 GB",
      "Priority support",
    ],
  },
  {
    key: "team",
    name: "Team",
    price: 75000,
    priceLabel: "Rp 75.000",
    priceSub: "per bulan",
    credits: 60000,
    creditsLabel: "60.000 kredit",
    creditsSub: "per siklus, rollover saat upgrade",
    highlight: false,
    cta: "Mulai Team",
    ctaHref: "/register",
    features: [
      "Unlimited slot proyek",
      "Multi user",
      "Shared proyek",
      "Priority support",
    ],
  }
];

function OpenAILogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

function AnthropicLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  );
}

function ZhipuLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16l-10.5 12H20" />
    </svg>
  );
}

function getProviderIcon(provider: string, baseClassName?: string) {
  const cls = baseClassName || "h-5 w-5";
  if (provider === "Anthropic") return <AnthropicLogo className={`${cls} text-amber-500`} />;
  if (provider === "OpenAI") return <OpenAILogo className={`${cls} text-emerald-500`} />;
  if (provider === "Zhipu AI") return <ZhipuLogo className={`${cls} text-blue-500`} />;
  return <Brain className={`${cls} text-muted-foreground`} />;
}

export default function HargaPage() {
  const grouped = groupModelsByProvider(MODEL_CATALOG);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 font-sans">
      <PublicNavbar />
      
      {/* -- BACKGROUND -- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
      </div>

      <section className="relative z-10 pt-32 pb-24 sm:pt-40 sm:pb-32 px-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h1 
              style={{ fontFamily: "'Space Grotesk', sans-serif" }} 
              className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
            >
              Bayar yang dipakai.<br />
              <span className="text-white/30">Bukan yang di-idle.</span>
            </h1>
            <p className="text-lg text-white/50 leading-relaxed">
              Sistem berbasis kredit transparan. Tidak ada tagihan membengkak, tidak ada kontrak. Anda memegang kendali penuh atas pengeluaran Anda.
            </p>
          </div>

          {/* Langganan Plans */}
          <div className="grid md:grid-cols-3 gap-6 mb-24">
            {plans.map((plan) => (
              <div 
                key={plan.key} 
                className={`relative rounded-3xl p-8 border ${plan.highlight ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'} flex flex-col`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full">
                    Paling Populer
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold tracking-tight">{plan.priceLabel}</span>
                  </div>
                  <p className="text-sm text-white/50">{plan.priceSub}</p>
                </div>
                
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 mb-8">
                  <p className="font-semibold text-primary mb-1">{plan.creditsLabel}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{plan.creditsSub}</p>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                      <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href={plan.ctaHref}>
                  <button className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
                    plan.highlight 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(249,115,22,0.3)]' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}>
                    {plan.cta}
                  </button>
                </Link>
              </div>
            ))}
          </div>

          {/* Pay As You Go Section with Tabs */}
          <div className="mb-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Tarif Pay-As-You-Go</h2>
              <p className="text-white/50 max-w-2xl mx-auto">
                Harga per-menit untuk server (Hosting) dan per-ribu token untuk model AI.
                Kredit Anda adalah saldo universal yang bisa digunakan untuk keduanya.
              </p>
            </div>

            <Tabs defaultValue="hosting" className="max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-10 h-auto p-1 bg-white/5 border border-white/10 rounded-2xl">
                <TabsTrigger value="hosting" className="py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Server className="w-4 h-4 mr-2" />
                  Hosting (Deploy)
                </TabsTrigger>
                <TabsTrigger value="apikeys" className="py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Brain className="w-4 h-4 mr-2" />
                  API Keys (AI)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hosting" className="focus:outline-none">
                <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 p-4 sm:p-6 text-sm font-semibold text-white/60">
                    <div>Spesifikasi RAM</div>
                    <div className="text-center">Biaya per Menit</div>
                    <div className="text-right">Estimasi 30 Hari (Aktif)</div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {[
                      { ram: "256 MB", min: "Rp 0,20", mo: "Rp 8.640" },
                      { ram: "512 MB", min: "Rp 0,40", mo: "Rp 17.280" },
                      { ram: "1 GB", min: "Rp 0,80", mo: "Rp 34.560" },
                      { ram: "2 GB", min: "Rp 1,60", mo: "Rp 69.120" },
                      { ram: "4 GB", min: "Rp 3,20", mo: "Rp 138.240" },
                      { ram: "8 GB", min: "Rp 6,40", mo: "Rp 276.480" },
                    ].map((row, i) => (
                      <div key={i} className="grid grid-cols-3 p-4 sm:p-6 hover:bg-white/[0.02] transition-colors items-center">
                        <div className="font-medium flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <Cpu className="w-4 h-4 text-primary" />
                          </div>
                          {row.ram}
                        </div>
                        <div className="text-center font-mono text-white/80">{row.min}</div>
                        <div className="text-right font-mono text-white/60">~ {row.mo}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="apikeys" className="focus:outline-none">
                <div className="space-y-12">
                  {Object.entries(grouped).map(([providerName, provModels]) => (
                    <div key={providerName} className="space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl shadow-sm">
                          {getProviderIcon(providerName)}
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-white">{providerName}</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {provModels.map((m) => (
                          <div
                            key={m.id}
                            className="relative flex flex-col p-5 rounded-2xl transition-all border border-white/10 bg-white/5 hover:border-white/20"
                          >
                            <div className="flex items-center justify-between mb-5">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                                  {getProviderIcon(m.provider)}
                                </div>
                                <span className="font-semibold text-[15px] tracking-tight">{m.label}</span>
                              </div>
                            </div>

                            <div className="space-y-2 mb-6">
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-white/60 w-12 font-medium">Input</span>
                                <div className="h-1.5 w-4 rounded-full bg-primary/40" />
                                <span className="font-semibold tabular-nums text-white">Rp {m.pricing.input} <span className="text-white/40 font-normal">/ 1K</span></span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-white/60 w-12 font-medium">Output</span>
                                <div className="h-1.5 w-6 rounded-full bg-primary" />
                                <span className="font-semibold tabular-nums text-white">Rp {m.pricing.output} <span className="text-white/40 font-normal">/ 1K</span></span>
                              </div>
                            </div>

                            <div className="mt-auto flex items-end justify-between pt-4 border-t border-white/10">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-white tracking-wide">{m.provider}</span>
                                  {m.note && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/10 text-white/70">
                                      {m.note}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-white/40 mt-0.5">Token-based</span>
                              </div>
                              <div className="flex gap-5">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-medium text-white/40 mb-0.5">Context</span>
                                  <span className="text-[11px] font-semibold tabular-nums">{m.context}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>



        </div>
      </section>
      <PageFooter />
    </div>
  );
}
