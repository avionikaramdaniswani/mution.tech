import React, { createContext, useContext, useEffect } from "react";
import { useGetMe, getGetMeQueryKey, type User } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: user = null, isLoading, error } = useGetMe({
    query: {
      retry: false,
    }
  });

  const publicRoutes = ["/", "/login", "/register", "/harga", "/faq", "/refund-policy", "/terms-and-conditions", "/kontak"];

  useEffect(() => {
    if (!isLoading && !user && !publicRoutes.includes(location)) {
      setLocation("/");
    }
  }, [user, isLoading, location, setLocation]);

  const logout = () => {
    queryClient.setQueryData(getGetMeQueryKey(), null);
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}