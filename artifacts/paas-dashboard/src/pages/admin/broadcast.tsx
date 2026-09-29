import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Users, CheckSquare } from "lucide-react";
import { csrfFetch } from "@/lib/csrf";

// Minimal type definition for user
interface AdminUser {
  id: number;
  name: string;
  email: string;
}

export default function AdminBroadcast() {
  const { toast } = useToast();
  
  const [targetType, setTargetType] = useState<"all" | "selected">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [subject, setSubject] = useState("");
  const [messageHtml, setMessageHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await csrfFetch("/api/admin/users");
      if (!res.ok) throw new Error("Gagal mengambil data user");
      return res.json();
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        target: targetType === "all" ? "all" : selectedUserIds,
        subject,
        message: messageHtml,
      };
      const res = await csrfFetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal mengirim broadcast");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Broadcast Berhasil",
        description: `Berhasil mengirim email ke ${data.count} pengguna.`,
      });
      setSubject("");
      setMessageHtml("");
      setSelectedUserIds([]);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Broadcast Gagal",
        description: err.message,
      });
    },
  });

  const toggleUserSelection = (id: number) => {
    setSelectedUserIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (users) setSelectedUserIds(users.map(u => u.id));
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const isFormValid = subject.trim() !== "" && messageHtml.trim() !== "" && 
    (targetType === "all" || (targetType === "selected" && selectedUserIds.length > 0));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Broadcast Email</h1>
        <p className="text-muted-foreground mt-1">Kirim pengumuman atau pembaruan massal ke pengguna terdaftar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Target Penerima</CardTitle>
              <CardDescription>Pilih siapa yang akan menerima email ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={targetType} onValueChange={(v: "all" | "selected") => setTargetType(v)}>
                <div className="flex items-center space-x-2 mb-4">
                  <RadioGroupItem value="all" id="target-all" />
                  <Label htmlFor="target-all" className="cursor-pointer">Semua User ({users?.length ?? 0} akun)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="target-selected" />
                  <Label htmlFor="target-selected" className="cursor-pointer">Pilih User Spesifik</Label>
                </div>
              </RadioGroup>

              {targetType === "selected" && (
                <div className="mt-4 border rounded-md p-4 space-y-4 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-500">{selectedUserIds.length} dipilih</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>Pilih Semua</Button>
                      <Button variant="ghost" size="sm" onClick={handleClearSelection}>Reset</Button>
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-2 border bg-white rounded-md p-2">
                    {usersLoading ? (
                      <p className="text-sm text-muted-foreground p-2">Memuat user...</p>
                    ) : users?.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center space-x-2 hover:bg-slate-50 p-1.5 rounded cursor-pointer"
                        onClick={() => toggleUserSelection(user.id)}
                      >
                        <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${selectedUserIds.includes(user.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                          {selectedUserIds.includes(user.id) && <CheckSquare className="w-3 h-3 text-white" />}
                        </div>
                        <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                          <span className="font-medium">{user.name}</span> <span className="text-slate-500">({user.email})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Konten Pesan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subjek Email</Label>
                <Input 
                  id="subject" 
                  placeholder="Cth: Pembaruan Sistem Mution v2.0" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label htmlFor="message">Isi Pesan (HTML Mendukung)</Label>
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setShowPreview(!showPreview)}>
                    {showPreview ? "Tutup Preview" : "Lihat Preview"}
                  </Button>
                </div>
                <Textarea 
                  id="message" 
                  placeholder="<p>Halo pengguna Mution!</p><br/><p>Kami baru saja merilis pembaruan besar...</p>"
                  className="font-mono text-xs min-h-[200px]"
                  value={messageHtml}
                  onChange={(e) => setMessageHtml(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Gunakan tag HTML standar seperti &lt;b&gt;, &lt;p&gt;, &lt;a href="..."&gt; untuk styling isi.</p>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 pt-6">
              <Button 
                className="w-full" 
                size="lg"
                disabled={!isFormValid || broadcastMutation.isPending}
                onClick={() => broadcastMutation.mutate()}
              >
                {broadcastMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Kirim Broadcast Sekarang
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          {showPreview ? (
            <Card className="sticky top-6 border-slate-200 shadow-xl overflow-hidden">
              <div className="bg-slate-100 p-2 border-b text-center text-xs font-medium text-slate-500 uppercase tracking-widest">
                Preview Email
              </div>
              <div className="bg-[#f8fafc] p-6 h-full min-h-[500px]">
                {/* Simulated Email Wrapper */}
                <div className="max-w-[480px] mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-br from-[#f97316] to-[#ea580c] p-8 text-center">
                    <p className="m-0 text-white text-xl font-extrabold tracking-tight">Mution</p>
                    <p className="m-0 mt-1 text-white/80 text-xs">PaaS &amp; AI Gateway</p>
                  </div>
                  <div className="p-8 text-[#172033] leading-relaxed text-[15px]" 
                       dangerouslySetInnerHTML={{ __html: messageHtml || "<p class='text-slate-400 italic'>Ketik pesan di kolom kiri untuk melihat preview.</p>" }}>
                  </div>
                  <div className="bg-slate-50 border-t p-5 text-center">
                    <p className="m-0 text-[11px] text-slate-400">© {new Date().getFullYear()} Mution · mution.tech</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg p-6 bg-slate-50/50">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-medium text-slate-900">Preview dinonaktifkan</h3>
                <p className="mt-1 text-sm text-slate-500 max-w-sm">
                  Klik "Lihat Preview" di form pesan untuk melihat bagaimana email akan terlihat di inbox user.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
