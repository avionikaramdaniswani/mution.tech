import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, Download, Filter, Hash, Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { getModelById } from "@workspace/model-catalog";

interface ApiUsageItem {
  id: number;
  requestId: string;
  keyId: number | null;
  endpoint: string;
  method: string;
  model: string | null;
  providerId: string | null;
  statusCode: number;
  success: boolean;
  errorType: string | null;
  latencyMs: number;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  totalTokens: number;
  credits: number;
  createdAt: string;
  apiKeyName: string | null;
}

interface ApiUsageDaily {
  day: string;
  requests: number;
  errors: number;
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
    cachedTokens: number;
    completionTokens: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatencyMs: number;
  };
  data: ApiUsageItem[];
  daily: ApiUsageDaily[];
  filters: {
    from: string;
    to: string;
    model: string | null;
    status: "success" | "error" | null;
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
  status,
  keyId,
  format,
}: {
  page: number;
  from: string;
  to: string;
  model: string;
  status: string;
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
  if (status) params.set("status", status);
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

function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  accent,
}: {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-black leading-none tracking-normal text-foreground">{value}</p>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function modelLabel(modelId: string) {
  const model = getModelById(modelId);
  return model ? `${model.label} (${model.id})` : modelId;
}

function shortRequestId(requestId: string) {
  return requestId.length > 12 ? requestId.slice(0, 8) : requestId;
}

function statusBadgeClass(success: boolean) {
  return success
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function ApiUsagePage() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [keyId, setKeyId] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const params = buildUsageParams({ page, from, to, model, status, keyId });

  const { data, isLoading, isError } = useQuery<ApiUsageResponse>({
    queryKey: ["api-usage", page, from, to, model, status, keyId],
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
    setStatus("");
    setKeyId("");
    setPage(1);
  };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const exportParams = buildUsageParams({ page: 1, from, to, model, status, keyId, format: "csv" });
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Developer</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-normal text-foreground sm:text-3xl">API Usage</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pantau request, token, model, API key, dan pemotongan kredit.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-md" onClick={exportCsv} disabled={isExporting || isLoading}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Filter</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dari</label>
            <Input type="date" value={from} onChange={(e) => updateFilter(setFrom, e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Sampai</label>
            <Input type="date" value={to} onChange={(e) => updateFilter(setTo, e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">API Key</label>
            <select value={keyId} onChange={(e) => updateFilter(setKeyId, e.target.value)} className={selectClass}>
              <option value="">Semua key</option>
              {data?.filters.apiKeys.map((key) => (
                <option key={key.id} value={String(key.id)}>
                  {key.name} - {key.keyPrefix}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select value={status} onChange={(e) => updateFilter(setStatus, e.target.value)} className={selectClass}>
              <option value="">Semua status</option>
              <option value="success">Berhasil</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Model</label>
            <select value={model} onChange={(e) => updateFilter(setModel, e.target.value)} className={selectClass}>
              <option value="">Semua model</option>
              {data?.filters.models.map((modelId) => (
                <option key={modelId} value={modelId}>{modelLabel(modelId)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" className="w-full gap-2 rounded-md" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal mengambil data penggunaan API. Silakan coba lagi.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              title="Total Requests"
              value={(data?.summary.totalRequests ?? 0).toLocaleString("id-ID")}
              icon={Activity}
              accent="border-sky-100 bg-sky-50 text-sky-600"
              description={`${(data?.summary.successfulRequests || 0).toLocaleString("id-ID")} berhasil - ${(data?.summary.failedRequests || 0).toLocaleString("id-ID")} error`}
            />
            <SummaryCard
              title="Total Tokens"
              value={(data?.summary.totalTokens ?? 0).toLocaleString("id-ID")}
              icon={Hash}
              accent="border-orange-100 bg-orange-50 text-primary"
              description={`${(data?.summary.promptTokens || 0).toLocaleString("id-ID")} input - ${(data?.summary.completionTokens || 0).toLocaleString("id-ID")} output`}
            />
            <SummaryCard
              title="Cached Tokens"
              value={(data?.summary.cachedTokens || 0).toLocaleString("id-ID")}
              icon={Database}
              accent="border-teal-100 bg-teal-50 text-teal-600"
              description={
                data && data.summary.promptTokens > 0
                  ? `${Math.round(((data.summary.cachedTokens || 0) / data.summary.promptTokens) * 100)}% dari input tokens - info saja, harga tidak berubah`
                  : "Belum ada cache hit pada filter ini"
              }
            />
            <SummaryCard
              title="Error Requests"
              value={(data?.summary.failedRequests ?? 0).toLocaleString("id-ID")}
              icon={AlertTriangle}
              accent="border-red-100 bg-red-50 text-red-600"
              description="Request dengan status gagal pada filter aktif"
            />
            <SummaryCard
              title="Avg Latency"
              value={`${(data?.summary.averageLatencyMs ?? 0).toLocaleString("id-ID")} ms`}
              icon={Clock}
              accent="border-violet-100 bg-violet-50 text-violet-600"
              description={`Kredit terpakai: Rp ${(data?.summary.totalCredits ?? 0).toLocaleString("id-ID")}`}
            />
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Tren Harian</h2>
              <span className="text-xs text-muted-foreground">Token per hari</span>
            </div>
            {daily.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Belum ada data pada filter ini.</div>
            ) : (
              <div className="flex h-40 items-end gap-1">
                {daily.map((item) => (
                  <div key={item.day} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <div className="relative flex w-full justify-center">
                      <div
                        className="w-full max-w-[28px] rounded-t bg-primary/70 transition-all group-hover:bg-primary"
                        style={{ height: `${Math.max(3, (item.totalTokens / maxDailyTokens) * 138)}px` }}
                      />
                      <div className="pointer-events-none absolute -top-10 whitespace-nowrap rounded-md border border-border bg-foreground px-2 py-1 text-[10px] font-medium text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                        {item.totalTokens.toLocaleString("id-ID")} tok - {item.requests.toLocaleString("id-ID")} req - {item.errors.toLocaleString("id-ID")} err
                      </div>
                    </div>
                    <span className="w-full truncate text-center text-[9px] text-muted-foreground">{item.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_12px_34px_rgba(23,32,51,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Tanggal</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Request</th>
                    <th className="px-6 py-3 font-semibold">API Key</th>
                    <th className="px-6 py-3 font-semibold">Endpoint</th>
                    <th className="px-6 py-3 font-semibold">Model</th>
                    <th className="px-6 py-3 text-right font-semibold">Tokens</th>
                    <th className="px-6 py-3 text-right font-semibold">Latency</th>
                    <th className="px-6 py-3 text-right font-semibold">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.data && data.data.length > 0 ? (
                    data.data.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-muted/30">
                        <td className="whitespace-nowrap px-6 py-4 text-foreground">
                          {format(new Date(item.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={statusBadgeClass(item.success)}>
                              {item.success ? (
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                              ) : (
                                <AlertTriangle className="mr-1 h-3 w-3" />
                              )}
                              {item.statusCode}
                            </Badge>
                            {item.errorType && (
                              <span className="max-w-36 truncate text-xs text-red-600" title={item.errorType}>
                                {item.errorType}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs text-muted-foreground" title={item.requestId}>
                            {shortRequestId(item.requestId)}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          {item.keyId === null || item.apiKeyName === "Deleted API Key" ? (
                            <Badge variant="outline" className="border-border text-muted-foreground">
                              Deleted API Key
                            </Badge>
                          ) : (
                            <span className="font-medium text-foreground">{item.apiKeyName}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground">{item.method}</span>
                            <code className="max-w-40 truncate text-xs text-foreground" title={item.endpoint}>
                              {item.endpoint}
                            </code>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.model ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="border-border font-mono text-xs font-normal text-foreground">
                                {item.model}
                              </Badge>
                              {item.providerId && (
                                <span className="text-xs text-muted-foreground">{item.providerId}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                          <div className="font-medium text-foreground">
                            {item.totalTokens.toLocaleString("id-ID")}
                          </div>
                          <div className="text-xs">
                            {item.promptTokens.toLocaleString("id-ID")} in - {item.completionTokens.toLocaleString("id-ID")} out
                          </div>
                          {item.cachedTokens > 0 && (
                            <div className="text-xs font-medium text-teal-600" title="Bagian dari input tokens yang cache hit di provider — info saja, tidak mengubah harga">
                              {item.cachedTokens.toLocaleString("id-ID")} cached
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                          {item.latencyMs.toLocaleString("id-ID")} ms
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums font-semibold text-primary">
                          Rp {item.credits.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                        Belum ada request API untuk filter ini.
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
                  className="rounded-md"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md"
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
