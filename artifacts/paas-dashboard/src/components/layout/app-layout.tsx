import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Activity,
  LayoutDashboard,
  ShieldAlert,
  KeyRound,
  BookOpen,
  Server,
  BarChart3,
  LineChart,
  Brain,
  Wallet,
  CreditCard,
} from "lucide-react";
import { TopNavbar, isNavActive, formatCredits, creditColor, type TopNavLink } from "./shared";
import { useRealtimeEvents } from "@/hooks/use-realtime";

/* --- Navigasi: dipisah per layanan --- */
const navGroups = [
  {
    label: null,
    items: [
      { title: "Dashboard",      url: "/dashboard",  icon: LayoutDashboard },
    ],
  },
  {
    label: "Hosting",
    items: [
      { title: "Projects",     url: "/projects",   icon: Server },
      { title: "Hosting Usage",url: "/usage",      icon: BarChart3 },
    ],
  },
  {
    label: "Developer",
    items: [
      { title: "API Keys",     url: "/api-keys",   icon: KeyRound },
      { title: "AI Models",    url: "/providers",  icon: Brain },
      { title: "API Usage",    url: "/api-usage",  icon: LineChart },
      { title: "Documentation",url: "/docs",       icon: BookOpen },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { title: "Activity Logs",url: "/activity",   icon: Activity },
    ],
  },
];

const topNavLinks: TopNavLink[] = [
  { label: "Home",      href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pricing",   href: "/harga" },
  { label: "Changelog", href: "/changelog" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });

  // Buka stream SSE user: saldo/transaksi/statistik ter-update seketika tanpa refresh.
  useRealtimeEvents("/api/events");

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => logout() });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-[#f8fbff] text-[#172033]">

        {/* -- Navbar: fixed full-width, tidak terpengaruh sidebar -- */}
        <TopNavbar
          user={user}
          location={location}
          navLinks={topNavLinks}
          logoHref="/dashboard"
          healthOk={health?.status === "ok"}
          onLogout={handleLogout}
        />

        {/* -- Body: sidebar + content, digeser 64px ke bawah navbar -- */}
        <div className="flex min-h-screen pt-16">
          <Sidebar
            variant="sidebar"
            collapsible="icon"
            className="top-16 h-[calc(100svh-4rem)] border-r border-[#dbe8f3] shadow-[8px_0_30px_rgba(23,32,51,0.04)]"
          >
            {/* -- Mobile-only header: logo + brand -- */}
            <SidebarHeader className="border-b border-[#dbe8f3] px-5 py-5 md:hidden">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <img src="/mution-logo.png" alt="Mution" className="h-8 w-auto" />
                <div>
                  <span
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    className="block text-lg font-extrabold leading-none tracking-normal text-[#172033]"
                  >
                    Mution
                  </span>
                  <span className="text-[10px] font-medium tracking-wide text-[#526173]">Cloud Platform</span>
                </div>
              </Link>
            </SidebarHeader>

            <SidebarContent className="pt-2">
              {navGroups.map((group, gi) => (
                <div key={group.label ?? "home"}>
                  {/* Separator tipis antar grup (kecuali sebelum grup pertama) */}
                  {gi > 0 && <SidebarSeparator />}

                  <SidebarGroup className={`${group.label ? "pt-1" : ""} pb-0`}>
                    {/* Label hanya muncul jika ada */}
                    {group.label && (
                      <SidebarGroupLabel className="h-5 text-[10px] font-semibold uppercase tracking-widest text-[#526173]/60">
                        {group.label}
                      </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => {
                          const active = isNavActive(location, item.url);
                          return (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton
                                asChild
                                isActive={active}
                                tooltip={item.title}
                              >
                                <Link href={item.url} className="flex items-center gap-3">
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </div>
              ))}

              {user?.role === "admin" && (
                <>
                  <SidebarSeparator />
                  <SidebarGroup className="pt-1 pb-0">
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={isNavActive(location, "/admin")}
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
                </>
              )}
            </SidebarContent>

            {/* -- Sidebar footer: kredit user -- */}
            <SidebarFooter className="border-t border-[#dbe8f3]">
              <Link href="/billing">
                <div
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[#eef8ff] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(249,115,22,0.1)",
                      border: "1px solid rgba(249,115,22,0.15)",
                    }}
                  >
                    <Wallet className="h-4 w-4" style={{ color: "rgb(249,115,22)" }} />
                  </div>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="mb-1 text-[10px] font-semibold uppercase leading-none tracking-wider text-[#526173]/70">Kredit</p>
                    <p
                      className="text-sm font-bold tabular-nums leading-none"
                      style={{ color: creditColor(user?.credits) }}
                    >
                      {formatCredits(user?.credits)}
                    </p>
                  </div>
                  <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-[#526173]/40 group-data-[collapsible=icon]:hidden" />
                </div>
              </Link>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>

      </div>
    </SidebarProvider>
  );
}
