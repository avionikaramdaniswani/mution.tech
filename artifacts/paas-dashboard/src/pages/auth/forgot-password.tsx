import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, CheckCircle2, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { csrfFetch } from "@/lib/csrf";

// ─── Shared Styles ────────────────────────────────────────────────────────────
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

// ─── Schemas ─────────────────────────────────────────────────────────────────
const emailSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid." }),
});

const resetSchema = z.object({
  otp: z.string().length(6, { message: "OTP harus 6 digit." }),
  newPassword: z.string().min(8, { message: "Password minimal 8 karakter." }),
  confirmPassword: z.string().min(1, { message: "Konfirmasi password wajib diisi." }),
}).refine(v => v.newPassword === v.confirmPassword, {
  message: "Konfirmasi password tidak sama.",
  path: ["confirmPassword"],
});

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
  });

  async function onSendOtp(values: z.infer<typeof emailSchema>) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await csrfFetch("/api/auth/forgot-password/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim OTP.");
      }
      setEmail(values.email);
      setStep("reset");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengirim OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(values: z.infer<typeof resetSchema>) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await csrfFetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: values.otp,
          newPassword: values.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mereset password.");
      }
      setStep("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mereset password.");
    } finally {
      setLoading(false);
    }
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
      {/* Overlays */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(248,250,252,0.88) 0%, rgba(248,250,252,0.84) 54%, rgba(255,247,237,0.92) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.16), rgba(20,184,166,0.10) 56%, transparent 100%)" }} />

      <div className="relative z-10 w-full max-w-md">
        <div
          className="flex flex-col overflow-hidden rounded-2xl border border-[#dbe8f3] shadow-[0_24px_70px_rgba(23,32,51,0.13)]"
          style={{
            background: "rgba(255,255,255,0.93)",
            backdropFilter: "blur(20px)",
            maxHeight: "min(660px, calc(100vh - 2rem))",
          }}
        >
          {/* Header */}
          <div className="flex-none relative px-6 pb-4 pt-8 text-center">
            {step === "email" && (
              <Link
                href="/login"
                className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#b0c0d0] transition-colors hover:bg-[#f1f5f9] hover:text-[#526173]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            {step === "reset" && (
              <button
                type="button"
                onClick={() => { setStep("email"); setErrorMsg(null); resetForm.reset(); }}
                className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#b0c0d0] transition-colors hover:bg-[#f1f5f9] hover:text-[#526173]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-[#172033]">
              Lupa Password
            </h1>
            <p className="text-sm text-[#94a3b8]">
              {step === "email" ? "Masukkan email kamu untuk mereset password." : 
               step === "reset" ? "Masukkan kode OTP dan password baru." :
               "Password berhasil diubah!"}
            </p>
          </div>

          {/* Form Content */}
          <div className="flex flex-col flex-1 h-full">
            {step === "email" && (
              <Form {...emailForm}>
                <form id="forgot-form" onSubmit={emailForm.handleSubmit(onSendOtp)} className="contents">
                  <div className="scrollbar-hide flex-1 overflow-y-auto px-6 pb-5 pt-1 space-y-4">
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

                    {errorMsg && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                        {errorMsg}
                      </div>
                    )}
                  </div>
                </form>
              </Form>
            )}

            {step === "reset" && (
              <Form {...resetForm}>
                <form id="forgot-form" onSubmit={resetForm.handleSubmit(onResetPassword)} className="contents">
                  <div className="scrollbar-hide flex-1 overflow-y-auto px-6 pb-5 pt-1 space-y-4">
                    <div className="rounded-lg border border-[#dbe8f3] bg-[#f8fafc] p-4 text-center">
                      <p className="text-sm font-medium text-[#172033]">Kode terkirim ke:</p>
                      <p className="text-sm text-[#64748b]">{email}</p>
                    </div>

                    <FormField control={resetForm.control} name="otp" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#172033]">Kode OTP (6 digit)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className={ICON_CLS} />
                            <Input placeholder="123456" maxLength={6} className={INPUT_CLS + " tracking-widest"} {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={resetForm.control} name="newPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#172033]">Password Baru</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className={ICON_CLS} />
                            <Input
                              type={showPw ? "text" : "password"}
                              placeholder="Minimal 8 karakter"
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

                    <FormField control={resetForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#172033]">Konfirmasi Password Baru</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className={ICON_CLS} />
                            <Input
                              type={showConfirmPw ? "text" : "password"}
                              placeholder="Ulangi password baru"
                              className={INPUT_CLS + " pr-11"}
                              {...field}
                            />
                            <PasswordToggle show={showConfirmPw} onToggle={() => setShowConfirmPw(v => !v)}
                              label={showConfirmPw ? "Sembunyikan password" : "Tampilkan password"} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {errorMsg && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                        {errorMsg}
                      </div>
                    )}
                  </div>
                </form>
              </Form>
            )}

            {step === "success" && (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#10b981] mb-4" />
                <h3 className="mb-2 font-semibold text-[#172033]">Password Berhasil Diubah!</h3>
                <p className="mb-6 text-sm text-[#64748b]">
                  Silakan masuk menggunakan password baru kamu.
                </p>
                <Link href="/login" className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#f97316] px-8 text-sm font-medium text-white transition-colors hover:bg-[#ea580c]">
                  Masuk Sekarang
                </Link>
              </div>
            )}
            
            {/* Footer Buttons */}
            {step !== "success" && (
              <div className="flex-none border-t border-[#e8f0f7] px-6 pb-6 pt-4">
                <Button type="submit" form="forgot-form" className="h-11 w-full bg-[#f97316] text-white hover:bg-[#ea580c]" disabled={loading}>
                  {loading ? "Memproses..." : (step === "email" ? "Kirim Kode OTP" : "Simpan Password Baru")}
                </Button>
                
                {step === "reset" && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => onSendOtp({ email })}
                      disabled={loading}
                      className="text-xs text-[#526173] hover:text-[#f97316] transition-colors"
                    >
                      Tidak menerima email? Kirim ulang
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
