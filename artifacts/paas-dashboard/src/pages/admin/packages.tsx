import { useState, useEffect } from "react";
import { csrfFetch } from "@/lib/csrf";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, GripVertical, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const EMPTY: Omit<CreditPackage, "id" | "isActive"> = {
  name: "",
  description: "",
  priceIdr: 25000,
  creditsAmount: 25000,
  bonusLabel: "",
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
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setForm({ ...EMPTY, ...initial }); setError(null); }
  }, [open, initial]);

  function set(key: keyof typeof form, value: string | number) {
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
          <DialogTitle>{isEdit ? "Edit Paket" : "Tambah Paket Kredit"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
              <input className={inputCls} type="number" min={1000} step={1000}
                value={form.priceIdr} onChange={e => set("priceIdr", parseInt(e.target.value) || 0)} />
              <p className="mt-1 text-[10px] text-[#526173]">{formatRp(form.priceIdr)}</p>
            </div>
            <div>
              <label className={labelCls}>Kredit Didapat *</label>
              <input className={inputCls} type="number" min={1}
                value={form.creditsAmount} onChange={e => set("creditsAmount", parseInt(e.target.value) || 0)} />
              <p className="mt-1 text-[10px] text-[#526173]">
                {autoBonus != null
                  ? <span className="text-emerald-600 font-semibold">+{autoBonus}% bonus</span>
                  : form.creditsAmount === form.priceIdr ? "1:1 tanpa bonus" : "diskon"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Label Bonus</label>
              <input className={inputCls} placeholder={autoBonus ? `+${autoBonus}% bonus` : ""}
                value={form.bonusLabel ?? ""}
                onChange={e => set("bonusLabel", e.target.value)} />
              <p className="mt-1 text-[10px] text-[#526173]">Kosongkan untuk otomatis</p>
            </div>
            <div>
              <label className={labelCls}>Urutan</label>
              <input className={inputCls} type="number" min={0}
                value={form.sortOrder} onChange={e => set("sortOrder", parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}
            className="bg-[#f97316] text-white hover:bg-[#ea580c]">
            {saving ? "Menyimpan..." : isEdit ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPackages() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CreditPackage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CreditPackage | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/packages", { credentials: "include" });
      const data = await r.json() as CreditPackage[];
      setPackages(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleSave(data: Partial<CreditPackage>) {
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
    await load();
  }

  async function handleToggle(pkg: CreditPackage) {
    await csrfFetch(`/api/admin/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !pkg.isActive }),
    });
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await csrfFetch(`/api/admin/packages/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setDeleteTarget(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">Credit Packages</h1>
          <p className="mt-1 text-sm text-[#526173]">
            Atur paket topup kredit yang tampil ke user. Makin besar paket, bisa kasih lebih banyak kredit (bonus).
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="gap-2 bg-[#f97316] text-white hover:bg-[#ea580c]">
          <Plus className="h-4 w-4" /> Tambah Paket
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#526173] text-sm">Memuat paket...</div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#dbe8f3] py-20">
          <Package className="h-10 w-10 text-[#dbe8f3]" />
          <p className="text-sm text-[#526173]">Belum ada paket. Tambah yang pertama!</p>
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
                      <p className="font-semibold text-[#172033]">{pkg.name}</p>
                      {pkg.description && <p className="text-xs text-[#526173]">{pkg.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#172033]">{formatRp(pkg.priceIdr)}</td>
                    <td className="px-4 py-3 font-semibold text-[#172033]">{pkg.creditsAmount.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3">
                      {pkg.bonusLabel ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-200">
                          {pkg.bonusLabel}
                        </span>
                      ) : pct != null ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-200">
                          +{pct}%
                        </span>
                      ) : (
                        <span className="text-xs text-[#94a3b8]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(pkg)}
                        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                        style={{ color: pkg.isActive ? "rgb(16,185,129)" : "#94a3b8" }}>
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

      <PackageFormDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus paket "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Paket akan dihapus permanen. Transaksi yang sudah dibuat dengan paket ini tidak terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
