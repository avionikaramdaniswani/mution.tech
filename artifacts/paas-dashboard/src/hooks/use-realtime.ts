import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  getListTransactionsQueryKey,
  getGetDashboardStatsQueryKey,
  getGetAdminStatsQueryKey,
  getAdminListUsersQueryKey,
  getAdminListOrdersQueryKey,
  getAdminGetRevenueQueryKey,
  getListActivityQueryKey,
} from "@workspace/api-client-react";

type RealtimeEvent = { type: string; [key: string]: unknown };

/**
 * Membuka koneksi Server-Sent Events dan meng-invalidate query React Query
 * yang relevan setiap kali server mengirim event. Efeknya: saldo, tabel,
 * dan statistik ter-update seketika tanpa refresh halaman.
 *
 * @param path  endpoint SSE - "/api/events" (user) atau "/api/admin/events" (admin)
 * @param admin true bila ini stream admin (ikut refresh query khusus admin)
 */
export function useRealtimeEvents(path: string, admin = false) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // EventSource otomatis mengirim cookie sesi (same-origin / lewat proxy dev),
    // dan otomatis reconnect kalau koneksi putus.
    const source = new EventSource(path, { withCredentials: true });

    const invalidateUserScope = () => {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });          // saldo di navbar
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    };

    const invalidateAdminScope = () => {
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminGetRevenueQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListActivityQueryKey() });
    };

    source.onmessage = (e) => {
      let event: RealtimeEvent;
      try {
        event = JSON.parse(e.data);
      } catch {
        return; // heartbeat / non-JSON - abaikan
      }
      if (event.type === "connected") return;

      // Selalu refresh scope user (saldo dll). Bila stream admin, refresh juga scope admin.
      invalidateUserScope();
      if (admin) invalidateAdminScope();
    };

    // Biarkan EventSource menangani reconnect sendiri; jangan tutup saat error.
    source.onerror = () => { /* auto-reconnect */ };

    return () => source.close();
  }, [path, admin, queryClient]);
}
