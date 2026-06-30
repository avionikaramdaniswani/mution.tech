import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, useHealthCheck } from "@workspace/api-client-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  HeartPulse,
  User,
  CreditCard,
  Wallet,
  KeyRound,
  BookOpen,
  Server,
  BarChart3,
  ChevronDown,
} from "lucide-react";

function formatCredits(credits?: number) {
  if (credits === undefined || credits === null) return "Rp 0";
  return "Rp " + credits.toLocaleString("id-ID");
}

function creditColor(credits?: number): string {
  if (credits === undefined || credits === null || credits === 0) return "rgb(239,68,68)";
  if (credits <= 1000) return "rgb(234,179,8)";
  return "rgb(34,197,94)";
}

function UserAvatar({ name, size = "md" }: { name?: string; size?: "sm" | "md" }) {
  const initials = (name ?? "?")
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

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const { data: health } = useHealthCheck({ query: { refetchInterval: 30000 } });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => logout(),
    });
  };

  const navItems = [
    { title: "Beranda",          url: "/dashboard",  icon: LayoutDashboard },
    { title: "Hosting",          url: "/projects",   icon: Server },
    { title: "API Token",        url: "/api-keys",   icon: KeyRound },
    { title: "Log Penggunaan",   url: "/usage",      icon: BarChart3 },
    { title: "Dokumentasi",      url: "/docs",       icon: BookOpen },
    { title: "Aktivitas",        url: "/activity",   icon: Activity },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background dark text-foreground">
        <Sidebar variant="inset" className="border-r border-border/50">

          {/* ── Sidebar header ── */}
          <SidebarHeader className="flex h-16 items-center px-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <img src="/mution-logo.png" alt="Mution" className="h-8 w-auto" />
                <span
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  className="text-lg font-extrabold tracking-tight text-primary"
                >
                  Mution
                </span>
              </div>
              {health?.status === "ok" ? (
                <div
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full"
                  title="Platform beroperasi normal"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Normal</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full"
                  title="Platform mengalami gangguan"
                >
                  <HeartPulse className="h-3 w-3" />
                  <span>Gangguan</span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* ── Sidebar nav ── */}
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.startsWith(item.url)}
                        tooltip={item.title}
                      >
                        <Link href={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {user?.role === "admin" && (
              <SidebarGroup>
                <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location.startsWith("/admin")}
                        tooltip="Panel Admin"
                      >
                        <Link href="/admin" className="flex items-center gap-3">
                          <ShieldAlert className="h-4 w-4 text-destructive" />
                          <span className="text-destructive font-medium">Panel Admin</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">

          {/* ── Top navbar — gaya landing page ── */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/50 px-4 md:px-6 bg-background/80 backdrop-blur-md">

            {/* Left: sidebar trigger + logo */}
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
                <img src="/mution-logo.png" alt="Mution" className="h-7 w-auto" />
                <span
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  className="text-base font-extrabold tracking-tight text-primary hidden sm:block"
                >
                  Mution
                </span>
              </Link>

              {/* Center nav links */}
              <nav className="hidden md:flex items-center gap-0.5 ml-2">
                {[
                  { label: "Home",       href: "/" },
                  { label: "Dashboard",  href: "/dashboard" },
                  { label: "Pricing",    href: "/harga" },
                  { label: "Changelog",  href: "/docs" },
                ].map(({ label, href }) => (
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

            {/* Right: credits + profile */}
            <div className="flex items-center gap-2.5">

              {/* Credit badge */}
              <Link href="/billing">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/40"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                  title="Kredit kamu"
                >
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: creditColor(user?.credits) }}
                  >
                    {formatCredits(user?.credits)}
                  </span>
                </div>
              </Link>

              {/* Profile dropdown — always visible */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl transition-colors hover:bg-muted/40 outline-none"
                    style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <UserAvatar name={user?.name} size="sm" />
                    <div className="hidden sm:block text-left min-w-0">
                      <p className="text-xs font-semibold truncate max-w-[120px] leading-tight">{user?.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[120px] leading-tight">{user?.email}</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="end" className="w-48 mt-1">
                  {/* Info di mobile (nama/email tidak tampil di button) */}
                  <div className="sm:hidden px-2 py-1.5 mb-1">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <DropdownMenuSeparator className="mt-1.5" />
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/billing" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
