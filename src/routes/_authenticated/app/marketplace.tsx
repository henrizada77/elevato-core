import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Store, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/marketplace")({ component: MarketplacePage });

function MarketplacePage() {
  const companyId = useCompanyId();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["marketplace", companyId], enabled: !!companyId,
    queryFn: async () => {
      const [modules, active] = await Promise.all([
        supabase.from("billing_modules").select("*").eq("is_active", true).order("position"),
        supabase.from("company_modules").select("module_id, enabled").eq("company_id", companyId!),
      ]);
      const activeSet = new Map((active.data ?? []).map((a: any) => [a.module_id, a.enabled]));
      return (modules.data ?? []).map((m: any) => ({ ...m, enabled: activeSet.get(m.id) ?? false }));
    },
  });

  const toggle = async (moduleId: string, enabled: boolean, isCore: boolean) => {
    if (!companyId) return;
    if (isCore && !enabled) { toast.error("Módulos essenciais não podem ser desativados"); return; }
    const { error } = await supabase.from("company_modules").upsert({ company_id: companyId, module_id: moduleId, enabled }, { onConflict: "company_id,module_id" });
    if (error) { toast.error(error.message); return; }
    toast.success(enabled ? "Módulo ativado" : "Módulo desativado");
    qc.invalidateQueries({ queryKey: ["marketplace"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Marketplace" description="Ative módulos para expandir as funcionalidades do Elevo." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((m: any) => (
          <Card key={m.id} className="shadow-soft">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-gradient-brand flex items-center justify-center text-primary-foreground">
                  <Store className="h-5 w-5" />
                </div>
                {m.is_core ? (
                  <Badge variant="secondary" className="gap-1"><Check className="h-3 w-3" /> Essencial</Badge>
                ) : (
                  <Switch checked={m.enabled} onCheckedChange={(v) => toggle(m.id, v, m.is_core)} />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{m.category}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
