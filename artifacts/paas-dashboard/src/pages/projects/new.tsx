import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Github, Lock, Globe, RefreshCw, CheckCircle2, ChevronDown, Search } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type GithubRepo = {
  id: number;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  language: string | null;
  private: boolean;
  description: string | null;
  updatedAt: string;
};

type GithubStatus = {
  connected: boolean;
  login: string | null;
};

const LANGUAGE_TO_RUNTIME: Record<string, string> = {
  JavaScript: "nodejs",
  TypeScript: "nodejs",
  Python: "python",
  PHP: "php",
  HTML: "static",
  CSS: "static",
};

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Nama proyek minimal 2 karakter." })
    .regex(/^[a-z0-9-]+$/, { message: "Hanya huruf kecil, angka, dan tanda hubung." }),
  runtime: z.enum(["nodejs", "python", "php", "static"]),
});

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export default function NewProject() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const { toast } = useToast();

  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [repoSearch, setRepoSearch] = useState("");
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [showRuntimeOverride, setShowRuntimeOverride] = useState(false);
  const [detectedRuntime, setDetectedRuntime] = useState<{ runtime: string; confidence: string } | null>(null);
  const [detectingRuntime, setDetectingRuntime] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { data: ghStatus, refetch: refetchStatus } = useQuery<GithubStatus>({
    queryKey: ["/api/github/status"],
    queryFn: () => apiFetch<GithubStatus>("/api/github/status"),
  });

  const { data: repos, isLoading: reposLoading } = useQuery<GithubRepo[]>({
    queryKey: ["/api/github/repos"],
    queryFn: () => apiFetch<GithubRepo[]>("/api/github/repos"),
    enabled: ghStatus?.connected === true,
  });

  const disconnect = useMutation({
    mutationFn: () => apiFetch<{ success: boolean }>("/api/github/disconnect", { method: "DELETE" }),
    onSuccess: () => {
      setSelectedRepo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/github/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/github/repos"] });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", runtime: "nodejs" },
  });

  useEffect(() => {
    if (!selectedRepo) return;

    if (!form.getValues("name")) {
      const slug = selectedRepo.fullName
        .split("/")[1]
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 40);
      form.setValue("name", slug);
    }

    setDetectedRuntime(null);
    setShowRuntimeOverride(false);
    setDetectingRuntime(true);

    apiFetch<{ runtime: string; confidence: string }>(
      `/api/github/detect-runtime?repo=${encodeURIComponent(selectedRepo.fullName)}`,
    )
      .then((result) => {
        setDetectedRuntime(result);
        form.setValue("runtime", result.runtime as any);
      })
      .catch(() => {
        const fallback = selectedRepo.language
          ? (LANGUAGE_TO_RUNTIME[selectedRepo.language] ?? "nodejs")
          : "nodejs";
        setDetectedRuntime({ runtime: fallback, confidence: "fallback" });
        form.setValue("runtime", fallback as any);
      })
      .finally(() => setDetectingRuntime(false));
  }, [selectedRepo]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "github-oauth") {
        if (e.data.status === "connected") {
          refetchStatus();
          toast({ title: "GitHub terhubung!", description: "Sekarang kamu bisa pilih repo." });
        } else {
          toast({ title: "Gagal menghubungkan GitHub", variant: "destructive" });
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [refetchStatus, toast]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowRepoPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openGithubOAuth() {
    window.open(
      "/api/auth/github",
      "github-oauth",
      "width=600,height=700,left=200,top=100",
    );
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    createProject.mutate(
      {
        data: {
          ...values,
          repoUrl: selectedRepo?.cloneUrl ?? undefined,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({ title: "Proyek dibuat", description: "Proyek baru kamu berhasil dibuat." });
          setLocation(`/projects/${data.id}`);
        },
        onError: (error: any) => {
          toast({
            title: "Gagal membuat proyek",
            description: error.error || "Coba lagi.",
            variant: "destructive",
          });
        },
      },
    );
  }

  const filteredRepos = (repos ?? []).filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase()),
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <Button variant="outline" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyek Baru</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deploy dari repository GitHub kamu.</p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Github className="h-4 w-4" />
            Pilih Repository
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!ghStatus ? (
            <Skeleton className="h-10 w-full" />
          ) : !ghStatus.connected ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-muted-foreground text-center">
                Hubungkan akun GitHub kamu untuk memilih repository.
              </p>
              <Button onClick={openGithubOAuth} className="gap-2">
                <Github className="h-4 w-4" />
                Connect GitHub
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Login sebagai <strong className="text-foreground">{ghStatus.login}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect.mutate()}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Disconnect
                </button>
              </div>

              <div className="relative" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setShowRepoPicker((v) => !v)}
                  className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent/50 transition-colors"
                >
                  {selectedRepo ? (
                    <span className="flex items-center gap-2">
                      {selectedRepo.private
                        ? <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        : <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="font-medium">{selectedRepo.fullName}</span>
                      {selectedRepo.language && (
                        <Badge variant="secondary" className="text-xs">{selectedRepo.language}</Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Pilih repository...</span>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                </button>

                {showRepoPicker && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                    <div className="flex items-center border-b border-border px-3 py-2 gap-2">
                      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                      <input
                        autoFocus
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        placeholder="Cari repository..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {reposLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Memuat repo...
                        </div>
                      ) : filteredRepos.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          Tidak ada repo ditemukan.
                        </p>
                      ) : (
                        filteredRepos.map((repo) => (
                          <button
                            key={repo.id}
                            type="button"
                            onClick={() => {
                              setSelectedRepo(repo);
                              setShowRepoPicker(false);
                              setRepoSearch("");
                            }}
                            className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent/60 transition-colors"
                          >
                            {repo.private
                              ? <Lock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              : <Globe className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{repo.fullName}</p>
                              {repo.description && (
                                <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                              )}
                            </div>
                            {repo.language && (
                              <Badge variant="secondary" className="text-xs shrink-0">{repo.language}</Badge>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Konfigurasi Proyek</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Proyek</FormLabel>
                    <FormControl>
                      <Input placeholder="aplikasi-saya" {...field} />
                    </FormControl>
                    <FormDescription>
                      Huruf kecil, angka, dan tanda hubung saja.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(selectedRepo || showRuntimeOverride) && (
                <FormField
                  control={form.control}
                  name="runtime"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Runtime</FormLabel>
                        {detectedRuntime && !showRuntimeOverride && (
                          <button
                            type="button"
                            onClick={() => setShowRuntimeOverride(true)}
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                          >
                            Ubah manual
                          </button>
                        )}
                      </div>

                      {detectingRuntime ? (
                        <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Mendeteksi dari file repo...</span>
                        </div>
                      ) : detectedRuntime && !showRuntimeOverride ? (
                        <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/30">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-sm font-medium">
                            {{
                              nodejs: "Node.js",
                              python: "Python",
                              php: "PHP",
                              static: "Static HTML/JS",
                            }[detectedRuntime.runtime] ?? detectedRuntime.runtime}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {detectedRuntime.confidence === "detected"
                              ? "— terdeteksi dari file repo"
                              : "— fallback dari bahasa repo"}
                          </span>
                        </div>
                      ) : (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih runtime" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="nodejs">Node.js</SelectItem>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="php">PHP</SelectItem>
                            <SelectItem value="static">Static HTML/JS</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                <Link href="/projects">
                  <Button type="button" variant="ghost">Batal</Button>
                </Link>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? "Membuat..." : "Buat Proyek"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
