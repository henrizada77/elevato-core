import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Zap, Edit2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/empty-state";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/crm/automations")({ component: AutomationsPage });

const TRIGGERS = [
  { value: "lead_created", label: "Quando um lead for criado" },
  { value: "lead_stage_changed", label: "Quando lead mudar de status" },
  { value: "deal_created", label: "Quando um negócio for criado" },
  { value: "deal_stage_changed", label: "Quando um negócio mudar de etapa" },
  { value: "deal_won", label: "Quando um negócio for ganho" },
  { value: "deal_lost", label: "Quando um negócio for perdido" },
  { value: "customer_inactive", label: "Quando um cliente ficar inativo" },
];

const ACTIONS = [
  { value: "create_task", label: "Criar uma tarefa" },
  { value: "add_tag", label: "Adicionar uma tag" },
  { value: "assign_owner", label: "Atribuir responsável" },
  { value: "send_notification", label: "Enviar notificação" },
  { value: "convert_to_customer", label: "Converter em cliente" },
];

function AutomationsPage() {
  const companyId = useCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", description: "", trigger_type: "lead_created", actions: [{ type: "create_task" }] });
  const [editing, setEditing] = useState<any>(null);

  const { data: rules = [] } = useQuery({
    queryKey: ["crm-automations", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_automations").select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", trigger_type: "lead_created", actions: [{ type: "create_task" }] }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.name?.trim() || !companyId) { toast.error("Nome obrigatório"); return; }
    const payload = {
      company_id: companyId, name: form.name, description: form.description,
      trigger_type: form.trigger_type, trigger_config: form.trigger_config ?? {},
      actions: form.actions ?? [], is_active: form.is_active ?? true,
      created_by: user?.id,
    };
    if (editing) {
      const { error } = await supabase.from("crm_automations").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("crm_automations").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editing ? "Automação atualizada" : "Automação criada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["crm-automations"] });
  };

  const toggle = async (r: any) => {
    await supabase.from("crm_automations").update({ is_active: !r.is_active }).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["crm-automations"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir automação?")) return;
    await supabase.from("crm_automations").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["crm-automations"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Automações" description="Crie regras inteligentes para o CRM trabalhar por você." actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova automação</Button>} />

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="runs">Execuções</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 space-y-3">
          {rules.length === 0 ? (
            <Card className="shadow-soft border-dashed">
              <CardContent className="py-12">
                <EmptyState icon={Zap} title="Nenhuma automação criada" description="Crie regras que executam ações automaticamente em leads e negócios." action={<Button onClick={openNew}>Criar primeira automação</Button>} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {rules.map((r: any) => (
                <Card key={r.id} className="shadow-soft">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-md bg-gradient-soft flex items-center justify-center text-primary">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{r.name}</p>
                        <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Ativa" : "Inativa"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {TRIGGERS.find((t) => t.value === r.trigger_type)?.label} • {(r.actions ?? []).length} ação(ões) • Executada {r.run_count} vez(es)
                      </p>
                    </div>
                    <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Power className="h-3 w-3" /> Engine ativa: as regras são executadas automaticamente quando o gatilho ocorre.</p>
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <RunsList companyId={companyId} />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Editar automação" : "Nova automação"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Gatilho</Label>
              <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ação principal</Label>
              <Select value={form.actions?.[0]?.type ?? "create_task"} onValueChange={(v) => setForm({ ...form, actions: [{ type: v }] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="w-full">{editing ? "Salvar" : "Criar automação"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
