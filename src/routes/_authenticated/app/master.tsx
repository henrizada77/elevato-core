import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Sparkles, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/master")({
  component: MasterPanel,
});

const statusLabel: Record<string, string> = {
  trial: "Trial",
  active: "Ativa",
  trial_expired: "Trial expirado",
  suspended: "Suspensa",
  cancelled: "Cancelada",
};

function MasterPanel() {
  const { isPlatformMaster, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isPlatformMaster) {
      navigate({ to: "/app", replace: true });
    }
  }, [loading, isPlatformMaster, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["master-companies"],
    enabled: isPlatformMaster,
    queryFn: async () => {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("id, name, plan, status, trial_end, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = companies?.map((c) => c.id) ?? [];
      if (ids.length === 0) return [];
      const { data: counts } = await supabase
        .from("company_members")
        .select("company_id")
        .in("company_id", ids);
      const countMap = new Map<string, number>();
      counts?.forEach((m) => countMap.set(m.company_id, (countMap.get(m.company_id) ?? 0) + 1));
      return companies!.map((c) => ({ ...c, members: countMap.get(c.id) ?? 0 }));
    },
  });

  if (!isPlatformMaster) return null;

  const totals = {
    companies: data?.length ?? 0,
    trial: data?.filter((c) => c.status === "trial").length ?? 0,
    active: data?.filter((c) => c.status === "active").length ?? 0,
    users: data?.reduce((s, c) => s + (c.members ?? 0), 0) ?? 0,
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Painel Master" description="Visão global da plataforma Elevo." />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Empresas" value={totals.companies} icon={Building2} />
        <MetricCard label="Em trial" value={totals.trial} icon={Sparkles} />
        <MetricCard label="Ativas" value={totals.active} icon={Activity} />
        <MetricCard label="Usuários" value={totals.users} icon={Users} />
      </section>

      <div className="rounded-xl border bg-card shadow-soft">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Building2} title="Sem empresas" description="Nenhuma empresa cadastrada na plataforma." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Trial até</TableHead>
                <TableHead>Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.plan.toUpperCase()}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : c.status === "trial" ? "secondary" : "outline"}>
                      {statusLabel[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.members}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.trial_end).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
