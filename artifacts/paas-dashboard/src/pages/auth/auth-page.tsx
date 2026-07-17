import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { useLogin, useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Gift, KeyRound, LockKeyhole, Mail, RefreshCw, UserRound, CheckCircle2 } from "lucide-react";
import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import { csrfFetch } from "@/lib/csrf";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().min(1, { message: "Password tidak boleh kosong." }),
});

const registerSchema = z.object({
  name: z.string().min(2, { message: "Nama minimal 2 karakter." }),
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().min(6, { message: "Password minimal 6 karakter." }),
  confirmPassword: z.string().min(1, { message: "Konfirmasi password wajib diisi." }),
}).refine(v => v.password === v.confirmPassword, {
  message: "Konfirmasi password tidak sama.",
  path: ["confirmPassword"],
});

// ─── Shared input style ───────────────────────────────────────────────────────

const INPUT_CLS = "h-11 border-[#dbe8f3] bg-[#f8fbff] pl-10 shadow-none focus-visible:ring-[#f97316]";
const ICON_CLS  = "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]";

function PasswordToggle({ show, onToggle, label }: { show: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#64748b] transition-colors hover:bg-white hover:text-[#172033]"
      aria-label={label}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

// ─── Login form panel ─────────────────────────────────────────────────────────

function LoginPanel({ onSwitchTab }: { onSwitchTab: () => void }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  const [showPw, setShowPw] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation(data.user.role === "admin" ? "/admin" : "/dashboard");
      },
    });
  }

  return (
    <div className="px-6 pb-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#172033]">Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className={ICON_CLS} />
                  <Input placeholder="kamu@contoh.com" autoComplete="email" className={INPUT_CLS} {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#172033]">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <LockKeyhole className={ICON_CLS} />
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className={INPUT_CLS + " pr-11"}
                    {...field}
                  />
                  <PasswordToggle show={showPw} onToggle={() => setShowPw(v => !v)}
                    label={showPw ? "Sembunyikan password" : "Tampilkan password"} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {loginMutation.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {/* @ts-ignore */}
              {loginMutation.error?.error || "Login gagal. Periksa kembali email dan password kamu."}
            </div>
          )}

          <Button type="submit" className="h-11 w-full bg-[#f97316] text-white hover:bg-[#ea580c]"
            disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Masuk..." : "Masuk"}
          </Button>
        </form>
      </Form>

      <p className="mt-5 text-center text-sm text-[#526173]">
        Belum punya akun?{" "}
        <button onClick={onSwitchTab} className="font-semibold text-[#f97316] hover:underline">
          Daftar sekarang
        </button>
      </p>
    </div>
  );
}

// ─── Register schemas per step ────────────────────────────────────────────────

const emailStepSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid." }),
});

const otpStepSchema = z.object({
  otp: z.string().length(6, { message: "Kode OTP harus 6 digit." }).regex(/^\d{6}$/, "Hanya angka."),
});

const profileStepSchema = z.object({
  name: z.string().min(2, { message: "Nama minimal 2 karakter." }),
  password: z.string().min(8, { message: "Password minimal 8 karakter." }),
  confirmPassword: z.string().min(1, { message: "Konfirmasi password wajib diisi." }),
}).refine(v => v.password === v.confirmPassword, {
  message: "Konfirmasi password tidak sama.",
  path: ["confirmPassword"],
});

type RegStep = "email" | "otp" | "profile";

// ─── Register form panel ──────────────────────────────────────────────────────

function RegisterPanel({ onSwitchTab, onHeightChange }: { onSwitchTab: () => void; onHeightChange?: () => void }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const registerMutation = useRegister();
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [regStep, setRegStep] = useState<RegStep>("email");
  const [regEmail, setRegEmail] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
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

  // Notify parent when step changes so it can remeasure height
  useEffect(() => { onHeightChange?.(); }, [regStep]); // eslint-disable-line

  const emailForm = useForm<z.infer<typeof emailStepSchema>>({
    resolver: zodResolver(emailStepSchema),
    defaultValues: { email: "" },
  });
  const otpForm = useForm<z.infer<typeof otpStepSchema>>({
    resolver: zodResolver(otpStepSchema),
    defaultValues: { otp: "" },
  });
  const profileForm = useForm<z.infer<typeof profileStepSchema>>({
    resolver: zodResolver(profileStepSchema),
    defaultValues: { name: "", password: "", confirmPassword: "" },
  });

  async function sendOtp(email: string): Promise<boolean> {
    setSendingOtp(true);
    setOtpError(null);
    try {
      const res = await csrfFetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Gagal mengirim OTP."); return false; }
      return true;
    } catch {
      setOtpError("Gagal terhubung ke server. Coba lagi.");
      return false;
    } finally {
      setSendingOtp(false);
    }
  }

  function startCooldown() {
    setResendCooldown(60);
    const iv = setInterval(() => setResendCooldown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; }), 1000);
  }

  async function onEmailSubmit(values: z.infer<typeof emailStepSchema>) {
    const ok = await sendOtp(values.email);
    if (ok) { setRegEmail(values.email); setRegStep("otp"); startCooldown(); }
  }

  function onOtpSubmit(values: z.infer<typeof otpStepSchema>) {
    setRegOtp(values.otp);
    setRegStep("profile");
  }

  async function onResend() {
    if (resendCooldown > 0 || sendingOtp) return;
    const ok = await sendOtp(regEmail);
    if (ok) { otpForm.reset(); startCooldown(); }
  }

  function onProfileSubmit(values: z.infer<typeof profileStepSchema>) {
    const { confirmPassword: _, ...rest } = values;
    const payload: Record<string, string> = { ...rest, email: regEmail, otp: regOtp };
    if (refCode && refCheck?.valid) payload.refCode = refCode;
    registerMutation.mutate({ data: payload as any }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation("/dashboard");
      },
    });
  }

  const STEPS: RegStep[] = ["email", "otp", "profile"];
  const stepIdx = STEPS.indexOf(regStep);

  return (
    <div className="px-6 pb-6">
      {/* Step indicator */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
              s === regStep ? "bg-[#f97316] text-white" :
              stepIdx > i ? "bg-emerald-500 text-white" :
              "bg-[#e2e8f0] text-[#94a3b8]"
            }`}>
              {stepIdx > i ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < 2 && <div className={`h-px w-6 transition-colors ${stepIdx > i ? "bg-emerald-400" : "bg-[#e2e8f0]"}`} />}
          </div>
        ))}
      </div>

      {/* Referral banner — only on step 1 */}
      {regStep === "email" && refCode && refCheck?.valid && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
          <Gift className="h-4 w-4 shrink-0 text-emerald-500" />
          Diundang oleh <strong>{refCheck.referrerName}</strong> — dapat bonus Rp&nbsp;5.000!
        </div>
      )}
      {regStep === "email" && refCode && refCheck && !refCheck.valid && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600">
          Kode referral tidak valid atau sudah tidak berlaku.
        </div>
      )}

      {/* ── Step 1: Email ── */}
      {regStep === "email" && (
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
            <FormField control={emailForm.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#172033]">Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className={ICON_CLS} />
                    <Input placeholder="kamu@contoh.com" autoComplete="email" className={INPUT_CLS} {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {otpError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{otpError}</div>
            )}
            <Button type="submit" className="h-11 w-full bg-[#f97316] text-white hover:bg-[#ea580c]" disabled={sendingOtp}>
              {sendingOtp ? "Mengirim kode..." : "Kirim kode verifikasi"}
            </Button>
          </form>
        </Form>
      )}

      {/* ── Step 2: OTP ── */}
      {regStep === "otp" && (
        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
            <p className="text-center text-sm text-[#526173]">Kode 6 digit dikirim ke <span className="font-semibold text-[#172033]">{regEmail}</span></p>
            <FormField control={otpForm.control} name="otp" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#172033]">Kode OTP</FormLabel>
                <FormControl>
                  <div className="relative">
                    <KeyRound className={ICON_CLS} />
                    <Input
                      placeholder="123456"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className={INPUT_CLS + " text-center text-xl font-bold tracking-[0.3em]"}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {otpError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{otpError}</div>
            )}
            <Button type="submit" className="h-11 w-full bg-[#f97316] text-white hover:bg-[#ea580c]">
              Verifikasi kode
            </Button>
            <div className="flex items-center justify-between">
              <button type="button" className="text-xs text-[#526173] hover:text-[#172033] transition-colors"
                onClick={() => { setRegStep("email"); setOtpError(null); }}>
                ← Ganti email
              </button>
              <button
                type="button"
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${resendCooldown > 0 || sendingOtp ? "cursor-not-allowed text-[#94a3b8]" : "text-[#f97316] hover:text-[#ea580c]"}`}
                onClick={onResend}
                disabled={resendCooldown > 0 || sendingOtp}
              >
                <RefreshCw className={`h-3 w-3 ${sendingOtp ? "animate-spin" : ""}`} />
                {resendCooldown > 0 ? `Kirim ulang (${resendCooldown}s)` : "Kirim ulang kode"}
              </button>
            </div>
          </form>
        </Form>
      )}

      {/* ── Step 3: Profile ── */}
      {regStep === "profile" && (
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <FormField control={profileForm.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#172033]">Nama Lengkap</FormLabel>
                <FormControl>
                  <div className="relative">
                    <UserRound className={ICON_CLS} />
                    <Input placeholder="Budi Santoso" autoComplete="name" className={INPUT_CLS} {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={profileForm.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#172033]">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <LockKeyhole className={ICON_CLS} />
                    <Input type={showPw ? "text" : "password"} placeholder="Minimal 8 karakter"
                      autoComplete="new-password" className={INPUT_CLS + " pr-11"} {...field} />
                    <PasswordToggle show={showPw} onToggle={() => setShowPw(v => !v)}
                      label={showPw ? "Sembunyikan password" : "Tampilkan password"} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={profileForm.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#172033]">Konfirmasi Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <LockKeyhole className={ICON_CLS} />
                    <Input type={showCPw ? "text" : "password"} placeholder="Ulangi password"
                      autoComplete="new-password" className={INPUT_CLS + " pr-11"} {...field} />
                    <PasswordToggle show={showCPw} onToggle={() => setShowCPw(v => !v)}
                      label={showCPw ? "Sembunyikan konfirmasi" : "Tampilkan konfirmasi"} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {registerMutation.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {/* @ts-ignore */}
                {registerMutation.error?.error || "Registrasi gagal. Silakan coba lagi."}
              </div>
            )}
            <Button type="submit" className="h-11 w-full bg-[#f97316] text-white hover:bg-[#ea580c]"
              disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Membuat akun..." : "Buat akun"}
            </Button>
          </form>
        </Form>
      )}

      <p className="mt-5 text-center text-sm text-[#526173]">
        Sudah punya akun?{" "}
        <button onClick={onSwitchTab} className="font-semibold text-[#f97316] hover:underline">Masuk</button>
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AuthPage({ initialTab = "login" }: { initialTab?: "login" | "register" }) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [, setLocation] = useLocation();

  // Measure panel heights for smooth container transition
  const loginRef  = useRef<HTMLDivElement>(null);
  const registerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const updateHeight = useCallback((t: "login" | "register") => {
    const el = t === "login" ? loginRef.current : registerRef.current;
    if (el) setHeight(el.offsetHeight);
  }, []);

  // Measure on first render
  useLayoutEffect(() => { updateHeight(tab); }, []); // eslint-disable-line

  function switchTo(t: "login" | "register") {
    updateHeight(t);   // capture target height before transition
    setTab(t);
    setLocation(t === "login" ? "/login" : "/register", { replace: true });
  }

  const TAB_ITEMS = [
    { key: "login" as const, label: "Masuk" },
    { key: "register" as const, label: "Daftar" },
  ];

  const headings = {
    login: "Selamat Datang",
    register: "Buat Akun",
  };

  const subtitles = {
    login: "Masuk untuk lanjutkan ke dashboard kamu.",
    register: "Daftar untuk mulai deploy dan kelola API key.",
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
      {/* Overlays */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(248,250,252,0.88) 0%, rgba(248,250,252,0.84) 54%, rgba(255,247,237,0.92) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.16), rgba(20,184,166,0.10) 56%, transparent 100%)" }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div
          className="overflow-hidden rounded-3xl border border-[#dbe8f3] shadow-[0_24px_70px_rgba(23,32,51,0.13)]"
          style={{ background: "rgba(255,255,255,0.93)", backdropFilter: "blur(20px)" }}
        >
          {/* Tab bar — full width, flush to top of card */}
          <div className="flex items-stretch border-b border-[#e8f0f7]">
            {/* Back arrow */}
            <Link
              href="/"
              title="Kembali ke beranda"
              className="flex w-12 flex-shrink-0 items-center justify-center border-r border-[#e8f0f7] text-[#b0c0d0] transition-colors hover:bg-[#f8fbff] hover:text-[#526173]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            {/* Tabs */}
            {TAB_ITEMS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => switchTo(key)}
                  className="relative flex-1 py-3.5 text-sm font-semibold transition-colors duration-200"
                  style={{ color: active ? "#172033" : "#94a3b8" }}
                >
                  {label}
                  {/* Active indicator */}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-[#f97316]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Title + subtitle */}
          <div className="px-6 pb-4 pt-6 text-center">
            <h1
              key={tab + "-h"}
              className="mb-1 text-2xl font-bold tracking-tight text-[#172033]"
              style={{ animation: "fadeSlideIn 0.25s ease both" }}
            >
              {headings[tab]}
            </h1>
            <p
              key={tab + "-s"}
              className="text-sm text-[#94a3b8]"
              style={{ animation: "fadeSlideIn 0.25s ease both" }}
            >
              {subtitles[tab]}
            </p>
          </div>

          {/* Sliding form viewport */}
          <div
            className="overflow-hidden transition-[height] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ height: height !== undefined ? `${height}px` : "auto" }}
          >
            {/* Track — 200% wide, slides left/right */}
            <div
              className="flex transition-transform duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                width: "200%",
                transform: `translateX(${tab === "login" ? "0%" : "-50%"})`,
              }}
            >
              {/* Login panel */}
              <div ref={loginRef} style={{ width: "50%" }}>
                <LoginPanel onSwitchTab={() => switchTo("register")} />
              </div>

              {/* Register panel */}
              <div ref={registerRef} style={{ width: "50%" }}>
                <RegisterPanel
                  onSwitchTab={() => switchTo("login")}
                  onHeightChange={() => {
                    // Re-measure register panel height after step change
                    setTimeout(() => {
                      if (tab === "register" && registerRef.current) {
                        setHeight(registerRef.current.offsetHeight);
                      }
                    }, 0);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fade-in keyframe */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .duration-400 { transition-duration: 400ms; }
      `}</style>
    </div>
  );
}
