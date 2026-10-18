import { useQuery } from "@tanstack/react-query";
import { csrfFetch } from "@/lib/csrf";

export interface UserTokenPackage {
  id: number;
  userId: number;
  packageId: number | null;
  category: "claude" | "gpt";
  totalTokens: number;
  remainingTokens: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export const USER_TOKEN_PACKAGES_QUERY_KEY = ["/api/billing/user/token-packages"];

export function useUserTokenPackages() {
  return useQuery({
    queryKey: USER_TOKEN_PACKAGES_QUERY_KEY,
    queryFn: async (): Promise<UserTokenPackage[]> => {
      const res = await csrfFetch("/api/billing/user/token-packages", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
  });
}
