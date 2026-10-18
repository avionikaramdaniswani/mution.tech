import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LogOut,
  User,
  CreditCard,
  Wallet,
  ChevronDown,
  Receipt,
  Sparkles,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useUserTokenPackages } from "@/hooks/use-user-token-packages";
import { cn } from "@/lib/utils";

export function formatCredits(credits?: number) {
  if (credits === undefined || credits === null) return "Rp 0";
  return "Rp " + credits.toLocaleString("id-ID");
}

export function creditColor(credits?: number): string {
  if (credits === undefined || credits === null || credits === 0) return "rgb(239,68,68)";
  if (credits <= 1000) return "rgb(234,179,8)";
  return "rgb(34,197,94)";
}

/**
 * Cocokkan lokasi saat ini dengan url menu.
 * - exact: harus sama persis (mis. "/admin" tidak ikut aktif di "/admin/users")
 * - default: aktif jika lokasi === url atau merupakan sub-route ("/url/...").
 *   Batas "/" mencegah "/dashboard" ikut aktif di "/dashboardX".
 */
export function isNavActive(location: string, url: string, exact = false): boolean {
  if (exact) return location === url;
  return location === url || location.startsWith(url + "/");
}

export function UserAvatar({ name, size = "md" }: { name?: string; size?: "sm" | "md" }) {
  const initials = (name ?? "x")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: "rgba(249,115,22,0.18)", color: "rgb(249,115,22)", border: "1px solid rgba(249,115,22,0.28)" }}
    >
      {initials}
    </div>
  );
}

export interface TopNavLink {
  label: string;
  href: string;
}

export interface TopNavbarProps {
  user?: { name?: string; email?: string; credits?: number } | null;
  location: string;
  navLinks: TopNavLink[];
  /** Tautan logo di kiri navbar (mis. "/dashboard" atau "/admin"). */
  logoHref: string;
  /** Status kesehatan platform dari useHealthCheck. */
  healthOk: boolean;
  /** Elemen tambahan di kiri, setelah logo (mis. badge "Admin"). */
  leftExtra?: React.ReactNode;
  onLogout: () => void;
}

export function NavbarTokenPassPill() {
  const { data: passes = [] } = useUserTokenPackages();
  if (!passes || passes.length === 0) return null;

  const totalRemaining = passes.reduce((sum, p) => sum + p.remainingTokens, 0);
  const totalTokensFormatted = totalRemaining >= 1_000_000
    ? `${(totalRemaining / 1_000_000).toFixed(1)}M`
    : totalRemaining >= 1_000
    ? `${(totalRemaining / 1_000).toFixed(0)}k`
    : `${totalRemaining}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 sm:px-3 py-1.5 transition-all text-amber-700 dark:text-amber-400 font-bold text-xs shadow-sm active:scale-95"
          title="Klik untuk detail Paket Token aktif"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          <span className="tabular-nums font-extrabold">{totalTokensFormatted}</span>
          <span className="hidden sm:inline text-[11px] font-semibold opacity-80">Token</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-80 p-4 space-y-3 shadow-xl rounded-2xl border-border bg-card">
        <div className="flex items-center justify-between pb-2.5 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-extrabold text-xs uppercase tracking-wider text-foreground">Paket Token Aktif</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {passes.length} Aktif
          </span>
        </div>

        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-0.5">
          {passes.map((pass) => {
            const isClaude = pass.category === "claude";
            const pct = Math.max(0, Math.min(100, Math.round((pass.remainingTokens / pass.totalTokens) * 100)));
            const daysLeft = Math.max(0, Math.ceil((new Date(pass.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

            return (
              <div key={pass.id} className="p-3 rounded-xl border border-border/80 bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border",
                    isClaude 
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  )}>
                    {isClaude ? "Claude Pass" : "GPT Pass"}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Sisa {daysLeft} hari
                  </span>
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-foreground">
                      {pass.remainingTokens.toLocaleString("id-ID")}
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">/ {pass.totalTokens.toLocaleString("id-ID")}</span>
                    </span>
                    <span className="text-[10px] font-bold text-primary">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted mt-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", isClaude ? "bg-amber-500" : "bg-emerald-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-1">
          <Link
            href="/billing"
            className="w-full py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity shadow-sm"
          >
            <span>Beli / Kelola Paket</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Navbar fixed full-width yang dipakai baik panel user maupun admin. */
export function TopNavbar({
  user,
  location,
  navLinks,
  logoHref,
  healthOk,
  leftExtra,
  onLogout,
}: TopNavbarProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between gap-4 border-b border-[#dbe8f3] bg-white/88 px-4 shadow-[0_14px_40px_rgba(23,32,51,0.08)] backdrop-blur-xl dark:border-border/50 dark:bg-background/80 dark:shadow-none">

      {/* Kiri: toggle + logo + extra + nav links */}
      <div className="flex items-center gap-2">
        <SidebarTrigger
          className="flex-shrink-0 text-[#526173] hover:bg-[#eef8ff] hover:text-[#172033] dark:text-muted-foreground dark:hover:bg-muted/30 dark:hover:text-foreground"
          aria-label="Buka/tutup menu samping"
        />

        <Link href={logoHref} className="flex items-center gap-2 flex-shrink-0 ml-1">
          <img src="/mution-logo.png" alt="Mution" className="h-7 w-auto" />
          <span
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            className="hidden text-base font-extrabold tracking-normal text-[#172033] sm:block dark:text-primary"
          >
            Mution
          </span>
        </Link>

        {leftExtra}

        <nav className="hidden md:flex items-center gap-0.5 ml-3">
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                location === href
                  ? "bg-[#eef8ff] font-semibold text-[#172033] dark:bg-muted/30 dark:text-foreground"
                  : "text-[#526173] hover:bg-[#eef8ff] hover:text-[#172033] dark:text-muted-foreground dark:hover:bg-muted/30 dark:hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Kanan: status platform + saldo + profil */}
      <div className="flex items-center gap-2.5">

        {/* Status dot - hanya titik, tanpa tulisan */}
        <div
          role="status"
          className={`h-2 w-2 rounded-full flex-shrink-0 ${healthOk ? "bg-emerald-500 animate-pulse" : "bg-destructive"}`}
          title={healthOk ? "Platform beroperasi normal" : "Platform mengalami gangguan"}
          aria-label={healthOk ? "Platform beroperasi normal" : "Platform mengalami gangguan"}
        />

        {/* Token Pass Pill (Hanya muncul jika ada paket aktif) */}
        <NavbarTokenPassPill />

        {/* Saldo */}
        <Link href="/billing">
          <div
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dbe8f3] bg-[#f8fbff]/90 px-3 py-1.5 transition-colors hover:border-[#c9d8e7] hover:bg-[#eef8ff] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-muted/40"
            title="Kredit kamu"
          >
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold tabular-nums" style={{ color: creditColor(user?.credits) }}>
              {formatCredits(user?.credits)}
            </span>
          </div>
        </Link>

        {/* Profil dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full border border-[#dbe8f3] bg-white/70 py-1 pl-1 pr-2.5 outline-none transition-colors hover:border-[#c9d8e7] hover:bg-[#eef8ff] dark:border-white/10 dark:bg-transparent dark:hover:bg-muted/40"
              aria-label="Menu akun"
            >
              <UserAvatar name={user?.name} size="sm" />
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-semibold truncate max-w-[110px] leading-tight">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[110px] leading-tight">{user?.email}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="w-48 mt-1">
            <div className="sm:hidden px-2 py-1.5">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing" className="flex items-center gap-2 cursor-pointer">
                <Wallet className="h-4 w-4" /> Billing & Top Up
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing/riwayat" className="flex items-center gap-2 cursor-pointer">
                <Receipt className="h-4 w-4" /> Transaction History
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
