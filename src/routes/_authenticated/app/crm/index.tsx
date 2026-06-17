import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, DollarSign, Trophy, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId, formatCurrency } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";

export const Route = createFileRoute("/_authenticated/app/crm/")({ component: CrmDashboard });

function CrmDashboard() {
  const companyId = useCompanyId();

  const { data: stats } = useQuery({
    queryKey: ["crm-stats", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const [leads, customers, openDeals, wonDeals] = await Promise.all([
        supabase.from("crm_leads").select("id, estimated_value", { count: "exact" }).eq("company_id", companyId!).eq("archived", false),
        supabase.from("crm_customers").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        supabase.from("crm_deals").select("id, value", { count: "exact" }).eq("company_id", companyId!).eq("status", "open"),
        supabase.from("crm_deals").select("id, value", { count: "exact" }).eq("company_id", companyId!).eq("status", "won"),
      ]);
      const estimated = (leads.data ?? []).reduce((s, l: any) => s + Number(l.estimated_value || 0), 0);
      const inProgress = (openDeals.data ?? []).reduce((s, d: any) => s + Number(d.value || 0), 0);
      const wonTotal = (wonDeals.data ?? []).reduce((s, d: any) => s + Number(d.value || 0), 0);
      const wonCount = wonDeals.count ?? 0;
      const ticket = wonCount > 0 ? wonTotal / wonCount : 0;
      const conversion = (leads.count ?? 0) > 0 ? ((customers.count ?? 0) / (leads.count ?? 1)) * 100 : 0;
      return {
        leads: leads.count ?? 0,
        customers: customers.count ?? 0,
        openDeals: openDeals.count ?? 0,
        wonCount,
        estimated, inProgress, wonTotal, ticket, conversion,
      };
    }
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["crm-recent-deals", companyId], enabled: !!companyId,
    queryFn: async () => { const { data } = await supabase.from("crm_deals").select("id,number,title,value,status,closed_at").eq("company_id", companyId!).eq("status", "won").order("closed_at", { ascending: false }).limit(5); return data ?? []; }
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard Comercial" description="Visão geral do seu CRM." />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Leads ativos" value={stats?.leads ?? 0} hint={formatCurrency(stats?.estimated)} icon={Users} />
        <MetricCard label="Clientes" value={stats?.customers ?? 0} hint={`${stats?.conversion.toFixed(1) ?? 0}% conversão`} icon={Trophy} />
        <MetricCard label="Em pipeline" value={formatCurrency(stats?.inProgress)} hint={`${stats?.openDeals ?? 0} negócios abertos`} icon={TrendingUp} />
        <MetricCard label="Receita fechada" value={formatCurrency(stats?.wonTotal)} hint={`Ticket médio ${formatCurrency(stats?.ticket)}`} icon={DollarSign} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Últimos negócios ganhos</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState icon={Trophy} title="Sem negócios ganhos ainda" description="Mova negócios para a etapa Ganho no Kanban." />
            ) : (
              <ul className="space-y-2">
                {recent.map((d: any) => (
                  <li key={d.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{d.number}</p>
                    </div>
                    <span className="font-semibold text-primary">{formatCurrency(d.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base">Em construção</CardTitle></CardHeader>
          <CardContent>
            <EmptyState icon={BarChart3} title="Gráficos avançados em breve" description="Ranking de vendedores, funil mais utilizado e gráficos por período chegam na próxima fase." />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
