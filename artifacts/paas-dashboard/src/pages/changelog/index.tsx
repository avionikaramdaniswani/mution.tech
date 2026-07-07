import { Rocket, Bug, Zap } from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";
import { PageFooter } from "@/components/page-footer";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

type ChangeType = "feat" | "fix" | "chore";

interface ChangelogEntry {
  id: number;
  version: string;
  date: string;
  title: string;
  description?: string;
  changes: { type: ChangeType; text: string }[];
}

const TypeConfig: Record<ChangeType, { label: string; icon: any; colorClass: string }> = {
  feat:  { label: "New", icon: Rocket, colorClass: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  fix:   { label: "Fix", icon: Bug,    colorClass: "text-red-500 bg-red-500/10 border-red-500/20" },
  chore: { label: "Improve", icon: Zap,    colorClass: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
};

export default function ChangelogPage() {
  const { data: changelogs = [], isLoading } = useQuery<ChangelogEntry[]>({
    queryKey: ["changelogs"],
    queryFn: () => apiFetch("/changelog"),
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pb-10 pt-32 sm:px-6 sm:pb-12 sm:pt-36 lg:px-0">
        {/* Header */}
        <div className="mb-10 sm:mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-3 sm:text-4xl">Changelog</h1>
          <p className="text-base text-muted-foreground leading-relaxed sm:text-lg">Catatan pembaruan, penambahan fitur baru, dan peningkatan sistem Mution AI.</p>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Memuat catatan rilis...</div>
        ) : changelogs.length === 0 ? (
          <div className="py-20 text-center border border-dashed rounded-xl bg-card border-border/50 text-muted-foreground">
            Belum ada catatan rilis.
          </div>
        ) : (
          <div className="relative ml-2 space-y-10 border-l border-border/50 pb-10 sm:ml-4 sm:space-y-12">
            {changelogs.map((entry) => (
              <div key={entry.id} className="relative pl-6 sm:pl-10">
                {/* Timeline solid dot */}
                <div className="absolute -left-[7px] top-2 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />

                {/* Version & Date */}
                <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{entry.version}</h2>
                  <span className="text-sm font-medium text-muted-foreground">{entry.date}</span>
                </div>
                
                {/* Entry Card */}
                <div className="bg-card border border-border/50 rounded-xl p-4 mt-4 shadow-sm relative group overflow-hidden transition-colors hover:border-border sm:p-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">{entry.title}</h3>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed sm:mb-6">{entry.description}</p>
                  )}

                  {/* Changes List */}
                  <div className="space-y-4 sm:space-y-3">
                    {entry.changes.map((change, cIdx) => {
                      const conf = TypeConfig[change.type] || TypeConfig.chore;
                      return (
                        <div key={cIdx} className="flex flex-col items-start gap-2 sm:flex-row sm:gap-3">
                          <span className={`inline-flex w-fit max-w-full flex-shrink-0 items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:mt-0.5 sm:tracking-widest ${conf.colorClass}`}>
                            <conf.icon className="h-3 w-3" />
                            {conf.label}
                          </span>
                          <p className="text-sm text-foreground/90 leading-relaxed">{change.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* End of timeline indicator */}
        {!isLoading && changelogs.length > 0 && (
          <div className="flex items-center justify-center pt-8 border-t border-border/30">
            <p className="text-xs text-muted-foreground/60 flex items-center gap-2">
              <span>&mdash;</span> Awal dari perjalanan Mution AI <span>&mdash;</span>
            </p>
          </div>
        )}
      </main>

      <PageFooter />
    </div>
  );
}
