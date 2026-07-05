import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Box,
  Activity,
  ShieldAlert,
  Cpu,
  Receipt,
  BarChart3,
  FolderGit2,
  Brain,
  CreditCard,
  Server,
  GitCommit,
} from "lucide-react";
import { TopNavbar, isNavActive, type TopNavLink } from "./shared";
import { useRealtimeEvents } from "@/hooks/use-realtime";

const adminNavGroups = [
  {
    title: "Administration",
    items: [
      { title: "Overview", url: "/admin", icon: LayoutDashboard, exact: true },
      { title: "Users", url: "/admin/users", icon: Users, exact: false },
      { title: "Projects", url: "/admin/projects", icon: FolderGit2, exact: false },
      { title: "Activity", url: "/admin/activity", icon: Activity, exact: false },
    ],
  },
  {
    title: "Platform Management",
    items: [
      { title: "AI Providers", url: "/admin/providers", icon: Brain, exact: false },
      { title: "Payments", url: "/admin/payments", icon: CreditCard, exact: false },
      { title: "AI Usage", url: "/admin/usage", icon: Server, exact: false },
      { title: "Changelog", url: "/admin/changelog", icon: GitCommit, exact: false },
    ],
  },
];

const topNavLinks: TopNavLink[] = [
  { label: "Home",      href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pricing",   href: "/harga" },
  { label: "Changelog", href: "/changelog" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });

  // Stream SSE admin: satu koneksi menerima event admin (user baru, order lunas,
  // saldo user diubah) sekaligus perubahan saldo admin itu sendiri.
  useRealtimeEvents("/api/admin/events", true);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => logout() });
  };

  return (
    <SidebarProvider>
      <div className="dark bg-background text-foreground min-h-screen w-full">

        {/* -- Navbar: fixed full-width, tidak terpengaruh sidebar -- */}
        <TopNavbar
          user={user}
          location={location}
          navLinks={topNavLinks}
          logoHref="/admin"
          healthOk={health?.status === "ok"}
          onLogout={handleLogout}
          leftExtra={
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20 flex-shrink-0">
              <ShieldAlert className="h-3 w-3" />
              <span>Admin</span>
            </div>
          }
        />

        {/* -- Body: sidebar + content, digeser 64px ke bawah navbar -- */}
        <div className="flex pt-16 min-h-screen">
          <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border/50 top-16 h-[calc(100svh-4rem)]">
            <SidebarContent>
              {adminNavGroups.map((group) => (
                <SidebarGroup key={group.title}>
                  <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isNavActive(location, item.url, item.exact)}
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
              ))}

              <SidebarGroup>
                <SidebarGroupLabel>User Panel</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Back to Dashboard">
                        <Link href="/dashboard" className="flex items-center gap-3">
                          <LayoutDashboard className="h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>

      </div>
    </SidebarProvider>
  );
}
