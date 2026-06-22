import { useEffect } from "react";
import { useSearch } from "wouter";

export default function GitHubCallback() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const status = params.get("status");

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "github-oauth", status }, "*");
      window.close();
    }
  }, [status]);

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground dark">
      <p className="text-sm text-muted-foreground">
        {status === "connected"
          ? "GitHub terhubung! Menutup jendela..."
          : "Terjadi kesalahan. Menutup jendela..."}
      </p>
    </div>
  );
}
