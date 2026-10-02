import { useState } from "react";
import { useListActivity } from "@workspace/api-client-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Activity as ActivityIcon, Settings, Terminal, Play, Square, Database, Box, 
  Trash2, PlusCircle, RefreshCw, Key
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function ActivityLog() {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { data: activities, isLoading } = useListActivity();

  const totalPages = Math.max(1, Math.ceil((activities?.length ?? 0) / itemsPerPage));
  const paginatedActivities = activities?.slice((page - 1) * itemsPerPage, page * itemsPerPage) ?? [];

  // Memilih icon & warna (semantic) berdasarkan action
  const getActionStyle = (action: string) => {
    const act = action.toLowerCase();
    
    // Destructive
    if (act.includes('delete') || act.includes('remove') || act.includes('stop')) {
      return { 
        icon: act.includes('stop') ? Square : Trash2, 
        color: "text-red-600 bg-red-100/50 border-red-200" 
      };
    }
    // Success / Create
    if (act.includes('deploy') || act.includes('create') || act.includes('start') || act.includes('run')) {
      const Icon = act.includes('deploy') ? Terminal : act.includes('create') ? PlusCircle : Play;
      return { icon: Icon, color: "text-emerald-600 bg-emerald-100/50 border-emerald-200" };
    }
    // Update / Refresh
    if (act.includes('update') || act.includes('restart') || act.includes('set')) {
      return { icon: RefreshCw, color: "text-blue-600 bg-blue-100/50 border-blue-200" };
    }
    // Database
    if (act.includes('db') || act.includes('database')) {
      return { icon: Database, color: "text-purple-600 bg-purple-100/50 border-purple-200" };
    }
    // Project
    if (act.includes('project')) {
      return { icon: Box, color: "text-indigo-600 bg-indigo-100/50 border-indigo-200" };
    }
    // Auth / API Keys
    if (act.includes('key') || act.includes('login') || act.includes('auth')) {
      return { icon: Key, color: "text-amber-600 bg-amber-100/50 border-amber-200" };
    }

    return { icon: Settings, color: "text-slate-600 bg-slate-100/50 border-slate-200" };
  };

  const translateAction = (action: string) => {
    const map: Record<string, string> = {
      deploy: "Deploy aplikasi",
      create_project: "Membuat proyek baru",
      delete_project: "Menghapus proyek",
      start: "Menjalankan aplikasi",
      stop: "Menghentikan aplikasi",
      restart: "Merestart aplikasi",
      rollback: "Rollback versi",
      provision_db: "Membuat database",
      delete_db: "Menghapus database",
      set_env: "Mengatur variabel env",
      delete_env: "Menghapus variabel env",
      create_api_key: "Membuat API key baru",
      delete_api_key: "Menghapus API key",
    };
    return map[action] || action.replace(/_/g, ' ');
  };

  const parseMetadata = (metadata: string | null | undefined) => {
    if (!metadata) return null;
    try {
      const parsed = JSON.parse(metadata);
      return typeof parsed === "object" ? parsed : { detail: parsed };
    } catch {
      return { detail: metadata };
    }
  };

  // Group activities by date
  const groupedActivities = paginatedActivities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt);
    let dateStr = "";
    
    if (isToday(date)) dateStr = "Hari ini";
    else if (isYesterday(date)) dateStr = "Kemarin";
    else dateStr = format(date, "d MMMM yyyy", { locale: id });

    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr]!.push(activity);
    return groups;
  }, {} as Record<string, typeof paginatedActivities>);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto py-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Aktivitas</h1>
          <p className="text-slate-500 mt-1">Memuat riwayat...</p>
        </div>
        <Card>
          <CardContent className="p-8 space-y-6">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1 pt-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Aktivitas</h1>
          <p className="text-slate-500 mt-1">Riwayat lengkap aktivitas dari akun dan semua proyekmu.</p>
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardContent className="p-8">
          {!activities || activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ActivityIcon className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Belum ada aktivitas</h3>
              <p className="text-slate-500 max-w-sm mt-1">
                Riwayat log sistem seperti deploy, perubahan env, dan aksi lainnya akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="relative border-l border-slate-200 ml-4 space-y-10 pb-4">
              {Object.entries(groupedActivities!).map(([dateStr, items]) => (
                <div key={dateStr} className="relative">
                  {/* Date Header */}
                  <div className="mb-6 ml-10">
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                      {dateStr}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-8">
                    {items.map((activity) => {
                      const style = getActionStyle(activity.action);
                      const meta = parseMetadata(activity.metadata);
                      
                      return (
                        <div key={activity.id} className="relative flex gap-6 items-start group">
                          {/* Timeline Dot/Icon */}
                          <div className={`absolute -left-[36px] flex h-10 w-10 items-center justify-center rounded-full border shadow-sm bg-white ${style.color} ring-4 ring-white`}>
                            <style.icon className="h-4 w-4" />
                          </div>
                          
                          {/* Content Box */}
                          <div className="ml-6 flex-1 bg-white border border-slate-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-shadow">
                            <div className="flex items-baseline justify-between gap-4">
                              <p className="text-sm font-medium text-slate-900">
                                <span className="capitalize">{translateAction(activity.action)}</span>
                                {activity.projectName && (
                                  <span className="text-slate-500 font-normal">
                                    {" "}untuk <span className="font-semibold text-slate-700">{activity.projectName}</span>
                                  </span>
                                )}
                              </p>
                              <span className="text-xs text-slate-400 whitespace-nowrap" title={format(new Date(activity.createdAt), "PPpp", { locale: id })}>
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: id })}
                              </span>
                            </div>

                            {/* Metadata Badges */}
                            {meta && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {Object.entries(meta).map(([k, v]) => (
                                  <div key={k} className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-xs text-slate-600">
                                    <span className="font-medium text-slate-400">{k}:</span>
                                    <span className="truncate max-w-[250px]" title={String(v)}>{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {activities && activities.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="whitespace-nowrap">Tampilkan:</span>
                <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-16 bg-white border-slate-200 px-2 py-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="whitespace-nowrap ml-2">
                  Menampilkan <span className="font-semibold text-slate-900">{(page - 1) * itemsPerPage + 1}</span> hingga{" "}
                  <span className="font-semibold text-slate-900">{Math.min(page * itemsPerPage, activities.length)}</span> dari{" "}
                  <span className="font-semibold text-slate-900">{activities.length}</span> aktivitas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 bg-white border-slate-200"
                >
                  Sebelumnnya
                </Button>
                <span className="px-2 font-medium">
                  Hal {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 bg-white border-slate-200"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
