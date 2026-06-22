import {
  useGetDashboardStats,
  useListProjects,
  useStopProject,
  useRestartProject,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  Square,
  RefreshCw,
  Clock,
  Globe,
  Code2,
  FolderOpen,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link } from "wouter";
import type { Project } from "@workspace/api-client-react";

function seededRandom(seed: number, min: number, max: number) {
  const x = Math.sin(seed + 1) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

function ResourceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    running: { label: "Running", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" },
    failed:  { label: "Failed",  className: "bg-red-500/15 text-red-600 border-red-500/20" },
    stopped: { label: "Stopped", className: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20" },
    building:{ label: "Building",className: "bg-blue-500/15 text-blue-600 border-blue-500/20" },
  };
  const s = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const stop    = useStopProject();
  const restart = useRestartProject();

  const isRunning = project.status === "running";
  const isBusy    = stop.isPending || restart.isPending;

  const cpu = isRunning ? seededRandom(project.id * 3, 5, 72) : 0;
  const ram = isRunning ? seededRandom(project.id * 7, 20, 85) : 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
  }

  return (
    <Card className="border-border/60 hover:border-border transition-colors">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/projects/${project.id}`} className="font-semibold text-sm hover:underline truncate block">
              {project.name}
            </Link>
            {project.domain ? (
              <a
                href={`https://${project.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5 truncate"
              >
                <Globe className="h-3 w-3 shrink-0" />
                {project.domain}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground mt-0.5 block">Tidak ada domain</span>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Code2 className="h-3 w-3" />
            {project.runtime}
          </span>
          {project.lastDeployedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(project.lastDeployedAt), { addSuffix: true, locale: idLocale })}
            </span>
          )}
        </div>

        {isRunning && (
          <div className="space-y-2">
            <ResourceBar label="CPU" value={cpu} color="bg-blue-500" />
            <ResourceBar label="RAM" value={ram} color="bg-violet-500" />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {isRunning ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 flex-1"
              disabled={isBusy}
              onClick={() => stop.mutate({ projectId: project.id }, { onSuccess: invalidate })}
            >
              <Square className="h-3 w-3" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 flex-1"
              disabled={isBusy}
              onClick={() => restart.mutate({ projectId: project.id }, { onSuccess: invalidate })}
            >
              <RefreshCw className="h-3 w-3" />
              Start
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
            <Link href={`/projects/${project.id}`}>Detail</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats }    = useGetDashboardStats();
  const { data: projects, isLoading: projectsLoading } = useListProjects();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Beranda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/projects">Semua Proyek</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { label: "Berjalan",    value: stats?.runningProjects, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
          { label: "Gagal",       value: stats?.failedProjects,  icon: <AlertCircle  className="h-4 w-4 text-red-500" /> },
          { label: "Total Proyek",value: stats?.totalProjects,   icon: <FolderOpen   className="h-4 w-4 text-muted-foreground" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-1.5">
            {icon}
            <span className="text-sm font-semibold">{value ?? "—"}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Proyek</h2>
        {projectsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !projects?.length ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada proyek.</p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/projects">Buat Proyek</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>

    </div>
  );
}
