import React from "react";

interface PageHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}

export function PageHero({ eyebrow, title, subtitle }: PageHeroProps) {
  return (
    <section className="px-3 sm:px-6 lg:px-8 pt-6 pb-0">
      <div className="mx-auto max-w-6xl">
        <div
          className="relative rounded-2xl overflow-hidden text-center"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/hero-bg.png?v=2')",
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(4,4,12,0.88) 0%, rgba(6,6,16,0.82) 50%, rgba(8,8,18,0.96) 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 110%, rgba(249,115,22,0.18) 0%, transparent 55%)",
            }}
          />
          <div className="relative z-10 px-6 py-20 sm:py-24">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {eyebrow}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white mb-6">
              {title}
            </h1>
            {subtitle && (
              <p
                className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
