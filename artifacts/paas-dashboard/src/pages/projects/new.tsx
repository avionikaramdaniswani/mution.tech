import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Box } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, { message: "Nama proyek minimal 2 karakter." }).regex(/^[a-z0-9-]+$/, { message: "Hanya huruf kecil, angka, dan tanda hubung yang diperbolehkan." }),
  repoUrl: z.string().url({ message: "Harus berupa URL yang valid." }).optional().or(z.literal("")),
  runtime: z.enum(["nodejs", "python", "php", "static"]),
  domain: z.string().optional(),
});

export default function NewProject() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      repoUrl: "",
      runtime: "nodejs",
      domain: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createProject.mutate(
      { 
        data: {
          ...values,
          repoUrl: values.repoUrl || undefined,
          domain: values.domain || undefined,
        } 
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({
            title: "Proyek dibuat",
            description: "Proyek baru kamu berhasil dibuat.",
          });
          setLocation(`/projects/${data.id}`);
        },
        onError: (error: any) => {
          toast({
            title: "Gagal",
            description: error.error || "Gagal membuat proyek.",
            variant: "destructive",
          });
        }
      }
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buat Proyek</h1>
          <p className="text-muted-foreground mt-1">Konfigurasi aplikasi baru kamu.</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Pengaturan Proyek
          </CardTitle>
          <CardDescription>
            Konfigurasi dasar untuk deployment baru kamu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      Identifer unik. Gunakan huruf kecil, angka, dan tanda hubung.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="runtime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Runtime</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormDescription>
                      Environment yang digunakan untuk build dan menjalankan aplikasi kamu.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="repoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Repository <span className="text-muted-foreground font-normal">(Opsional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/username/repo.git" {...field} />
                    </FormControl>
                    <FormDescription>
                      Repository Git publik untuk di-deploy. Jika dikosongkan, kamu bisa deploy manual nanti.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain Kustom <span className="text-muted-foreground font-normal">(Opsional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="app.contoh.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Domain kustom untuk proyek ini. Kamu perlu konfigurasi DNS secara terpisah.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-border/50">
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
