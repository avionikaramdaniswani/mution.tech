import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey,
  useStopProject, useRestartProject, useDeleteProject,
  useGetProjectEnv, getGetProjectEnvQueryKey, useSetProjectEnv, useDeleteProjectEnv,
  useListDeployments, getListDeploymentsQueryKey, useTriggerDeployment, useRollbackDeployment,
  useGetProjectDatabase, getGetProjectDatabaseQueryKey, useProvisionDatabase, useDeleteDatabase,
  getListProjectsQueryKey, useGetDeployment
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ProjectStatusBadge } from "./index";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Database, Globe, Play, Power, RotateCcw, Settings, TerminalSquare, Trash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ProjectDetail() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId, { 
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } 
  });

  const { data: deployments, isLoading: isLoadingDeployments } = useListDeployments({
    query: { enabled: !!projectId, queryKey: getListDeploymentsQueryKey() }
  });
  
  // Filter deployments by this project
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
  
  const handleDeploy = () => {
    triggerDeploy.mutate(
      { data: {} },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDeploymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Deployment triggered" });
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
          toast({ title: "Project stopped" });
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
          toast({ title: "Project restarted" });
        }
      }
    );
  };

  if (isLoadingProject) {
    return <div className="space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[400px]" /></div>;
  }

  if (!project) {
    return <div>Project not found</div>;
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
            <Power className="h-4 w-4 mr-2" /> Stop
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
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Repository</div>
                  {project.repoUrl ? (
                    <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-sm break-all">
                      {project.repoUrl}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">No repository connected</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Created</div>
                  <div className="text-sm">{formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Last Deployed</div>
                  <div className="text-sm">
                    {project.lastDeployedAt 
                      ? formatDistanceToNow(new Date(project.lastDeployedAt), { addSuffix: true }) 
                      : "Never deployed"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>Destructive actions for this project.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Deleting a project removes all deployments, databases, and environment variables permanently.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Project</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the project and all its data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
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
              <CardTitle>Deployments</CardTitle>
              <CardDescription>History of all deployments for this project.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDeployments ? (
                <Skeleton className="h-[200px]" />
              ) : projectDeployments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  No deployments yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Commit</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Action</TableHead>
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
                            {deployment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs max-w-[200px] truncate" title={deployment.commitMessage || deployment.commitHash || ''}>
                            {deployment.commitMessage || deployment.commitHash || 'Manual deployment'}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}
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
                                  { id: deployment.id },
                                  {
                                    onSuccess: () => {
                                      queryClient.invalidateQueries({ queryKey: getListDeploymentsQueryKey() });
                                      toast({ title: "Rollback initiated" });
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
          toast({ title: "Environment variable added" });
        }
      }
    );
  };

  const handleDelete = (key: string) => {
    delEnv.mutate(
      { id: projectId, key },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectEnvQueryKey(projectId) });
          toast({ title: "Environment variable deleted" });
        }
      }
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Environment Variables</CardTitle>
        <CardDescription>Secrets and configuration available to your application at runtime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label>Key</Label>
            <Input placeholder="API_KEY" value={newKey} onChange={e => setNewKey(e.target.value)} />
          </div>
          <div className="space-y-2 flex-1">
            <Label>Value</Label>
            <Input type="password" placeholder="••••••••" value={newVal} onChange={e => setNewVal(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={setEnv.isPending || !newKey || !newVal}>Add</Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-[200px]" />
        ) : !envVars || envVars.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
            No environment variables configured
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envVars.map((env: any) => (
                <TableRow key={env.id}>
                  <TableCell className="font-mono text-sm">{env.key}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{env.value || "••••••••"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(env.key)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
          toast({ title: "Database provisioning started" });
        }
      }
    );
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this database? All data will be lost.")) {
      deleteDb.mutate(
        { id: projectId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetProjectDatabaseQueryKey(projectId) });
            toast({ title: "Database deleted" });
          }
        }
      );
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Attached Database
        </CardTitle>
        <CardDescription>Provision a PostgreSQL database for this project.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[150px]" />
        ) : database ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-border p-4 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium text-lg">PostgreSQL</div>
                <div className="text-sm text-muted-foreground mt-1">Status: <Badge variant="outline">{database.status || 'ready'}</Badge></div>
                <div className="text-sm text-muted-foreground">Size: {database.sizeMb} MB</div>
              </div>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteDb.isPending}>
                <Trash className="h-4 w-4 mr-2" /> Delete Database
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Connection String</Label>
              <div className="flex gap-2">
                <Input value={database.connectionString || "••••••••••••••••••••••••••••••••••••••••••••"} readOnly type="password" />
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(database.connectionString || "");
                  toast({ title: "Copied to clipboard" });
                }}>Copy</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Also available in your project's environment as DATABASE_URL.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-lg flex flex-col items-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4 text-primary">
              <Database className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium">No database provisioned</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              Add a PostgreSQL database to your project. The connection string will automatically be injected into your environment.
            </p>
            <Button onClick={handleProvision} disabled={provisionDb.isPending}>
              Provision PostgreSQL Database
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}