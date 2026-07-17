import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Gift, LockKeyhole, Mail, UserRound, KeyRound, RefreshCw, CheckCircle2 } from "lucide-react";
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
import { csrfFetch } from "@/lib/csrf";

// ─── Step 1: Email form ───────────────────────────────────────────────────────
const emailSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid." }),
});

// ─── Step 2: OTP form ─────────────────────────────────────────────────────────
const otpSchema = z.object({
  otp: z.string().length(6, { message: "Kode OTP harus 6 digit." }).regex(/^\d{6}$/, "Kode OTP hanya angka."),
});

// ─── Step 3: Profile + password form ─────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2, { message: "Nama minimal 2 karakter." }),
  password: z.string().min(8, { message: "Password minimal 8 karakter." }),
  confirmPassword: z.string().min(1, { message: "Konfirmasi password tidak boleh kosong." }),
}).refine((v) => v.password === v.confirmPassword, {
  message: "Konfirmasi password tidak sama.",
  path: ["confirmPassword"],
});

type Step = "email" | "otp" | "profile";

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const registerMutation = useRegister();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const refCode = new URLSearchParams(window.location.search).get("ref") ?? "";

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

  // ── Forms ──────────────────────────────────────────────────────────────────
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", password: "", confirmPassword: "" },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  async function sendOtp(targetEmail: string): Promise<boolean> {
    setSendingOtp(true);
    setOtpError(null);
    try {
      const res = await csrfFetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error ?? "Gagal mengirim OTP.");
        return false;
      }
      return true;
    } catch {
      setOtpError("Gagal terhubung ke server. Coba lagi.");
      return false;
    } finally {
      setSendingOtp(false);
    }
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  // ── Step handlers ──────────────────────────────────────────────────────────
  async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
    const ok = await sendOtp(values.email);
    if (ok) {
      setEmail(values.email);
      setStep("otp");
      startResendCooldown();
    }
  }

  function onOtpSubmit(values: z.infer<typeof otpSchema>) {
    setOtp(values.otp);
    setStep("profile");
  }

  async function onResend() {
    if (resendCooldown > 0) return;
    const ok = await sendOtp(email);
    if (ok) {
      otpForm.reset();
      startResendCooldown();
    }
  }

  function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    const { confirmPassword, ...rest } = values;
    const payload: Record<string, string> = { ...rest, email, otp };
    if (refCode) payload.refCode = refCode;

    registerMutation.mutate(
      { data: payload as any },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          setLocation("/dashboard");
        },
      }
    );
  }

  // ── Shared card shell ──────────────────────────────────────────────────────
  const stepMeta = {
    email: { title: "Mulai bangun di Mution", desc: "Masukkan email kamu — kami akan kirim kode verifikasi." },
    otp: { title: "Cek email kamu", desc: `Kami mengirim kode 6 digit ke ${email}` },
    profile: { title: "Lengkapi profil kamu", desc: "Hampir selesai! Buat nama dan password akun." },
  };

  const stepIcons: Record<Step, React.ReactNode> = {
    email: <Mail className="h-6 w-6 text-[#f97316]" />,
    otp: <KeyRound className="h-6 w-6 text-[#f97316]" />,
    profile: <UserRound className="h-6 w-6 text-[#f97316]" />,
  };

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
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(248,250,252,0.88) 0%, rgba(248,250,252,0.84) 54%, rgba(255,247,237,0.92) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.16), rgba(20,184,166,0.10) 56%, transparent 100%)" }} />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#dbe8f3] bg-white/75 px-3 py-2 text-xs font-semibold text-[#526173] shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#172033]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Beranda
        </Link>

        {/* Step indicator */}
        <div className="mb-4 flex items-center justify-center gap-2">
          {(["email", "otp", "profile"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                s === step ? "bg-[#f97316] text-white" :
                (["email", "otp", "profile"].indexOf(step) > i) ? "bg-emerald-500 text-white" :
                "bg-[#e2e8f0] text-[#94a3b8]"
              }`}>
                {["email", "otp", "profile"].indexOf(step) > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < 2 && <div className={`h-px w-8 transition-colors ${["email", "otp", "profile"].indexOf(step) > i ? "bg-emerald-400" : "bg-[#e2e8f0]"}`} />}
            </div>
          ))}
        </div>

        <Card className="overflow-hidden border-[#dbe8f3] shadow-[0_24px_70px_rgba(23,32,51,0.13)]" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)" }}>
          <CardHeader className="space-y-3 px-6 pb-5 pt-7 text-center">
            <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#fed7aa] bg-white shadow-[0_14px_34px_rgba(249,115,22,0.16)]">
              {stepIcons[step]}
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-normal text-[#172033]">{stepMeta[step].title}</CardTitle>
            <CardDescription className="text-sm leading-6 text-[#526173]">{stepMeta[step].desc}</CardDescription>
            {refCheck?.valid && step === "email" && (
              <div className="mx-auto flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <Gift className="h-4 w-4 text-emerald-500" />
                Diundang oleh <strong>{refCheck.referrerName}</strong> — dapat bonus Rp&nbsp;5.000!
              </div>
            )}
            {refCode && refCheck && !refCheck.valid && step === "email" && (
              <div className="mx-auto rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600">
                Kode referral tidak valid
              </div>
            )}
          </CardHeader>

          <CardContent className="px-6">

            {/* ── Step 1: Email ── */}
            {step === "email" && (
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
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
                  {otpError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                      {otpError}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="h-11 w-full bg-[#f97316] text-white hover:bg-[#ea580c]"
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? "Mengirim kode..." : "Kirim kode verifikasi"}
                  </Button>
                </form>
              </Form>
            )}

            {/* ── Step 2: OTP ── */}
            {step === "otp" && (
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#172033]">Kode OTP</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                            <Input
                              placeholder="123456"
                              maxLength={6}
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              className="h-11 border-[#dbe8f3] bg-[#f8fbff] pl-10 text-center text-xl font-bold tracking-[0.3em] shadow-none focus-visible:ring-[#f97316]"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {otpError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                      {otpError}
                    </div>
                  )}

                  <Button type="submit" className="h-11 w-full bg-[#f97316] text-white hover:bg-[#ea580c]">
                    Verifikasi kode
                  </Button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      className="text-xs text-[#526173] hover:text-[#172033] transition-colors"
                      onClick={() => { setStep("email"); setOtpError(null); }}
                    >
                      ← Ganti email
                    </button>
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        resendCooldown > 0 || sendingOtp
                          ? "text-[#94a3b8] cursor-not-allowed"
                          : "text-[#f97316] hover:text-[#ea580c]"
                      }`}
                      onClick={onResend}
                      disabled={resendCooldown > 0 || sendingOtp}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${sendingOtp ? "animate-spin" : ""}`} />
                      {resendCooldown > 0 ? `Kirim ulang (${resendCooldown}s)` : "Kirim ulang kode"}
                    </button>
                  </div>
                </form>
              </Form>
            )}

            {/* ── Step 3: Profile ── */}
            {step === "profile" && (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
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
                    control={profileForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#172033]">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Minimal 8 karakter"
                              autoComplete="new-password"
                              className="h-11 border-[#dbe8f3] bg-[#f8fbff] pl-10 pr-11 shadow-none focus-visible:ring-[#f97316]"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#64748b] transition-colors hover:bg-white hover:text-[#172033]"
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
                    control={profileForm.control}
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
                  <Button
                    type="submit"
                    className="h-11 w-full bg-[#f97316] text-white hover:bg-[#ea580c]"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Membuat akun..." : "Buat akun"}
                  </Button>
                </form>
              </Form>
            )}
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
