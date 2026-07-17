import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Gift, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";

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
  confirmPassword: z.string().min(1, { message: "Konfirmasi password tidak boleh kosong." }),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Konfirmasi password tidak sama.",
  path: ["confirmPassword"],
});

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Extract referral code from URL (?ref=XXXX)
  const refCode = new URLSearchParams(window.location.search).get("ref") ?? "";

  // Validate the ref code against the server and get referrer name
  const { data: refCheck } = useQuery({
    queryKey: ["check-ref", refCode],
    queryFn: async () => {
      if (!refCode) return { valid: false };
      const res = await fetch(`/api/auth/check-ref?code=${encodeURIComponent(refCode)}`);
      return res.json() as Promise<{ valid: boolean; referrerName?: string }>;
    },
    enabled: !!refCode,
    staleTime: Infinity,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const { confirmPassword, ...registerData } = values;

    // Include refCode in body so backend can credit welcome bonus
    const payload = refCode ? { ...registerData, refCode } : registerData;

    registerMutation.mutate(
      { data: payload as typeof registerData },
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
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/hero-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        position: "relative",
      }}
    >
      {/* Light overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(248,250,252,0.88) 0%, rgba(248,250,252,0.84) 54%, rgba(255,247,237,0.92) 100%)" }}
      />
      {/* Orange glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.16), rgba(20,184,166,0.10) 56%, transparent 100%)" }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#dbe8f3] bg-white/75 px-3 py-2 text-xs font-semibold text-[#526173] shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#172033]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Beranda
        </Link>

        <Card className="overflow-hidden border-[#dbe8f3] shadow-[0_24px_70px_rgba(23,32,51,0.13)]" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)" }}>
          <CardHeader className="space-y-3 px-6 pb-5 pt-7 text-center">
            <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#fed7aa] bg-white shadow-[0_14px_34px_rgba(249,115,22,0.16)]">
              <img src="/mution-logo.png" alt="Mution" className="h-9 w-auto" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-normal text-[#172033]">Mulai bangun di Mution</CardTitle>
            <CardDescription className="text-sm leading-6 text-[#526173]">
              Buat akun untuk deploy project, kelola API key, dan pantau kredit.
            </CardDescription>
            {refCheck?.valid && (
              <div className="mx-auto flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <Gift className="h-4 w-4 text-emerald-500" />
                Diundang oleh <strong>{refCheck.referrerName}</strong> — dapat bonus Rp&nbsp;5.000!
              </div>
            )}
            {refCode && refCheck && !refCheck.valid && (
              <div className="mx-auto rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600">
                Kode referral tidak valid
              </div>
            )}
          </CardHeader>
          <CardContent className="px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#172033]">Nama Lengkap</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                          <Input
                            placeholder="Budi Santoso"
                            autoComplete="name"
                            className="h-11 border-[#dbe8f3] bg-[#f8fbff] pl-10 shadow-none focus-visible:ring-[#f97316]"
                            {...field}
                          />
                        </div>
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
                      <FormLabel className="text-[#172033]">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                          <Input
                            placeholder="kamu@contoh.com"
                            autoComplete="email"
                            className="h-11 border-[#dbe8f3] bg-[#f8fbff] pl-10 shadow-none focus-visible:ring-[#f97316]"
                            {...field}
                          />
                        </div>
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
                      <FormLabel className="text-[#172033]">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Minimal 6 karakter"
                            autoComplete="new-password"
                            className="h-11 border-[#dbe8f3] bg-[#f8fbff] pl-10 pr-11 shadow-none focus-visible:ring-[#f97316]"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#64748b] transition-colors hover:bg-white hover:text-[#172033]"
                            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#172033]">Konfirmasi Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Ulangi password"
                            autoComplete="new-password"
                            className="h-11 border-[#dbe8f3] bg-[#f8fbff] pl-10 pr-11 shadow-none focus-visible:ring-[#f97316]"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#64748b] transition-colors hover:bg-white hover:text-[#172033]"
                            aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {registerMutation.isError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                    {/* @ts-ignore */}
                    {registerMutation.error?.error || "Registrasi gagal. Silakan coba lagi."}
                  </div>
                )}
                <Button type="submit" className="h-11 w-full bg-[#f97316] text-white hover:bg-[#ea580c]" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Membuat akun..." : "Buat akun"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="mt-6 flex justify-center border-t border-[#dbe8f3] bg-[#f8fbff]/75 px-6 py-5">
            <div className="text-sm text-[#526173]">
              Sudah punya akun?{" "}
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
