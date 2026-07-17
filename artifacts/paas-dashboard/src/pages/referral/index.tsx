import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Gift,
  Link2,
  Users,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ReferralStats {
  total: number;
  pending: number;
  rewarded: number;
  creditsEarned: number;
}

interface ReferralEntry {
  id: number;
  status: "pending" | "rewarded";
  refereeName: string;
  refereeEmail: string;
  joinedAt: string;
  rewardedAt: string | null;
}

interface ReferralData {
  referralCode: string;
  stats: ReferralStats;
  referrals: ReferralEntry[];
}

async function fetchReferral(): Promise<ReferralData> {
  const res = await fetch("/api/referral", { credentials: "include" });
  if (!res.ok) throw new Error("Gagal memuat data referral");
  return res.json();
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#dbe8f3] bg-white p-5 shadow-[0_4px_20px_rgba(23,32,51,0.06)]">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ background: `${color}18` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <p className="text-2xl font-black tabular-nums text-[#172033]">{value}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#172033]">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-[#64748b]">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "rewarded" }) {
  if (status === "rewarded") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Reward diterima
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-200">
      <Clock3 className="h-3 w-3" />
      Menunggu topup
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRupiah(rp: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(rp);
}

export default function ReferralPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["referral"],
    queryFn: fetchReferral,
  });
  const [copied, setCopied] = useState(false);

  const referralUrl = data?.referralCode
    ? `${window.location.origin}/register?ref=${data.referralCode}`
    : "";

  function handleCopy() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      toast({ title: "Link disalin!", description: "Bagikan ke teman kamu." });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Program Referral</p>
        <h1 className="mt-1 text-2xl font-black text-[#172033]">Ajak teman, dapat kredit gratis</h1>
        <p className="mt-1 text-sm text-[#526173]">
          Bagikan link referralmu. Teman yang daftar langsung dapat <strong>Rp 5.000 kredit</strong> welcome bonus,
          dan kamu dapat <strong>Rp 5.000 kredit</strong> setelah mereka topup pertama.
        </p>
      </div>

      {/* Referral link card */}
      <div className="rounded-xl border border-[#dbe8f3] bg-white p-6 shadow-[0_4px_20px_rgba(23,32,51,0.06)]">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[#f97316]" />
          <span className="text-sm font-bold text-[#172033]">Link referralmu</span>
        </div>

        <div className="flex gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-[#dbe8f3] bg-[#f8fbff] px-4 py-3">
            <span className="truncate font-mono text-sm text-[#526173]">
              {isLoading ? "Memuat..." : referralUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!referralUrl}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#f97316] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ea580c] disabled:opacity-50"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Disalin!" : "Salin"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Hei! Coba Mution, platform hosting + AI Gateway Indonesia. Daftar pakai link ini dan langsung dapat kredit gratis: ${referralUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe8f3] bg-white px-3 py-1.5 text-xs font-semibold text-[#526173] transition-colors hover:bg-[#f8fbff]"
          >
            <ExternalLink className="h-3 w-3" />
            Share via WhatsApp
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { step: "1", icon: Link2, color: "#f97316", title: "Salin link", body: "Salin link referral unik milikmu di atas." },
          { step: "2", icon: Users, color: "#14b8a6", title: "Teman daftar", body: "Teman daftar lewat linkmu → langsung dapat Rp 5.000 kredit." },
          { step: "3", icon: Wallet, color: "#8b5cf6", title: "Kamu dapat kredit", body: "Setelah teman topup pertama, kamu dapat Rp 5.000 kredit otomatis." },
        ].map(({ step, icon: Icon, color, title, body }) => (
          <div key={step} className="relative rounded-xl border border-[#dbe8f3] bg-white p-5 shadow-[0_4px_20px_rgba(23,32,51,0.06)]">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: color }}>
                {step}
              </div>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <p className="font-bold text-[#172033]">{title}</p>
            <p className="mt-1 text-xs leading-5 text-[#64748b]">{body}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-[#dbe8f3] bg-white" />
          ))}
        </div>
      ) : isError ? null : (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard icon={Users} label="Total diundang" value={data!.stats.total} color="#f97316" />
          <StatCard icon={Clock3} label="Menunggu topup" value={data!.stats.pending} sub="Belum cair" color="#f59e0b" />
          <StatCard icon={CheckCircle2} label="Reward cair" value={data!.stats.rewarded} sub="Teman sudah topup" color="#10b981" />
          <StatCard icon={Gift} label="Kredit didapat" value={formatRupiah(data!.stats.creditsEarned)} sub="Total reward kamu" color="#8b5cf6" />
        </div>
      )}

      {/* Referral history table */}
      <div className="rounded-xl border border-[#dbe8f3] bg-white shadow-[0_4px_20px_rgba(23,32,51,0.06)]">
        <div className="border-b border-[#dbe8f3] px-5 py-4">
          <h2 className="font-bold text-[#172033]">Riwayat referral</h2>
          <p className="mt-0.5 text-xs text-[#64748b]">Semua teman yang daftar lewat link kamu</p>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-[#f8fbff]" />)}
          </div>
        ) : !data?.referrals.length ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff7ed]">
              <Gift className="h-6 w-6 text-[#f97316]" />
            </div>
            <p className="font-semibold text-[#172033]">Belum ada referral</p>
            <p className="max-w-xs text-sm text-[#64748b]">Salin link di atas dan bagikan ke teman. Kredit gratis menanti!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dbe8f3] bg-[#f8fbff] text-left text-[10px] font-bold uppercase tracking-widest text-[#64748b]">
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Bergabung</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Reward cair</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbe8f3]">
                {data!.referrals.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-[#f8fbff]">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#172033]">{r.refereeName}</p>
                      <p className="text-xs text-[#64748b]">{r.refereeEmail}</p>
                    </td>
                    <td className="px-5 py-3 text-[#526173]">{formatDate(r.joinedAt)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3 font-mono text-[#526173]">
                      {r.rewardedAt ? (
                        <span className="font-semibold text-emerald-600">+{formatRupiah(5000)}</span>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
