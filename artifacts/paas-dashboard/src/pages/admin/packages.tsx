import { useState, useEffect } from "react";
import { csrfFetch } from "@/lib/csrf";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, GripVertical, Package, Sparkles, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CreditPackage {
  id: number;
  name: string;
  description: string | null;
  priceIdr: number;
  creditsAmount: number;
  bonusLabel: string | null;
  originalPriceIdr: number | null;
  isHighlight: boolean;
  stock: number | null;
  isActive: boolean;
  sortOrder: number;
}

interface TokenPackage {
  id: number;
  name: string;
  category: "claude" | "gpt";
  description: string | null;
  tokensAmount: number;
  priceIdr: number;
  originalPriceIdr: number | null;
  durationDays: number;
  bonusLabel: string | null;
  isHighlight: boolean;
  isActive: boolean;
  sortOrder: number;
}

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function bonusPct(priceIdr: number, creditsAmount: number) {
  if (creditsAmount <= priceIdr) return null;
  return Math.round(((creditsAmount - priceIdr) / priceIdr) * 100);
}

const EMPTY_CREDIT: Omit<CreditPackage, "id" | "isActive"> = {
  name: "",
  description: "",
  priceIdr: 25000,
  creditsAmount: 25000,
  bonusLabel: "",
  originalPriceIdr: null,
  isHighlight: false,
  stock: null,
  sortOrder: 0,
};

const EMPTY_TOKEN: Omit<TokenPackage, "id" | "isActive"> = {
  name: "",
  category: "claude",
  description: "",
  tokensAmount: 3000000,
  priceIdr: 75000,
  originalPriceIdr: null,
  durationDays: 30,
  bonusLabel: "",
  isHighlight: false,
  sortOrder: 0,
};

function PackageFormDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Partial<CreditPackage> | null;
  onClose: () => void;
  onSave: (data: Partial<CreditPackage>) => Promise<void>;
}) {
  const isEdit = initial?.id != null;
  const [form, setForm] = useState({ ...EMPTY_CREDIT, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setForm({ ...EMPTY_CREDIT, ...initial }); setError(null); }
  }, [open, initial]);

  function set(key: keyof typeof form, value: string | number | boolean | null) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const autoBonus = bonusPct(form.priceIdr, form.creditsAmount);

  async function handleSave() {
    if (!form.name.trim()) { setError("Nama paket wajib diisi"); return; }
    if (form.priceIdr < 1000) { setError("Harga minimal Rp 1.000"); return; }
    if (form.creditsAmount < 1) { setError("Kredit minimal 1"); return; }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description?.trim() || null,
        priceIdr: form.priceIdr,
        creditsAmount: form.creditsAmount,
        bonusLabel: form.bonusLabel?.trim() || null,
        originalPriceIdr: form.originalPriceIdr || null,
        isHighlight: !!form.isHighlight,
        stock: form.stock || null,
        sortOrder: form.sortOrder,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-[#dbe8f3] bg-white px-3 py-2 text-sm text-[#172033] outline-none focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/10 transition-colors";
  const labelCls = "block text-xs font-semibold text-[#526173] mb-1";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Paket Kredit" : "Tambah Paket Kredit"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto px-1">
          <div>
            <label className={labelCls}>Nama Paket *</label>
            <input className={inputCls} placeholder="Starter" value={form.name}
              onChange={e => set("name", e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Deskripsi</label>
            <input className={inputCls} placeholder="Cocok untuk mulai coba..." value={form.description ?? ""}
              onChange={e => set("description", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Harga (IDR) *</label>
              <input type="number" className={inputCls} min={1000} step={1000} value={form.priceIdr}
                onChange={e => set("priceIdr", Number.parseInt(e.target.value, 10) || 0)} />
            </div>
            <div>
              <label className={labelCls}>Harga Asli Coret (opsional)</label>
              <input type="number" className={inputCls} min={1000} step={1000}
                placeholder="misal 50000"
                value={form.originalPriceIdr ?? ""}
                onChange={e => set("originalPriceIdr", e.target.value ? Number.parseInt(e.target.value, 10) : null)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Kredit yang Didapat *</label>
            <input type="number" className={inputCls} min={1} step={1000} value={form.creditsAmount}
              onChange={e => set("creditsAmount", Number.parseInt(e.target.value, 10) || 0)} />
            {autoBonus && (
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                Hitungan bonus otomatis: +{autoBonus}%
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>Label Bonus Custom (opsional)</label>
            <input className={inputCls} placeholder={autoBonus ? `+${autoBonus}% bonus` : "+10% bonus"}
              value={form.bonusLabel ?? ""}
              onChange={e => set("bonusLabel", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Stok (opsional)</label>
              <input type="number" className={inputCls} min={0}
                placeholder="Kosong = tanpa batas"
                value={form.stock ?? ""}
                onChange={e => set("stock", e.target.value ? Number.parseInt(e.target.value, 10) : null)} />
            </div>
            <div>
              <label className={labelCls}>Urutan Tampil</label>
              <input type="number" className={inputCls} value={form.sortOrder}
                onChange={e => set("sortOrder", Number.parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="highlight" checked={form.isHighlight}
              onChange={e => set("isHighlight", e.target.checked)}
              className="h-4 w-4 rounded border-[#dbe8f3] text-[#f97316] focus:ring-[#f97316]" />
            <label htmlFor="highlight" className="text-sm text-[#172033] font-medium cursor-pointer">
              Highlight Flash Sale (border merah & badge animasi)
            </label>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#f97316] text-white hover:bg-[#ea580c]">
            {saving ? "Menyimpan..." : isEdit ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TokenPackageFormDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Partial<TokenPackage> | null;
  onClose: () => void;
  onSave: (data: Partial<TokenPackage>) => Promise<void>;
}) {
  const isEdit = initial?.id != null;
  const [form, setForm] = useState({ ...EMPTY_TOKEN, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setForm({ ...EMPTY_TOKEN, ...initial }); setError(null); }
  }, [open, initial]);

  function set(key: keyof typeof form, value: string | number | boolean | null) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Nama paket wajib diisi"); return; }
    if (form.priceIdr < 1000) { setError("Harga minimal Rp 1.000"); return; }
    if (form.tokensAmount < 1000) { setError("Jumlah token minimal 1.000"); return; }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        category: form.category,
        description: form.description?.trim() || null,
        tokensAmount: form.tokensAmount,
        priceIdr: form.priceIdr,
        originalPriceIdr: form.originalPriceIdr || null,
        durationDays: form.durationDays || 30,
        bonusLabel: form.bonusLabel?.trim() || null,
        isHighlight: !!form.isHighlight,
        sortOrder: form.sortOrder,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-[#dbe8f3] bg-white px-3 py-2 text-sm text-[#172033] outline-none focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/10 transition-colors";
  const labelCls = "block text-xs font-semibold text-[#526173] mb-1";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Paket Token" : "Tambah Paket Token (Claude / GPT)"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto px-1">
          <div>
            <label className={labelCls}>Nama Paket *</label>
            <input className={inputCls} placeholder="Claude Starter Pass" value={form.name}
              onChange={e => set("name", e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Kategori Model *</label>
            <select
              className={inputCls}
              value={form.category}
              onChange={e => set("category", e.target.value as "claude" | "gpt")}
            >
              <option value="claude">Claude (Anthropic Claude Series)</option>
              <option value="gpt">GPT (OpenAI GPT & o1/o3 Series)</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Deskripsi Singkat</label>
            <input className={inputCls} placeholder="Akses hemat untuk Claude 3.5 & 3.7 Sonnet" value={form.description ?? ""}
              onChange={e => set("description", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Jumlah Token *</label>
              <input type="number" className={inputCls} min={1000} step={100000} value={form.tokensAmount}
                onChange={e => set("tokensAmount", Number.parseInt(e.target.value, 10) || 0)} />
              <p className="mt-1 text-[11px] text-[#526173]">
                {(form.tokensAmount / 1_000_000).toFixed(1)} Juta Token
              </p>
            </div>
            <div>
              <label className={labelCls}>Masa Aktif (Hari) *</label>
              <input type="number" className={inputCls} min={1} value={form.durationDays}
                onChange={e => set("durationDays", Number.parseInt(e.target.value, 10) || 30)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Harga (IDR) *</label>
              <input type="number" className={inputCls} min={1000} step={1000} value={form.priceIdr}
                onChange={e => set("priceIdr", Number.parseInt(e.target.value, 10) || 0)} />
            </div>
            <div>
              <label className={labelCls}>Harga Asli Coret</label>
              <input type="number" className={inputCls} min={1000} step={1000}
                placeholder="misal 99000"
                value={form.originalPriceIdr ?? ""}
                onChange={e => set("originalPriceIdr", e.target.value ? Number.parseInt(e.target.value, 10) : null)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Label Promo (opsional)</label>
              <input className={inputCls} placeholder="Hemat 15%"
                value={form.bonusLabel ?? ""}
                onChange={e => set("bonusLabel", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Urutan Tampil</label>
              <input type="number" className={inputCls} value={form.sortOrder}
                onChange={e => set("sortOrder", Number.parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="tokenHighlight" checked={form.isHighlight}
              onChange={e => set("isHighlight", e.target.checked)}
              className="h-4 w-4 rounded border-[#dbe8f3] text-[#f97316] focus:ring-[#f97316]" />
            <label htmlFor="tokenHighlight" className="text-sm text-[#172033] font-medium cursor-pointer">
              Highlight Flash Sale (border merah & badge animasi)
            </label>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#f97316] text-white hover:bg-[#ea580c]">
            {saving ? "Menyimpan..." : isEdit ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPackages() {
  const [activeTab, setActiveTab] = useState<"credit" | "token">("credit");

  // Credit Packages State
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CreditPackage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CreditPackage | null>(null);

  // Token Packages State
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenEditing, setTokenEditing] = useState<TokenPackage | null>(null);
  const [tokenDeleteTarget, setTokenDeleteTarget] = useState<TokenPackage | null>(null);

  async function loadCredits() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/packages", { credentials: "include" });
      const data = await r.json() as CreditPackage[];
      setPackages(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadTokens() {
    setTokenLoading(true);
    try {
      const r = await fetch("/api/admin/token-packages", { credentials: "include" });
      const data = await r.json() as TokenPackage[];
      setTokenPackages(Array.isArray(data) ? data : []);
    } finally {
      setTokenLoading(false);
    }
  }

  useEffect(() => {
    void loadCredits();
    void loadTokens();
  }, []);

  // Credit Handlers
  async function handleSaveCredit(data: Partial<CreditPackage>) {
    if (editing) {
      const r = await csrfFetch(`/api/admin/packages/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!r.ok) { const e = await r.json() as { error: string }; throw new Error(e.error); }
    } else {
      const r = await csrfFetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!r.ok) { const e = await r.json() as { error: string }; throw new Error(e.error); }
    }
    await loadCredits();
  }

  async function handleToggleCredit(pkg: CreditPackage) {
    await csrfFetch(`/api/admin/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !pkg.isActive }),
    });
    await loadCredits();
  }

  async function handleDeleteCredit() {
    if (!deleteTarget) return;
    await csrfFetch(`/api/admin/packages/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setDeleteTarget(null);
    await loadCredits();
  }

  // Token Package Handlers
  async function handleSaveToken(data: Partial<TokenPackage>) {
    if (tokenEditing) {
      const r = await csrfFetch(`/api/admin/token-packages/${tokenEditing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!r.ok) { const e = await r.json() as { error: string }; throw new Error(e.error); }
    } else {
      const r = await csrfFetch("/api/admin/token-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!r.ok) { const e = await r.json() as { error: string }; throw new Error(e.error); }
    }
    await loadTokens();
  }

  async function handleToggleToken(pkg: TokenPackage) {
    await csrfFetch(`/api/admin/token-packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !pkg.isActive }),
    });
    await loadTokens();
  }

  async function handleDeleteToken() {
    if (!tokenDeleteTarget) return;
    await csrfFetch(`/api/admin/token-packages/${tokenDeleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setTokenDeleteTarget(null);
    await loadTokens();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">Kelola Paket Penjualan</h1>
          <p className="mt-1 text-sm text-[#526173]">
            Atur paket top-up saldo kredit atau paket kuota token Claude & GPT yang dapat dibeli oleh pengguna.
          </p>
        </div>
        <Button
          onClick={() => {
            if (activeTab === "credit") {
              setEditing(null);
              setDialogOpen(true);
            } else {
              setTokenEditing(null);
              setTokenDialogOpen(true);
            }
          }}
          className="gap-2 bg-[#f97316] text-white hover:bg-[#ea580c]"
        >
          <Plus className="h-4 w-4" />
          {activeTab === "credit" ? "Tambah Paket Kredit" : "Tambah Paket Token"}
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#dbe8f3] pb-3">
        <button
          onClick={() => setActiveTab("credit")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all",
            activeTab === "credit" ? "bg-[#f97316] text-white shadow-sm" : "text-[#526173] hover:bg-[#f0f4f8]"
          )}
        >
          <Coins className="h-4 w-4" />
          Paket Kredit Saldo ({packages.length})
        </button>
        <button
          onClick={() => setActiveTab("token")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all",
            activeTab === "token" ? "bg-[#f97316] text-white shadow-sm" : "text-[#526173] hover:bg-[#f0f4f8]"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Paket Token Claude & GPT ({tokenPackages.length})
        </button>
      </div>

      {/* Credit Packages View */}
      {activeTab === "credit" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[#526173] text-sm">Memuat paket kredit...</div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#dbe8f3] py-20">
              <Package className="h-10 w-10 text-[#dbe8f3]" />
              <p className="text-sm text-[#526173]">Belum ada paket kredit. Tambah yang pertama!</p>
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }}
                variant="outline" className="mt-1 gap-2">
                <Plus className="h-4 w-4" /> Tambah Paket
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#dbe8f3] bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dbe8f3] bg-[#f8fbff]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Urutan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Paket</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Harga</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Kredit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Bonus</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Promo/Stok</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#526173]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dbe8f3]">
                  {packages.map((pkg) => {
                    const pct = bonusPct(pkg.priceIdr, pkg.creditsAmount);
                    return (
                      <tr key={pkg.id} className="transition-colors hover:bg-[#f8fbff]">
                        <td className="px-4 py-3 text-[#526173]">
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-4 w-4 text-[#dbe8f3]" />
                            <span className="text-xs font-mono">{pkg.sortOrder}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#172033]">{pkg.name}</div>
                          {pkg.description && (
                            <div className="text-xs text-[#526173] line-clamp-1">{pkg.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#172033]">
                          {formatRp(pkg.priceIdr)}
                          {pkg.originalPriceIdr && (
                            <div className="text-xs text-[#526173] line-through">{formatRp(pkg.originalPriceIdr)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">
                          {pkg.creditsAmount.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3">
                          {pkg.bonusLabel ? (
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              {pkg.bonusLabel}
                            </span>
                          ) : pct ? (
                            <span className="text-xs text-emerald-600 font-medium">+{pct}%</span>
                          ) : (
                            <span className="text-xs text-[#526173]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {pkg.isHighlight && (
                              <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                                Flash Sale
                              </span>
                            )}
                            {pkg.stock !== null && (
                              <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                Sisa {pkg.stock}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => void handleToggleCredit(pkg)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                              pkg.isActive
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-gray-100 text-[#526173] hover:bg-gray-200"
                            )}>
                            {pkg.isActive
                              ? <><ToggleRight className="h-4 w-4" /> Aktif</>
                              : <><ToggleLeft className="h-4 w-4" /> Nonaktif</>}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                              onClick={() => { setEditing(pkg); setDialogOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteTarget(pkg)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Token Packages View */}
      {activeTab === "token" && (
        <>
          {tokenLoading ? (
            <div className="flex items-center justify-center py-20 text-[#526173] text-sm">Memuat paket token...</div>
          ) : tokenPackages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#dbe8f3] py-20">
              <Sparkles className="h-10 w-10 text-[#dbe8f3]" />
              <p className="text-sm text-[#526173]">Belum ada paket token. Tambah Claude atau GPT pass sekarang!</p>
              <Button onClick={() => { setTokenEditing(null); setTokenDialogOpen(true); }}
                variant="outline" className="mt-1 gap-2">
                <Plus className="h-4 w-4" /> Tambah Paket Token
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#dbe8f3] bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dbe8f3] bg-[#f8fbff]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Urutan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Kategori</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Nama Paket</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Jumlah Token</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Masa Aktif</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Harga</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Promo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#526173]">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#526173]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dbe8f3]">
                  {tokenPackages.map((pkg) => (
                    <tr key={pkg.id} className="transition-colors hover:bg-[#f8fbff]">
                      <td className="px-4 py-3 text-[#526173]">
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-[#dbe8f3]" />
                          <span className="text-xs font-mono">{pkg.sortOrder}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          pkg.category === "claude"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        )}>
                          {pkg.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#172033]">{pkg.name}</div>
                        {pkg.description && (
                          <div className="text-xs text-[#526173] line-clamp-1">{pkg.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-[#172033]">
                        {pkg.tokensAmount.toLocaleString("id-ID")} Token
                        <span className="block text-[11px] font-normal text-[#526173]">
                          ({(pkg.tokensAmount / 1_000_000).toFixed(1)}M)
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#526173]">
                        {pkg.durationDays} Hari
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#172033]">
                        {formatRp(pkg.priceIdr)}
                        {pkg.originalPriceIdr && (
                          <div className="text-xs text-[#526173] line-through">{formatRp(pkg.originalPriceIdr)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {pkg.isHighlight && (
                            <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                              Flash Sale
                            </span>
                          )}
                          {pkg.bonusLabel && (
                            <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                              {pkg.bonusLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => void handleToggleToken(pkg)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                            pkg.isActive
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-gray-100 text-[#526173] hover:bg-gray-200"
                          )}>
                          {pkg.isActive
                            ? <><ToggleRight className="h-4 w-4" /> Aktif</>
                            : <><ToggleLeft className="h-4 w-4" /> Nonaktif</>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => { setTokenEditing(pkg); setTokenDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setTokenDeleteTarget(pkg)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <PackageFormDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveCredit}
      />

      <TokenPackageFormDialog
        open={tokenDialogOpen}
        initial={tokenEditing}
        onClose={() => setTokenDialogOpen(false)}
        onSave={handleSaveToken}
      />

      {/* Alert Dialog Credit Package Delete */}
      <AlertDialog open={deleteTarget != null} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus paket kredit "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Paket akan dihapus permanen. Transaksi yang sudah dibuat dengan paket ini tidak terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCredit} className="bg-red-500 hover:bg-red-600">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog Token Package Delete */}
      <AlertDialog open={tokenDeleteTarget != null} onOpenChange={v => !v && setTokenDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus paket token "{tokenDeleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Paket token akan dihapus dari katalog store. Pengguna yang sudah membeli kuota ini tetap memiliki kuotanya sampai habis/expired.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteToken} className="bg-red-500 hover:bg-red-600">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
