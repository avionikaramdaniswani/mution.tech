import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Trash2, Pencil, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { csrfFetch } from "@/lib/csrf";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { Announcement } from "../dashboard/index";

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<{ title: string; content: string; type: string; isActive: boolean; expiresAt: string; ctaText: string; ctaLink: string }>({
    title: "",
    content: "",
    type: "info",
    isActive: true,
    expiresAt: "",
    ctaText: "",
    ctaLink: "",
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['/api/admin/announcements'],
    queryFn: async () => {
      const res = await csrfFetch('/api/admin/announcements', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch announcements');
      return res.json() as Promise<Announcement[]>;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await csrfFetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null
        })
      });
      if (!res.ok) throw new Error('Gagal membuat pengumuman');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] }); // User facing
      toast({ title: "Berhasil", description: "Pengumuman telah diterbitkan!" });
      setIsEditorOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<typeof formData> }) => {
      const payload: any = { ...data };
      if (data.expiresAt !== undefined) {
        payload.expiresAt = data.expiresAt ? new Date(data.expiresAt).toISOString() : null;
      }
      const res = await csrfFetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Gagal update pengumuman');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] }); // User facing
      toast({ title: "Berhasil", description: "Pengumuman diperbarui!" });
      setIsEditorOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await csrfFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus pengumuman');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] }); // User facing
      toast({ title: "Dihapus", description: "Pengumuman telah dihapus." });
    }
  });

  const openEditor = (item?: Announcement) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        content: item.content,
        type: item.type,
        isActive: item.isActive,
        expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 16) : "",
        ctaText: item.ctaText || "",
        ctaLink: item.ctaLink || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: "",
        content: "",
        type: "info",
        isActive: true,
        expiresAt: "",
        ctaText: "",
        ctaLink: "",
      });
    }
    setIsEditorOpen(true);
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengumuman</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola notifikasi dan banner informasi untuk pengguna Mution.</p>
        </div>
        <Button onClick={() => openEditor()} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
          <Plus className="w-4 h-4" />
          Pengumuman Baru
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
           <div className="p-8"><Skeleton className="w-full h-32" /></div>
        ) : !announcements || announcements.length === 0 ? (
           <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
             <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
               <Megaphone className="w-6 h-6 text-slate-400" />
             </div>
             Belum ada pengumuman apapun.
           </div>
        ) : (
          <div className="divide-y divide-border">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{ann.title}</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      ann.type === 'info' ? 'bg-blue-100 text-blue-700' :
                      ann.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                      ann.type === 'urgent' ? 'bg-rose-100 text-rose-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {ann.type}
                    </span>
                    {ann.isActive ? (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{ann.content}</p>
                  <div className="text-xs text-muted-foreground pt-1 flex items-center gap-4">
                    <span>Dibuat: {format(new Date(ann.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}</span>
                    {ann.expiresAt && (
                      <span className="text-amber-600">Berakhir: {format(new Date(ann.expiresAt), "dd MMM yyyy HH:mm", { locale: idLocale })}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Switch 
                    checked={ann.isActive} 
                    onCheckedChange={(val) => updateMutation.mutate({ id: ann.id, data: { isActive: val }})}
                    disabled={updateMutation.isPending}
                  />
                  <Button variant="outline" size="icon" onClick={() => openEditor(ann)}>
                    <Pencil className="w-4 h-4 text-slate-600" />
                  </Button>
                  <Button variant="outline" size="icon" className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" onClick={() => {
                    if (confirm('Yakin ingin menghapus pengumuman ini?')) {
                      deleteMutation.mutate(ann.id);
                    }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Pengumuman' : 'Pengumuman Baru'}</DialogTitle>
            <DialogDescription>Pengumuman yang aktif akan muncul di dashboard user.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Maintenance Server" />
            </div>
            
            <div className="space-y-2">
              <Label>Tipe Label</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (Biru)</SelectItem>
                  <SelectItem value="warning">Warning (Kuning)</SelectItem>
                  <SelectItem value="urgent">Urgent (Merah)</SelectItem>
                  <SelectItem value="promo">Promo (Hijau)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Isi Pesan (Mendukung Markdown)</Label>
              <Textarea 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})} 
                placeholder="Tulis detail pengumuman di sini..." 
                className="min-h-[150px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teks Tombol CTA (Opsional)</Label>
                <Input value={formData.ctaText} onChange={e => setFormData({...formData, ctaText: e.target.value})} placeholder="Contoh: Beli Sekarang" />
              </div>
              <div className="space-y-2">
                <Label>Link Tombol CTA (Opsional)</Label>
                <Input value={formData.ctaLink} onChange={e => setFormData({...formData, ctaLink: e.target.value})} placeholder="Contoh: /billing" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batas Waktu Tayang (Opsional)</Label>
                <Input type="datetime-local" value={formData.expiresAt} onChange={e => setFormData({...formData, expiresAt: e.target.value})} />
              </div>
              <div className="flex flex-col justify-center space-y-2">
                <Label>Status Tayang</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.isActive} onCheckedChange={v => setFormData({...formData, isActive: v})} />
                  <span className="text-sm font-medium">{formData.isActive ? 'Aktif' : 'Disembunyikan'}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
