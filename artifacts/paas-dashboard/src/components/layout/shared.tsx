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
  LogOut,
  User,
  CreditCard,
  Wallet,
  ChevronDown,
  Receipt,
} from "lucide-react";

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
    <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between gap-4 border-b border-border/50 bg-background/80 backdrop-blur-md px-4">

      {/* Kiri: toggle + logo + extra + nav links */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="flex-shrink-0" aria-label="Buka/tutup menu samping" />

        <Link href={logoHref} className="flex items-center gap-2 flex-shrink-0 ml-1">
          <img src="/mution-logo.png" alt="Mution" className="h-7 w-auto" />
          <span
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            className="text-base font-extrabold tracking-tight text-primary hidden sm:block"
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
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location === href
                  ? "text-foreground font-medium bg-muted/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
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

        {/* Saldo */}
        <Link href="/billing">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/40"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
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
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl transition-colors hover:bg-muted/40 outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
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
