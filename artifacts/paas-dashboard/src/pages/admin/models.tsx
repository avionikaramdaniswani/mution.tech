import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag, Search, Pencil, RotateCcw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { csrfFetch } from "@/lib/csrf";

type PricingMode = "default" | "discount_percent" | "fixed_price" | "free";

interface ModelOverride {
  mode: PricingMode;
  discountPercent: number | null;
  inputPriceOverride: string | null;
  outputPriceOverride: string | null;
  updatedAt: string;
}

interface ModelPricingEntry {
  modelId: string;
  label: string;
  provider: string;
  basePricingInput: number;
  basePricingOutput: number;
  context: string;
  override: ModelOverride | null;
}

async function fetchModelPricing(): Promise<ModelPricingEntry[]> {
  const res = await fetch("/api/admin/model-pricing", { credentials: "include" });
  if (!res.ok) throw new Error("Gagal mengambil data harga model");
  return res.json();
}

async function updateModelPricing(
  modelId: string,
  payload: {
    mode: PricingMode;
    discountPercent?: number | null;
    inputPriceOverride?: string | null;
    outputPriceOverride?: string | null;
  },
) {
  const res = await csrfFetch(`/api/admin/model-pricing/${encodeURIComponent(modelId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Gagal mengubah harga model");
}

async function resetModelPricing(modelId: string) {
  const res = await csrfFetch(`/api/admin/model-pricing/${encodeURIComponent(modelId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Gagal mereset harga model");
}

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "border-amber-200 bg-amber-50 text-amber-700",
  OpenAI: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Zhipu AI": "border-blue-200 bg-blue-50 text-blue-700",
  MiniMax: "border-violet-200 bg-violet-50 text-violet-700",
  "Moonshot AI": "border-indigo-200 bg-indigo-50 text-indigo-700",
};

function ProviderBadge({ provider }: { provider: string }) {
  const cls = PROVIDER_COLORS[provider] ?? "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {provider}
    </span>
  );
}

function ModeBadge({ mode }: { mode: PricingMode | null }) {
  if (!mode || mode === "default")
    return <Badge variant="outline" className="text-xs text-muted-foreground">Default</Badge>;
  if (mode === "free")
    return <Badge className="gap-1 bg-emerald-500 text-xs text-white hover:bg-emerald-600"><Sparkles className="h-3 w-3" /> Gratis</Badge>;
  if (mode === "discount_percent")
    return <Badge variant="outline" className="gap-1 border-orange-300 bg-orange-50 text-xs text-orange-700"><Tag className="h-3 w-3" /> Diskon</Badge>;
  if (mode === "fixed_price")
    return <Badge variant="outline" className="border-sky-300 bg-sky-50 text-xs text-sky-700">Harga Custom</Badge>;
  return null;
}

function formatCredits(n: number) {
  return n.toLocaleString("id-ID");
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  entry: ModelPricingEntry;
  open: boolean;
  onClose: () => void;
}

function EditDialog({ entry, open, onClose }: EditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initial = entry.override;
  const [mode, setMode] = useState<PricingMode>(initial?.mode ?? "default");
  const [discountPercent, setDiscountPercent] = useState<string>(
    initial?.discountPercent?.toString() ?? "",
  );
  const [inputPrice, setInputPrice] = useState<string>(
    initial?.inputPriceOverride ?? entry.basePricingInput.toString(),
  );
  const [outputPrice, setOutputPrice] = useState<string>(
    initial?.outputPriceOverride ?? entry.basePricingOutput.toString(),
  );

  const mutation = useMutation({
    mutationFn: () =>
      updateModelPricing(entry.modelId, {
        mode,
        discountPercent: mode === "discount_percent" ? Number(discountPercent) : null,
        inputPriceOverride: mode === "fixed_price" ? inputPrice : null,
        outputPriceOverride: mode === "fixed_price" ? outputPrice : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "model-pricing"] });
      toast({ title: `Harga "${entry.label}" berhasil disimpan` });
      onClose();
    },
    onError: () => toast({ title: "Gagal menyimpan harga", variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetModelPricing(entry.modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "model-pricing"] });
      toast({ title: `Harga "${entry.label}" dikembalikan ke default` });
      onClose();
    },
    onError: () => toast({ title: "Gagal mereset harga", variant: "destructive" }),
  });

  const isPending = mutation.isPending || resetMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Edit Harga — <span className="font-mono text-sm text-[#526173]">{entry.label}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Harga default: <strong>{formatCredits(entry.basePricingInput)}</strong> kredit/1M input ·{" "}
            <strong>{formatCredits(entry.basePricingOutput)}</strong> kredit/1M output
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-[#526173]">Mode Harga</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as PricingMode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default — gunakan harga katalog</SelectItem>
                <SelectItem value="free">Gratis — 0 kredit (tetap dicatat)</SelectItem>
                <SelectItem value="discount_percent">Diskon % — kurangi % dari harga default</SelectItem>
                <SelectItem value="fixed_price">Harga Custom — isi sendiri per 1M token</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "discount_percent" && (
            <div className="space-y-1.5">
              <Label htmlFor="discount" className="text-xs font-semibold uppercase tracking-wide text-[#526173]">
                Diskon (%)
              </Label>
              <Input
                id="discount"
                type="number"
                min={1}
                max={100}
                placeholder="cth: 50"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
              {discountPercent && (
                <p className="text-xs text-muted-foreground">
                  Harga efektif:{" "}
                  <strong>{formatCredits(Math.ceil(entry.basePricingInput * (1 - Number(discountPercent) / 100)))}</strong>
                  {" "}input ·{" "}
                  <strong>{formatCredits(Math.ceil(entry.basePricingOutput * (1 - Number(discountPercent) / 100)))}</strong>
                  {" "}output kredit/1M token
                </p>
              )}
            </div>
          )}

          {mode === "fixed_price" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="inputPrice" className="text-xs font-semibold uppercase tracking-wide text-[#526173]">
                  Harga Input (kredit / 1 juta token)
                </Label>
                <Input
                  id="inputPrice"
                  type="number"
                  min={0}
                  placeholder={entry.basePricingInput.toString()}
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="outputPrice" className="text-xs font-semibold uppercase tracking-wide text-[#526173]">
                  Harga Output (kredit / 1 juta token)
                </Label>
                <Input
                  id="outputPrice"
                  type="number"
                  min={0}
                  placeholder={entry.basePricingOutput.toString()}
                  value={outputPrice}
                  onChange={(e) => setOutputPrice(e.target.value)}
                />
              </div>
            </div>
          )}

          {mode === "free" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              User tidak dikenakan kredit saat menggunakan model ini. Penggunaan tetap dicatat di log usage untuk transparansi.
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center gap-2 pt-2">
          {entry.override && entry.override.mode !== "default" && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto text-xs text-muted-foreground"
              disabled={isPending}
              onClick={() => resetMutation.mutate()}
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Reset ke default
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={isPending}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminModels() {
  const [search, setSearch] = useState("");
  const [editEntry, setEditEntry] = useState<ModelPricingEntry | null>(null);

  const { data: models, isLoading } = useQuery({
    queryKey: ["admin", "model-pricing"],
    queryFn: fetchModelPricing,
    refetchInterval: 30_000,
  });

  const filtered = models?.filter(
    (m) =>
      !search ||
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase()) ||
      m.modelId.toLowerCase().includes(search.toLowerCase()),
  );

  const hasOverride = (m: ModelPricingEntry) => m.override && m.override.mode !== "default";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold tracking-normal text-[#172033]">
          <Tag className="h-6 w-6 text-primary" />
          Model Pricing
        </h1>
        <p className="mt-1 text-sm text-[#526173]">
          Atur harga per model: gratis, diskon %, atau harga custom per token. Berlaku real-time untuk semua user.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari model atau provider…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#c9d8e7] bg-white/80 p-12 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {search ? "Tidak ada model yang cocok." : "Tidak ada model di katalog."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#dbe8f3] bg-white shadow-[0_12px_34px_rgba(23,32,51,0.04)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#dbe8f3] bg-[#f8fbff]">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#526173]/70">Model</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#526173]/70 sm:table-cell">Provider</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-[#526173]/70 md:table-cell">Input / 1M</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-[#526173]/70 md:table-cell">Output / 1M</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-[#526173]/70">Mode</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-[#526173]/70">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f5fa]">
              {filtered.map((m) => (
                <tr
                  key={m.modelId}
                  className={`transition-colors hover:bg-[#f8fbff] ${hasOverride(m) ? "bg-orange-50/40" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-[#172033]">{m.label}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-[#526173]/60">{m.modelId}</div>
                  </td>
                  <td className="hidden px-4 py-3.5 sm:table-cell">
                    <ProviderBadge provider={m.provider} />
                  </td>
                  <td className="hidden px-4 py-3.5 text-right md:table-cell">
                    <span className="font-mono text-xs text-[#526173]">
                      {formatCredits(m.override?.mode === "discount_percent" && m.override.discountPercent != null
                        ? Math.ceil(m.basePricingInput * (1 - m.override.discountPercent / 100))
                        : m.override?.mode === "fixed_price" && m.override.inputPriceOverride != null
                        ? parseFloat(m.override.inputPriceOverride)
                        : m.override?.mode === "free"
                        ? 0
                        : m.basePricingInput)}
                    </span>
                    {hasOverride(m) && m.override?.mode !== "free" && (
                      <div className="font-mono text-[10px] text-muted-foreground/60 line-through">
                        {formatCredits(m.basePricingInput)}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3.5 text-right md:table-cell">
                    <span className="font-mono text-xs text-[#526173]">
                      {formatCredits(m.override?.mode === "discount_percent" && m.override.discountPercent != null
                        ? Math.ceil(m.basePricingOutput * (1 - m.override.discountPercent / 100))
                        : m.override?.mode === "fixed_price" && m.override.outputPriceOverride != null
                        ? parseFloat(m.override.outputPriceOverride)
                        : m.override?.mode === "free"
                        ? 0
                        : m.basePricingOutput)}
                    </span>
                    {hasOverride(m) && m.override?.mode !== "free" && (
                      <div className="font-mono text-[10px] text-muted-foreground/60 line-through">
                        {formatCredits(m.basePricingOutput)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <ModeBadge mode={m.override?.mode ?? "default"} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() => setEditEntry(m)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info note */}
      <div
        className="rounded-lg px-4 py-3 text-xs text-[#526173]"
        style={{ border: "1px solid rgba(234,179,8,0.15)", background: "rgba(234,179,8,0.04)" }}
      >
        <span className="font-semibold text-amber-700">Catatan:</span> Override harga berlaku real-time (cache 10 detik).
        Mode &quot;Gratis&quot; mengurangi kredit menjadi 0 tapi tetap dicatat di usage log untuk transparansi.
        Diskon dan harga custom langsung memotong saldo user saat request selesai.
      </div>

      {editEntry && (
        <EditDialog
          entry={editEntry}
          open={!!editEntry}
          onClose={() => setEditEntry(null)}
        />
      )}
    </div>
  );
}
