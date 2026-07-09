import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  GitCommit,
  History,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";
import { apiFetch } from "@/lib/api-fetch";

type ChangeType = "feat" | "fix" | "chore";
type ChangeFilter = ChangeType | "all";

interface ChangeTypeConfig {
  label: string;
  Icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
  accentClass: string;
}

interface ChangelogEntry {
  id: number;
  version: string;
  date: string;
  title: string;
  description?: string;
  changes: { type: ChangeType; title?: string; description?: string | null; text?: string }[];
}

const typeConfig: Record<ChangeType, ChangeTypeConfig> = {
  feat: {
    label: "Baru",
    Icon: Rocket,
    badgeClass: "border-[#bae6fd] bg-[#eef8ff] text-[#0369a1]",
    iconClass: "border-[#bae6fd] bg-[#eef8ff] text-[#0369a1]",
    accentClass: "bg-[#38bdf8]",
  },
  fix: {
    label: "Perbaikan",
    Icon: Bug,
    badgeClass: "border-[#fecdd3] bg-[#fff1f2] text-[#be123c]",
    iconClass: "border-[#fecdd3] bg-[#fff1f2] text-[#be123c]",
    accentClass: "bg-[#fb7185]",
  },
  chore: {
    label: "Peningkatan",
    Icon: Zap,
    badgeClass: "border-[#ccfbf1] bg-[#eefdfa] text-[#0f766e]",
    iconClass: "border-[#ccfbf1] bg-[#eefdfa] text-[#0f766e]",
    accentClass: "bg-[#2dd4bf]",
  },
};

const filters: { label: string; value: ChangeFilter; Icon: LucideIcon }[] = [
  { label: "Semua", value: "all", Icon: History },
  { label: "Baru", value: "feat", Icon: Rocket },
  { label: "Perbaikan", value: "fix", Icon: Bug },
  { label: "Peningkatan", value: "chore", Icon: Zap },
];

function getChangeCount(entries: ChangelogEntry[], type?: ChangeType) {
  return entries.reduce((total, entry) => {
    return total + entry.changes.filter((change) => !type || change.type === type).length;
  }, 0);
}

function getChangeTitle(change: ChangelogEntry["changes"][number]) {
  return change.title || change.text || "Update";
}

function getChangeDescription(change: ChangelogEntry["changes"][number]) {
  return change.description?.trim() || "";
}

function LoadingState() {
  return (
    <div className="grid gap-5">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-md border border-[#dbe8f3] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
          <div className="h-4 w-28 animate-pulse rounded bg-[#dbe8f3]" />
          <div className="mt-4 h-7 w-2/3 animate-pulse rounded bg-[#dbe8f3]" />
          <div className="mt-5 grid gap-3">
            <div className="h-4 w-full animate-pulse rounded bg-[#edf4fb]" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-[#edf4fb]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChangelogPage() {
  const [activeFilter, setActiveFilter] = useState<ChangeFilter>("all");
  const { data: changelogs = [], isLoading } = useQuery<ChangelogEntry[]>({
    queryKey: ["changelogs"],
    queryFn: () => apiFetch("/changelog"),
  });

  const latestEntry = changelogs[0];
  const totalChanges = useMemo(() => getChangeCount(changelogs), [changelogs]);
  const filteredChangelogs = useMemo(() => {
    if (activeFilter === "all") return changelogs;

    return changelogs
      .map((entry) => ({
        ...entry,
        changes: entry.changes.filter((change) => change.type === activeFilter),
      }))
      .filter((entry) => entry.changes.length > 0);
  }, [activeFilter, changelogs]);

  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#172033]">
      <PublicNavbar />

      <main>
        <section className="relative overflow-hidden border-b border-[#dbe8f3] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_58%,#fff7ed_100%)] px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,0.08),rgba(20,184,166,0.08)_44%,transparent_72%)]" />

          <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Update Produk</p>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-normal text-[#172033] sm:text-6xl">
                Changelog
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#526173] sm:text-lg sm:leading-8">
                Catatan pembaruan fitur, perbaikan, dan peningkatan layanan Mution dari waktu ke waktu.
              </p>

              <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold text-[#526173]">
                {["Update produk", "Rilis fitur", "Perbaikan"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-md border border-[#dbe8f3] bg-white/80 px-3 py-2 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#14b8a6]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <aside className="rounded-md border border-[#dbe8f3] bg-white p-5 shadow-[0_24px_70px_rgba(23,32,51,0.10)]">
              <div className="flex items-center gap-3 border-b border-[#dbe8f3] pb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-md border border-[#fed7aa] bg-[#fff7ed] text-[#f97316]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Rilis Terbaru</p>
                  <h2 className="mt-1 text-lg font-extrabold text-[#172033]">
                    {isLoading ? "Memuat..." : latestEntry?.version ?? "Belum ada rilis"}
                  </h2>
                </div>
              </div>

              {latestEntry ? (
                <div className="mt-4">
                  <p className="text-sm font-bold text-[#172033]">{latestEntry.title}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748b]">{latestEntry.date}</p>
                  {latestEntry.description && (
                    <p className="mt-3 text-sm leading-6 text-[#526173]">{latestEntry.description}</p>
                  )}
                  <div className="mt-4 grid gap-2">
                    {latestEntry.changes.slice(0, 3).map((change, index) => {
                      const config = typeConfig[change.type] ?? typeConfig.chore;
                      const Icon = config.Icon;
                      const title = getChangeTitle(change);

                      return (
                        <div key={`${title}-${index}`} className="flex items-start gap-2 text-xs leading-5 text-[#526173]">
                          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f97316]" />
                          <span>{title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#526173]">
                  {isLoading ? "Mengambil catatan rilis terbaru." : "Rilis terbaru akan tampil di sini setelah changelog diterbitkan."}
                </p>
              )}
            </aside>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              {[
                { label: "Total rilis", value: changelogs.length.toString(), Icon: GitCommit },
                { label: "Total pembaruan", value: totalChanges.toString(), Icon: History },
                { label: "Versi terbaru", value: latestEntry?.version ?? "-", Icon: Sparkles },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="rounded-md border border-[#dbe8f3] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                  <Icon className="h-4 w-4 text-[#f97316]" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">{label}</p>
                  <p className="mt-1 text-2xl font-black text-[#172033]">{isLoading ? "-" : value}</p>
                </div>
              ))}
            </div>

            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Linimasa Rilis</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-[#172033] sm:text-4xl">
                  Semua catatan rilis.
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                {filters.map(({ label, value, Icon }) => {
                  const active = activeFilter === value;
                  const count = value === "all" ? totalChanges : getChangeCount(changelogs, value);

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setActiveFilter(value)}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold transition-colors ${
                        active
                          ? "border-[#f97316] bg-[#fff7ed] text-[#c2410c]"
                          : "border-[#dbe8f3] bg-white text-[#526173] hover:bg-[#f8fbff] hover:text-[#172033]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      <span className="font-mono text-xs opacity-70">{isLoading ? "-" : count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isLoading ? (
              <LoadingState />
            ) : changelogs.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#c9d8e7] bg-white p-10 text-center shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                <History className="mx-auto h-8 w-8 text-[#f97316]" />
                <h3 className="mt-4 text-xl font-extrabold text-[#172033]">Belum ada catatan rilis.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#526173]">
                  Changelog akan tampil di sini setelah update produk pertama diterbitkan.
                </p>
              </div>
            ) : filteredChangelogs.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#c9d8e7] bg-white p-10 text-center shadow-[0_18px_50px_rgba(23,32,51,0.07)]">
                <History className="mx-auto h-8 w-8 text-[#f97316]" />
                <h3 className="mt-4 text-xl font-extrabold text-[#172033]">Tidak ada update di filter ini.</h3>
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#172033] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#263247]"
                >
                  Lihat semua
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative border-l border-[#dbe8f3] pl-5 sm:pl-8">
                <div className="grid gap-6">
                  {filteredChangelogs.map((entry) => (
                    <article key={entry.id} className="relative rounded-md border border-[#dbe8f3] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,51,0.07)] sm:p-6">
                      <span className="absolute -left-[29px] top-7 flex h-4 w-4 rounded-full border-4 border-[#f8fbff] bg-[#f97316] sm:-left-[41px]" />

                      <div className="flex flex-col gap-4 border-b border-[#dbe8f3] pb-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">{entry.version}</p>
                          <h3 className="mt-2 text-2xl font-extrabold tracking-normal text-[#172033]">{entry.title}</h3>
                          {entry.description && (
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526173]">{entry.description}</p>
                          )}
                        </div>
                        <span className="w-fit rounded-md border border-[#dbe8f3] bg-[#f8fbff] px-3 py-2 text-xs font-bold text-[#64748b]">
                          {entry.date}
                        </span>
                      </div>

                      <div className="mt-5 overflow-hidden rounded-md border border-[#dbe8f3] bg-[#fbfdff]">
                        {entry.changes.map((change, index) => {
                          const config = typeConfig[change.type] ?? typeConfig.chore;
                          const Icon = config.Icon;
                          const title = getChangeTitle(change);
                          const description = getChangeDescription(change);

                          return (
                            <div
                              key={`${title}-${index}`}
                              className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-4 py-4 transition-colors hover:bg-white [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[#e6eef7]"
                            >
                              <span className={`absolute bottom-4 left-0 top-4 w-1 rounded-r ${config.accentClass}`} />
                              <span className={`flex h-10 w-10 items-center justify-center rounded-md border ${config.iconClass}`}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <span className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase ${config.badgeClass}`}>
                                    {config.label}
                                  </span>
                                  <p className="min-w-0 text-[15px] font-extrabold leading-6 text-[#172033]">
                                    {title}
                                  </p>
                                </div>
                                {description && (
                                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526173]">{description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-8 flex items-center gap-3 pl-1 text-xs font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
                  <span className="h-px flex-1 bg-[#dbe8f3]" />
                  Awal perjalanan Mution
                  <span className="h-px flex-1 bg-[#dbe8f3]" />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
