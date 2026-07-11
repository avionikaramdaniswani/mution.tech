import { useState } from "react";
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

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, BookOpen, Code2, Copy, FileText, Globe, MoreHorizontal, Power, RefreshCw, RotateCcw, Trash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const ACTIVE_PROJECT_STATUSES = new Set<string>(["building", "deploying"]);
const ACTIVE_DEPLOYMENT_STATUSES = new Set<string>(["queued", "building", "deploying"]);

function isDeploymentActive(deployment: Deployment | null | undefined): boolean {
  return ACTIVE_DEPLOYMENT_STATUSES.has(deployment?.status ?? "");
}

export default function ProjectDetail() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [logDeployment, setLogDeployment] = useState<Deployment | null>(null);

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
  
  const projectDeployments = deployments?.filter(d => d.projectId === projectId) || [];
  const latestDeployment = projectDeployments[0] ?? null;
  const hasActiveDeployment = isDeploymentActive(latestDeployment) || ACTIVE_PROJECT_STATUSES.has(project?.status ?? "");
  const selectedLogDeployment = logDeployment
    ? projectDeployments.find((deployment) => deployment.id === logDeployment.id) ?? logDeployment
    : null;

  const { data: envVars, isLoading: isLoadingEnv } = useGetProjectEnv(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectEnvQueryKey(projectId) }
  });

  const triggerDeploy = useTriggerDeployment();
  const triggerRollback = useRollbackDeployment();
  const stopProject = useStopProject();
  const restartProject = useRestartProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const [baseDirectoryInput, setBaseDirectoryInput] = useState<string | null>(null);

  const handleSaveBaseDirectory = () => {
    if (baseDirectoryInput === null) return;
    updateProject.mutate(
      { id: projectId, data: { baseDirectory: baseDirectoryInput } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          setBaseDirectoryInput(null);
          toast({ title: "Root directory disimpan", description: "Deploy ulang untuk menerapkan perubahan." });
        },
        onError: (error: any) => {
          toast({
            title: "Gagal menyimpan",
            description: error?.data?.error || error?.message,
            variant: "destructive",
          });
        },
      },
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
          toast({ title: "Proyek dihapus" });
          setLocation("/projects");
        }
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
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{project.runtime}</span>
            {project.domain && (
              <a href={`https://${project.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <Globe className="h-3 w-3" />
                {project.domain}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleStop}
            disabled={project.status === 'stopped' || stopProject.isPending}
          >
            <Power className="h-4 w-4 mr-2" /> Hentikan
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRestart}
            disabled={restartProject.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Restart
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="deployments">Deployment</TabsTrigger>
          <TabsTrigger value="environment">Variabel Env</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
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
                  <div className="text-sm font-medium text-muted-foreground mb-1">Root Directory</div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="/apps/api (kosongkan jika bukan monorepo)"
                      value={baseDirectoryInput ?? project.baseDirectory ?? ""}
                      onChange={(e) => setBaseDirectoryInput(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={baseDirectoryInput === null || updateProject.isPending}
                      onClick={handleSaveBaseDirectory}
                    >
                      Simpan
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Untuk monorepo: build & typecheck hanya berjalan dari folder ini, jadi error di package lain tidak menggagalkan deploy.
                  </p>
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
                      <AlertDialogTitle>Yakin ingin menghapusx</AlertDialogTitle>
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
                <pre className="max-h-[360px] min-h-[160px] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap">
                  {latestDeployment?.buildLog || "Log deployment akan muncul di sini setelah project dibuat dan deploy otomatis dimulai."}
                </pre>
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
                          {deployment.durationMs ? `${(deployment.durationMs / 1000).toFixed(1)}s` : '-'}
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
          <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap">
            {selectedLogDeployment?.buildLog || "Belum ada log untuk deployment ini."}
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
  const [bulkMode, setBulkMode] = useState<"env" | "json" | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

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
    const keys: string[] = (envVars || []).map((e: any) => e.key);
    if (mode === "env") {
      setBulkText(keys.length ? keys.map((k) => `${k}=`).join("\n") : "# Contoh:\n# API_KEY=nilai_kamu\n# DATABASE_URL=postgresql://...");
    } else {
      const obj: Record<string, string> = {};
      keys.forEach((k) => { obj[k] = ""; });
      setBulkText(keys.length ? JSON.stringify(obj, null, 2) : '{\n  "API_KEY": "nilai_kamu"\n}');
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
        const value = trimmed.slice(idx + 1);
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
    let saved = 0;
    let failed = 0;
    for (const { key, value } of result) {
      try {
        await setEnv.mutateAsync({ id: projectId, data: { key, value } });
        saved++;
      } catch {
        failed++;
      }
    }
    setIsBulkSaving(false);
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
          <div className="flex items-end gap-3">
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
                {envVars.map((env: any) => (
                  <TableRow key={env.id}>
                    <TableCell className="font-mono text-sm">{env.key}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">••••••••</TableCell>
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
                ))}
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
              {isBulkSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
