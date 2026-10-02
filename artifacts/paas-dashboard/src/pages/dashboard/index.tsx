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

function ArchitectureMap({ projects, apiKeys }: { projects: Project[], apiKeys: ApiKey[] }) {
  const displayProjects = projects.slice(0, 3);
  const displayKeys = apiKeys.slice(0, 3);
  const totalNodes = displayProjects.length + displayKeys.length;
  
  return (
    <Card className="overflow-hidden border-[#dbe8f3] shadow-[0_12px_40px_rgba(23,32,51,0.06)] relative bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] text-[#172033]">
      <CardContent className="p-6 md:p-12 relative min-h-[300px]">
        {/* Animated SVG Connecting Lines using fixed viewBox */}
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none" 
          className="absolute inset-0 w-full h-full pointer-events-none" 
          style={{ zIndex: 0 }}
        >
           {/* Lines to Projects (Right Side) */}
           {displayProjects.map((p, i) => {
              const y = displayProjects.length === 1 ? 50 : 20 + (60 / (displayProjects.length - 1)) * i;
              const isRunning = p.status === 'running';
              const strokeColor = isRunning ? "#10b981" : "#f43f5e";
              return (
                <path 
                  key={`proj-${p.id}`}
                  d={`M 50 50 C 60 50, 60 ${y}, 75 ${y}`} 
                  fill="none" 
                  stroke={strokeColor}
                  strokeWidth="0.5" 
                  strokeDasharray="1 1" 
                  strokeOpacity="0.6"
                  className={isRunning ? "animate-[dash_10s_linear_infinite]" : ""}
                />
              )
           })}

           {/* Lines to API Keys (Left Side) */}
           {displayKeys.map((k, i) => {
              const y = displayKeys.length === 1 ? 50 : 20 + (60 / (displayKeys.length - 1)) * i;
              const isActive = k.isActive;
              const strokeColor = isActive ? "#10b981" : "#f43f5e";
              return (
                <path 
                  key={`key-${k.id}`}
                  d={`M 50 50 C 40 50, 40 ${y}, 25 ${y}`} 
                  fill="none" 
                  stroke={strokeColor}
                  strokeWidth="0.5" 
                  strokeDasharray="1 1" 
                  strokeOpacity="0.6"
                  className={isActive ? "animate-[dash_10s_linear_infinite_reverse]" : ""}
                />
              )
           })}
        </svg>
        <style>{`
          @keyframes dash { to { stroke-dashoffset: -100; } }
        `}</style>

        <div className="flex flex-col md:flex-row items-center justify-between h-full relative z-10">
          
          {/* Left Side: API Keys */}
          <div className="flex flex-col w-full md:w-1/3 gap-4 order-2 md:order-1 mt-8 md:mt-0 items-center md:items-end">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#f97316] mb-2 hidden md:block">API Interfaces</h3>
            {displayKeys.length === 0 ? (
               <div className="text-center text-[#526173] text-xs p-4 border border-[#dbe8f3] rounded-lg border-dashed">
                 Belum ada API Key.
               </div>
            ) : (
               displayKeys.map((k) => (
                 <Link href={`/api-keys`} key={k.id} className="w-full max-w-[220px]">
                   <div className="group flex items-center justify-between bg-white border border-[#dbe8f3] p-3 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${k.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`} />
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-semibold text-[#172033] truncate">{k.name}</span>
                          <span className="text-[10px] text-[#526173] font-mono truncate">{k.keyPrefix}...</span>
                        </div>
                      </div>
                      <Key className="w-4 h-4 text-[#8c9bab] group-hover:text-indigo-500 transition-colors shrink-0" />
                   </div>
                 </Link>
               ))
            )}
          </div>

          {/* Central Node: Mution Gateway */}
          <div className="flex flex-col items-center order-1 md:order-2 shrink-0 my-4 md:my-0">
             <div className="h-20 w-20 rounded-full bg-white border-4 border-indigo-50 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)] relative">
                <Globe className="h-8 w-8 text-indigo-500" />
                {totalNodes > 0 && (
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" style={{ animationDuration: '3s' }} />
                )}
             </div>
             <span className="mt-3 text-xs font-bold uppercase tracking-widest text-indigo-700">Mution Gateway</span>
             <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                System Nominal
             </div>
          </div>

          {/* Right Side: Projects */}
          <div className="flex flex-col w-full md:w-1/3 gap-4 order-3 items-center md:items-start mt-8 md:mt-0">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#f97316] mb-2 hidden md:block">Cloud Deployments</h3>
            {displayProjects.length === 0 ? (
               <div className="text-center text-[#526173] text-xs p-4 border border-[#dbe8f3] rounded-lg border-dashed">
                 Belum ada proyek.
               </div>
            ) : (
               displayProjects.map((p) => {
                 const isRunning = p.status === 'running';
                 return (
                   <Link href={`/projects/${p.id}`} key={p.id} className="w-full max-w-[220px]">
                     <div className="group flex items-center justify-between bg-white border border-[#dbe8f3] p-3 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRunning ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`} />
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-semibold text-[#172033] truncate">{p.name}</span>
                            <span className="text-[10px] text-[#526173] truncate">{p.domain || p.runtime}</span>
                          </div>
                        </div>
                        <Box className="w-4 h-4 text-[#8c9bab] group-hover:text-indigo-500 transition-colors shrink-0" />
                     </div>
                   </Link>
                 )
               })
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

function ActivityHeatmap({ activities }: { activities: ActivityLog[] }) {
  const today = new Date();
  const days = Array.from({length: 35}).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (34 - i));
    return d.toISOString().split('T')[0];
  });

  const counts = activities?.reduce((acc, act) => {
     const date = act.createdAt.split('T')[0];
     acc[date] = (acc[date] || 0) + 1;
     return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card className="border-[#dbe8f3] shadow-[0_12px_34px_rgba(23,32,51,0.05)] bg-white h-full">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
           <div>
             <h3 className="text-sm font-bold text-[#172033] flex items-center gap-1.5">
               <ActivityIcon className="w-4 h-4 text-[#f97316]" /> Developer Pulse
             </h3>
             <p className="text-xs text-[#526173]">Aktivitas Mution 35 hari terakhir</p>
           </div>
           <div className="flex items-center gap-1 text-xs text-[#526173] bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
              <span className="text-emerald-600 font-bold">{activities?.length || 0}</span> logs
           </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 justify-start flex-1 content-start">
           {days.map(d => {
              const count = counts[d] || 0;
              let bg = "bg-[#edf3f8]"; 
              let hover = "hover:ring-[#dbe8f3]";
              if (count === 1) { bg = "bg-emerald-200"; hover = "hover:ring-emerald-300"; }
              else if (count >= 2 && count <= 4) { bg = "bg-emerald-400"; hover = "hover:ring-emerald-400"; }
              else if (count > 4) { bg = "bg-emerald-600"; hover = "hover:ring-emerald-500"; }

              return (
                <div 
                  key={d} 
                  title={`${d}: ${count} aktivitas`}
                  className={`w-3.5 h-3.5 sm:w-[22px] sm:h-[22px] rounded-[3px] ${bg} hover:ring-2 hover:ring-offset-1 ${hover} transition-all cursor-pointer`}
                />
              )
           })}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-[#526173] font-medium">
           <span>Less</span>
           <div className="flex gap-1">
             <div className="w-3 h-3 rounded-[2px] bg-[#edf3f8]" />
             <div className="w-3 h-3 rounded-[2px] bg-emerald-200" />
             <div className="w-3 h-3 rounded-[2px] bg-emerald-400" />
             <div className="w-3 h-3 rounded-[2px] bg-emerald-600" />
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
  const { data: activities, isLoading: activitiesLoading } = useListActivity();

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
              Pantau arsitektur <i>cloud</i> Anda, evaluasi kesehatan <i>deployment</i>, dan amati intensitas aktivitas (Pulse) di Mution dalam satu layar interaktif.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="rounded-md border-[#c9d8e7] bg-white text-[#172033] hover:bg-[#eef8ff]"
              asChild
            >
              <Link href="/projects">
                Semua Proyek
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button className="rounded-md bg-[#f97316] text-white hover:bg-[#ea580c] shadow-md shadow-orange-500/20" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4 mr-1" />
                Proyek Baru
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Interactive Node Map */}
      <section>
        <div className="mb-4 flex items-center justify-between">
           <h2 className="text-sm font-extrabold tracking-widest uppercase text-[#172033]">Network Topology</h2>
           <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Live View
           </span>
        </div>
        {(projectsLoading || apiKeysLoading) ? (
           <Skeleton className="w-full h-[300px] rounded-xl" />
        ) : (
           <ArchitectureMap projects={projects || []} apiKeys={apiKeys || []} />
        )}
      </section>

      <div className="grid lg:grid-cols-12 gap-8">
         
         {/* Kiri: Activity Pulse & Terminal View */}
         <div className="lg:col-span-7 space-y-6 flex flex-col">
            <ActivityHeatmap activities={activities || []} />
            
            <Card className="bg-[#172033] border-[#172033] shadow-lg rounded-xl overflow-hidden flex-shrink-0">
               <div className="flex items-center justify-between px-4 py-2 border-b border-[#2d3a54] bg-[#0f172a]">
                 <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                   <Terminal className="h-3 w-3" /> System Tail
                 </div>
                 <div className="flex gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                 </div>
               </div>
               <CardContent className="p-5 font-mono text-[11px] leading-relaxed space-y-1.5 text-slate-300 min-h-[140px]">
                 <div className="text-indigo-400">{'>'} mution system check --realtime</div>
                 <div className="opacity-80">[{new Date().toLocaleTimeString('en-US', {hour12: false})}] establishing secure tunnel... OK</div>
                 <div className="opacity-80">[{new Date().toLocaleTimeString('en-US', {hour12: false})}] indexing active resource nodes...</div>
                 {projects?.slice(0,1).map(p => (
                    <div key={p.id} className="text-emerald-400 pl-4">→ ping {p.name}: {Math.floor(Math.random() * 20 + 10)}ms (status: {p.status})</div>
                 ))}
                 {apiKeys?.slice(0,1).map(k => (
                    <div key={k.id} className="text-emerald-400 pl-4">→ auth key {k.keyPrefix}...: verified (active: {k.isActive ? 'true' : 'false'})</div>
                 ))}
                 <div className="text-amber-400 mt-2">{'>'} waiting for incoming traffic...</div>
               </CardContent>
            </Card>
         </div>

         {/* Kanan: Quick Access / Projects Mini List */}
         <div className="lg:col-span-5 space-y-6">
            <div>
               <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-[#172033]">Quick Resources</h2>
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
