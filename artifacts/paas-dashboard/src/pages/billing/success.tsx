import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useGetPaymentStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function PaymentSuccessPage() {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(window.location.search);
  const invoiceNumber = params.get("invoice") ?? "";

  const [pollEnabled, setPollEnabled] = useState(true);

  const { data, isLoading, isError } = useGetPaymentStatus(invoiceNumber, {
    query: {
      enabled: !!invoiceNumber && pollEnabled,
      refetchInterval: (q) => {
        const status = (q.state.data as any)?.status;
        if (status === "paid" || status === "failed" || status === "expired") return false;
        return 3000;
      },
    },
  });

  useEffect(() => {
    if (data?.status === "paid") {
      setPollEnabled(false);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
    }
    if (data?.status === "failed" || data?.status === "expired") {
      setPollEnabled(false);
    }
  }, [data?.status, queryClient]);

  if (!invoiceNumber) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 mx-auto" style={{ color: "rgb(239,68,68)" }} />
          <p className="text-lg font-semibold">Invoice tidak ditemukan</p>
          <Link href="/billing">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Billing
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = data?.status;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
      >
        <div className="px-8 py-10 flex flex-col items-center text-center gap-5">

          {/* Icon + status */}
          {isLoading && !data ? (
            <>
              <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
                <Clock className="h-8 w-8 animate-pulse" style={{ color: "rgb(249,115,22)" }} />
              </div>
              <div>
                <p className="text-lg font-bold">Menunggu Pembayaran</p>
                <p className="text-sm text-muted-foreground mt-1">Sedang mengecek status pembayaran…</p>
              </div>
            </>
          ) : status === "paid" ? (
            <>
              <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle2 className="h-8 w-8" style={{ color: "rgb(34,197,94)" }} />
              </div>
              <div>
                <p className="text-lg font-bold">Pembayaran Berhasil!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data?.amount ? formatRp(data.amount) : ""} kredit telah ditambahkan ke akun kamu.
                </p>
              </div>
            </>
          ) : status === "failed" || status === "expired" || isError ? (
            <>
              <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <XCircle className="h-8 w-8" style={{ color: "rgb(239,68,68)" }} />
              </div>
              <div>
                <p className="text-lg font-bold">{status === "expired" ? "Pembayaran Kedaluwarsa" : "Pembayaran Gagal"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {status === "expired" ? "Waktu pembayaran sudah habis." : "Transaksi tidak berhasil diproses."}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
                <Clock className="h-8 w-8 animate-pulse" style={{ color: "rgb(249,115,22)" }} />
              </div>
              <div>
                <p className="text-lg font-bold">Menunggu Konfirmasi</p>
                <p className="text-sm text-muted-foreground mt-1">Pembayaran sedang diproses oleh DOKU.</p>
              </div>
            </>
          )}

          {/* Invoice detail */}
          {invoiceNumber && (
            <div
              className="w-full rounded-xl px-4 py-3 text-left space-y-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-mono font-medium">{invoiceNumber}</span>
              </div>
              {data?.amount && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Nominal</span>
                  <span className="font-semibold">{formatRp(data.amount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="w-full space-y-2">
            <Link href="/billing">
              <Button
                className="w-full gap-2"
                style={
                  status === "paid"
                    ? { background: "rgb(249,115,22)", color: "#fff" }
                    : {}
                }
                variant={status === "paid" ? "default" : "outline"}
              >
                <Wallet className="h-4 w-4" />
                {status === "paid" ? "Lihat Saldo" : "Kembali ke Billing"}
              </Button>
            </Link>
            {(status === "failed" || status === "expired") && (
              <Link href="/billing">
                <Button className="w-full" style={{ background: "rgb(249,115,22)", color: "#fff" }}>
                  Coba Topup Lagi
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
