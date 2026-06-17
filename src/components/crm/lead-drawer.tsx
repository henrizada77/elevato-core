import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCompanyId } from "@/lib/crm/context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TagPicker } from "@/components/crm/tag-picker";
import { TimelineList } from "@/components/crm/timeline-list";
import { NotesList } from "@/components/crm/notes-list";
import { CustomFieldsForm } from "@/components/crm/custom-fields-form";
import { LEAD_STATUSES } from "@/lib/crm/context";
import { toast } from "sonner";
import { ArrowRightLeft, Trash2, Copy, Archive } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | "new" | null;
}

export function LeadDrawer({ open, onOpenChange, leadId }: Props) {
  const companyId = useCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isNew = leadId === "new";
  const [tab, setTab] = useState("data");

  const { data: lead } = useQuery({
    queryKey: ["crm-lead", leadId],
    enabled: open && !!leadId && !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_leads").select("*").eq("id", leadId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["crm-sources", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_lead_sources").select("id,name").eq("company_id", companyId!).eq("archived", false);
      return data ?? [];
    },
  });

  const { data: tagIds = [] } = useQuery({
    queryKey: ["crm-lead-tags", leadId],
    enabled: !!leadId && !isNew,
    queryFn: async () => {
      const { data } = await supabase.from("crm_lead_tags").select("tag_id").eq("lead_id", leadId!);
      return (data ?? []).map((r) => r.tag_id);
    },
  });

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [tags, setTags] = useState<string[]>([]);
  const current: Record<string, any> = isNew ? form : { ...(lead ?? {}), ...form };

  // sync once
  useState(() => { setTags(tagIds); });

  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!companyId) return;
    const payload: Record<string, unknown> = {
      company_id: companyId,
      name: current.name,
      company_text: current.company_text,
      email: current.email,
      phone: current.phone,
      whatsapp: current.whatsapp,
      document: current.document,
      job_title: current.job_title,
      city: current.city,
      state: current.state,
      source_id: current.source_id || null,
      owner_id: current.owner_id || user?.id,
      estimated_value: Number(current.estimated_value ?? 0),
      status: current.status ?? "new",
      notes: current.notes,
    };
    if (!payload.name) { toast.error("Nome obrigatório"); return; }
    let id = leadId;
    if (isNew) {
      payload.created_by = user?.id;
      const { data, error } = await supabase.from("crm_leads").insert(payload as never).select().single();
      if (error) { toast.error(error.message); return; }
      id = data.id;
    } else {
      const { error } = await supabase.from("crm_leads").update(payload as never).eq("id", leadId!);
      if (error) { toast.error(error.message); return; }
    }
    // sync tags
    if (id && id !== "new") {
      await supabase.from("crm_lead_tags").delete().eq("lead_id", id);
      if (tags.length) {
        await supabase.from("crm_lead_tags").insert(tags.map((t) => ({ lead_id: id!, tag_id: t, company_id: companyId })));
      }
    }
    toast.success(isNew ? "Lead criado" : "Lead atualizado");
    qc.invalidateQueries({ queryKey: ["crm-leads"] });
    onOpenChange(false);
    setForm({});
  };

  const convert = async () => {
    if (!leadId || isNew) return;
    const { error } = await supabase.rpc("crm_convert_lead_to_customer", { _lead_id: leadId });
    if (error) { toast.error(error.message); return; }
    toast.success("Lead convertido em cliente");
    qc.invalidateQueries({ queryKey: ["crm-leads"] });
    qc.invalidateQueries({ queryKey: ["crm-customers"] });
    onOpenChange(false);
  };

  const remove = async () => {
    if (!leadId || isNew) return;
    if (!confirm("Excluir este lead?")) return;
    const { error } = await supabase.from("crm_leads").delete().eq("id", leadId);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead excluído");
    qc.invalidateQueries({ queryKey: ["crm-leads"] });
    onOpenChange(false);
  };

  const archive = async () => {
    if (!leadId || isNew) return;
    await supabase.from("crm_leads").update({ archived: true, status: "archived" }).eq("id", leadId);
    qc.invalidateQueries({ queryKey: ["crm-leads"] });
    onOpenChange(false);
  };

  const duplicate = async () => {
    if (!lead || !companyId) return;
    const { id, created_at, updated_at, converted_customer_id, ...rest } = lead;
    void id; void created_at; void updated_at; void converted_customer_id;
    const { error } = await supabase.from("crm_leads").insert({ ...rest, name: rest.name + " (cópia)" });
    if (error) { toast.error(error.message); return; }
    toast.success("Lead duplicado");
    qc.invalidateQueries({ queryKey: ["crm-leads"] });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{isNew ? "Novo Lead" : current.name || "Lead"}</span>
            {!isNew && current.status && <Badge variant="outline">{current.status}</Badge>}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="data">Dados</TabsTrigger>
            <TabsTrigger value="timeline" disabled={isNew}>Timeline</TabsTrigger>
            <TabsTrigger value="notes" disabled={isNew}>Notas</TabsTrigger>
            <TabsTrigger value="fields" disabled={isNew}>Campos</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome *"><Input value={current.name ?? ""} onChange={(e) => setField("name", e.target.value)} /></Field>
              <Field label="Empresa"><Input value={current.company_text ?? ""} onChange={(e) => setField("company_text", e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={current.email ?? ""} onChange={(e) => setField("email", e.target.value)} /></Field>
              <Field label="Telefone"><Input value={current.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} /></Field>
              <Field label="WhatsApp"><Input value={current.whatsapp ?? ""} onChange={(e) => setField("whatsapp", e.target.value)} /></Field>
              <Field label="CPF/CNPJ"><Input value={current.document ?? ""} onChange={(e) => setField("document", e.target.value)} /></Field>
              <Field label="Cargo"><Input value={current.job_title ?? ""} onChange={(e) => setField("job_title", e.target.value)} /></Field>
              <Field label="Valor estimado"><Input type="number" value={current.estimated_value ?? ""} onChange={(e) => setField("estimated_value", e.target.value)} /></Field>
              <Field label="Cidade"><Input value={current.city ?? ""} onChange={(e) => setField("city", e.target.value)} /></Field>
              <Field label="Estado"><Input value={current.state ?? ""} onChange={(e) => setField("state", e.target.value)} /></Field>
              <Field label="Origem">
                <Select value={current.source_id ?? ""} onValueChange={(v) => setField("source_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={current.status ?? "new"} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Observações"><Textarea value={current.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} /></Field>
            <Field label="Tags"><TagPicker selected={tags} onChange={setTags} /></Field>

            <div className="flex flex-wrap gap-2 pt-3 border-t">
              <Button onClick={save}>{isNew ? "Criar Lead" : "Salvar"}</Button>
              {!isNew && (
                <>
                  <Button variant="outline" onClick={convert}><ArrowRightLeft className="h-4 w-4 mr-1" /> Converter em Cliente</Button>
                  <Button variant="outline" onClick={duplicate}><Copy className="h-4 w-4 mr-1" /> Duplicar</Button>
                  <Button variant="outline" onClick={archive}><Archive className="h-4 w-4 mr-1" /> Arquivar</Button>
                  <Button variant="destructive" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            {leadId && !isNew && <TimelineList entityKind="lead" entityId={leadId} />}
          </TabsContent>
          <TabsContent value="notes" className="mt-4">
            {leadId && !isNew && <NotesList entityKind="lead" entityId={leadId} />}
          </TabsContent>
          <TabsContent value="fields" className="mt-4">
            {leadId && !isNew && <CustomFieldsForm entityKind="lead" entityId={leadId} />}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
