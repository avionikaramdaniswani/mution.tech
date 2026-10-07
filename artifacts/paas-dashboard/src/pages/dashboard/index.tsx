import {
  useListProjects,
  useStopProject,
  useRestartProject,
  useListActivity,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowRight,
  Plus,
  Globe,
  Code2,
  Clock,
  Square,
  RefreshCw,
  Box,
  Terminal,
  Activity as ActivityIcon,
  Key,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link } from "wouter";
import { csrfFetch } from "@/lib/csrf";
import type { Project, ActivityLog } from "@workspace/api-client-react";

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  isActive: boolean;
}

function useListApiKeys() {
  return useQuery({
    queryKey: ['/api/api-keys'],
    queryFn: async () => {
      const res = await csrfFetch('/api/api-keys', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch api keys');
      return res.json() as Promise<ApiKey[]>;
    }
  });
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

function useAnnouncements() {
  return useQuery({
    queryKey: ['/api/announcements'],
    queryFn: async () => {
      const res = await csrfFetch('/api/announcements', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch announcements');
      return res.json() as Promise<Announcement[]>;
    }
  });
}

interface ApiUsageDaily {
  day: string;
  requests: number;
}
interface ApiUsageResponse {
  daily: ApiUsageDaily[];
}

function useApiUsageDaily() {
  return useQuery({
    queryKey: ['/api/api-usage', 'dashboard-pulse'],
    queryFn: async () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 139); // exactly 140 days (20 weeks)
      
      const params = new URLSearchParams({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        limit: "200"
      });
      const res = await csrfFetch(`/api/api-usage?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch API usage");
      return res.json() as Promise<ApiUsageResponse>;
    }
  });
}

// --- Project Card Component (Kept for functional actions) ---
function ResourceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-[#526173]">
        <span>{label}</span>
        <span className="font-semibold text-[#172033]">{value}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[#eef8ff]">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const stop = useStopProject();
  const restart = useRestartProject();

  const isRunning = project.status === "running";
  const isBusy = stop.isPending || restart.isPending;
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0 });

  useEffect(() => {
    if (!isRunning) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const loadMetrics = async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}/metrics/current`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);
        if (response.ok && !data?.unavailable && !cancelled) {
          setMetrics({ cpu: Number(data.cpu) || 0, ram: Number(data.ram) || 0 });
        }
      } catch (err) {}
      finally {
        if (!cancelled) timeout = setTimeout(loadMetrics, 5_000);
      }
    };
    void loadMetrics();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [isRunning, project.id]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  }

  return (
    <Card className="group overflow-hidden rounded-lg border-[#dbe8f3] bg-white shadow-sm hover:border-[#c9d8e7]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/projects/${project.id}`} className="block truncate text-sm font-bold text-[#172033] hover:text-[#f97316]">
              {project.name}
            </Link>
          </div>
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isRunning ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#526173]">
          <span className="flex items-center gap-1"><Code2 className="h-3 w-3" /> {project.runtime}</span>
        </div>

        {isRunning && metrics && (
          <div className="space-y-1.5">
            <ResourceBar label="CPU" value={metrics.cpu || 0} color="bg-[#14b8a6]" />
            <ResourceBar label="RAM" value={metrics.ram || 0} color="bg-[#f97316]" />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {isRunning ? (
            <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 rounded" disabled={isBusy} onClick={() => stop.mutate({ id: project.id }, { onSuccess: invalidate })}>
              <Square className="h-3 w-3 mr-1" /> Stop
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 rounded" disabled={isBusy} onClick={() => restart.mutate({ id: project.id }, { onSuccess: invalidate })}>
              <RefreshCw className="h-3 w-3 mr-1" /> Start
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- New Awesome Components ---

import ReactMarkdown from "react-markdown";
import { Info, AlertTriangle, BellRing, Sparkles } from "lucide-react";

function AnnouncementFeed() {
  const { data: announcements, isLoading } = useAnnouncements();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  if (isLoading) {
    return <Skeleton className="w-full h-[300px] rounded-xl" />;
  }

  if (!announcements || announcements.length === 0) {
    return (
      <Card className="border-[#dbe8f3] shadow-[0_12px_40px_rgba(23,32,51,0.06)] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] text-[#172033]">
        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
            <BellRing className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-[#172033]">Tidak ada pengumuman baru</h3>
          <p className="text-xs text-[#526173] mt-1">Anda sudah melihat semua pembaruan sistem terkini.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {announcements.map((ann) => {
        let bgColor = "bg-white";
        let borderColor = "border-[#dbe8f3]";
        let icon = <Info className="w-4 h-4 text-blue-500" />;
        let iconBg = "bg-blue-50 border-blue-100";

        if (ann.type === "warning") {
          borderColor = "border-amber-200";
          icon = <AlertTriangle className="w-4 h-4 text-amber-500" />;
          iconBg = "bg-amber-50 border-amber-100";
        } else if (ann.type === "urgent") {
          borderColor = "border-rose-200";
          icon = <BellRing className="w-4 h-4 text-rose-500" />;
          iconBg = "bg-rose-50 border-rose-100";
        } else if (ann.type === "promo") {
          borderColor = "border-emerald-200";
          icon = <Sparkles className="w-4 h-4 text-emerald-500" />;
          iconBg = "bg-emerald-50 border-emerald-100";
        }

        return (
          <Card 
            key={ann.id} 
            onClick={() => setSelectedAnnouncement(ann)}
            className={`overflow-hidden border ${borderColor} shadow-sm hover:shadow-md transition-all cursor-pointer ${bgColor}`}
          >
            <CardContent className="p-5">
              <div className="flex gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${iconBg}`}>
                  {icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172033] line-clamp-2 leading-tight">{ann.title}</h3>
                  <p className="text-[10px] font-medium text-[#8c9bab] mt-1 uppercase tracking-wider">
                    {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true, locale: idLocale })}
                  </p>
                </div>
              </div>
              <div className="text-xs text-[#526173] prose prose-sm max-w-none prose-p:leading-relaxed prose-a:text-indigo-600 hover:prose-a:text-indigo-500 line-clamp-3">
                <ReactMarkdown>{ann.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
        <DialogContent className="sm:max-w-[600px] bg-white text-[#172033]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold leading-tight">{selectedAnnouncement?.title}</DialogTitle>
            <DialogDescription className="text-xs font-medium text-[#8c9bab] uppercase tracking-wider mt-2">
              {selectedAnnouncement && formatDistanceToNow(new Date(selectedAnnouncement.createdAt), { addSuffix: true, locale: idLocale })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-[#526173] prose prose-sm max-w-none prose-p:leading-relaxed prose-a:text-indigo-600 hover:prose-a:text-indigo-500">
            {selectedAnnouncement && <ReactMarkdown>{selectedAnnouncement.content}</ReactMarkdown>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApiTrafficPulse({ daily }: { daily: ApiUsageDaily[] }) {
  const today = new Date();
  const days = Array.from({length: 140}).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (139 - i));
    return d.toISOString().split('T')[0];
  });

  const counts = daily?.reduce((acc, d) => {
     acc[d.day] = d.requests;
     return acc;
  }, {} as Record<string, number>) || {};

  const totalRequests = daily?.reduce((sum, d) => sum + (d.requests || 0), 0) || 0;

  return (
    <Card className="border-[#dbe8f3] shadow-[0_12px_34px_rgba(23,32,51,0.05)] bg-white h-full flex-1">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
           <div>
             <h3 className="text-sm font-bold text-[#172033] flex items-center gap-1.5">
               <ActivityIcon className="w-4 h-4 text-emerald-500" /> API Traffic Pulse
             </h3>
             <p className="text-xs text-[#526173]">Total API Requests 140 hari terakhir</p>
           </div>
           <div className="flex items-center gap-1 text-xs text-[#526173] bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
              <span className="text-emerald-600 font-bold">{totalRequests.toLocaleString('id-ID')}</span> requests
           </div>
        </div>
        
        {/* Container for the pulse grid */}
        <div className="flex-1 w-full flex items-center pt-2">
          <div className="grid grid-rows-7 grid-flow-col gap-1 sm:gap-1.5 w-full">
             {days.map(d => {
                const count = counts[d] || 0;
                let bg = "bg-[#ebedf0]"; 
                let hover = "hover:ring-1 hover:ring-[#dbe8f3]";
                if (count > 0 && count <= 50) { bg = "bg-[#9be9a8]"; hover = "hover:ring-1 hover:ring-[#9be9a8]"; }
                else if (count > 50 && count <= 500) { bg = "bg-[#40c463]"; hover = "hover:ring-1 hover:ring-[#40c463]"; }
                else if (count > 500) { bg = "bg-[#216e39]"; hover = "hover:ring-1 hover:ring-[#216e39]"; }

                return (
                  <div 
                    key={d} 
                    title={`${d}: ${count.toLocaleString('id-ID')} requests`}
                    className={`w-full aspect-square rounded-[2px] sm:rounded-sm ${bg} ${hover} transition-all cursor-pointer`}
                  />
                )
             })}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] text-[#526173] font-medium">
           <span>Less</span>
           <div className="flex gap-1 sm:gap-1.5">
             <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[2px] bg-[#ebedf0]" title="0" />
             <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[2px] bg-[#9be9a8]" title="1 - 50" />
             <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[2px] bg-[#40c463]" title="51 - 500" />
             <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[2px] bg-[#216e39]" title="> 500" />
           </div>
           <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const { data: apiKeys, isLoading: apiKeysLoading } = useListApiKeys();
  const { data: apiUsageData, isLoading: usageLoading } = useApiUsageDaily();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      
      {/* Banner / Hero */}
      <section className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#eefdfa_100%)] p-6 shadow-[0_20px_60px_rgba(23,32,51,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Command Center</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#172033] sm:text-3xl">
              Halo, {user?.name?.split(' ')[0] || "Developer"} 👋
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#526173]">
              Pantau semua proyek Anda dan kelola layanan API Gateway dari satu tempat terpusat.
            </p>
          </div>
          <div className="flex flex-row gap-2 w-full mt-2 sm:mt-0 sm:w-auto">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4 rounded-md border-[#c9d8e7] bg-white text-[#172033] hover:bg-[#eef8ff]"
              asChild
            >
              <Link href="/projects">
                <Box className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Hosting
              </Link>
            </Button>
            <Button 
              className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4 rounded-md bg-[#f97316] text-white hover:bg-[#ea580c] shadow-md shadow-orange-500/20" 
              asChild
            >
              <Link href="/api-keys">
                <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                API Keys
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Announcements */}
      <section>
        <div className="mb-4 flex items-center justify-between">
           <h2 className="text-sm font-extrabold tracking-widest uppercase text-[#172033]">Sistem & Pengumuman</h2>
           <Link href="/changelog" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 transition-colors">
              Lihat Semua Pengumuman <ArrowRight className="w-3 h-3" />
           </Link>
        </div>
        <AnnouncementFeed />
      </section>

      <div className="grid lg:grid-cols-12 gap-8">
         
         {/* Kiri: Activity Pulse & Terminal View */}
         <div className="lg:col-span-7 space-y-6 flex flex-col">
            {(usageLoading) ? (
              <Skeleton className="w-full h-[200px] rounded-xl" />
            ) : (
              <ApiTrafficPulse daily={apiUsageData?.daily || []} />
            )}

         </div>

         {/* Kanan: Quick Access / Projects Mini List */}
         <div className="lg:col-span-5 space-y-6">
            <div>
               <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-[#172033]">Server Metrics</h2>
                  <Link href="/projects" className="text-xs font-semibold text-[#f97316] hover:underline">View All</Link>
               </div>
               {projectsLoading ? (
                 <div className="space-y-3">
                   <Skeleton className="h-[120px] w-full rounded-lg" />
                   <Skeleton className="h-[120px] w-full rounded-lg" />
                 </div>
               ) : !projects?.length ? (
                 <div className="p-6 border border-dashed border-[#c9d8e7] rounded-lg text-center text-sm text-[#526173]">
                   Tidak ada sumber daya aktif.
                 </div>
               ) : (
                 <div className="space-y-3">
                    {projects.slice(0, 3).map(p => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
