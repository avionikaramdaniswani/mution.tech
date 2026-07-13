import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight,
  Brain,
  Calculator,
  CheckCircle2,
  Clock3,
  Cpu,
  CreditCard,
  Gauge,
  KeyRound,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODEL_CATALOG, groupModelsByProvider, type ModelCatalogEntry } from "@workspace/model-catalog";

type EffectiveCatalogEntry = ModelCatalogEntry & {
  basePricing: { input: number; output: number };
  pricingMode: string;
};

async function fetchCatalog(): Promise<EffectiveCatalogEntry[]> {
  const res = await fetch("/api/catalog");
  if (!res.ok) throw new Error("gagal");
  return res.json();
}

const hostingRates = [
  { ram: "256 MB", perMinute: 0.25, fit: "Prototype ringan" },
  { ram: "512 MB", perMinute: 0.49, fit: "API kecil" },
  { ram: "1 GB", perMinute: 0.9, fit: "Web app aktif" },
  { ram: "2 GB", perMinute: 1.8, fit: "Backend produksi" },
  { ram: "4 GB", perMinute: 3.6, fit: "Worker dan API ramai" },
  { ram: "8 GB", perMinute: 7.2, fit: "Beban berat" },
] as const;

const pricingSignals = [
  { label: "Hosting", value: "per menit aktif", Icon: Clock3 },
  { label: "AI Gateway", value: "per 1K atau 1M token", Icon: Brain },
  { label: "Kontrol", value: "saldo kredit", Icon: CreditCard },
] as const;

const billingPrinciples = [
  {
    title: "Resource aktif saja",
    body: "Biaya hosting mengikuti durasi runtime aktif. Cocok untuk produk yang traffic-nya naik turun.",
    Icon: Server,
  },
  {
    title: "Harga model terbaca",
    body: "Input dan output token dipisah, jadi biaya API AI lebih mudah dilacak dari dashboard usage.",
    Icon: KeyRound,
  },
  {
    title: "Tidak ada kontrak panjang",
    body: "Mulai dari saldo kecil, pantau pemakaian, lalu naikkan kredit saat produk butuh kapasitas lebih.",
    Icon: ShieldCheck,
  },
] as const;

const DEFAULT_MODEL = MODEL_CATALOG.find((model) => model.id === "claude-opus-4-8") ?? MODEL_CATALOG[0]!;
const AI_PRICING_TOKEN_UNIT = 1_000_000;
const TOKEN_SLIDER_UNIT = 1_000;

type AiPricingDisplayUnit = "1k" | "1m";

const aiPricingDisplayUnits: { value: AiPricingDisplayUnit; label: string; suffix: string }[] = [
  { value: "1k", label: "1K token", suffix: "/1K" },
  { value: "1m", label: "1M token", suffix: "/1M" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatRupiah(value: number, options?: Intl.NumberFormatOptions) {
  return `Rp ${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: value > 0 && value < 10 ? 2 : 0,
    maximumFractionDigits: value > 0 && value < 10 ? 2 : 0,
    ...options,
  }).format(value)}`;
}

function formatTokenPrice(value: number) {
  const hasDecimal = !Number.isInteger(value);

  return `Rp ${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function getHostingEstimate(perMinute: number, hoursPerDay: number, daysPerMonth: number) {
  return perMinute * 60 * hoursPerDay * daysPerMonth;
}

function getAiEstimate(inputKTokens: number, outputKTokens: number, pricing: { input: number; output: number }) {
  const inputTokens = inputKTokens * TOKEN_SLIDER_UNIT;
  const outputTokens = outputKTokens * TOKEN_SLIDER_UNIT;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / AI_PRICING_TOKEN_UNIT;
}

function getAiDisplayPrice(pricePerMillion: number, unit: AiPricingDisplayUnit) {
  const value = unit === "1k" ? pricePerMillion / 1000 : pricePerMillion;
  return formatTokenPrice(value);
}

function getAiUnitSuffix(unit: AiPricingDisplayUnit) {
  return aiPricingDisplayUnits.find((item) => item.value === unit)?.suffix ?? "/1K";
}

function AiPricingUnitToggle({
  value,
  onChange,
  className = "",
}: {
  value: AiPricingDisplayUnit;
  onChange: (value: AiPricingDisplayUnit) => void;
  className?: string;
}) {
  return (
    <div className={`inline-grid grid-cols-2 rounded-md border border-[#dbe8f3] bg-white p-0.5 text-[11px] font-bold normal-case tracking-normal ${className}`}>
      {aiPricingDisplayUnits.map((unit) => {
        const active = value === unit.value;

        return (
          <button
            key={unit.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(unit.value)}
            className={`h-7 rounded px-2.5 transition-colors ${
              active
                ? "bg-[#172033] text-white shadow-sm"
                : "text-[#526173] hover:bg-[#f8fbff] hover:text-[#172033]"
            }`}
          >
            {unit.value === "1k" ? "1K" : "1M"}
          </button>
        );
      })}
    </div>
  );
}

function OpenAILogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

function AnthropicLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  );
}

function ZhipuLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16l-10.5 12H20" />
    </svg>
  );
}

function getProviderIcon(provider: string, baseClassName = "h-5 w-5") {
  if (provider === "Anthropic") return <AnthropicLogo className={`${baseClassName} text-amber-500`} />;
  if (provider === "OpenAI") return <OpenAILogo className={`${baseClassName} text-emerald-500`} />;
  if (provider === "Zhipu AI") return <ZhipuLogo className={`${baseClassName} text-blue-500`} />;
  return <Brain className={`${baseClassName} text-[#64748b]`} />;
}

export default function HargaPage() {
  // Fetch catalog dengan harga efektif dari server (setelah admin override diterapkan)
  const { data: fetchedCatalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: fetchCatalog,
    staleTime: 30_000,
  });
  const catalog = fetchedCatalog ?? MODEL_CATALOG;

  const grouped = useMemo(() => groupModelsByProvider(catalog as readonly ModelCatalogEntry[]), [catalog]);
  const [selectedRam, setSelectedRam] = useState("1 GB");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerMonth, setDaysPerMonth] = useState(20);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL.id);
  const [inputKTokens, setInputKTokens] = useState(120);
  const [outputKTokens, setOutputKTokens] = useState(40);
  const [aiPricingDisplayUnit, setAiPricingDisplayUnit] = useState<AiPricingDisplayUnit>("1k");

  const selectedHosting = useMemo(
    () => hostingRates.find((tier) => tier.ram === selectedRam) ?? hostingRates[2]!,
    [selectedRam],
  );

  const selectedModel = useMemo(
    () => (catalog.find((model) => model.id === selectedModelId) ?? DEFAULT_MODEL) as EffectiveCatalogEntry,
    [selectedModelId],
  );

  const hostingEstimate = getHostingEstimate(selectedHosting.perMinute, hoursPerDay, daysPerMonth);
  const aiEstimate = getAiEstimate(inputKTokens, outputKTokens, selectedModel.pricing);
  const totalEstimate = hostingEstimate + aiEstimate;
  const aiPriceSuffix = getAiUnitSuffix(aiPricingDisplayUnit);

  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#172033] selection:bg-[#f97316]/20">
      <PublicNavbar />

      <main>
        <section className="relative overflow-hidden border-b border-[#dbe8f3] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_58%,#fff7ed_100%)] px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,0.08),rgba(20,184,166,0.08)_44%,transparent_72%)]" />

          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">
                Harga Mution
              </p>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-normal text-[#172033] sm:text-6xl">
                Bayar sesuai usage, bukan paket yang menganggur.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#526173] sm:text-lg sm:leading-8">
                Hosting dihitung per menit aktif. API model bisa dibaca per 1K atau per 1 juta token. Semua dibuat mudah dipantau dari saldo kredit yang sama.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#ea580c]"
                >
                  Mulai Pakai
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/faq"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#c9d8e7] bg-white px-5 text-sm font-semibold text-[#172033] transition-colors hover:bg-[#eef8ff]"
                >
                  Baca FAQ
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {pricingSignals.map(({ label, value, Icon }) => (
                  <div key={label} className="rounded-lg border border-[#dbe8f3] bg-white/80 p-4 shadow-[0_18px_45px_rgba(23,32,51,0.07)] backdrop-blur">
                    <Icon className="h-4 w-4 text-[#f97316]" />
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">{label}</p>
                    <p className="mt-1 text-sm font-extrabold text-[#172033]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_24px_70px_rgba(23,32,51,0.10)]">
              <div className="flex items-center justify-between gap-4 border-b border-[#dbe8f3] pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Estimasi</p>
                  <h2 className="mt-1 text-xl font-extrabold text-[#172033]">Simulasi bulan ini</h2>
                </div>
                <Calculator className="h-5 w-5 text-[#14b8a6]" />
              </div>

              <div className="space-y-4 py-5 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-[#172033]">Hosting {selectedHosting.ram}</p>
                    <p className="mt-1 text-xs text-[#64748b]">{hoursPerDay} jam/hari, {daysPerMonth} hari</p>
                  </div>
                  <span className="font-mono font-bold text-[#172033]">{formatRupiah(hostingEstimate)}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-[#172033]">{selectedModel.label}</p>
                    <p className="mt-1 text-xs text-[#64748b]">{formatNumber(inputKTokens + outputKTokens)}K token</p>
                  </div>
                  <span className="font-mono font-bold text-[#172033]">{formatRupiah(aiEstimate)}</span>
                </div>
              </div>

              <div className="border-t border-[#dbe8f3] pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748b]">Total estimasi</p>
                    <p className="mt-1 text-sm text-[#526173]">Belum termasuk storage tambahan.</p>
                  </div>
                  <p className="text-2xl font-black text-[#172033]">{formatRupiah(totalEstimate)}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="bg-[#f8fbff] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Kalkulator usage</p>
                <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-normal text-[#172033] sm:text-4xl">
                  Atur skenario pemakaian dan lihat angkanya langsung.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#526173]">
                Angka di bawah adalah estimasi sederhana dari tarif yang tersedia. Tagihan aktual mengikuti usage real di dashboard.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Hosting</p>
                    <h3 className="mt-2 text-2xl font-extrabold text-[#172033]">Runtime calculator</h3>
                  </div>
                  <Server className="h-5 w-5 text-[#14b8a6]" />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {hostingRates.map((tier) => {
                    const active = tier.ram === selectedRam;

                    return (
                      <button
                        key={tier.ram}
                        type="button"
                        onClick={() => setSelectedRam(tier.ram)}
                        className={`rounded-md border px-3 py-3 text-left transition-colors ${
                          active
                            ? "border-[#f97316] bg-[#fff7ed] text-[#172033]"
                            : "border-[#dbe8f3] bg-[#f8fbff] text-[#526173] hover:border-[#c9d8e7] hover:bg-white"
                        }`}
                      >
                        <span className="block text-sm font-extrabold">{tier.ram}</span>
                        <span className="mt-1 block text-xs">{formatRupiah(tier.perMinute, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/menit</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-7 space-y-6">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-[#172033]">Jam aktif per hari</p>
                      <span className="rounded-md bg-[#eefdfa] px-2 py-1 text-xs font-bold text-[#0f766e]">{hoursPerDay} jam</span>
                    </div>
                    <Slider value={[hoursPerDay]} min={1} max={24} step={1} onValueChange={(value) => setHoursPerDay(value[0] ?? hoursPerDay)} />
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-[#172033]">Hari aktif per bulan</p>
                      <span className="rounded-md bg-[#eefdfa] px-2 py-1 text-xs font-bold text-[#0f766e]">{daysPerMonth} hari</span>
                    </div>
                    <Slider value={[daysPerMonth]} min={1} max={30} step={1} onValueChange={(value) => setDaysPerMonth(value[0] ?? daysPerMonth)} />
                  </div>
                </div>

                <div className="mt-7 rounded-lg border border-[#dbe8f3] bg-[#f8fbff] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#172033]">{selectedHosting.fit}</p>
                      <p className="mt-1 text-xs leading-5 text-[#64748b]">
                        {formatRupiah(selectedHosting.perMinute, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/menit, {formatRupiah(selectedHosting.perMinute * 60)}/jam
                      </p>
                    </div>
                    <p className="text-xl font-black text-[#172033]">{formatRupiah(hostingEstimate)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">AI Gateway</p>
                    <h3 className="mt-2 text-2xl font-extrabold text-[#172033]">Token calculator</h3>
                  </div>
                  <Brain className="h-5 w-5 text-[#14b8a6]" />
                </div>

                <label className="mt-6 block">
                  <span className="text-sm font-bold text-[#172033]">Model</span>
                  <select
                    value={selectedModelId}
                    onChange={(event) => setSelectedModelId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-[#dbe8f3] bg-[#f8fbff] px-3 text-sm font-semibold text-[#172033] outline-none transition-colors focus:border-[#f97316] focus:bg-white"
                  >
                    {catalog.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label} - {model.provider}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-7 space-y-6">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-[#172033]">Input token</p>
                      <span className="rounded-md bg-[#fff7ed] px-2 py-1 text-xs font-bold text-[#c2410c]">{formatNumber(inputKTokens)}K</span>
                    </div>
                    <Slider value={[inputKTokens]} min={10} max={1000} step={10} onValueChange={(value) => setInputKTokens(value[0] ?? inputKTokens)} />
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-[#172033]">Output token</p>
                      <span className="rounded-md bg-[#fff7ed] px-2 py-1 text-xs font-bold text-[#c2410c]">{formatNumber(outputKTokens)}K</span>
                    </div>
                    <Slider value={[outputKTokens]} min={5} max={500} step={5} onValueChange={(value) => setOutputKTokens(value[0] ?? outputKTokens)} />
                  </div>
                </div>

                <div className="mt-7 rounded-lg border border-[#dbe8f3] bg-[#f8fbff] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-[#172033]">
                        {getProviderIcon(selectedModel.provider, "h-4 w-4")}
                        {selectedModel.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#64748b]">
                        Input {getAiDisplayPrice(selectedModel.pricing.input, aiPricingDisplayUnit)}{aiPriceSuffix}, output {getAiDisplayPrice(selectedModel.pricing.output, aiPricingDisplayUnit)}{aiPriceSuffix}
                      </p>
                    </div>
                    <p className="text-xl font-black text-[#172033]">{formatRupiah(aiEstimate)}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Tarif detail</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-[#172033] sm:text-4xl">
                  Satu halaman untuk cek semua rate.
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold text-[#526173] lg:justify-end">
                {["Per menit", "Tanpa kontrak"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-md border border-[#dbe8f3] bg-[#f8fbff] px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#14b8a6]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <Tabs defaultValue="hosting">
              <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-lg border border-[#dbe8f3] bg-[#f8fbff] p-1">
                <TabsTrigger value="hosting" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#f97316] data-[state=active]:text-white">
                  <Cpu className="h-4 w-4" />
                  Hosting
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2 rounded-md py-3 data-[state=active]:bg-[#f97316] data-[state=active]:text-white">
                  <KeyRound className="h-4 w-4" />
                  API Models
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hosting" className="mt-6 focus:outline-none">
                <div className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-white shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                  <div className="overflow-x-auto">
                    <div className="min-w-[680px]">
                      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] border-b border-[#dbe8f3] bg-[#f8fbff] px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
                        <div>RAM</div>
                        <div>Per menit</div>
                        <div>Per jam</div>
                        <div className="text-right">30 hari aktif</div>
                      </div>
                      <div className="divide-y divide-[#dbe8f3]">
                        {hostingRates.map((tier) => (
                          <div key={tier.ram} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center px-5 py-4 text-sm transition-colors hover:bg-[#f8fbff]">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#fff7ed] text-[#f97316]">
                                <Cpu className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="font-extrabold text-[#172033]">{tier.ram}</p>
                                <p className="mt-0.5 text-xs text-[#64748b]">{tier.fit}</p>
                              </div>
                            </div>
                            <div className="font-mono font-bold text-[#172033]">
                              {formatRupiah(tier.perMinute, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="font-mono text-[#526173]">{formatRupiah(tier.perMinute * 60)}</div>
                            <div className="text-right font-mono font-bold text-[#172033]">
                              {formatRupiah(getHostingEstimate(tier.perMinute, 24, 30))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="mt-6 focus:outline-none">
                <div className="space-y-6">
                  {Object.entries(grouped).map(([providerName, providerModels]) => (
                    <section key={providerName} className="overflow-hidden rounded-lg border border-[#dbe8f3] bg-white shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                      <div className="flex flex-col gap-4 border-b border-[#dbe8f3] bg-[#f8fbff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[#dbe8f3] bg-white">
                            {getProviderIcon(providerName)}
                          </span>
                          <div>
                            <h3 className="font-extrabold text-[#172033]">{providerName}</h3>
                            <p className="text-xs text-[#64748b]">{providerModels.length} model tersedia</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <AiPricingUnitToggle
                            value={aiPricingDisplayUnit}
                            onChange={setAiPricingDisplayUnit}
                            className="md:hidden"
                          />
                          <Gauge className="h-4 w-4 text-[#14b8a6]" />
                        </div>
                      </div>

                      <div className="hidden grid-cols-[minmax(0,1.4fr)_0.7fr_0.7fr_0.7fr] items-center border-b border-[#dbe8f3] bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#64748b] md:grid">
                        <div>Model</div>
                        <div className="flex items-center gap-3">
                          Input
                          <AiPricingUnitToggle
                            value={aiPricingDisplayUnit}
                            onChange={setAiPricingDisplayUnit}
                          />
                        </div>
                        <div>Output</div>
                        <div>Context</div>
                      </div>

                      <div className="divide-y divide-[#dbe8f3]">
                        {providerModels.map((model) => (
                          <div key={model.id} className="grid gap-4 px-5 py-4 text-sm transition-colors hover:bg-[#f8fbff] md:grid-cols-[minmax(0,1.4fr)_0.7fr_0.7fr_0.7fr] md:items-center">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-extrabold text-[#172033]">{model.label}</p>
                                {model.note && (
                                  <span className="rounded-md bg-[#fff7ed] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#c2410c]">
                                    {model.note}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs leading-5 text-[#64748b]">{model.description}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b] md:hidden">Input</p>
                              <p className="mt-1 font-mono font-bold text-[#172033]">{getAiDisplayPrice(model.pricing.input, aiPricingDisplayUnit)}{aiPriceSuffix}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b] md:hidden">Output</p>
                              <p className="mt-1 font-mono font-bold text-[#172033]">{getAiDisplayPrice(model.pricing.output, aiPricingDisplayUnit)}{aiPriceSuffix}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b] md:hidden">Context</p>
                              <p className="mt-1 font-mono font-bold text-[#172033]">{model.context}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <section className="bg-[#f8fbff] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Cara bacanya</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-[#172033] sm:text-4xl">
                  Pricing dibuat untuk dipantau, bukan ditebak.
                </h2>
                <p className="mt-4 text-sm leading-6 text-[#526173]">
                  Kamu bisa mulai kecil, melihat usage harian, lalu menambah kredit saat angka pemakaian sudah jelas.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {billingPrinciples.map(({ title, body, Icon }) => (
                  <article key={title} className="rounded-lg border border-[#dbe8f3] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eefdfa] text-[#14b8a6]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-4 font-extrabold text-[#172033]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#526173]">{body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-lg border border-[#dbe8f3] bg-white p-6 shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">
                    <Zap className="h-4 w-4" />
                    Siap dicoba
                  </p>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-normal text-[#172033]">
                    Deploy dulu, lihat pemakaian real, baru scale.
                  </h2>
                </div>
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#172033] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#263247]"
                >
                  Buat Akun
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
