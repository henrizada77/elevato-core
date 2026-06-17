import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ENTITY_KINDS } from "@/lib/crm/context";

export const Route = createFileRoute("/_authenticated/app/crm/settings")({ component: CrmSettingsPage });

function CrmSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações do CRM" description="Personalize todo o processo comercial sem código." />
      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="pipelines">Funis & Etapas</TabsTrigger>
          <TabsTrigger value="sources">Origens</TabsTrigger>
          <TabsTrigger value="reasons">Motivos</TabsTrigger>
          <TabsTrigger value="fields">Campos Personalizados</TabsTrigger>
          <TabsTrigger value="numbering">Numeração</TabsTrigger>
          <TabsTrigger value="conversion">Conversão</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4"><GeneralSettings /></TabsContent>
        <TabsContent value="pipelines" className="mt-4"><PipelinesSettings /></TabsContent>
        <TabsContent value="sources" className="mt-4"><SimpleListSettings table="crm_lead_sources" title="Origens dos Leads" placeholder="Ex.: Google Ads" /></TabsContent>
        <TabsContent value="reasons" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <SimpleListSettings table="crm_win_reasons" title="Motivos de Ganho" placeholder="Ex.: Melhor preço" />
            <SimpleListSettings table="crm_loss_reasons" title="Motivos de Perda" placeholder="Ex.: Sem orçamento" />
          </div>
        </TabsContent>
        <TabsContent value="fields" className="mt-4"><CustomFieldsSettings /></TabsContent>
        <TabsContent value="numbering" className="mt-4"><NumberingSettings /></TabsContent>
        <TabsContent value="conversion" className="mt-4"><ConversionSettings /></TabsContent>
      </Tabs>
    </div>
  );
}

function useSettings() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["crm-settings", companyId], enabled: !!companyId,
    queryFn: async () => { const { data } = await supabase.from("crm_settings").select("*").eq("company_id", companyId!).single(); return data; }
  });
}

function GeneralSettings() {
  const companyId = useCompanyId();
  const { data: s } = useSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});
  const cur: any = { ...(s ?? {}), ...form };
  const save = async () => {
    if (!companyId) return;
    const { error } = await supabase.from("crm_settings").update({ currency: cur.currency, date_format: cur.date_format, timezone: cur.timezone, module_label: cur.module_label, default_deal_value: Number(cur.default_deal_value || 0) }).eq("company_id", companyId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["crm-settings"] }); toast.success("Salvo");
  };
  return (
    <Card className="p-6 space-y-4 shadow-soft max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <Fld label="Nome do módulo"><Input value={cur.module_label ?? ""} onChange={(e) => setForm({ ...form, module_label: e.target.value })} /></Fld>
        <Fld label="Moeda">
          <Select value={cur.currency ?? "BRL"} onValueChange={(v) => setForm({ ...form, currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["BRL","USD","EUR","ARS","CLP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Fld>
        <Fld label="Formato de data"><Input value={cur.date_format ?? ""} onChange={(e) => setForm({ ...form, date_format: e.target.value })} /></Fld>
        <Fld label="Fuso horário"><Input value={cur.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></Fld>
        <Fld label="Valor padrão de negócio"><Input type="number" value={cur.default_deal_value ?? 0} onChange={(e) => setForm({ ...form, default_deal_value: e.target.value })} /></Fld>
      </div>
      <Button onClick={save}>Salvar</Button>
    </Card>
  );
}

function NumberingSettings() {
  const companyId = useCompanyId();
  const { data: s } = useSettings();
  const qc = useQueryClient();
  const [prefix, setPrefix] = useState<string | null>(null);
  const current = prefix ?? s?.deal_prefix ?? "CRM";
  const save = async () => {
    if (!companyId) return;
    const { error } = await supabase.from("crm_settings").update({ deal_prefix: current }).eq("company_id", companyId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["crm-settings"] }); toast.success("Salvo");
  };
  return (
    <Card className="p-6 space-y-3 shadow-soft max-w-md">
      <Fld label="Prefixo dos negócios"><Input value={current} onChange={(e) => setPrefix(e.target.value)} /></Fld>
      <p className="text-xs text-muted-foreground">Próximo número será {current}-{String((s?.deal_counter ?? 0) + 1).padStart(6, "0")}</p>
      <Button onClick={save}>Salvar</Button>
    </Card>
  );
}

function ConversionSettings() {
  const companyId = useCompanyId();
  const { data: s } = useSettings();
  const qc = useQueryClient();
  const rules: any = s?.conversion_rules ?? {};
  const update = async (key: string, val: boolean) => {
    if (!companyId) return;
    const newRules = { ...rules, [key]: val };
    await supabase.from("crm_settings").update({ conversion_rules: newRules }).eq("company_id", companyId);
    qc.invalidateQueries({ queryKey: ["crm-settings"] });
  };
  const items = [["keep_tags", "Manter tags"], ["keep_notes", "Manter observações"], ["keep_attachments", "Manter anexos"], ["keep_deals", "Manter negócios vinculados"]];
  return (
    <Card className="p-6 space-y-3 shadow-soft max-w-md">
      <p className="text-sm text-muted-foreground">O que preservar ao converter um Lead em Cliente:</p>
      {items.map(([k, l]) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <Checkbox checked={rules[k] !== false} onCheckedChange={(c) => update(k, Boolean(c))} /> {l}
        </label>
      ))}
    </Card>
  );
}

function PipelinesSettings() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const { data: pipelines = [] } = useQuery({
    queryKey: ["crm-pipelines-settings", companyId], enabled: !!companyId,
    queryFn: async () => { const { data } = await supabase.from("crm_pipelines").select("*").eq("company_id", companyId!).order("position"); return data ?? []; }
  });
  const [selected, setSelected] = useState<string | null>(null);
  const activePipeline = selected ?? pipelines[0]?.id ?? null;
  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages-settings", activePipeline], enabled: !!activePipeline,
    queryFn: async () => { const { data } = await supabase.from("crm_stages").select("*").eq("pipeline_id", activePipeline!).order("position"); return data ?? []; }
  });

  const setDefault = async (id: string) => {
    if (!companyId) return;
    await supabase.from("crm_pipelines").update({ is_default: false }).eq("company_id", companyId);
    await supabase.from("crm_pipelines").update({ is_default: true }).eq("id", id);
    await supabase.from("crm_settings").update({ default_pipeline_id: id }).eq("company_id", companyId);
    qc.invalidateQueries({ queryKey: ["crm-pipelines-settings"] });
  };
  const archive = async (id: string) => { await supabase.from("crm_pipelines").update({ archived: true }).eq("id", id); qc.invalidateQueries({ queryKey: ["crm-pipelines-settings"] }); };

  const addStage = async () => {
    if (!activePipeline || !companyId) return;
    await supabase.from("crm_stages").insert({ company_id: companyId, pipeline_id: activePipeline, name: "Nova etapa", position: stages.length, kind: "open" });
    qc.invalidateQueries({ queryKey: ["crm-stages-settings"] });
  };
  const updateStage = async (id: string, patch: any) => { await supabase.from("crm_stages").update(patch).eq("id", id); qc.invalidateQueries({ queryKey: ["crm-stages-settings"] }); };
  const removeStage = async (id: string) => { if (!confirm("Excluir etapa?")) return; await supabase.from("crm_stages").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["crm-stages-settings"] }); };

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4">
      <Card className="p-3 space-y-1 shadow-soft">
        {pipelines.map((p: any) => (
          <button key={p.id} onClick={() => setSelected(p.id)} className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${activePipeline === p.id ? "bg-muted" : "hover:bg-muted/50"}`}>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.name}{p.is_default && <span className="text-amber-500 text-xs">★</span>}</span>
          </button>
        ))}
      </Card>
      <Card className="p-4 shadow-soft space-y-3">
        {activePipeline ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Etapas</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDefault(activePipeline)}>Definir como padrão</Button>
                <Button size="sm" variant="outline" onClick={() => archive(activePipeline)}>Arquivar</Button>
                <Button size="sm" onClick={addStage}><Plus className="h-4 w-4 mr-1" /> Etapa</Button>
              </div>
            </div>
            <div className="space-y-2">
              {stages.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 rounded border p-2">
                  <Input type="color" value={s.color} onChange={(e) => updateStage(s.id, { color: e.target.value })} className="h-8 w-12 p-1" />
                  <Input value={s.name} onChange={(e) => updateStage(s.id, { name: e.target.value })} className="flex-1" />
                  <Input type="number" value={s.probability} onChange={(e) => updateStage(s.id, { probability: Number(e.target.value) })} className="w-20" placeholder="%" />
                  <Select value={s.kind} onValueChange={(v) => updateStage(s.id, { kind: v })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Inicial</SelectItem>
                      <SelectItem value="open">Aberta</SelectItem>
                      <SelectItem value="won">Ganho</SelectItem>
                      <SelectItem value="lost">Perda</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => removeStage(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </>
        ) : <p className="text-sm text-muted-foreground">Selecione um funil.</p>}
      </Card>
    </div>
  );
}

function SimpleListSettings({ table, title, placeholder }: { table: "crm_lead_sources" | "crm_win_reasons" | "crm_loss_reasons"; title: string; placeholder: string }) {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data: items = [] } = useQuery({
    queryKey: [`crm-list-${table}`, companyId], enabled: !!companyId,
    queryFn: async () => { const { data } = await supabase.from(table).select("*").eq("company_id", companyId!).order("name"); return data ?? []; }
  });
  const add = async () => {
    if (!companyId || !name.trim()) return;
    const { error } = await supabase.from(table).insert({ company_id: companyId, name: name.trim() });
    if (error) return toast.error(error.message);
    setName(""); qc.invalidateQueries({ queryKey: [`crm-list-${table}`] });
  };
  const remove = async (id: string) => { await supabase.from(table).delete().eq("id", id); qc.invalidateQueries({ queryKey: [`crm-list-${table}`] }); };
  return (
    <Card className="p-4 shadow-soft space-y-3">
      <h3 className="font-medium">{title}</h3>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add}>Adicionar</Button>
      </div>
      <ul className="space-y-1">
        {items.map((i: any) => (
          <li key={i.id} className="flex items-center justify-between border-b py-2 text-sm">
            <span>{i.name}</span>
            <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CustomFieldsSettings() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ field_type: "text", applies_to: ["lead"], options: [] });

  const { data: fields = [] } = useQuery({
    queryKey: ["crm-cf-settings", companyId], enabled: !!companyId,
    queryFn: async () => { const { data } = await supabase.from("crm_custom_fields").select("*").eq("company_id", companyId!).order("position"); return data ?? []; }
  });

  const save = async () => {
    if (!companyId || !form.label || !form.key) return toast.error("Preencha rótulo e chave");
    const payload = { ...form, company_id: companyId, position: fields.length, options: form.field_type === "select" || form.field_type === "multiselect" ? (form.options || []) : [] };
    const { error } = await supabase.from("crm_custom_fields").insert(payload);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["crm-cf-settings"] }); qc.invalidateQueries({ queryKey: ["crm-custom-fields"] });
    setOpen(false); setForm({ field_type: "text", applies_to: ["lead"], options: [] });
  };

  const remove = async (id: string) => { if (!confirm("Excluir campo?")) return; await supabase.from("crm_custom_fields").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["crm-cf-settings"] }); };

  return (
    <Card className="p-4 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Campos Personalizados</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Campo</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Campo Personalizado</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Fld label="Rótulo *"><Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value, key: (e.target.value).toLowerCase().replace(/[^a-z0-9]+/g, "_") })} /></Fld>
              <Fld label="Chave (interna)"><Input value={form.key ?? ""} onChange={(e) => setForm({ ...form, key: e.target.value })} /></Fld>
              <Fld label="Tipo">
                <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["text","number","date","time","select","multiselect","checkbox","url","email","phone","currency"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Fld>
              {(form.field_type === "select" || form.field_type === "multiselect") && (
                <Fld label="Opções (uma por linha)">
                  <textarea className="w-full min-h-[80px] rounded-md border bg-background p-2 text-sm" value={(form.options ?? []).join("\n")} onChange={(e) => setForm({ ...form, options: e.target.value.split("\n").filter(Boolean) })} />
                </Fld>
              )}
              <Fld label="Aplica-se a">
                <div className="flex flex-wrap gap-2">
                  {ENTITY_KINDS.map(k => (
                    <label key={k} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                      <Checkbox checked={(form.applies_to ?? []).includes(k)} onCheckedChange={(c) => setForm({ ...form, applies_to: c ? [...(form.applies_to ?? []), k] : (form.applies_to ?? []).filter((x: string) => x !== k) })} /> {k}
                    </label>
                  ))}
                </div>
              </Fld>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.required} onCheckedChange={(c) => setForm({ ...form, required: Boolean(c) })} /> Obrigatório</label>
              <Button onClick={save} className="w-full">Criar Campo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ul className="space-y-1">
        {fields.map((f: any) => (
          <li key={f.id} className="flex items-center justify-between border-b py-2 text-sm">
            <div>
              <span className="font-medium">{f.label}</span>
              <span className="text-xs text-muted-foreground ml-2">{f.field_type} • {(f.applies_to || []).join(", ")}{f.required && " • obrigatório"}</span>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
        {fields.length === 0 && <p className="text-sm text-muted-foreground">Nenhum campo personalizado.</p>}
      </ul>
    </Card>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
