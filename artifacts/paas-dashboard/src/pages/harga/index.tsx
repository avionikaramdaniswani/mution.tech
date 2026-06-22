import { PublicNavbar } from "@/components/public-navbar";

const ramPlans = [
  { ram: "256 MB",  perMenit: "Rp0,29",  perBulan: "~Rp12.700" },
  { ram: "512 MB",  perMenit: "Rp0,59",  perBulan: "~Rp25.400", popular: true },
  { ram: "768 MB",  perMenit: "Rp0,88",  perBulan: "~Rp38.100" },
  { ram: "1 GB",    perMenit: "Rp1,18",  perBulan: "~Rp50.800" },
  { ram: "2 GB",    perMenit: "Rp2,36",  perBulan: "~Rp101.700" },
  { ram: "4 GB",    perMenit: "Rp4,71",  perBulan: "~Rp203.500" },
  { ram: "8 GB",    perMenit: "Rp9,42",  perBulan: "~Rp407.000" },
];

export default function HargaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <PublicNavbar />

      {/* Content */}
      <section className="pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">

          <div className="text-center mb-10">
            <h1
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3"
            >
              Harga
            </h1>
            <p className="text-muted-foreground">
              Bayar per menit selama container berjalan. Berhenti = tagihan berhenti.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/30 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
              <span>RAM</span>
              <span className="text-center">Per Menit</span>
              <span className="text-right">Estimasi 30 Hari</span>
            </div>

            {ramPlans.map((plan) => (
              <div
                key={plan.ram}
                className={`grid grid-cols-3 items-center px-6 py-4 border-b border-border/40 last:border-0 transition-colors hover:bg-muted/20 ${
                  plan.popular ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">{plan.ram}</span>
                  {plan.popular && (
                    <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wide bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5">
                      Populer
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <span className={`text-lg font-bold font-mono ${plan.popular ? "text-primary" : "text-foreground"}`}>
                    {plan.perMenit}
                  </span>
                </div>
                <div className="text-right text-muted-foreground text-sm tabular-nums">
                  {plan.perBulan}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Estimasi 30 hari = rate × 43.200 menit (nonstop). Tagihan aktual biasanya lebih rendah.
          </p>

        </div>
      </section>

    </div>
  );
}
