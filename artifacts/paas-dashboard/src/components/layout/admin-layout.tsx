import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Users,
  Box,
  LogOut,
  ShieldAlert,
  MoreHorizontal,
  ArrowLeft,
  Activity,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function UserAvatar({ name }: { name?: string }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
      style={{ background: "rgba(239,68,68,0.18)", color: "rgb(239,68,68)", border: "1px solid rgba(239,68,68,0.28)" }}
    >
      {initials}
    </div>
  );
}

const navItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Pengguna", url: "/admin/users", icon: Users },
  { title: "Proyek", url: "/admin/projects", icon: Box },
  { title: "Aktivitas", url: "/admin/activity", icon: Activity },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => logout() });
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location === item.url;
    return location.startsWith(item.url);
  };

  return (
    <div className="flex min-h-screen w-full dark text-foreground" style={{ background: "hsl(var(--background))" }}>
      {/* ── Sidebar ── */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col border-r"
        style={{ borderColor: "rgba(239,68,68,0.12)", background: "rgba(10,5,5,0.98)" }}
      >
        {/* Logo / Brand */}
        <div
          className="flex items-center gap-3 px-5 h-16 border-b flex-shrink-0"
          style={{ borderColor: "rgba(239,68,68,0.12)" }}
        >
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)" }}
          >
            <ShieldAlert className="h-4 w-4" style={{ color: "rgb(239,68,68)" }} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">Admin Panel</p>
            <p className="text-[10px]" style={{ color: "rgba(239,68,68,0.7)" }}>Mution Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.url} href={item.url}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
                  style={
                    active
                      ? { background: "rgba(239,68,68,0.12)", color: "rgb(239,68,68)", border: "1px solid rgba(239,68,68,0.2)" }
                      : { color: "rgba(255,255,255,0.45)", border: "1px solid transparent" }
                  }
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.title}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Back to user panel */}
        <div className="px-3 pb-3">
          <Link href="/dashboard">
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer hover:bg-white/5"
              style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Dashboard
            </div>
          </Link>
        </div>

        {/* Footer / User */}
        <div
          className="border-t px-3 py-3 flex-shrink-0"
          style={{ borderColor: "rgba(239,68,68,0.12)" }}
        >
          <div className="flex items-center gap-2.5">
            <UserAvatar name={user?.name} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-white">{user?.name}</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{user?.email}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-6 w-6 flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-40 mb-1">
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
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-6"
          style={{ borderColor: "rgba(239,68,68,0.12)", background: "rgba(10,5,5,0.98)" }}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" style={{ color: "rgba(239,68,68,0.7)" }} />
            <span className="text-xs font-medium" style={{ color: "rgba(239,68,68,0.7)" }}>
              Mode Administrator
            </span>
          </div>
          <div
            className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: "rgba(239,68,68,0.1)", color: "rgba(239,68,68,0.7)", border: "1px solid rgba(239,68,68,0.18)" }}
          >
            Admin
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
