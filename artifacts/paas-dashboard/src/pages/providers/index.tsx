import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Brain, Check, Copy, ChevronRight, Sparkles, Hexagon, Component, CheckCircle2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MODEL_CATALOG, groupModelsByProvider, type ModelCatalogEntry } from "@workspace/model-catalog";

// --- Data -----------------------------------------------------------------------

type Model = ModelCatalogEntry;

function formatPricing(value: number) {
  return value.toLocaleString("id-ID");
}

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
  return <Sparkles className={`${cls} text-violet-500`} />;
}

// --- Component ------------------------------------------------------------------

export interface UpstreamHealth {
  status: "Online" | "Degraded" | "Offline";
  latencyMs: number;
  lastChecked: number;
}

export default function ProvidersPage() {
  const { toast } = useToast();
  const [detailsModel, setDetailsModel] = useState<Model | null>(null);

  const { data: health } = useQuery<UpstreamHealth>({
    queryKey: ["provider-health"],
    queryFn: async () => {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const getStatusColor = (status?: string) => {
    if (status === "Online") return "bg-emerald-500";
    if (status === "Degraded") return "bg-yellow-500";
    if (status === "Offline") return "bg-red-500";
    return "bg-muted-foreground/30";
  };

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast({ title: "ID Model disalin", description: id });
  }

  // group models by provider
  const grouped = groupModelsByProvider(MODEL_CATALOG);

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Provider</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Daftar model AI yang didukung oleh sistem proxy. Kamu dapat mengatur izin akses model pada pengaturan masing-masing API Key di halaman API Keys.
        </p>
      </div>

      {/* Grouped Models */}
      <div className="space-y-12">
        {Object.entries(grouped).map(([provider, providerModels]) => (
          <div key={provider} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-background border border-border/40 p-2.5 rounded-xl shadow-sm">
                {getProviderIcon(provider, "h-5 w-5 drop-shadow-sm")}
              </div>
              <h2 className="text-xl font-bold tracking-tight">{provider}</h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {providerModels.map((m) => {
                return (
                  <div
                    key={m.id}
                    className="relative flex flex-col p-5 rounded-2xl transition-all group border border-border/40 bg-background hover:border-border/80"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center bg-muted/30 border border-border/40">
                          {getProviderIcon(m.provider, "h-4 w-4 drop-shadow-sm")}
                        </div>
                        <span className="font-semibold text-[15px] tracking-tight">{m.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailsModel(m); }}
                          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/40 transition-colors"
                        >
                          Details <ChevronRight className="h-3 w-3 opacity-70" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyId(m.id); }}
                          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/40 transition-colors"
                          title="Copy Model ID"
                        >
                          <Copy className="h-3.5 w-3.5 opacity-70" />
                        </button>
                      </div>
                    </div>

                    {/* Pricing details */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground/80 w-12 font-medium">Input</span>
                        <div className="h-1.5 w-4 rounded-full bg-primary/40" />
                        <span className="font-semibold tabular-nums">{formatPricing(m.pricing.input)} <span className="text-muted-foreground/60 font-normal">/ 1M</span></span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground/80 w-12 font-medium">Output</span>
                        <div className="h-1.5 w-6 rounded-full bg-primary" />
                        <span className="font-semibold tabular-nums">{formatPricing(m.pricing.output)} <span className="text-muted-foreground/60 font-normal">/ 1M</span></span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="text-[12px] leading-relaxed text-muted-foreground/80 mb-6 line-clamp-2">
                      {m.description || "No description available."}
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-auto flex items-end justify-between pt-4 border-t border-border/40">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-foreground tracking-wide">{m.provider}</span>
                          {m.note && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-foreground/10 text-foreground/70">
                              {m.note}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">Token-based</span>
                      </div>
                      <div className="flex gap-5">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-medium text-muted-foreground/60 mb-0.5">Context</span>
                          <span className="text-[11px] font-semibold tabular-nums">{m.context}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-medium text-muted-foreground/60 mb-1">Status</span>
                          <div className="flex items-center gap-1.5 h-3 mt-1">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.status)}`} />
                            <span className="text-[11px] font-semibold tabular-nums leading-none">
                              {health ? `${health.latencyMs}ms` : "--"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Side Panel (Sheet) for Details */}
      <Sheet open={!!detailsModel} onOpenChange={(o) => !o && setDetailsModel(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          {detailsModel && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted/30 border border-border/40">
                    {getProviderIcon(detailsModel.provider, "h-5 w-5 drop-shadow-sm")}
                  </div>
                  <SheetTitle className="text-xl">{detailsModel.label}</SheetTitle>
                </div>
                <SheetDescription>
                  Detail informasi model {detailsModel.label} dari {detailsModel.provider}.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                {/* ID section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Model ID</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted/50 border border-border/50 px-3 py-2 rounded-lg text-sm font-mono">
                      {detailsModel.id}
                    </code>
                    <button
                      onClick={() => copyId(detailsModel.id)}
                      className="p-2 rounded-lg border border-border/50 bg-background hover:bg-muted transition-colors"
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* About section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deskripsi</label>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {detailsModel.description || "Tidak ada deskripsi tersedia untuk model ini."}
                  </p>
                </div>

                {/* Pricing section */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Harga (Kredit / 1M Token)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-border/50 rounded-xl p-4 bg-muted/10">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Input Tokens</p>
                      <p className="text-2xl font-bold tabular-nums">{formatPricing(detailsModel.pricing.input)}</p>
                    </div>
                    <div className="border border-border/50 rounded-xl p-4 bg-muted/10">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Output Tokens</p>
                      <p className="text-2xl font-bold tabular-nums">{formatPricing(detailsModel.pricing.output)}</p>
                    </div>
                  </div>
                </div>

                {/* Specs section */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spesifikasi</label>
                  <div className="border border-border/50 rounded-xl divide-y divide-border/50 bg-muted/10">
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-sm text-muted-foreground">Provider</span>
                      <span className="text-sm font-medium">{detailsModel.provider}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-sm text-muted-foreground">Context Window</span>
                      <span className="text-sm font-medium">{detailsModel.context}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <span className="text-sm text-muted-foreground">Status API</span>
                      <div className="flex items-center gap-2">
                        <span className={`flex h-2 w-2 rounded-full ${getStatusColor(health?.status)}`}></span>
                        <span className="text-sm font-medium">
                          {health?.status || "Checking..."} <span className="text-muted-foreground/60">({health ? `${health.latencyMs}ms` : "--"})</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
