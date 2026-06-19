import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Shield,
  GitBranch,
  Globe,
  TerminalSquare,
  ArrowRight,
  CheckCircle2,
  Box,
  Activity,
  Database,
} from "lucide-react";
import { useEffect } from "react";

const features = [
  {
    icon: Zap,
    title: "Deploy in Seconds",
    desc: "Push your code and it's live. Zero downtime deployments with automatic rollbacks.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    desc: "SSL, isolated containers, and encrypted environment variables out of the box.",
  },
  {
    icon: GitBranch,
    title: "Git-based Workflow",
    desc: "Connect your repo and deploy on every push. Full build logs included.",
  },
  {
    icon: Globe,
    title: "Custom Domains",
    desc: "Map your own domain to any project. HTTPS provisioned automatically.",
  },
  {
    icon: Database,
    title: "Managed Databases",
    desc: "Provision a PostgreSQL database per project with one click.",
  },
  {
    icon: Activity,
    title: "Real-time Monitoring",
    desc: "Live deployment logs, status, and activity history for every project.",
  },
];

const runtimes = ["Node.js", "Python", "PHP", "Static"];

const plans = [
  {
    name: "Starter",
    price: "Free",
    desc: "For personal projects and experiments.",
    features: ["3 projects", "1 GB RAM per container", "Shared CPU", "Community support"],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    per: "/mo",
    desc: "For teams shipping production apps.",
    features: ["Unlimited projects", "4 GB RAM per container", "Dedicated CPU", "Priority support", "Custom domains", "Managed databases"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For organizations that need more control.",
    features: ["Everything in Pro", "SLA guarantee", "On-premise option", "Dedicated account manager", "Audit logs", "SSO / SAML"],
    cta: "Contact us",
    highlight: false,
  },
];

export default function Landing() {
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-bold text-primary">
              <TerminalSquare className="h-6 w-6" />
              <span>Mution</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#runtimes" className="hover:text-foreground transition-colors">Runtimes</a>
            </nav>
            <div className="flex items-center gap-3">
              {user ? (
                <Link href="/dashboard">
                  <Button size="sm">Go to Dashboard <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Sign in</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Get started free</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium mb-8">
            <Zap className="h-3.5 w-3.5" />
            Ship faster with Mution
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
            Deploy your apps.<br />
            <span className="text-primary">No DevOps needed.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Mution is a Platform as a Service that lets you deploy, scale, and manage your applications in minutes — without worrying about servers, Docker, or infrastructure.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-base px-8 gap-2">
                Start for free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-base px-8">
                Sign in to dashboard
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required · Free tier available</p>
        </div>
      </section>

      {/* Runtimes */}
      <section id="runtimes" className="border-y border-border/50 bg-card/30 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">Supported Runtimes</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {runtimes.map((r) => (
              <div key={r} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-5 py-2.5 text-sm font-medium text-foreground">
                <Box className="h-4 w-4 text-primary" />
                {r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need to ship</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              From deployment to monitoring — Mution has you covered end-to-end.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border/60 bg-card p-6 hover:border-primary/40 transition-colors">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/50 bg-card/20 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Start free, scale when you're ready.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-8 ${
                  plan.highlight
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border/60 bg-card"
                }`}
              >
                {plan.highlight && (
                  <div className="mb-3 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.per && <span className="text-muted-foreground">{plan.per}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    className="mt-8 w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-8 py-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to deploy your first app?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Join developers already hosting on Mution. Set up in under 5 minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="text-base px-10 gap-2">
                  Get started for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <TerminalSquare className="h-5 w-5" />
            <span>Mution</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Mution. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
