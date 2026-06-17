import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId, formatCurrency } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/settings/billing")({ component: BillingPage });

function BillingPage() {
  const companyId = useCompanyId();

  const { data: sub } = useQuery({
    queryKey: ["billing-sub", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("billing_subscriptions").select("*, billing_plans(*)").eq("company_id", companyId!).maybeSingle();
      return data;
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("billing_plans").select("*").eq("is_public", true).order("position");
      return data ?? [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["billing-invoices", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("billing_invoices").select("*").eq("company_id", companyId!).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const trialDaysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Plano e cobrança" description="Gerencie sua assinatura do Elevo." />

      {sub && (
        <Card className="shadow-soft border-primary/30">
          <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge variant={sub.status === "trial" ? "secondary" : "default"}>{sub.status}</Badge>
              <h3 className="text-2xl font-bold mt-2">{sub.billing_plans?.name}</h3>
              <p className="text-sm text-muted-foreground">{sub.billing_plans?.description}</p>
              {sub.status === "trial" && trialDaysLeft > 0 && (
                <p className="text-sm mt-2 flex items-center gap-1 text-amber-600"><Clock className="h-4 w-4" /> {trialDaysLeft} dias restantes no trial</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatCurrency((sub.billing_plans?.price_cents ?? 0) / 100)}</p>
              <p className="text-xs text-muted-foreground">por mês</p>
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h3 className="font-semibold mb-3">Planos disponíveis</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((p: any) => {
            const current = sub?.plan_id === p.id;
            return (
              <Card key={p.id} className={`shadow-soft ${current ? "border-primary border-2" : ""}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">{p.name}{current && <Badge>Atual</Badge>}</CardTitle>
                  <p className="text-3xl font-bold">{formatCurrency(p.price_cents / 100)}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <ul className="text-sm space-y-1">
                    {p.max_users && <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> {p.max_users} usuários</li>}
                    {p.max_inboxes && <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> {p.max_inboxes} canais de atendimento</li>}
                    {p.max_contacts && <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> {p.max_contacts.toLocaleString("pt-BR")} contatos</li>}
                    {(p.modules ?? []).map((m: string) => <li key={m} className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Módulo {m}</li>)}
                  </ul>
                  {!current && <Button className="w-full" disabled>Em breve</Button>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Histórico de faturas</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma fatura ainda.</p>
          ) : (
            <ul className="divide-y">
              {invoices.map((i: any) => (
                <li key={i.id} className="py-2 flex items-center justify-between">
                  <span className="text-sm">{new Date(i.created_at).toLocaleDateString("pt-BR")}</span>
                  <span className="font-medium">{formatCurrency(i.amount_cents / 100)}</span>
                  <Badge variant="outline">{i.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
