import { useAdminListUsers } from "@workspace/api-client-react";
import { Users, ShieldAlert, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={
        isAdmin
          ? { background: "rgba(239,68,68,0.12)", color: "rgb(239,68,68)", border: "1px solid rgba(239,68,68,0.22)" }
          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }
      }
    >
      {isAdmin ? <ShieldAlert className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
      {role}
    </span>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: "rgba(99,102,241,0.15)", color: "rgb(99,102,241)", border: "1px solid rgba(99,102,241,0.22)" }}
    >
      {initials}
    </div>
  );
}

export default function AdminUsers() {
  const { data: users, isLoading } = useAdminListUsers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pengguna</h1>
          <p className="text-sm text-muted-foreground mt-1">Semua akun yang terdaftar di platform.</p>
        </div>
        {users && (
          <div
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
          >
            {users.length} pengguna
          </div>
        )}
      </div>

      {/* Table card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="col-span-5">Pengguna</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2 text-center">Proyek</div>
          <div className="col-span-3 text-right">Bergabung</div>
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : !users || users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada pengguna.</p>
          </div>
        ) : (
          <div>
            {users.map((user, i) => (
              <div
                key={user.id}
                className="grid grid-cols-12 items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: i < users.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
                {/* Avatar + name */}
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <UserAvatar name={user.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                {/* Role */}
                <div className="col-span-2">
                  <RoleBadge role={user.role} />
                </div>
                {/* Project count */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-semibold">{user.projectCount}</span>
                </div>
                {/* Joined */}
                <div className="col-span-3 text-right">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
