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
      
      <main className="flex-1 max-w-3xl w-full mx-auto py-12 px-6 sm:px-0">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Changelog</h1>
          <p className="text-lg text-muted-foreground">Catatan pembaruan, penambahan fitur baru, dan peningkatan sistem Mution AI.</p>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Memuat catatan rilis...</div>
        ) : changelogs.length === 0 ? (
          <div className="py-20 text-center border border-dashed rounded-xl bg-card border-border/50 text-muted-foreground">
            Belum ada catatan rilis.
          </div>
        ) : (
          <div className="relative border-l border-border/50 ml-4 space-y-12 pb-10">
            {changelogs.map((entry) => (
              <div key={entry.id} className="relative pl-10">
                {/* Timeline solid dot */}
                <div className="absolute -left-[7px] top-2 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />

                {/* Version & Date */}
                <div className="mb-2 flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{entry.version}</h2>
                  <span className="text-sm font-medium text-muted-foreground">{entry.date}</span>
                </div>
                
                {/* Entry Card */}
                <div className="bg-card border border-border/50 rounded-xl p-6 mt-4 shadow-sm relative group overflow-hidden transition-colors hover:border-border">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">{entry.title}</h3>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{entry.description}</p>
                  )}

                  {/* Changes List */}
                  <div className="space-y-4">
                    {entry.changes.map((change, cIdx) => {
                      const conf = TypeConfig[change.type] || TypeConfig.chore;
                      return (
                        <div key={cIdx} className="flex items-start gap-3">
                          <span className={`inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest flex-shrink-0 ${conf.colorClass}`}>
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
