import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SeoController } from "@/components/seo";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import { AdminLayout } from "@/components/layout/admin-layout";

import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import NewProject from "@/pages/projects/new";
import ProjectDetail from "@/pages/projects/detail";
import ActivityLog from "@/pages/activity";
import GitHubCallback from "@/pages/github-callback";
import HargaPage from "@/pages/harga";
import ProfilePage from "@/pages/profile";
import BillingPage from "@/pages/billing";
import RiwayatOrderPage from "@/pages/billing/riwayat";
import RiwayatDetailPage from "@/pages/billing/riwayat-detail";
import ApiKeysPage from "@/pages/api-keys";
import DocsPage from "@/pages/docs";
import ChangelogPage from "@/pages/changelog";
import UsagePage from "@/pages/usage";
import ApiUsagePage from "@/pages/api-usage";
import ProvidersPage from "@/pages/providers";
import FAQPage from "@/pages/faq";
import RefundPolicyPage from "@/pages/refund-policy";
import TermsPage from "@/pages/terms";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TentangKamiPage from "@/pages/tentang-kami";

import AdminOverview from "@/pages/admin/overview";
import AdminUsers from "@/pages/admin/users";
import AdminProjects from "@/pages/admin/projects";
import AdminActivity from "@/pages/admin/activity";
import AdminProviders from "@/pages/admin/providers";
import AdminPayments from "@/pages/admin/payments";
import AdminUsage from "@/pages/admin/usage";
import AdminChangelog from "@/pages/admin/changelog";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  if (!user) return <Redirect to="/login" />;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  if (!user) return <Redirect to="/login" />;
  if (user.role !== "admin") return <Redirect to="/dashboard" />;

  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function Router() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <>
      <SeoController />
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />

        {/* User routes */}
        <Route path="/dashboard/billing" component={() => { window.location.replace("/billing" + window.location.search); return null; }} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/projects/new" component={() => <ProtectedRoute component={NewProject} />} />
        <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetail} />} />
        <Route path="/projects" component={() => <ProtectedRoute component={Projects} />} />
        <Route path="/activity" component={() => <ProtectedRoute component={ActivityLog} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
        <Route path="/billing" component={() => <ProtectedRoute component={BillingPage} />} />
        <Route path="/billing/riwayat/:id" component={() => <ProtectedRoute component={RiwayatDetailPage} />} />
        <Route path="/billing/riwayat" component={() => <ProtectedRoute component={RiwayatOrderPage} />} />
        <Route path="/api-keys" component={() => <ProtectedRoute component={ApiKeysPage} />} />
        <Route path="/docs" component={() => <ProtectedRoute component={DocsPage} />} />
        <Route path="/usage" component={() => <ProtectedRoute component={UsagePage} />} />
        <Route path="/api-usage" component={() => <ProtectedRoute component={ApiUsagePage} />} />
        <Route path="/providers" component={() => <ProtectedRoute component={ProvidersPage} />} />
        <Route path="/github-callback" component={GitHubCallback} />

        {/* Public static pages */}
        <Route path="/harga" component={HargaPage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route path="/faq" component={FAQPage} />
        <Route path="/refund-policy" component={RefundPolicyPage} />
        <Route path="/terms-and-conditions" component={TermsPage} />
        <Route path="/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/tentang-kami" component={TentangKamiPage} />

        {/* Admin routes - dedicated layout */}
        <Route path="/admin/users" component={() => <AdminRoute component={AdminUsers} />} />
        <Route path="/admin/projects" component={() => <AdminRoute component={AdminProjects} />} />
        <Route path="/admin/payments" component={() => <AdminRoute component={AdminPayments} />} />
        <Route path="/admin/activity" component={() => <AdminRoute component={AdminActivity} />} />
        <Route path="/admin/providers" component={() => <AdminRoute component={AdminProviders} />} />
        <Route path="/admin/usage" component={() => <AdminRoute component={AdminUsage} />} />
        <Route path="/admin/changelog" component={() => <AdminRoute component={AdminChangelog} />} />
        <Route path="/admin" component={() => <AdminRoute component={AdminOverview} />} />

        {/* Root last - so it doesn't swallow every other path */}
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
