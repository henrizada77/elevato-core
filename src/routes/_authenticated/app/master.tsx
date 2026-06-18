import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Users, Sparkles, Activity, DollarSign, TrendingDown, Clock, Boxes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getMasterOverview, listMasterSubscriptions, listMasterModules, listMasterActivity, setCompanyStatus,
} from "@/lib/master/master.functions";
import { toast } from "sonner";

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

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function MasterPanel() {
  const { isPlatformMaster, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isPlatformMaster) navigate({ to: "/app", replace: true });
  }, [loading, isPlatformMaster, navigate]);

  const overview = useServerFn(getMasterOverview);
  const setStatus = useServerFn(setCompanyStatus);

  const { data: ov } = useQuery({ queryKey: ["master-ov"], enabled: isPlatformMaster, queryFn: () => overview() });

  const { data: companies, isLoading } = useQuery({
    queryKey: ["master-companies"],
    enabled: isPlatformMaster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, plan, status, trial_end, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = data?.map((c) => c.id) ?? [];
      if (ids.length === 0) return [];
      const { data: counts } = await supabase
        .from("company_members").select("company_id").in("company_id", ids);
      const countMap = new Map<string, number>();
      counts?.forEach((m) => countMap.set(m.company_id, (countMap.get(m.company_id) ?? 0) + 1));
      return data!.map((c) => ({ ...c, members: countMap.get(c.id) ?? 0 }));
    },
  });

  const updateStatus = async (companyId: string, status: string) => {
    try {
      await setStatus({ data: { companyId, status: status as any } });
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["master-companies"] });
      qc.invalidateQueries({ queryKey: ["master-ov"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  if (!isPlatformMaster) return null;

  const t = ov?.totals;

  return (
    <div className="space-y-8">
      <PageHeader title="Painel Master" description="Visão global da plataforma Elevo." />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="MRR estimado" value={t ? fmtBRL(t.mrrBRL) : "—"} icon={DollarSign} />
        <MetricCard label="Empresas ativas" value={t?.active ?? "—"} icon={Activity} />
        <MetricCard label="Em trial" value={t?.trial ?? "—"} icon={Sparkles} />
        <MetricCard label="Trial expira ≤7d" value={t?.trialExpSoon ?? "—"} icon={Clock} />
        <MetricCard label="Empresas totais" value={t?.companies ?? "—"} icon={Building2} />
        <MetricCard label="Churn 30d" value={t?.churn30 ?? "—"} icon={TrendingDown} />
        <MetricCard label="Módulos ativos" value={t?.enabledModules ?? "—"} icon={Boxes} />
        <MetricCard label="Chamadas IA" value={t?.aiCalls ?? "—"} icon={Sparkles} />
      </section>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">Empresas</TabsTrigger>
          <TabsTrigger value="subs">Assinaturas</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-4">
          <div className="rounded-xl border bg-card shadow-soft">
            {isLoading ? (
              <div className="space-y-3 p-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !companies?.length ? (
              <EmptyState icon={Building2} title="Sem empresas" description="Nenhuma empresa cadastrada." />
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Empresa</TableHead><TableHead>Plano</TableHead><TableHead>Status</TableHead>
                  <TableHead>Usuários</TableHead><TableHead>Trial até</TableHead><TableHead>Criada</TableHead><TableHead>Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="outline">{c.plan.toUpperCase()}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "default" : c.status === "trial" ? "secondary" : "outline"}>
                          {statusLabel[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.members}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.trial_end ? new Date(c.trial_end).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="active">Ativa</SelectItem>
                            <SelectItem value="suspended">Suspensa</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="subs"><SubsTab /></TabsContent>
        <TabsContent value="modules"><ModulesTab /></TabsContent>
        <TabsContent value="activity"><ActivityTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SubsTab() {
  const list = useServerFn(listMasterSubscriptions);
  const { data = [] } = useQuery({ queryKey: ["master-subs"], queryFn: () => list() });
  return (
    <div className="rounded-xl border bg-card shadow-soft">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Empresa</TableHead><TableHead>Plano</TableHead><TableHead>Status</TableHead>
          <TableHead>Trial até</TableHead><TableHead>Próximo ciclo</TableHead><TableHead>MRR</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {(data as any[]).map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.company?.name ?? "—"}</TableCell>
              <TableCell>{s.plan?.name ?? "—"}</TableCell>
              <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
              <TableCell className="text-sm">{s.trial_ends_at ? new Date(s.trial_ends_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
              <TableCell className="text-sm">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("pt-BR") : "—"}</TableCell>
              <TableCell>{s.plan ? fmtBRL((s.plan.price_cents ?? 0) / 100) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ModulesTab() {
  const list = useServerFn(listMasterModules);
  const { data = [] } = useQuery({ queryKey: ["master-modules"], queryFn: () => list() });
  const grouped = (data as any[]).reduce<Record<string, string[]>>((acc, m) => {
    const c = m.company?.name ?? "—"; (acc[c] = acc[c] || []).push(m.module?.name ?? m.module?.slug ?? "—"); return acc;
  }, {});
  return (
    <div className="rounded-xl border bg-card shadow-soft p-4 space-y-3">
      {Object.keys(grouped).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum módulo ativado.</p> :
        Object.entries(grouped).map(([co, mods]) => (
          <div key={co} className="flex items-start justify-between gap-3">
            <p className="font-medium text-sm">{co}</p>
            <div className="flex flex-wrap gap-1 justify-end">{mods.map((m, i) => <Badge key={i} variant="secondary">{m}</Badge>)}</div>
          </div>
        ))}
    </div>
  );
}

function ActivityTab() {
  const list = useServerFn(listMasterActivity);
  const { data = [] } = useQuery({ queryKey: ["master-activity"], queryFn: () => list() });
  return (
    <div className="rounded-xl border bg-card shadow-soft">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Quando</TableHead><TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Evento</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {(data as any[]).length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem atividade registrada.</TableCell></TableRow>
          ) : (data as any[]).map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</TableCell>
              <TableCell>{a.company?.name ?? "—"}</TableCell>
              <TableCell><Badge variant="outline">{a.kind}</Badge></TableCell>
              <TableCell className="text-sm">{a.title}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
