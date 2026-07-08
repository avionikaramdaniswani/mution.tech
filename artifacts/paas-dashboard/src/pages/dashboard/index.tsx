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
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Square,
  RefreshCw,
  Clock,
  Globe,
  Code2,
  FolderOpen,
  Plus,
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
      <div className="flex justify-between text-xs text-[#526173]">
        <span>{label}</span>
        <span className="font-semibold text-[#172033]">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eef8ff]">
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
    running:  { label: "Running",  className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    failed:   { label: "Failed",   className: "border-red-200 bg-red-50 text-red-700" },
    stopped:  { label: "Stopped",  className: "border-zinc-200 bg-zinc-50 text-zinc-600" },
    building: { label: "Building", className: "border-sky-200 bg-sky-50 text-sky-700" },
  };
  const s = map[status] ?? { label: status, className: "border-[#dbe8f3] bg-[#f8fbff] text-[#526173]" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>
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
    <Card className="group overflow-hidden rounded-lg border-[#dbe8f3] bg-white shadow-[0_16px_44px_rgba(23,32,51,0.07)] transition-all hover:-translate-y-0.5 hover:border-[#c9d8e7] hover:shadow-[0_22px_64px_rgba(23,32,51,0.1)]">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/projects/${project.id}`} className="block truncate text-sm font-bold text-[#172033] transition-colors hover:text-[#f97316]">
              {project.name}
            </Link>
            {project.domain ? (
              <a
                href={`https://${project.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#526173] transition-colors hover:text-[#172033]"
              >
                <Globe className="h-3 w-3 shrink-0" />
                {project.domain}
              </a>
            ) : (
              <span className="mt-0.5 block text-xs text-[#526173]">Tidak ada domain</span>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-[#526173]">
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
            <ResourceBar label="CPU" value={cpu} color="bg-[#14b8a6]" />
            <ResourceBar label="RAM" value={ram} color="bg-[#f97316]" />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {isRunning ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 gap-1.5 rounded-md border-[#c9d8e7] bg-white text-xs text-[#172033] hover:bg-[#eef8ff]"
              disabled={isBusy}
              onClick={() => stop.mutate({ id: project.id }, { onSuccess: invalidate })}
            >
              <Square className="h-3 w-3" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 gap-1.5 rounded-md border-[#c9d8e7] bg-white text-xs text-[#172033] hover:bg-[#eef8ff]"
              disabled={isBusy}
              onClick={() => restart.mutate({ id: project.id }, { onSuccess: invalidate })}
            >
              <RefreshCw className="h-3 w-3" />
              Start
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 rounded-md text-xs text-[#526173] hover:bg-[#eef8ff] hover:text-[#172033]" asChild>
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
  const statItems = [
    {
      label: "Berjalan",
      value: stats?.runningProjects,
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
      accent: "bg-emerald-50 border-emerald-100",
    },
    {
      label: "Gagal",
      value: stats?.failedProjects,
      icon: <AlertCircle className="h-4 w-4 text-red-600" />,
      accent: "bg-red-50 border-red-100",
    },
    {
      label: "Total Proyek",
      value: stats?.totalProjects,
      icon: <FolderOpen className="h-4 w-4 text-[#f97316]" />,
      accent: "bg-[#fff7ed] border-[#fed7aa]",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#eefdfa_100%)] p-5 shadow-[0_20px_60px_rgba(23,32,51,0.08)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Workspace Mution</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-normal text-[#172033] sm:text-4xl">Beranda</h1>
            <p className="mt-3 text-sm leading-6 text-[#526173]">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {" "}- pantau project, resource, dan deployment dari satu workspace.
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
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="rounded-md bg-[#f97316] text-white hover:bg-[#ea580c]" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Proyek Baru
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {statItems.map(({ label, value, icon, accent }) => (
          <div key={label} className="rounded-lg border border-[#dbe8f3] bg-white p-4 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${accent}`}>
                {icon}
              </span>
              <div>
                <p className="text-2xl font-black leading-none tracking-normal text-[#172033]">{value ?? "-"}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#526173]">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Hosting</p>
            <h2 className="mt-1 text-lg font-extrabold tracking-normal text-[#172033]">Proyek</h2>
          </div>
        </div>
        {projectsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="rounded-lg border-[#dbe8f3] bg-white">
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
          <div className="rounded-lg border border-dashed border-[#c9d8e7] bg-white/80 py-14 text-center shadow-[0_12px_34px_rgba(23,32,51,0.04)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#fed7aa] bg-[#fff7ed]">
              <FolderOpen className="h-6 w-6 text-[#f97316]" />
            </div>
            <p className="text-sm font-semibold text-[#172033]">Belum ada proyek.</p>
            <p className="mt-1 text-sm text-[#526173]">Buat project pertama untuk mulai deploy aplikasi.</p>
            <Button size="sm" className="mt-4 rounded-md bg-[#f97316] text-white hover:bg-[#ea580c]" asChild>
              <Link href="/projects/new">Buat Proyek</Link>
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
