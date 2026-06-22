import { useGetDashboardStats, useGetDeploymentStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertCircle, Box, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: deploymentStats, isLoading: isStatsLoading } = useGetDeploymentStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Beranda</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Beranda</h1>
          <p className="text-muted-foreground mt-1">Ringkasan platform kamu.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Proyek
            </CardTitle>
            <Box className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalProjects}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Berjalan
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.runningProjects}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gagal
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.failedProjects}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deploy
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalDeployments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.successfulDeployments} berhasil
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/50">
          <CardHeader>
            <CardTitle>Deploy Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentDeployments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Box className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground">Belum ada deployment</p>
              </div>
            ) : (
              <div className="space-y-6">
                {stats.recentDeployments.map((deployment) => (
                  <div key={deployment.id} className="flex items-center">
                    <div className={`mr-4 rounded-full p-2 ${
                      deployment.status === 'running' ? 'bg-emerald-500/10 text-emerald-500' :
                      deployment.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {deployment.status === 'running' ? <CheckCircle2 className="h-4 w-4" /> :
                       deployment.status === 'failed' ? <AlertCircle className="h-4 w-4" /> :
                       <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Proyek #{deployment.projectId}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {deployment.commitMessage || deployment.commitHash || 'Deploy manual'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={
                        deployment.status === 'running' ? 'default' :
                        deployment.status === 'failed' ? 'destructive' :
                        'secondary'
                      } className={deployment.status === 'running' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                        {deployment.status === 'running' ? 'berjalan' :
                         deployment.status === 'failed' ? 'gagal' :
                         deployment.status === 'building' ? 'build' :
                         deployment.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 min-w-[100px] justify-end">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true, locale: id })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-border/50">
          <CardHeader>
            <CardTitle>Aktivitas Deploy (30 Hari)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {isStatsLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : deploymentStats && deploymentStats.last30Days.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deploymentStats.last30Days}>
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value}`} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center h-[250px]">
                <Activity className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground">Belum ada data deployment</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
