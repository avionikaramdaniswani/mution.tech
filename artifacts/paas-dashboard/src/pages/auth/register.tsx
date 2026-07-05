import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(2, { message: "Nama minimal 2 karakter." }),
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().min(6, { message: "Password minimal 6 karakter." }),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    registerMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          setLocation("/dashboard");
        },
      }
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 dark"
      style={{
        backgroundImage: "url('/hero-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        position: "relative",
      }}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(4,4,12,0.82) 0%, rgba(6,6,16,0.78) 50%, rgba(8,8,18,0.95) 100%)" }}
      />
      {/* Orange glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 110%, rgba(249,115,22,0.18) 0%, transparent 55%)" }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-white/10 shadow-2xl" style={{ background: "rgba(10,10,18,0.85)", backdropFilter: "blur(20px)" }}>
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="flex justify-center mb-2">
              <img src="/mution-logo.png" alt="Mution" className="h-14 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">Buat akun baru</CardTitle>
            <CardDescription className="text-white/50">
              Bergabung dengan Mution dan mulai deploy aplikasi kamu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input placeholder="Budi Santoso" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="kamu@contoh.com" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {registerMutation.isError && (
                  <div className="text-sm text-destructive font-medium">
                    {/* @ts-ignore */}
                    {registerMutation.error?.error || "Registrasi gagal. Silakan coba lagi."}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Mendaftar..." : "Daftar"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="text-sm text-white/40">
              Sudah punya akunx{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Masuk
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
