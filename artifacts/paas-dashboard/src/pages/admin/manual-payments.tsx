import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, RefreshCw, Loader2, Clock } from "lucide-react";
import { csrfFetch } from "@/lib/csrf";

interface PendingOrder {
  id: number;
  invoiceNumber: string;
  amount: number;
  creditsAmount: number;
  createdAt: string;
  userEmail: string;
}

export default function AdminManualPayments() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await csrfFetch("/api/admin/payments/manual-pending");
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, 10000); // auto refresh every 10s
    return () => clearInterval(id);
  }, []);

  async function handleAction(id: number, action: "approve" | "reject") {
    if (!confirm(`Are you sure you want to ${action} this payment?`)) return;
    setProcessingId(id);
    try {
      const res = await csrfFetch(`/api/admin/payments/${id}/${action}`, {
        method: "POST"
      });
      if (res.ok) {
        setOrders(orders.filter(o => o.id !== id));
      } else {
        alert("Gagal memproses payment");
      }
    } catch (e) {
      alert("Error processing payment");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">Admin Mution</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-[#172033]">Manual QRIS</h1>
          <p className="mt-1 text-sm text-[#526173]">Verifikasi pembayaran manual (Shopee QRIS) yang masuk.</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-border shadow-sm rounded-lg hover:bg-muted transition-colors text-sm font-semibold"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mb-4" />
            <p>Memuat antrean...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Clock className="h-10 w-10 mb-4 opacity-50" />
            <p>Tidak ada pembayaran manual yang menunggu persetujuan.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bayar</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kredit</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-foreground">
                    {new Date(order.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {order.userEmail}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                    {order.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-foreground">
                    Rp {order.amount.toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-emerald-600">
                    +{order.creditsAmount.toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAction(order.id, "reject")}
                        disabled={processingId === order.id}
                        className="px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Tolak
                      </button>
                      <button
                        onClick={() => handleAction(order.id, "approve")}
                        disabled={processingId === order.id}
                        className="px-3 py-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
