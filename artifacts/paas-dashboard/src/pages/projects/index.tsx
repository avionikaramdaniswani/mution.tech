import { Link } from "wouter";
import { useListProjects, useDeleteProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { AlertCircle, Box, CheckCircle2, Clock, Globe, MoreHorizontal, Plus, TerminalSquare, Trash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export function ProjectStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    running:   { color: "bg-emerald-500 hover:bg-emerald-600",                      icon: CheckCircle2,    label: "Berjalan"  },
    stopped:   { color: "bg-zinc-500 hover:bg-zinc-600",                            icon: Clock,           label: "Berhenti"  },
    building:  { color: "bg-amber-500 hover:bg-amber-600 animate-pulse",            icon: TerminalSquare,  label: "Build"     },
    deploying: { color: "bg-blue-500 hover:bg-blue-600 animate-pulse",              icon: Globe,           label: "Deploy"    },
    failed:    { color: "bg-destructive hover:bg-destructive/90",                   icon: AlertCircle,     label: "Gagal"     },
    idle:      { color: "bg-zinc-500 hover:bg-zinc-600",                            icon: Box,             label: "Idle"      },
  };

  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} text-white flex items-center gap-1.5 px-2.5 py-0.5`}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
}

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteProject.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({
            title: "Proyek dihapus",
            description: "Proyek berhasil dihapus.",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Gagal",
            description: error.error || "Gagal menghapus proyek.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proyek</h1>
          <p className="text-muted-foreground mt-1">Kelola aplikasi dan deployment kamu.</p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Proyek Baru
          </Button>
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-background">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Box className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Belum ada proyek</h2>
            <p className="text-muted-foreground max-w-sm mb-6">
              Buat proyek pertama kamu untuk mulai men-deploy aplikasi ke platform.
            </p>
            <Link href="/projects/new">
              <Button>Buat Proyek</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="border-border/50 transition-all hover:border-primary/30 hover:shadow-md flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl">
                    <Link href={`/projects/${project.id}`} className="hover:underline">
                      {project.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="font-mono text-xs">{project.runtime}</Badge>
                  </CardDescription>
                </div>
                <AlertDialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/projects/${project.id}`}>
                        <DropdownMenuItem className="cursor-pointer">
                          Lihat detail
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer">
                          <Trash className="mr-2 h-4 w-4" />
                          Hapus
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Yakin ingin menghapus?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Proyek <span className="font-semibold text-foreground">{project.name}</span> beserta semua resource, database, dan deployment-nya akan dihapus permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDelete(project.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  
                  {project.domain && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Domain</span>
                      <a href={`https://${project.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline truncate max-w-[150px]">
                        <Globe className="h-3 w-3" />
                        {project.domain}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Terakhir deploy
                    </span>
                    <span>
                      {project.lastDeployedAt 
                        ? formatDistanceToNow(new Date(project.lastDeployedAt), { addSuffix: true, locale: id }) 
                        : "Belum pernah"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
