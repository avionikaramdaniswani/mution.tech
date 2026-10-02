import { useQuery } from "@tanstack/react-query";
import { Trophy, Coins, Brain, ArrowUp, Crown } from "lucide-react";
import { csrfFetch } from "@/lib/csrf";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCredits } from "@/components/layout/shared";

interface LeaderboardUser {
  userId: number;
  name: string;
  email: string;
  totalTokens: number;
  totalCredits: number;
}

interface LeaderboardResponse {
  success: boolean;
  data: {
    byTokens: LeaderboardUser[];
    byCredits: LeaderboardUser[];
    totalTokensUsed: number;
  };
}

function useLeaderboard() {
  return useQuery({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await csrfFetch("/api/leaderboard", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json() as Promise<LeaderboardResponse>;
    },
  });
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: React.ReactNode; icon: React.ElementType; color: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#dbe8f3] bg-white p-6 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#526173]">{label}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-black tracking-tight text-[#172033]">{value}</div>
      </div>
    </div>
  );
}

function RankingList({ title, users, type, icon: Icon }: { title: string, users: LeaderboardUser[], type: 'tokens' | 'credits', icon: any }) {
  return (
    <div className="rounded-xl border border-[#dbe8f3] bg-white shadow-[0_12px_34px_rgba(23,32,51,0.05)] overflow-hidden">
      <div className="border-b border-[#dbe8f3] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-[#172033]">{title}</h3>
          <p className="text-xs text-[#526173]">Top 10 Global Ranking</p>
        </div>
      </div>
      <div className="p-0">
        {users.length === 0 ? (
          <div className="p-8 text-center text-[#526173] text-sm">Belum ada data.</div>
        ) : (
          <div className="divide-y divide-[#dbe8f3]">
            {users.map((user, i) => (
              <div key={user.userId} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                    i === 0 ? "bg-amber-100 text-amber-600 border border-amber-200" :
                    i === 1 ? "bg-slate-200 text-slate-600 border border-slate-300" :
                    i === 2 ? "bg-orange-100 text-orange-600 border border-orange-200" :
                    "bg-slate-50 text-slate-400"
                  }`}>
                    {i === 0 ? <Crown className="w-4 h-4" /> : i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#172033]">{user.name}</p>
                    <p className="text-xs text-[#526173]">{user.email.replace(/(.{2})(.*)(?=@)/, "$1***")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#172033]">
                    {type === 'tokens' ? user.totalTokens.toLocaleString('id-ID') : formatCredits(user.totalCredits)}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-[#526173] tracking-wider">
                    {type === 'tokens' ? 'Tokens' : 'Credits'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { data, isLoading } = useLeaderboard();

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172033] flex items-center gap-2">
            <Trophy className="h-6 w-6 text-indigo-600" />
            Global Ranking
          </h1>
          <p className="mt-1.5 text-sm text-[#526173]">
            Peringkat pengguna teraktif di ekosistem Mution Gateway (Admin dikecualikan).
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <StatCard 
          label="Total Global Tokens" 
          value={isLoading ? <Skeleton className="h-9 w-32" /> : data?.data?.totalTokensUsed?.toLocaleString('id-ID') || '0'}
          icon={Brain}
          color="bg-purple-100 text-purple-600"
        />
        <div className="md:col-span-2 bg-[linear-gradient(135deg,#f8fbff_0%,#f1f5f9_100%)] border border-[#dbe8f3] rounded-xl p-6 relative overflow-hidden flex items-center shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
           <div className="relative z-10">
              <h2 className="text-xl font-black text-[#172033] mb-2">Mution Leaderboard</h2>
              <p className="text-sm text-[#526173] max-w-md">Daftar pengguna dengan pemakaian token dan kredit terbanyak di ekosistem Mution Gateway.</p>
           </div>
           <Trophy className="absolute right-4 -bottom-4 w-32 h-32 text-indigo-600 opacity-[0.03]" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {isLoading ? (
          <>
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </>
        ) : (
          <>
            <RankingList 
              title="Top Spender (Credits)" 
              users={data?.data?.byCredits || []} 
              type="credits"
              icon={Coins}
            />
            <RankingList 
              title="Top User (Tokens)" 
              users={data?.data?.byTokens || []} 
              type="tokens"
              icon={ArrowUp}
            />
          </>
        )}
      </div>
    </div>
  );
}
