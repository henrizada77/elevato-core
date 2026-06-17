import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Sparkles, TrendingUp, MessageSquare, Bot, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { TrialBanner } from "@/components/app/trial-banner";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, memberships } = useAuth();
  const companyId = profile?.current_company_id ?? memberships[0]?.company_id ?? null;

  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", companyId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["members-count", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("company_members")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Olá, ${profile?.full_name?.split(" ")[0] || "bem-vindo"} 👋`}
        description="Visão geral da sua plataforma Elevo."
      />

      {company && <TrialBanner status={company.status} trialEnd={company.trial_end} />}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Empresa" value={company?.name ?? "—"} hint={company?.plan?.toUpperCase()} icon={Building2} />
        <MetricCard label="Usuários" value={memberCount} hint="Ativos na empresa" icon={Users} />
        <MetricCard
          label="Status"
          value={statusLabel(company?.status)}
          hint={company?.trial_end ? `Trial até ${new Date(company.trial_end).toLocaleDateString("pt-BR")}` : undefined}
          icon={Sparkles}
        />
        <MetricCard label="Atividade" value="—" hint="Em breve" icon={TrendingUp} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={TrendingUp}
              title="Sem atividade ainda"
              description="Quando sua equipe começar a usar a plataforma, você verá os eventos por aqui."
            />
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Próximos módulos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: MessageSquare, name: "Atendimento & WhatsApp" },
              { icon: Bot, name: "Inteligência Artificial" },
              { icon: Zap, name: "Automações & Funis" },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-soft text-primary">
                  <m.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">Em breve</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "trial": return "Trial";
    case "active": return "Ativa";
    case "trial_expired": return "Trial expirado";
    case "suspended": return "Suspensa";
    case "cancelled": return "Cancelada";
    default: return "—";
  }
}
