import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, DollarSign, Trophy, Target, Award } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId, formatCurrency } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";

export const Route = createFileRoute("/_authenticated/app/crm/")({ component: CrmDashboard });

const CHART_COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

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
        wonCount, estimated, inProgress, wonTotal, ticket, conversion,
      };
    },
  });

  // Monthly evolution (last 6 months)
  const { data: monthly = [] } = useQuery({
    queryKey: ["crm-monthly", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 5);
      since.setDate(1);
      const { data } = await supabase
        .from("crm_deals")
        .select("value,status,closed_at,created_at")
        .eq("company_id", companyId!)
        .gte("created_at", since.toISOString());
      const buckets = new Map<string, { month: string; ganho: number; perdido: number; aberto: number }>();
      for (let i = 0; i < 6; i++) {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); d.setDate(1);
        const k = d.toISOString().slice(0, 7);
        buckets.set(k, { month: d.toLocaleDateString("pt-BR", { month: "short" }), ganho: 0, perdido: 0, aberto: 0 });
      }
      (data ?? []).forEach((d: any) => {
        const k = (d.closed_at ?? d.created_at).slice(0, 7);
        const b = buckets.get(k);
        if (!b) return;
        const v = Number(d.value || 0);
        if (d.status === "won") b.ganho += v;
        else if (d.status === "lost") b.perdido += v;
        else b.aberto += v;
      });
      return Array.from(buckets.values());
    },
  });

  // Sales ranking
  const { data: ranking = [] } = useQuery({
    queryKey: ["crm-ranking", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_deals")
        .select("value,owner_id")
        .eq("company_id", companyId!)
        .eq("status", "won");
      const byOwner = new Map<string, number>();
      (data ?? []).forEach((d: any) => {
        if (!d.owner_id) return;
        byOwner.set(d.owner_id, (byOwner.get(d.owner_id) ?? 0) + Number(d.value || 0));
      });
      const ids = Array.from(byOwner.keys());
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || p.email]));
      return Array.from(byOwner.entries())
        .map(([id, total]) => ({ name: profMap.get(id) ?? "—", total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });

  // Loss reasons
  const { data: losses = [] } = useQuery({
    queryKey: ["crm-losses", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_deals")
        .select("loss_reason_id, crm_loss_reasons(name)")
        .eq("company_id", companyId!)
        .eq("status", "lost");
      const m = new Map<string, number>();
      (data ?? []).forEach((d: any) => {
        const n = d.crm_loss_reasons?.name ?? "Sem motivo";
        m.set(n, (m.get(n) ?? 0) + 1);
      });
      return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["crm-recent-deals", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_deals").select("id,number,title,value,closed_at").eq("company_id", companyId!).eq("status", "won").order("closed_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const totalWonInPeriod = useMemo(() => monthly.reduce((s, m) => s + m.ganho, 0), [monthly]);

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard Comercial" description="Visão geral do seu CRM." />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Leads ativos" value={stats?.leads ?? 0} hint={formatCurrency(stats?.estimated)} icon={Users} />
        <MetricCard label="Clientes" value={stats?.customers ?? 0} hint={`${stats?.conversion.toFixed(1) ?? 0}% conversão`} icon={Trophy} />
        <MetricCard label="Em pipeline" value={formatCurrency(stats?.inProgress)} hint={`${stats?.openDeals ?? 0} negócios abertos`} icon={TrendingUp} />
        <MetricCard label="Ticket médio" value={formatCurrency(stats?.ticket)} hint={`${stats?.wonCount ?? 0} ganhos • ${formatCurrency(stats?.wonTotal)}`} icon={DollarSign} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolução últimos 6 meses</CardTitle>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalWonInPeriod)} em negócios ganhos</p>
          </CardHeader>
          <CardContent className="h-72">
            {monthly.length === 0 ? <EmptyState icon={TrendingUp} title="Sem dados" description="Crie negócios para ver a evolução." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="ganho" stroke="#22c55e" strokeWidth={2} name="Ganho" />
                  <Line type="monotone" dataKey="aberto" stroke="hsl(var(--primary))" strokeWidth={2} name="Aberto" />
                  <Line type="monotone" dataKey="perdido" stroke="#ef4444" strokeWidth={2} name="Perdido" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Ranking de vendedores</CardTitle></CardHeader>
          <CardContent className="h-72">
            {ranking.length === 0 ? <EmptyState icon={Award} title="Sem vendas ainda" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ranking} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Motivos de perda</CardTitle></CardHeader>
          <CardContent className="h-64">
            {losses.length === 0 ? <EmptyState icon={Target} title="Sem perdas registradas" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={losses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name} (${e.value})`}>
                    {losses.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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
      </section>
    </div>
  );
}
