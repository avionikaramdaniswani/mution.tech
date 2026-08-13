import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey,
  useStopProject, useRestartProject, useDeleteProject,
  useGetProjectEnv, getGetProjectEnvQueryKey, useSetProjectEnv, useDeleteProjectEnv,
  useListDeployments, getListDeploymentsQueryKey, useTriggerDeployment, useRollbackDeployment,
  getListProjectsQueryKey, useUpdateProject,
} from "@workspace/api-client-react";
import type { Deployment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ProjectStatusBadge } from "./index";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, BookOpen, Code2, Copy, ExternalLink, Eye, EyeOff, FileText, Globe, Loader2, MoreHorizontal, Power, RefreshCw, RotateCcw, Trash, Plus, Trash2, Info, Terminal, ArrowDownToLine } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const ACTIVE_PROJECT_STATUSES = new Set<string>(["building", "deploying"]);
const ACTIVE_DEPLOYMENT_STATUSES = new Set<string>(["queued", "building", "deploying"]);

function isDeploymentActive(deployment: Deployment | null | undefined): boolean {
  return ACTIVE_DEPLOYMENT_STATUSES.has(deployment?.status ?? "");
}

function slugifyDomain(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "app";
}

const hostingRates: Record<string, { ram: string, perMinute: number, fit: string }> = {
  "256mb": { ram: "256 MB", perMinute: 0.25, fit: "Prototype ringan" },
  "512mb": { ram: "512 MB", perMinute: 0.49, fit: "API kecil" },
  "1gb": { ram: "1 GB", perMinute: 0.9, fit: "Web app aktif" },
  "2gb": { ram: "2 GB", perMinute: 1.8, fit: "Backend produksi" },
  "4gb": { ram: "4 GB", perMinute: 3.6, fit: "Worker dan API ramai" },
  "8gb": { ram: "8 GB", perMinute: 7.2, fit: "Beban berat" },
};

function RealtimeChart({ data }: { data: any[] }) {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false}
            axisLine={false} 
          />
          <YAxis 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ fontSize: '13px' }}
            labelStyle={{ color: '#888', marginBottom: '4px' }}
          />
          <Line 
            type="monotone" 
            dataKey="cpu" 
            name="CPU Usage" 
            stroke="#14b8a6" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 6 }} 
          />
          <Line 
            type="monotone" 
            dataKey="ram" 
            name="RAM Usage" 
            stroke="#f97316" 
            strokeWidth={3}
            dot={false} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ProjectDetail() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [logDeployment, setLogDeployment] = useState<Deployment | null>(null);

  const latestDeployLogRef = useRef<HTMLPreElement>(null);
  const runtimeLogRef = useRef<HTMLPreElement>(null);
  const modalLogRef = useRef<HTMLPreElement>(null);

  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId, { 
    query: {
      enabled: !!projectId,
      queryKey: getGetProjectQueryKey(projectId),
      refetchInterval: (query) => {
        const current = query.state.data as { status?: string } | undefined;
        return ACTIVE_PROJECT_STATUSES.has(current?.status ?? "") ? 2500 : false;
      },
    }
  });

  const { data: deployments, isLoading: isLoadingDeployments } = useListDeployments(projectId, {
    query: {
      enabled: !!projectId,
      queryKey: getListDeploymentsQueryKey(projectId),
      refetchInterval: (query) => {
        const current = query.state.data as Deployment[] | undefined;
        return ACTIVE_PROJECT_STATUSES.has(project?.status ?? "") || current?.some(isDeploymentActive) ? 2500 : false;
      },
    }
  });
  
  // SSE states for live logs
  const [liveRuntimeLog, setLiveRuntimeLog] = useState<string | null>(null);
  const [liveBuildLog, setLiveBuildLog] = useState<string | null>(null);
  const [liveModalBuildLog, setLiveModalBuildLog] = useState<string | null>(null);
  
  // SSE state for usage metrics
  const [metricsHistory, setMetricsHistory] = useState<{ time: string, cpu: number, ram: number }[]>(
    Array(20).fill({ time: '', cpu: 0, ram: 0 })
  );

  const projectDeployments = deployments?.filter(d => d.projectId === projectId) || [];
  const latestDeployment = projectDeployments[0] ?? null;
  const hasActiveDeployment = isDeploymentActive(latestDeployment) || ACTIVE_PROJECT_STATUSES.has(project?.status ?? "");
  const selectedLogDeployment = logDeployment
    ? projectDeployments.find((deployment) => deployment.id === logDeployment.id) ?? logDeployment
    : null;

  // Usage Metrics SSE
  useEffect(() => {
    if (!projectId || project?.status !== "running") return;
    const es = new EventSource(`/api/projects/${projectId}/metrics`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const now = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setMetricsHistory(prev => {
          // If first meaningful data comes in, we can start pruning the empty fill
          const isFilling = prev[0].time === '';
          const updated = [...prev, { time: now, cpu: data.cpu, ram: data.ram }];
          if (updated.length > 20) {
            return isFilling ? updated.filter(item => item.time !== '').slice(-20) : updated.slice(updated.length - 20);
          }
          return updated;
        });
      } catch (err) {}
    };
    return () => es.close();
  }, [projectId, project?.status]);

  // Runtime Logs SSE
  useEffect(() => {
    if (!projectId || project?.status !== "running") return;
    const es = new EventSource(`/api/projects/${projectId}/runtime-logs/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.logs) setLiveRuntimeLog(data.logs);
      } catch (err) {}
    };
    return () => es.close();
  }, [projectId, project?.status]);

  // Latest Build Log SSE
  useEffect(() => {
    if (!projectId || !latestDeployment?.id) return;
    if (["success", "failed", "cancelled"].includes(latestDeployment.status)) return;
    const es = new EventSource(`/api/projects/${projectId}/deployments/${latestDeployment.id}/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.buildLog) setLiveBuildLog(data.buildLog);
      } catch (err) {}
    };
    return () => es.close();
  }, [projectId, latestDeployment?.id, latestDeployment?.status]);

  // Modal Build Log SSE
  useEffect(() => {
    if (!projectId || !selectedLogDeployment?.id) return;
    if (["success", "failed", "cancelled"].includes(selectedLogDeployment.status)) return;
    const es = new EventSource(`/api/projects/${projectId}/deployments/${selectedLogDeployment.id}/stream`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.buildLog) setLiveModalBuildLog(data.buildLog);
      } catch (err) {}
    };
    return () => es.close();
  }, [projectId, selectedLogDeployment?.id, selectedLogDeployment?.status]);

  useEffect(() => {
    if (latestDeployLogRef.current) {
      latestDeployLogRef.current.scrollTop = latestDeployLogRef.current.scrollHeight;
    }
  }, [latestDeployment?.buildLog, liveBuildLog]);

  useEffect(() => {
    if (runtimeLogRef.current) {
      runtimeLogRef.current.scrollTop = runtimeLogRef.current.scrollHeight;
    }
  }, [liveRuntimeLog]);

  useEffect(() => {
    if (modalLogRef.current) {
      modalLogRef.current.scrollTop = modalLogRef.current.scrollHeight;
    }
  }, [selectedLogDeployment?.buildLog, liveModalBuildLog]);

  const { data: envVars, isLoading: isLoadingEnv } = useGetProjectEnv(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectEnvQueryKey(projectId) }
  });



  const triggerDeploy = useTriggerDeployment();
  const triggerRollback = useRollbackDeployment();
  const stopProject = useStopProject();
  const restartProject = useRestartProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const [subdomainInput, setSubdomainInput] = useState("");
  const [isAddDomainOpen, setIsAddDomainOpen] = useState(false);
  const [newCustomDomain, setNewCustomDomain] = useState("");

  const allDomains = project?.domain ? project.domain.split(",").map(d => d.trim()).filter(Boolean) : [];
  const mutionDomain = allDomains.find(d => d.endsWith(".mution.tech")) || "";
  const customDomains = allDomains.filter(d => !d.endsWith(".mution.tech"));

  useEffect(() => {
    if (mutionDomain) {
      setSubdomainInput(mutionDomain.replace(".mution.tech", ""));
    }
  }, [mutionDomain]);

  const handleSaveSubdomain = () => {
    let clean = subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!clean) {
      toast({ title: "Masukkan nama subdomain terlebih dahulu", variant: "destructive" });
      return;
    }
    const newMution = `${clean}.mution.tech`;
    if (newMution === mutionDomain) {
      toast({ title: "Subdomain tidak berubah" });
      return;
    }
    
    const newDomains = [newMution, ...customDomains].join(",");
    
    updateProject.mutate({ id: projectId, data: { domain: newDomains } }, {
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
         toast({ 
           title: "Subdomain berhasil diperbarui!", 
           description: "PASTIKAN UNTUK DEPLOY ULANG agar rute trafik Traefik diterapkan ke domain ini." 
         });
       },
       onError: (err: any) => {
         const rawErr = err?.data?.error || err?.message;
         toast({ title: "Gagal menyimpan subdomain", description: rawErr, variant: "destructive" });
       }
    });
  };

  const handleAddCustomDomain = () => {
    let clean = newCustomDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!clean || !clean.includes(".")) {
       toast({ title: "Masukkan domain valid yang memiliki TLD", variant: "destructive" });
       return;
    }

    if (customDomains.includes(clean) || mutionDomain === clean) {
       toast({ title: "Domain sudah ada", variant: "destructive" });
       return;
    }

    const newDomains = [...allDomains, clean].join(",");
    
    updateProject.mutate({ id: projectId, data: { domain: newDomains } }, {
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
         toast({ 
           title: "Custom domain berhasil ditambahkan!",
           description: "PASTIKAN UNTUK DEPLOY ULANG agar rute trafik Traefik diterapkan ke domain ini."
         });
         setIsAddDomainOpen(false);
         setNewCustomDomain("");
       },
       onError: (err: any) => {
         const rawErr = err?.data?.error || err?.message;
         toast({ title: "Gagal menyimpan domain", description: rawErr, variant: "destructive" });
       }
    });
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    const newDomains = allDomains.filter(d => d !== domainToRemove).join(",");
    updateProject.mutate({ id: projectId, data: { domain: newDomains } }, {
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
         toast({ 
           title: "Domain berhasil dihapus!",
           description: "PASTIKAN UNTUK DEPLOY ULANG agar rute lama segera dicabut."
         });
       },
       onError: (err: any) => {
         const rawErr = err?.data?.error || err?.message;
         toast({ title: "Gagal menghapus domain", description: rawErr, variant: "destructive" });
       }
    });
  };

  const [baseDirectoryInput, setBaseDirectoryInput] = useState<string | null>(null);
  const [buildCommandInput, setBuildCommandInput] = useState<string | null>(null);
  const [startCommandInput, setStartCommandInput] = useState<string | null>(null);

  const handleSaveProjectSettings = () => {
    const payload: any = {};
    if (baseDirectoryInput !== null) payload.baseDirectory = baseDirectoryInput;
    if (buildCommandInput !== null) payload.buildCommand = buildCommandInput;
    if (startCommandInput !== null) payload.startCommand = startCommandInput;

    if (Object.keys(payload).length === 0) return;

    updateProject.mutate(
      { id: projectId, data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          setBaseDirectoryInput(null);
          setBuildCommandInput(null);
          setStartCommandInput(null);
          toast({ title: "Pengaturan proyek disimpan" });
        },
        onError: (err: any) => {
          toast({ title: "Gagal menyimpan", description: err?.message, variant: "destructive" });
        }
      }
    );
  };
  
  const handleDeploy = () => {
    triggerDeploy.mutate(
      { id: projectId, data: {} },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDeploymentsQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          void queryClient.refetchQueries({ queryKey: getListDeploymentsQueryKey(projectId) });
          toast({ title: "Deployment dimulai" });
        },
        onError: (error: any) => {
          queryClient.invalidateQueries({ queryKey: getListDeploymentsQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({
            title: "Deployment gagal",
            description: error?.data?.error || error?.message || "Cek log deployment untuk detail.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleStop = () => {
    stopProject.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Proyek dihentikan" });
        }
      }
    );
  };

  const handleRestart = () => {
    restartProject.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Proyek di-restart" });
        }
      }
    );
  };

  const handleDelete = () => {
    deleteProject.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({ title: "Proyek berhasil dihapus" });
          window.location.href = "/projects";
        },
        onError: (err: any) => {
          toast({
            title: "Gagal menghapus proyek",
            description: err?.message || "Terjadi kesalahan saat menghapus proyek",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoadingProject) {
    return <div className="space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[400px]" /></div>;
  }

  if (!project) {
    return <div className="text-muted-foreground py-12 text-center">Proyek tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <Link href="/projects">
            <Button variant="outline" size="icon" className="shrink-0 mt-1 sm:mt-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-sm text-muted-foreground">
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{project.runtime}</span>
              {project.domain && (
                <a href={`https://${project.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline break-all">
                  <Globe className="h-3 w-3 shrink-0" />
                  <span className="truncate">{project.domain}</span>
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleStop}
            disabled={project.status === 'stopped' || stopProject.isPending}
            className="flex-1 sm:flex-none"
          >
            <Power className="h-4 w-4 mr-2" /> Hentikan
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRestart}
            disabled={restartProject.isPending}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Restart
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted w-full justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="overview" className="shrink-0">Ringkasan</TabsTrigger>
          <TabsTrigger value="usage" className="shrink-0">Usage</TabsTrigger>
          <TabsTrigger value="domain" className="shrink-0">Domain</TabsTrigger>
          <TabsTrigger value="deployments" className="shrink-0">Deployment</TabsTrigger>
          <TabsTrigger value="runtime-logs" className="shrink-0">Runtime Logs</TabsTrigger>
          <TabsTrigger value="environment" className="shrink-0">Variabel Env</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {project.domain && project.status === 'running' && (
            <Card className="border-emerald-500/40 bg-emerald-500/5">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-500/15 p-2.5">
                    <Globe className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-0.5">Link Aktif</div>
                    <a
                      href={`https://${project.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-primary hover:underline break-all"
                    >
                      https://{project.domain}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://${project.domain}`);
                      toast({ title: "URL disalin ke clipboard" });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Salin
                  </Button>
                  <a href={`https://${project.domain}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Buka Website
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Detail Proyek</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Repository</div>
                  {project.repoUrl ? (
                    <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-sm break-all">
                      {project.repoUrl}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">Belum ada repository yang terhubung</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Kapasitas Server</div>
                  <div className="text-sm font-medium">
                    {project.ramTier && hostingRates[project.ramTier as string] ? (
                      <>
                        {hostingRates[project.ramTier as string].ram} 
                        <span className="text-muted-foreground font-normal ml-2">
                          (Rp {hostingRates[project.ramTier as string].perMinute}/mnt)
                        </span>
                      </>
                    ) : (
                      "Default (256 MB)"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Root Directory</div>
                  <Input
                    placeholder="/ (kosongkan jika bukan monorepo)"
                    value={baseDirectoryInput ?? project.baseDirectory ?? ""}
                    onChange={(e) => setBaseDirectoryInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Build Command (Opsional)</div>
                  <Input
                    placeholder="e.g. pnpm run build (kosongkan untuk otomatis)"
                    value={buildCommandInput ?? (project as any).buildCommand ?? ""}
                    onChange={(e) => setBuildCommandInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Start Command (Opsional)</div>
                  <Input
                    placeholder="e.g. node backend/dist/index.mjs (kosongkan untuk otomatis)"
                    value={startCommandInput ?? (project as any).startCommand ?? ""}
                    onChange={(e) => setStartCommandInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    disabled={
                      (baseDirectoryInput === null && buildCommandInput === null && startCommandInput === null) ||
                      updateProject.isPending
                    }
                    onClick={handleSaveProjectSettings}
                  >
                    Simpan Pengaturan
                  </Button>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Dibuat</div>
                  <div className="text-sm">{formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: id })}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Terakhir Deploy</div>
                  <div className="text-sm">
                    {project.lastDeployedAt 
                      ? formatDistanceToNow(new Date(project.lastDeployedAt), { addSuffix: true, locale: id }) 
                      : "Belum pernah deploy"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive">Zona Berbahaya</CardTitle>
                <CardDescription>Tindakan yang tidak bisa dibatalkan.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Menghapus proyek akan menghapus semua deployment, database, dan variabel environment secara permanen.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Hapus Proyek</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Yakin ingin menghapus?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tindakan ini tidak bisa dibatalkan. Semua data proyek <span className="font-semibold text-foreground">{project.name}</span> akan dihapus permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Usage Metrics</CardTitle>
              <CardDescription>Pemakaian resource server oleh aplikasimu secara real-time</CardDescription>
            </CardHeader>
            <CardContent>
              {project?.status !== 'running' ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-md bg-muted/20">
                  <p className="text-muted-foreground font-medium">Aplikasi Sedang Tidak Berjalan</p>
                  <p className="text-xs text-muted-foreground mt-1">Metrik usage hanya tersedia ketika aplikasi aktif.</p>
                </div>
              ) : (
                <div className="w-full pb-4">
                  <RealtimeChart data={metricsHistory} />
                  <div className="flex justify-center gap-8 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#14b8a6]"></div>
                      <span className="text-sm font-medium">CPU Usage: {metricsHistory[metricsHistory.length - 1]?.cpu.toFixed(1) || 0}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
                      <span className="text-sm font-medium">RAM Usage: {metricsHistory[metricsHistory.length - 1]?.ram.toFixed(1) || 0}%</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domain" className="mt-6 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Pengaturan Domain & Subdomain
              </CardTitle>
              <CardDescription>
                Hubungkan domain sendiri atau gunakan subdomain mution.tech secara gratis dengan SSL otomatis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                <Info className="h-4 w-4 stroke-amber-500" />
                <AlertTitle>Penting: Wajib Deploy Ulang</AlertTitle>
                <AlertDescription>
                  Setiap kamu menambah, mengubah, atau menghapus domain di bawah ini, <strong>kamu wajib menekan tombol "Deploy Ulang"</strong>. (Tombol Restart tidak akan menerapkan konfigurasi rute).
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border border-border/50 p-4 space-y-3 bg-card">
                <h4 className="text-sm font-semibold">Subdomain Mution.tech</h4>
                <p className="text-xs text-muted-foreground">
                  Subdomain gratis yang langsung aktif tanpa perlu mengatur DNS.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                  <div className="flex-1 flex items-center bg-muted/50 border border-input rounded-md overflow-hidden">
                    <span className="text-xs text-muted-foreground pl-3 pr-1 py-2 font-mono select-none">https://</span>
                    <input 
                      type="text" 
                      className="flex-1 bg-transparent border-none outline-none text-sm font-mono focus:ring-0 px-1 py-2 w-full"
                      value={subdomainInput}
                      onChange={(e) => setSubdomainInput(e.target.value)}
                      placeholder={slugifyDomain(project.name)}
                    />
                    <span className="text-xs text-muted-foreground pr-3 pl-1 py-2 font-mono select-none">.mution.tech</span>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleSaveSubdomain}
                    disabled={updateProject.isPending}
                  >
                    Simpan
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
                <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold">Custom Domains</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tambahkan domain kustom (contoh: perusahaan.com) lalu arahkan DNS ke Target berikut.
                    </p>
                  </div>
                  <Dialog open={isAddDomainOpen} onOpenChange={setIsAddDomainOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="shrink-0">
                        <Plus className="h-4 w-4 mr-1" /> Add Domain
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Custom Domain</DialogTitle>
                        <DialogDescription>
                          Masukkan nama domain yang ingin kamu hubungkan ke proyek ini.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Domain Name</Label>
                          <Input 
                            placeholder="app.perusahaan.com" 
                            value={newCustomDomain}
                            onChange={(e) => setNewCustomDomain(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDomainOpen(false)}>Batal</Button>
                        <Button onClick={handleAddCustomDomain} disabled={updateProject.isPending}>Tambahkan</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Domain Name</TableHead>
                        <TableHead>DNS Target</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customDomains.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-sm text-muted-foreground italic">
                            Belum ada custom domain.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customDomains.map((d) => (
                          <TableRow key={d}>
                            <TableCell className="font-mono text-xs">{d}</TableCell>
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-2">
                                target-{project.id}.mution.tech
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`target-${project.id}.mution.tech`);
                                    toast({ title: "DNS Target disalin!" });
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveDomain(d)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {customDomains.length > 0 && (
                  <div className="p-4 border-t border-border/50 bg-muted/10">
                    <p className="text-xs text-muted-foreground">
                      Untuk <strong>subdomain</strong> (misal: <code>app.domain.com</code>), buat record tipe <strong>CNAME</strong> ke DNS Target.
                      <br />
                      Untuk <strong>root domain</strong> (misal: <code>domain.com</code>), buat record tipe <strong>ALIAS / ANAME</strong> ke DNS Target.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployments" className="mt-6">
          <Card className="border-border/50">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Deployment</CardTitle>
                <CardDescription>Log build dan riwayat deployment project ini.</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={handleDeploy}
                disabled={triggerDeploy.isPending || hasActiveDeployment}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${triggerDeploy.isPending ? "animate-spin" : ""}`} />
                Deploy ulang
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">Log Terbaru</div>
                    <div className="text-xs text-muted-foreground">
                      {latestDeployment
                        ? `${latestDeployment.status} - ${formatDistanceToNow(new Date(latestDeployment.createdAt), { addSuffix: true, locale: id })}`
                        : "Belum ada deployment yang berjalan"}
                    </div>
                  </div>
                  {latestDeployment && (
                    <Button variant="ghost" size="sm" onClick={() => setLogDeployment(latestDeployment)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Buka penuh
                    </Button>
                  )}
                </div>
                <div className="relative group">
                  <pre ref={latestDeployLogRef} className="max-h-[380px] min-h-[160px] overflow-auto p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap rounded-md bg-muted/30 border border-border">
                    {liveBuildLog || latestDeployment?.buildLog || "Log deployment akan muncul di sini setelah project dibuat dan deploy otomatis dimulai."}
                  </pre>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8 shadow-md z-10"
                    onClick={() => {
                      if (latestDeployLogRef.current) {
                        latestDeployLogRef.current.scrollTo({ top: latestDeployLogRef.current.scrollHeight, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isLoadingDeployments ? (
                <Skeleton className="h-[200px]" />
              ) : projectDeployments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  Belum ada deployment
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Commit</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Durasi</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectDeployments.map((deployment) => (
                      <TableRow key={deployment.id}>
                        <TableCell>
                          <Badge variant={
                            deployment.status === 'running' ? 'default' :
                            deployment.status === 'failed' ? 'destructive' :
                            'secondary'
                          } className={deployment.status === 'running' ? 'bg-emerald-500' : ''}>
                            {deployment.status === 'running' ? 'Berjalan' :
                             deployment.status === 'failed' ? 'Gagal' :
                             deployment.status === 'building' ? 'Build' :
                             deployment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs max-w-[200px] truncate" title={deployment.commitMessage || deployment.commitHash || ''}>
                            {deployment.commitMessage || deployment.commitHash || 'Deploy manual'}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true, locale: id })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {deployment.durationMs 
                            ? `${(deployment.durationMs / 1000).toFixed(1)}s` 
                            : deployment.deployedAt 
                              ? `${((new Date(deployment.deployedAt).getTime() - new Date(deployment.createdAt).getTime()) / 1000).toFixed(1)}s`
                              : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLogDeployment(deployment)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Logs
                          </Button>
                          {deployment.status === 'running' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                triggerRollback.mutate(
                                  { id: projectId, deploymentId: deployment.id },
                                  {
                                    onSuccess: () => {
                                      queryClient.invalidateQueries({ queryKey: getListDeploymentsQueryKey(projectId) });
                                      toast({ title: "Rollback dimulai" });
                                    }
                                  }
                                );
                              }}
                              disabled={triggerRollback.isPending}
                            >
                              Rollback
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runtime-logs" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Runtime Logs</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled
                >
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Live Stream Active
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {project?.status !== 'running' ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-md bg-muted/20">
                  <Terminal className="h-8 w-8 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-medium">Aplikasi Sedang Tidak Berjalan</p>
                  <p className="text-xs text-muted-foreground mt-1">Runtime logs hanya tersedia ketika aplikasi aktif (berstatus running).</p>
                </div>
              ) : (
                <div className="relative group">
                  <pre ref={runtimeLogRef} className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/40 p-4 pb-12 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    {liveRuntimeLog ? (
                      liveRuntimeLog
                    ) : (
                      "Mengambil logs / belum ada log yang tersedia."
                    )}
                  </pre>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8 shadow-md z-10"
                    onClick={() => {
                      if (runtimeLogRef.current) {
                        runtimeLogRef.current.scrollTo({ top: runtimeLogRef.current.scrollHeight, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="environment" className="mt-6">
          <EnvVarsTab projectId={projectId} envVars={envVars} isLoading={isLoadingEnv} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedLogDeployment} onOpenChange={(open) => !open && setLogDeployment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Log Deployment</DialogTitle>
            <DialogDescription>
              {selectedLogDeployment?.commitMessage || selectedLogDeployment?.commitHash || "Deploy manual"}
            </DialogDescription>
          </DialogHeader>
          <pre ref={modalLogRef} className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/40 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap">
            {liveModalBuildLog || selectedLogDeployment?.buildLog || "Belum ada log untuk deployment ini."}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EnvVarsTab({ projectId, envVars, isLoading }: { projectId: number; envVars: any; isLoading: boolean }) {
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [visibleEnvIds, setVisibleEnvIds] = useState<Record<number, boolean>>({});
  const [bulkMode, setBulkMode] = useState<"env" | "json" | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const setEnv = useSetProjectEnv();
  const delEnv = useDeleteProjectEnv();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAdd = () => {
    if (!newKey.trim() || !newVal) return;
    setEnv.mutate(
      { id: projectId, data: { key: newKey.trim(), value: newVal } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectEnvQueryKey(projectId) });
          setNewKey("");
          setNewVal("");
          toast({ title: "Variabel environment ditambahkan" });
        },
        onError: (err: any) => {
          toast({ title: "Gagal menyimpan", description: err?.message ?? "Coba lagi", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (envId: number) => {
    delEnv.mutate(
      { id: projectId, envId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectEnvQueryKey(projectId) });
          toast({ title: "Variabel environment dihapus" });
        },
        onError: (err: any) => {
          toast({ title: "Gagal menghapus", description: err?.message ?? "Coba lagi", variant: "destructive" });
        },
      }
    );
  };

  const openBulkEdit = (mode: "env" | "json") => {
    const list: Array<{ key: string; value?: string }> = envVars || [];
    if (mode === "env") {
      setBulkText(
        list.length
          ? list.map((e) => `${e.key}=${e.value ?? ""}`).join("\n")
          : "# Contoh:\n# API_KEY=nilai_kamu\n# DATABASE_URL=postgresql://..."
      );
    } else {
      const obj: Record<string, string> = {};
      list.forEach((e) => { obj[e.key] = e.value ?? ""; });
      setBulkText(list.length ? JSON.stringify(obj, null, 2) : '{\n  "API_KEY": "nilai_kamu"\n}');
    }
    setBulkMode(mode);
    setBulkError(null);
  };

  const parseBulkPairs = (): Array<{ key: string; value: string }> | string => {
    if (bulkMode === "env") {
      const pairs: Array<{ key: string; value: string }> = [];
      for (const line of bulkText.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx < 0) return `Baris tidak valid: "${trimmed}" — format harus KEY=value`;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!key || !value) continue;
        pairs.push({ key, value });
      }
      return pairs;
    } else {
      try {
        const obj = JSON.parse(bulkText);
        if (typeof obj !== "object" || Array.isArray(obj) || obj === null)
          return 'JSON harus berupa objek, contoh: { "KEY": "value" }';
        const pairs: Array<{ key: string; value: string }> = [];
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value !== "string" || !value) continue;
          pairs.push({ key, value });
        }
        return pairs;
      } catch {
        return "JSON tidak valid — periksa format dan tanda baca";
      }
    }
  };

  const handleBulkSave = async () => {
    setBulkError(null);
    const result = parseBulkPairs();
    if (typeof result === "string") { setBulkError(result); return; }
    if (result.length === 0) { setBulkError("Tidak ada nilai yang diisi. Tulis value untuk key yang ingin disimpan."); return; }

    setIsBulkSaving(true);
    setBulkProgress({ current: 0, total: result.length });
    let saved = 0;
    let failed = 0;
    for (let i = 0; i < result.length; i++) {
      const { key, value } = result[i];
      setBulkProgress({ current: i + 1, total: result.length });
      try {
        await setEnv.mutateAsync({ id: projectId, data: { key, value } });
        saved++;
      } catch {
        failed++;
      }
    }
    setIsBulkSaving(false);
    setBulkProgress(null);
    queryClient.invalidateQueries({ queryKey: getGetProjectEnvQueryKey(projectId) });
    setBulkMode(null);
    toast({
      title: failed === 0 ? `${saved} variabel disimpan` : `${saved} disimpan, ${failed} gagal`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Variabel Environment</CardTitle>
              <CardDescription>Secret dan konfigurasi yang tersedia di aplikasi kamu saat runtime.</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowGuide(true)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Panduan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openBulkEdit("env")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Edit dengan ENV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openBulkEdit("json")}>
                  <Code2 className="h-4 w-4 mr-2" />
                  Edit dengan JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label>Nama</Label>
              <Input
                placeholder="API_KEY"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Nilai</Label>
              <Input
                type="password"
                placeholder="Nilai secret"
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd} disabled={setEnv.isPending || !newKey.trim() || !newVal}>
              Tambah
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-[200px]" />
          ) : !envVars || envVars.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
              Belum ada variabel environment
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envVars.map((env: any) => {
                  const isVisible = !!visibleEnvIds[env.id];
                  return (
                    <TableRow key={env.id}>
                      <TableCell className="font-mono text-sm">{env.key}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className={isVisible ? "text-foreground font-sans text-xs break-all max-w-[280px]" : ""}>
                            {isVisible ? (env.value || "—") : "••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                            onClick={() => setVisibleEnvIds((prev) => ({ ...prev, [env.id]: !prev[env.id] }))}
                            title={isVisible ? "Sembunyikan nilai" : "Tampilkan nilai"}
                          >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(env.id)}
                          disabled={delEnv.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Panduan */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Panduan Variabel Environment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold mb-1">Apa itu env vars?</p>
              <p className="text-muted-foreground">Variabel environment adalah cara menyimpan konfigurasi dan secret (API key, password, URL) di luar kode supaya aman dan mudah diubah tanpa mengubah source code.</p>
            </div>
            <div>
              <p className="font-semibold mb-2">Cara akses di kode</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Node.js</p>
                  <code className="block bg-muted rounded px-3 py-2 font-mono text-xs">process.env.API_KEY</code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Python</p>
                  <code className="block bg-muted rounded px-3 py-2 font-mono text-xs">import os; os.environ['API_KEY']</code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">PHP</p>
                  <code className="block bg-muted rounded px-3 py-2 font-mono text-xs">$_ENV['API_KEY']</code>
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold mb-1">Format nama</p>
              <p className="text-muted-foreground">Gunakan huruf kapital dan underscore: <code className="bg-muted px-1 rounded font-mono">DATABASE_URL</code>, <code className="bg-muted px-1 rounded font-mono">API_SECRET_KEY</code>.</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-amber-700 dark:text-amber-400 text-xs">
              ⚠️ Perubahan env vars berlaku setelah deploy ulang dari tab Deployment.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit */}
      <Dialog open={!!bulkMode} onOpenChange={(open) => !open && setBulkMode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bulkMode === "env" ? "Edit dengan ENV" : "Edit dengan JSON"}
            </DialogTitle>
            <DialogDescription>
              {bulkMode === "env"
                ? "Satu baris per variabel, format KEY=value. Baris # diabaikan. Key dengan value kosong tidak akan diubah."
                : 'Format { "KEY": "value" }. Key dengan value string kosong tidak akan diubah.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              className="font-mono text-xs min-h-[220px] resize-y"
              value={bulkText}
              onChange={(e) => { setBulkText(e.target.value); setBulkError(null); }}
              spellCheck={false}
              placeholder={bulkMode === "env" ? "API_KEY=nilai_kamu\nDATABASE_URL=postgresql://..." : '{\n  "API_KEY": "nilai_kamu"\n}'}
            />
            {bulkError && <p className="text-xs text-destructive">{bulkError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setBulkMode(null)} disabled={isBulkSaving}>Batal</Button>
            <Button onClick={handleBulkSave} disabled={isBulkSaving}>
              {isBulkSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {bulkProgress ? `Menyimpan (${bulkProgress.current}/${bulkProgress.total})...` : "Menyimpan..."}
                </span>
              ) : (
                "Simpan"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
