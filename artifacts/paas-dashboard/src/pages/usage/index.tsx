import { useListProjects } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Server, Activity, DollarSign, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const TIER_PRICING: Record<string, { ram: string; perMinute: number }> = {
  "256mb": { ram: "256 MB", perMinute: 0.25 },
  "512mb": { ram: "512 MB", perMinute: 0.49 },
  "1gb": { ram: "1 GB", perMinute: 0.9 },
  "2gb": { ram: "2 GB", perMinute: 1.8 },
  "4gb": { ram: "4 GB", perMinute: 3.6 },
  "8gb": { ram: "8 GB", perMinute: 7.2 },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function UsagePage() {
  const { data: projects, isLoading } = useListProjects();

  const activeProjects = projects?.filter(p => p.status === 'running') || [];
  
  // Calculate total monthly estimate
  // (perMinute rate * 60 mins * 24 hours * 30 days) = perMinute * 43200
  const estimatedMonthlyCost = activeProjects.reduce((total, p) => {
    const tier = TIER_PRICING[p.ramTier] || TIER_PRICING["256mb"];
    return total + (tier.perMinute * 43200);
  }, 0);

  const totalSpentAllTime = projects?.reduce((total, p) => total + (p.totalSpent || 0), 0) || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hosting Usage</h1>
        <p className="text-muted-foreground mt-1">
          Pantau daftar proyek, tipe runtime, dan akumulasi pemakaian saldo kamu.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Proyek Aktif</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sedang berjalan dan mengkonsumsi saldo
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estimasi Bulan Ini</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estimatedMonthlyCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Asumsi berjalan 24/7 (30 hari)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Akumulasi Biaya</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(totalSpentAllTime)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total yang sudah dihabiskan semua proyek
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rincian Pemakaian Proyek</CardTitle>
          <CardDescription>Daftar proyek dan beban biaya per menitnya.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <Server className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
              <h3 className="font-medium text-lg">Belum ada proyek</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Deploy proyek pertamamu untuk mulai melihat metrik penggunaan.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Proyek</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Kapasitas (RAM)</TableHead>
                    <TableHead>Biaya / Menit</TableHead>
                    <TableHead className="text-right">Total Dihabiskan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project: any) => {
                    const tier = TIER_PRICING[project.ramTier] || TIER_PRICING["256mb"];
                    
                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {project.runtime}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={project.status === 'running' ? 'default' : 'secondary'}
                            className={project.status === 'running' ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25' : ''}
                          >
                            {project.status === 'running' ? 'Berjalan' : 
                             project.status === 'stopped' ? 'Berhenti' : project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{tier.ram}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(tier.perMinute)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(project.totalSpent || 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
