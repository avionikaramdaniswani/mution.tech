import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import PaymentSuccessPage from "@/pages/billing/success";
import ApiKeysPage from "@/pages/api-keys";
import FAQPage from "@/pages/faq";
import RefundPolicyPage from "@/pages/refund-policy";
import TermsPage from "@/pages/terms";
import KontakPage from "@/pages/kontak";

import AdminOverview from "@/pages/admin/overview";
import AdminUsers from "@/pages/admin/users";
import AdminProjects from "@/pages/admin/projects";
import AdminActivity from "@/pages/admin/activity";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-background text-foreground dark">Loading...</div>;
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
    return <div className="flex h-screen items-center justify-center bg-background text-foreground dark">Loading...</div>;
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
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* User routes */}
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/projects" component={() => <ProtectedRoute component={Projects} />} />
      <Route path="/projects/new" component={() => <ProtectedRoute component={NewProject} />} />
      <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetail} />} />
      <Route path="/activity" component={() => <ProtectedRoute component={ActivityLog} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      <Route path="/billing" component={() => <ProtectedRoute component={BillingPage} />} />
      <Route path="/billing/payment/success" component={() => <ProtectedRoute component={PaymentSuccessPage} />} />
      <Route path="/api-keys" component={() => <ProtectedRoute component={ApiKeysPage} />} />
      <Route path="/github-callback" component={GitHubCallback} />
      <Route path="/harga" component={HargaPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/refund-policy" component={RefundPolicyPage} />
      <Route path="/terms-and-conditions" component={TermsPage} />
      <Route path="/kontak" component={KontakPage} />

      {/* Admin routes — dedicated layout */}
      <Route path="/admin" component={() => <AdminRoute component={AdminOverview} />} />
      <Route path="/admin/users" component={() => <AdminRoute component={AdminUsers} />} />
      <Route path="/admin/projects" component={() => <AdminRoute component={AdminProjects} />} />
      <Route path="/admin/activity" component={() => <AdminRoute component={AdminActivity} />} />

      <Route component={NotFound} />
    </Switch>
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
