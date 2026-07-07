import React from "react";

interface PageHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}

export function PageHero({ eyebrow, title, subtitle }: PageHeroProps) {
  return (
    <section className="bg-background px-3 pt-28 pb-0 sm:px-6 sm:pt-32 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card text-center shadow-sm">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/hero-bg.png?v=2')",
              backgroundSize: "cover",
              backgroundPosition: "center top",
              opacity: 0.14,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(248,250,252,0.94) 64%, rgba(255,247,237,0.84) 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, rgba(249,115,22,0.10), rgba(20,184,166,0.08))",
            }}
          />
          <div className="relative z-10 px-6 py-20 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
              {eyebrow}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-foreground mb-6">
              {title}
            </h1>
            {subtitle && (
              <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
