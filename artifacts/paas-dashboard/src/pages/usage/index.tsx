import { BarChart3, Cpu, HardDrive, Wifi } from "lucide-react";

export default function UsagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Log Penggunaan</h1>
        <p className="text-sm text-muted-foreground mt-1">Pantau konsumsi CPU, memori, dan bandwidth proyekmu.</p>
      </div>

      {/* Placeholder cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Cpu,       label: "CPU",       value: "-", unit: "rata-rata" },
          { icon: HardDrive, label: "Memori",    value: "-", unit: "dipakai" },
          { icon: Wifi,      label: "Bandwidth", value: "-", unit: "bulan ini" },
        ].map(({ icon: Icon, label, value, unit }) => (
          <div
            key={label}
            className="rounded-2xl px-6 py-5 flex items-center gap-4"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}
            >
              <Icon className="h-5 w-5" style={{ color: "rgb(249,115,22)" }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{unit}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon notice */}
      <div
        className="rounded-2xl px-8 py-16 flex flex-col items-center text-center gap-3"
        style={{ border: "1px dashed rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.01)" }}
      >
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center mb-2"
          style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}
        >
          <BarChart3 className="h-7 w-7" style={{ color: "rgba(249,115,22,0.6)" }} />
        </div>
        <p className="text-base font-semibold">Segera hadir</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Grafik penggunaan resource per proyek, history bandwidth, dan breakdown biaya akan tersedia di sini.
        </p>
      </div>
    </div>
  );
}
