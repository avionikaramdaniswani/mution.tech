import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { useLogin, useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState, useRef, useLayoutEffect, useCallback } from "react";
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

// ─── Register form panel ──────────────────────────────────────────────────────

function RegisterPanel({ onSwitchTab }: { onSwitchTab: () => void }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const registerMutation = useRegister();
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: z.infer<typeof registerSchema>) {
    const { confirmPassword: _, ...data } = values;
    registerMutation.mutate({ data }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation("/dashboard");
      },
    });
  }

  return (
    <div className="px-6 pb-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="name" render={({ field }) => (
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
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
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

          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#172033]">Konfirmasi Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <LockKeyhole className={ICON_CLS} />
                  <Input
                    type={showCPw ? "text" : "password"}
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                    className={INPUT_CLS + " pr-11"}
                    {...field}
                  />
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

      <p className="mt-5 text-center text-sm text-[#526173]">
        Sudah punya akun?{" "}
        <button onClick={onSwitchTab} className="font-semibold text-[#f97316] hover:underline">
          Masuk
        </button>
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

  const subtitles = {
    login: "Lanjutkan deploy, pantau usage, dan kelola API key.",
    register: "Buat akun untuk mulai deploy dan kelola API key.",
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
        {/* Back button */}
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#dbe8f3] bg-white/75 px-3 py-2 text-xs font-semibold text-[#526173] shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#172033]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Beranda
        </Link>

        {/* Card */}
        <div
          className="overflow-hidden rounded-3xl border border-[#dbe8f3] shadow-[0_24px_70px_rgba(23,32,51,0.13)]"
          style={{ background: "rgba(255,255,255,0.93)", backdropFilter: "blur(20px)" }}
        >
          {/* Header */}
          <div className="px-6 pb-5 pt-7 text-center">
            {/* Logo */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#fed7aa] bg-white shadow-[0_14px_34px_rgba(249,115,22,0.16)]">
              <img src="/mution-logo.png" alt="Mution" className="h-9 w-auto" />
            </div>

            {/* Subtitle - fades on switch */}
            <p
              className="mb-5 text-sm leading-6 text-[#526173] transition-all duration-300"
              key={tab}
              style={{ animation: "fadeSlideIn 0.3s ease both" }}
            >
              {subtitles[tab]}
            </p>

            {/* Tab switcher */}
            <div className="relative mx-auto flex w-fit rounded-xl bg-[#f1f5f9] p-1">
              {/* Sliding pill */}
              <div
                className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_1px_6px_rgba(23,32,51,0.12)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{
                  width: "calc(50% - 2px)",
                  left: tab === "login" ? "4px" : "calc(50% - 2px)",
                }}
              />
              {TAB_ITEMS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchTo(key)}
                  className="relative z-10 min-w-[100px] rounded-lg px-5 py-2 text-sm font-semibold transition-colors duration-200"
                  style={{ color: tab === key ? "#172033" : "#94a3b8" }}
                >
                  {label}
                </button>
              ))}
            </div>
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
                <RegisterPanel onSwitchTab={() => switchTo("login")} />
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
