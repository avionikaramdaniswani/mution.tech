import { useGetAdminStats, useAdminListProjects, useAdminListUsers, useAdminStopProject, useAdminDeleteProject, getAdminListProjectsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Box, Activity, ShieldAlert, Trash, Power, Cpu, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ProjectStatusBadge } from "../projects";
import { csrfFetch } from "@/lib/csrf";

// --- Provider types -----------------------------------------------------------

interface ProviderStatus {
  id: string;
  openaiBase: string;
  type: "conduit" | "generic";
  enabled: boolean;
  inCooldown: boolean;
  cooldownExpiresAt: string | null;
}

async function fetchProviders(): Promise<ProviderStatus[]> {
  const res = await fetch("/api/admin/providers", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch providers");
  return res.json();
}

async function toggleProvider(id: string, enabled: boolean): Promise<void> {
  const res = await csrfFetch(`/api/admin/providers/${encodeURIComponent(id)}/toggle`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to toggle provider");
}

// --- Provider status badge ----------------------------------------------------

function ProviderStatusBadge({ provider }: { provider: ProviderStatus }) {
  if (!provider.enabled) return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Disabled</Badge>;
  if (provider.inCooldown) return <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/50"><Clock className="h-3 w-3" /> Cooldown</Badge>;
  return <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/50"><CheckCircle2 className="h-3 w-3" /> Active</Badge>;
}

function ProviderTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = { conduit: "bg-violet-500/10 text-violet-400", generic: "bg-slate-500/10 text-slate-400" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[type] ?? map.generic}`}>{type}</span>;
}

// --- Providers Tab ------------------------------------------------------------

function ProvidersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: fetchProviders,
    refetchInterval: 5000,
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleProvider(id, enabled),
    onSuccess: (_, { id, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      toast({ title: enabled ? `Provider "${id}" diaktifkan` : `Provider "${id}" dinonaktifkan` });
    },
    onError: () => toast({ title: "Gagal mengubah status provider", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const list = providers ?? [];

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            AI Provider Pool
          </CardTitle>
          <CardDescription>
            Aktifkan atau nonaktifkan provider AI secara real-time. Provider yang aktif akan dipilih secara round-robin dengan automatic failover.
            Toggle provider tersimpan setelah server restart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Cpu className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Tidak ada provider terkonfigurasi.</p>
              <p className="text-xs mt-1">Set <code className="bg-muted px-1 rounded">PROVIDER_POOL</code> atau <code className="bg-muted px-1 rounded">CONDUIT_API_KEY</code> di environment secrets.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${p.enabled ? "border-border/50 bg-card/50" : "border-border/30 bg-muted/20 opacity-60"}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{p.id}</span>
                        <ProviderTypeBadge type={p.type} />
                        <ProviderStatusBadge provider={p} />
                      </div>
                      <span className="text-xs text-muted-foreground">{p.openaiBase}</span>
                      {p.inCooldown && p.cooldownExpiresAt && (
                        <span className="text-xs text-amber-500">
                          Cooldown sampai {formatDistanceToNow(new Date(p.cooldownExpiresAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{p.enabled ? "Aktif" : "Nonaktif"}</span>
                    <Switch
                      checked={p.enabled}
                      disabled={toggle.isPending}
                      onCheckedChange={(checked) => toggle.mutate({ id: p.id, enabled: checked })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-amber-500">Catatan:</span> Toggle provider disimpan permanen di database. Hapus secret provider hanya jika provider tidak ingin muncul di daftar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Admin Panel ---------------------------------------------------------

export default function AdminPanel() {
  const { data: stats, isLoading: isLoadingStats } = useGetAdminStats();
  const { data: users, isLoading: isLoadingUsers } = useAdminListUsers();
  const { data: projects, isLoading: isLoadingProjects } = useAdminListProjects();

  const stopProject = useAdminStopProject();
  const deleteProject = useAdminDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStopProject = (id: number) => {
    stopProject.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey() });
        toast({ title: "Project stopped" });
      },
    });
  };

  const handleDeleteProject = (id: number) => {
    if (confirm("Are you sure you want to delete this project globallyx")) {
      deleteProject.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey() });
          toast({ title: "Project deleted globally" });
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-destructive flex items-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">Platform-wide management and oversight.</p>
        </div>
      </div>

      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="stats">Platform Stats</TabsTrigger>
          <TabsTrigger value="providers">
            <Cpu className="h-4 w-4 mr-1.5" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="projects">All Projects</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          {isLoadingStats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
                  <Box className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalProjects}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Deployments</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalDeployments}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Running Resources</CardTitle>
                  <Activity className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.runningProjects}</div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="providers">
          <ProvidersTab />
        </TabsContent>

        <TabsContent value="projects">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Platform Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingProjects ? (
                <Skeleton className="h-[400px]" />
              ) : projects ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Admin Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          {project.name}
                          <div className="text-xs text-muted-foreground">{project.runtime}</div>
                        </TableCell>
                        <TableCell>
                          {project.ownerName}
                          <div className="text-xs text-muted-foreground">{project.ownerEmail}</div>
                        </TableCell>
                        <TableCell><ProjectStatusBadge status={project.status} /></TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStopProject(project.id)}
                              disabled={project.status === "stopped" || stopProject.isPending}
                            >
                              <Power className="h-4 w-4 mr-1" /> Force Stop
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProject(project.id)}
                              disabled={deleteProject.isPending}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <Skeleton className="h-[400px]" />
              ) : users ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.projectCount}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
