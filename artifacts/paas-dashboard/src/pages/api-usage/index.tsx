import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, Coins, Download, Filter, Hash, Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { getModelById } from "@workspace/model-catalog";

interface ApiUsageItem {
  id: number;
  keyId: number | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  credits: number;
  createdAt: string;
  apiKeyName: string | null;
}

interface ApiUsageDaily {
  day: string;
  requests: number;
  totalTokens: number;
  credits: number;
}

interface ApiUsageFilterKey {
  id: number;
  name: string;
  keyPrefix: string;
  isActive: boolean;
}

interface ApiUsageResponse {
  summary: {
    totalRequests: number;
    totalCredits: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
  data: ApiUsageItem[];
  daily: ApiUsageDaily[];
  filters: {
    from: string;
    to: string;
    model: string | null;
    keyId: number | null;
    models: string[];
    apiKeys: ApiUsageFilterKey[];
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function initialFrom() {
  const now = new Date();
  return dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function initialTo() {
  return dateInputValue(new Date());
}

function buildUsageParams({
  page,
  from,
  to,
  model,
  keyId,
  format,
}: {
  page: number;
  from: string;
  to: string;
  model: string;
  keyId: string;
  format?: "csv";
}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    from,
    to,
  });
  if (model) params.set("model", model);
  if (keyId) params.set("keyId", keyId);
  if (format) params.set("format", format);
  return params;
}

async function fetchApiUsage(params: URLSearchParams): Promise<ApiUsageResponse> {
  const res = await fetch(`/api/api-usage?${params.toString()}`, {
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

function modelLabel(modelId: string) {
  const model = getModelById(modelId);
  return model ? `${model.label} (${model.id})` : modelId;
}

export default function ApiUsagePage() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [model, setModel] = useState("");
  const [keyId, setKeyId] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const params = buildUsageParams({ page, from, to, model, keyId });

  const { data, isLoading, isError } = useQuery<ApiUsageResponse>({
    queryKey: ["api-usage", page, from, to, model, keyId],
    queryFn: () => fetchApiUsage(params),
    placeholderData: keepPreviousData,
  });

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const resetFilters = () => {
    setFrom(initialFrom());
    setTo(initialTo());
    setModel("");
    setKeyId("");
    setPage(1);
  };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const exportParams = buildUsageParams({ page: 1, from, to, model, keyId, format: "csv" });
      const res = await fetch(`/api/api-usage?${exportParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal export CSV");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mution-api-usage-${from}-to-${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const daily = data?.daily ?? [];
  const maxDailyTokens = Math.max(1, ...daily.map((item) => item.totalTokens));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Usage</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau request, token, model, API key, dan pemotongan kredit.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={isExporting || isLoading}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Filter</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Dari</label>
            <Input type="date" value={from} onChange={(e) => updateFilter(setFrom, e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Sampai</label>
            <Input type="date" value={to} onChange={(e) => updateFilter(setTo, e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">API Key</label>
            <select
              value={keyId}
              onChange={(e) => updateFilter(setKeyId, e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Semua key</option>
              {data?.filters.apiKeys.map((key) => (
                <option key={key.id} value={String(key.id)}>
                  {key.name} - {key.keyPrefix}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Model</label>
            <select
              value={model}
              onChange={(e) => updateFilter(setModel, e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Semua model</option>
              {data?.filters.models.map((modelId) => (
                <option key={modelId} value={modelId}>{modelLabel(modelId)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" className="w-full gap-2" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              title="Total Requests"
              value={data?.summary.totalRequests.toLocaleString("id-ID") || 0}
              icon={Activity}
              description="Jumlah pemanggilan API pada filter aktif"
            />
            <SummaryCard
              title="Total Tokens"
              value={data?.summary.totalTokens.toLocaleString("id-ID") || 0}
              icon={Hash}
              description={`${(data?.summary.promptTokens || 0).toLocaleString("id-ID")} input - ${(data?.summary.completionTokens || 0).toLocaleString("id-ID")} output`}
            />
            <SummaryCard
              title="Credits Used"
              value={`Rp ${data?.summary.totalCredits.toLocaleString("id-ID") || 0}`}
              icon={Coins}
              description="Total kredit yang terpotong"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Tren Harian</h2>
              <span className="text-xs text-muted-foreground">Token per hari</span>
            </div>
            {daily.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Belum ada data pada filter ini.</div>
            ) : (
              <div className="flex items-end gap-1 h-40">
                {daily.map((item) => (
                  <div key={item.day} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 group">
                    <div className="relative w-full flex justify-center">
                      <div
                        className="w-full max-w-[28px] rounded-t bg-orange-500/70 transition-all"
                        style={{ height: `${Math.max(3, (item.totalTokens / maxDailyTokens) * 138)}px` }}
                      />
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[10px] font-medium px-2 py-1 rounded bg-black/80 border border-white/10 pointer-events-none">
                        {item.totalTokens.toLocaleString("id-ID")} tok - {item.requests.toLocaleString("id-ID")} req
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">{item.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                    <th className="px-6 py-4 font-medium text-right">Total</th>
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
                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                          {item.totalTokens.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium text-orange-500">
                          Rp {item.credits.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        Belum ada riwayat penggunaan API untuk filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {data.pagination.totalPages} - {data.pagination.totalItems.toLocaleString("id-ID")} item
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
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
