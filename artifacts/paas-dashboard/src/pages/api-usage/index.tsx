import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, Coins, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface ApiUsageItem {
  id: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  credits: number;
  createdAt: string;
  apiKeyName: string | null;
}

interface ApiUsageResponse {
  summary: {
    totalRequests: number;
    totalCredits: number;
  };
  data: ApiUsageItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

async function fetchApiUsage(page: number = 1): Promise<ApiUsageResponse> {
  const res = await fetch(`/api/api-usage?page=${page}&limit=20`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch API usage");
  }
  return res.json();
}

function SummaryCard({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: any; description: string }) {
  return (
    <div className="rounded-2xl px-6 py-5 flex flex-col gap-2" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
          <Icon className="h-5 w-5" style={{ color: "rgb(249,115,22)" }} />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function ApiUsagePage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery<ApiUsageResponse>({
    queryKey: ["api-usage", page],
    queryFn: () => fetchApiUsage(page),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">Pantau penggunaan API Key dan pemotongan kredit Anda secara transparan.</p>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-sm">
          Gagal mengambil data penggunaan API. Silakan coba lagi.
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SummaryCard 
              title="Total Requests" 
              value={data?.summary.totalRequests.toLocaleString("id-ID") || 0} 
              icon={Activity} 
              description="Jumlah pemanggilan API bulan ini"
            />
            <SummaryCard 
              title="Total Credits Used" 
              value={`Rp ${data?.summary.totalCredits.toLocaleString("id-ID") || 0}`} 
              icon={Coins} 
              description="Total biaya kredit yang terpotong bulan ini"
            />
          </div>

          {/* Table Section */}
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 border-b border-white/10 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tanggal</th>
                    <th className="px-6 py-4 font-medium">API Key</th>
                    <th className="px-6 py-4 font-medium">Model</th>
                    <th className="px-6 py-4 font-medium text-right">Input</th>
                    <th className="px-6 py-4 font-medium text-right">Output</th>
                    <th className="px-6 py-4 font-medium text-right">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.data && data.data.length > 0 ? (
                    data.data.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {format(new Date(item.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{item.apiKeyName || "Deleted Key"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-mono text-xs font-normal">
                            {item.model}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                          {item.promptTokens.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                          {item.completionTokens.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium text-orange-500">
                          Rp {item.credits.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        Belum ada riwayat penggunaan API.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)}
                >
                  Sebelumnya
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page >= data.pagination.totalPages} 
                  onClick={() => setPage(p => p + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
