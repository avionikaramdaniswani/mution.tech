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
import { Tag } from "lucide-react";

// --- Data -----------------------------------------------------------------------

type Model = {
  id: string;
  label: string;
  provider: string;
  pricing: { input: number; output: number };
  context: string;
  note?: string | null;
  description: string;
  aliases?: string[];
  basePricing?: { input: number; output: number };
  pricingMode?: string;
};

async function fetchCatalog(): Promise<Model[]> {
  const res = await fetch("/api/catalog");
  if (!res.ok) throw new Error("gagal");
  return res.json();
}

function formatPricing(value: number) {
  return value.toLocaleString("id-ID");
}

function getProviderIcon(provider: string, baseClassName?: string) {
  const cls = baseClassName || "h-5 w-5";
  if (provider === "Anthropic") return <img src="/logo-anthropic.png" alt="Anthropic" className={cls} style={{ objectFit: "contain" }} />;
  if (provider === "OpenAI") return <img src="/logo-openai.png" alt="OpenAI" className={cls} style={{ objectFit: "contain" }} />;
  if (provider === "Zhipu AI") return <img src="/logo-zhipu.jpg" alt="Zhipu AI" className={cls} style={{ objectFit: "contain" }} />;
  if (provider === "MiniMax") return <img src="/logo-minimax.png" alt="MiniMax" className={cls} style={{ objectFit: "contain" }} />;
  if (provider === "Moonshot AI") return <img src="/logo-moonshot.png" alt="Moonshot AI" className={cls} style={{ objectFit: "contain" }} />;
  return <Brain className={`${cls} text-[#64748b]`} />;
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

  const { data: catalog = [], isLoading: catalogLoading } = useQuery<Model[]>({
    queryKey: ["catalog"],
    queryFn: fetchCatalog,
    staleTime: 30_000,
  });

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

  // group models by provider — gunakan catalog efektif dari API
  const grouped = catalog.reduce<Record<string, Model[]>>((groups, model) => {
    (groups[model.provider] ??= []).push(model);
    return groups;
  }, {});

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
        {!catalogLoading && catalog.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Belum ada model aktif yang dikonfigurasi oleh admin.</div>}
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
                    {(() => {
                      const item = m as any;
                      return (
                        <div className="space-y-2 mb-6">
                          {item.pricingMode === "free" ? (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                <Sparkles className="h-3 w-3" /> Gratis
                              </span>
                              {item.basePricing && (
                                <span className="text-muted-foreground/50 line-through tabular-nums text-[11px]">
                                  {formatPricing(item.basePricing.input)} / {formatPricing(item.basePricing.output)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground/80 w-12 font-medium">Input</span>
                                <div className="h-1.5 w-4 rounded-full bg-primary/40" />
                                <span className="font-semibold tabular-nums">
                                  {formatPricing(m.pricing.input)}{" "}
                                  <span className="text-muted-foreground/60 font-normal">/ 1M</span>
                                </span>
                                {item.pricingMode && item.pricingMode !== "default" && item.basePricing && item.basePricing.input !== m.pricing.input && (
                                  <span className="ml-1 text-muted-foreground/40 line-through text-[10px] tabular-nums">
                                    {formatPricing(item.basePricing.input)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground/80 w-12 font-medium">Output</span>
                                <div className="h-1.5 w-6 rounded-full bg-primary" />
                                <span className="font-semibold tabular-nums">
                                  {formatPricing(m.pricing.output)}{" "}
                                  <span className="text-muted-foreground/60 font-normal">/ 1M</span>
                                </span>
                                {item.pricingMode && item.pricingMode !== "default" && item.basePricing && item.basePricing.output !== m.pricing.output && (
                                  <span className="ml-1 text-muted-foreground/40 line-through text-[10px] tabular-nums">
                                    {formatPricing(item.basePricing.output)}
                                  </span>
                                )}
                              </div>
                              {item.pricingMode === "discount_percent" && (
                                <div className="flex items-center gap-1.5 text-[10px] text-orange-600">
                                  <Tag className="h-2.5 w-2.5" /> Harga sudah didiskon
                                </div>
                              )}
                              {item.pricingMode === "fixed_price" && (
                                <div className="flex items-center gap-1.5 text-[10px] text-sky-600">
                                  <Tag className="h-2.5 w-2.5" /> Harga custom
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })()}

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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Harga (Kredit / 1M Token)</label>
                    {detailsModel.pricingMode === "free" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <Sparkles className="h-3 w-3" /> Gratis
                      </span>
                    )}
                    {detailsModel.pricingMode === "discount_percent" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                        <Tag className="h-3 w-3" /> Diskon
                      </span>
                    )}
                    {detailsModel.pricingMode === "fixed_price" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                        <Tag className="h-3 w-3" /> Custom
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-border/50 rounded-xl p-4 bg-muted/10">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Input Tokens</p>
                      <p className="text-2xl font-bold tabular-nums">{formatPricing(detailsModel.pricing.input)}</p>
                      {detailsModel.basePricing && detailsModel.basePricing.input !== detailsModel.pricing.input && (
                        <p className="text-xs text-muted-foreground/50 line-through mt-0.5">{formatPricing(detailsModel.basePricing.input)}</p>
                      )}
                    </div>
                    <div className="border border-border/50 rounded-xl p-4 bg-muted/10">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Output Tokens</p>
                      <p className="text-2xl font-bold tabular-nums">{formatPricing(detailsModel.pricing.output)}</p>
                      {detailsModel.basePricing && detailsModel.basePricing.output !== detailsModel.pricing.output && (
                        <p className="text-xs text-muted-foreground/50 line-through mt-0.5">{formatPricing(detailsModel.basePricing.output)}</p>
                      )}
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
