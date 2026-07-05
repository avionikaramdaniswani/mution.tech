import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Rocket, Bug, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-fetch";

type ChangeType = "feat" | "fix" | "chore";

interface ChangelogChange {
  type: ChangeType;
  text: string;
}

interface Changelog {
  id: number;
  version: string;
  date: string;
  title: string;
  description: string | null;
  changes: ChangelogChange[];
}

export default function AdminChangelog() {
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [form, setForm] = useState<{
    version: string;
    date: string;
    title: string;
    description: string;
    changes: ChangelogChange[];
  }>({
    version: "",
    date: "",
    title: "",
    description: "",
    changes: [{ type: "feat", text: "" }],
  });

  const { data: changelogs = [], isLoading } = useQuery<Changelog[]>({
    queryKey: ["admin-changelog"],
    queryFn: () => apiFetch("/changelog"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => {
      if (editingId) {
        return apiFetch(`/admin/changelog/${editingId}`, { method: "PUT", body: JSON.stringify(data) });
      }
      return apiFetch("/admin/changelog", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-changelog"] });
      setIsDialogOpen(false);
      toast({ title: "Berhasil", description: "Changelog berhasil disimpan" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/changelog/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-changelog"] });
      toast({ title: "Berhasil", description: "Changelog dihapus" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" })
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      version: "",
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      title: "",
      description: "",
      changes: [{ type: "feat", text: "" }],
    });
    setIsDialogOpen(true);
  };

  const openEdit = (c: Changelog) => {
    setEditingId(c.id);
    setForm({
      version: c.version,
      date: c.date,
      title: c.title,
      description: c.description || "",
      changes: c.changes || [],
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Changelog</h1>
          <p className="text-muted-foreground text-sm">Atur catatan rilis yang akan ditampilkan di halaman publik.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah Rilis
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Memuat...</div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="grid grid-cols-12 border-b border-border/50 bg-muted/20 p-4 text-sm font-semibold text-muted-foreground">
            <div className="col-span-2">Versi</div>
            <div className="col-span-2">Tanggal</div>
            <div className="col-span-4">Judul</div>
            <div className="col-span-2 text-center">Jml Perubahan</div>
            <div className="col-span-2 text-right">Aksi</div>
          </div>
          <div className="divide-y divide-border/50">
            {changelogs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">Belum ada changelog.</div>
            )}
            {changelogs.map(c => (
              <div key={c.id} className="grid grid-cols-12 p-4 items-center text-sm">
                <div className="col-span-2 font-mono font-medium">{c.version}</div>
                <div className="col-span-2 text-muted-foreground">{c.date}</div>
                <div className="col-span-4 font-medium truncate pr-4">{c.title}</div>
                <div className="col-span-2 text-center text-muted-foreground">{c.changes?.length || 0} item</div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => {
                    if (confirm("Yakin ingin menghapus changelog inix")) {
                      deleteMutation.mutate(c.id);
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Rilis" : "Tambah Rilis Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Versi (misal: v1.0.0)</label>
                <Input value={form.version} onChange={e => setForm({...form, version: e.target.value})} placeholder="vX.X.X" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Tanggal</label>
                <Input value={form.date} onChange={e => setForm({...form, date: e.target.value})} placeholder="14 Okt 2023" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Judul Rilis</label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Fitur Baru Mution AI..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Deskripsi Singkat (Opsional)</label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Penjelasan singkat mengenai rilis ini..." rows={2} />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Daftar Perubahan</label>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({...form, changes: [...form.changes, { type: "feat", text: "" }]})}>
                  <Plus className="h-3 w-3 mr-1" /> Tambah Item
                </Button>
              </div>
              
              <div className="space-y-2">
                {form.changes.map((change, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Select value={change.type} onValueChange={(val: any) => {
                      const newCh = [...form.changes];
                      newCh[idx].type = val;
                      setForm({...form, changes: newCh});
                    }}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feat"><span className="flex items-center gap-1.5"><Rocket className="h-3 w-3" /> Feature</span></SelectItem>
                        <SelectItem value="fix"><span className="flex items-center gap-1.5"><Bug className="h-3 w-3" /> Fix</span></SelectItem>
                        <SelectItem value="chore"><span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Improve</span></SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input className="flex-1" value={change.text} onChange={e => {
                      const newCh = [...form.changes];
                      newCh[idx].text = e.target.value;
                      setForm({...form, changes: newCh});
                    }} placeholder="Deskripsi perubahan..." />
                    
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => {
                        const newCh = form.changes.filter((_, i) => i !== idx);
                        setForm({...form, changes: newCh});
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.changes.length === 0 && (
                  <div className="text-xs text-muted-foreground italic text-center p-2 border border-dashed rounded-lg">Belum ada item perubahan.</div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.version || !form.title}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Changelog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
