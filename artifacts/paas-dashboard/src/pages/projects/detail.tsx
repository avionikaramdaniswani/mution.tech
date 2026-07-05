import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey,
  useStopProject, useRestartProject, useDeleteProject,
  useGetProjectEnv, getGetProjectEnvQueryKey, useSetProjectEnv, useDeleteProjectEnv,
  useListDeployments, getListDeploymentsQueryKey, useTriggerDeployment, useRollbackDeployment,
  useGetProjectDatabase, getGetProjectDatabaseQueryKey, useProvisionDatabase, useDeleteDatabase,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
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
import { ArrowLeft, Copy, Database, Globe, Play, Power, RotateCcw, Trash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ProjectDetail() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId, { 
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } 
  });

  const { data: deployments, isLoading: isLoadingDeployments } = useListDeployments(projectId, {
    query: { enabled: !!projectId, queryKey: getListDeploymentsQueryKey(projectId) }
  });
  
  const projectDeployments = deployments?.filter(d => d.projectId === projectId) || [];

  const { data: envVars, isLoading: isLoadingEnv } = useGetProjectEnv(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectEnvQueryKey(projectId) }
  });

  const { data: database, isLoading: isLoadingDb } = useGetProjectDatabase(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectDatabaseQueryKey(projectId), retry: false }
  });

  const triggerDeploy = useTriggerDeployment();
  const triggerRollback = useRollbackDeployment();
  const stopProject = useStopProject();
  const restartProject = useRestartProject();
  const deleteProject = useDeleteProject();
  
  const handleDeploy = () => {
    triggerDeploy.mutate(
      { id: projectId, data: {} },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDeploymentsQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Deployment dimulai" });
        }
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
          <Button 
            onClick={handleDeploy}
            disabled={triggerDeploy.isPending || project.status === 'deploying'}
          >
            <Play className="h-4 w-4 mr-2" /> Deploy
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="deployments">Deployment</TabsTrigger>
          <TabsTrigger value="environment">Variabel Env</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
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
            <CardHeader>
              <CardTitle>Riwayat Deployment</CardTitle>
              <CardDescription>Semua deployment yang pernah dijalankan untuk proyek ini.</CardDescription>
            </CardHeader>
            <CardContent>
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

        <TabsContent value="database" className="mt-6">
          <DatabaseTab projectId={projectId} database={database} isLoading={isLoadingDb} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EnvVarsTab({ projectId, envVars, isLoading }: { projectId: number, envVars: any, isLoading: boolean }) {
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const setEnv = useSetProjectEnv();
  const delEnv = useDeleteProjectEnv();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAdd = () => {
    if (!newKey || !newVal) return;
    setEnv.mutate(
      { id: projectId, data: { key: newKey, value: newVal } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectEnvQueryKey(projectId) });
          setNewKey("");
          setNewVal("");
          toast({ title: "Variabel environment ditambahkan" });
        }
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
        }
      }
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Variabel Environment</CardTitle>
        <CardDescription>Secret dan konfigurasi yang tersedia di aplikasi kamu saat runtime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label>Nama</Label>
            <Input placeholder="API_KEY" value={newKey} onChange={e => setNewKey(e.target.value)} />
          </div>
          <div className="space-y-2 flex-1">
            <Label>Nilai</Label>
            <Input type="password" placeholder="********" value={newVal} onChange={e => setNewVal(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={setEnv.isPending || !newKey || !newVal}>Tambah</Button>
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
                  <TableCell className="font-mono text-sm text-muted-foreground">{env.value || "********"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(env.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
  );
}

function DatabaseTab({ projectId, database, isLoading }: { projectId: number, database: any, isLoading: boolean }) {
  const provisionDb = useProvisionDatabase();
  const deleteDb = useDeleteDatabase();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleProvision = () => {
    provisionDb.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectDatabaseQueryKey(projectId) });
          toast({ title: "Provisioning database dimulai" });
        }
      }
    );
  };

  const handleDelete = () => {
    deleteDb.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectDatabaseQueryKey(projectId) });
          toast({ title: "Database dihapus" });
        }
      }
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Database Terpasang
        </CardTitle>
        <CardDescription>Provisioning database PostgreSQL untuk proyek ini.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[150px]" />
        ) : database ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-border p-4 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium text-lg">PostgreSQL</div>
                <div className="text-sm text-muted-foreground mt-1">Status: <Badge variant="outline">{database.status || 'siap'}</Badge></div>
                <div className="text-sm text-muted-foreground">Ukuran: {database.sizeMb} MB</div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleteDb.isPending}>
                    <Trash className="h-4 w-4 mr-2" /> Hapus Database
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus databasex</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua data di database ini akan hilang permanen. Tindakan ini tidak bisa dibatalkan.
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
            </div>
            
            <div className="space-y-2">
              <Label>Connection String</Label>
              <div className="flex gap-2">
                <Input value={database.connectionString || "********************************************"} readOnly type="password" />
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(database.connectionString || "");
                  toast({ title: "Disalin ke clipboard" });
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tersedia juga di environment proyek kamu sebagai <code className="font-mono bg-muted px-1 rounded">DATABASE_URL</code>.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-lg flex flex-col items-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4 text-primary">
              <Database className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium">Belum ada database</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              Tambahkan database PostgreSQL ke proyek ini. Connection string akan otomatis tersedia di environment kamu.
            </p>
            <Button onClick={handleProvision} disabled={provisionDb.isPending}>
              {provisionDb.isPending ? "Menyiapkan..." : "Provision Database PostgreSQL"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
