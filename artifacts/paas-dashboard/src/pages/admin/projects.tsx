import { useAdminListProjects, useAdminStopProject, useAdminDeleteProject, getAdminListProjectsQueryKey } from "@workspace/api-client-react";
import { Box, Power, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ProjectStatusBadge } from "@/pages/projects";

const RUNTIME_LABEL: Record<string, string> = {
  nodejs: "Node.js",
  python: "Python",
  php: "PHP",
  static: "Static",
};

export default function AdminProjects() {
  const { data: projects, isLoading } = useAdminListProjects();
  const stopProject = useAdminStopProject();
  const deleteProject = useAdminDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStop = (id: number) => {
    stopProject.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey() });
        toast({ title: "Proyek dihentikan." });
      },
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Hapus proyek "${name}" secara permanenx`)) return;
    deleteProject.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey() });
        toast({ title: "Proyek dihapus.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-[#172033]">Semua Proyek</h1>
          <p className="mt-1 text-sm text-[#526173]">Kelola proyek dari seluruh pengguna platform.</p>
        </div>
        {projects && (
          <div className="rounded-full border border-[#dbe8f3] bg-white px-4 py-2 text-sm font-bold text-[#526173] shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
            {projects.length} proyek
          </div>
        )}
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-white shadow-[0_16px_44px_rgba(23,32,51,0.07)]">
        {/* Table header */}
        <div className="grid grid-cols-12 border-b border-[#dbe8f3] bg-[#f8fbff] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#526173]">
          <div className="col-span-3">Proyek</div>
          <div className="col-span-3">Pemilik</div>
          <div className="col-span-2">Runtime</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Aksi</div>
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Box className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada proyek.</p>
          </div>
        ) : (
          <div>
            {projects.map((project) => (
              <div
                key={project.id}
                className="grid grid-cols-12 items-center border-b border-[#edf4fb] px-5 py-3.5 transition-colors last:border-b-0 hover:bg-[#f8fbff]"
              >
                {/* Project name */}
                <div className="col-span-3 min-w-0">
                  <p className="truncate text-sm font-semibold text-[#172033]">{project.name}</p>
                  {project.domain && (
                    <p className="truncate text-xs text-[#526173]">{project.domain}</p>
                  )}
                </div>
                {/* Owner */}
                <div className="col-span-3 min-w-0">
                  <p className="truncate text-sm text-[#172033]">{project.ownerName}</p>
                  <p className="truncate text-xs text-[#526173]">{project.ownerEmail}</p>
                </div>
                {/* Runtime */}
                <div className="col-span-2">
                  <span
                    className="rounded-md border border-[#dbe8f3] bg-[#f8fbff] px-2 py-0.5 text-xs font-semibold text-[#526173]"
                  >
                    {RUNTIME_LABEL[project.runtime] ?? project.runtime}
                  </span>
                </div>
                {/* Status */}
                <div className="col-span-2">
                  <ProjectStatusBadge status={project.status} />
                </div>
                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs gap-1.5"
                    onClick={() => handleStop(project.id)}
                    disabled={project.status === "stopped" || stopProject.isPending}
                  >
                    <Power className="h-3 w-3" />
                    Stop
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(project.id, project.name)}
                    disabled={deleteProject.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
