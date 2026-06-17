import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCompanyId } from "@/lib/crm/context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimelineList } from "@/components/crm/timeline-list";
import { NotesList } from "@/components/crm/notes-list";
import { TagPicker } from "@/components/crm/tag-picker";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string | null;
  pipelineId?: string;
  initialStageId?: string | null;
}

export function DealDrawer({ open, onOpenChange, dealId, pipelineId, initialStageId }: Props) {
  const companyId = useCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isNew = !dealId;
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [tags, setTags] = useState<string[]>([]);

  const { data: deal } = useQuery({
    queryKey: ["crm-deal", dealId],
    enabled: open && !!dealId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_deals").select("*").eq("id", dealId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["crm-pipelines", companyId],
    enabled: !!companyId && open,
    queryFn: async () => {
      const { data } = await supabase.from("crm_pipelines").select("id,name").eq("company_id", companyId!).eq("archived", false);
      return data ?? [];
    },
  });

  const currentPipeline = (form.pipeline_id as string) || deal?.pipeline_id || pipelineId;

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages-deal", currentPipeline],
    enabled: !!currentPipeline,
    queryFn: async () => {
      const { data } = await supabase.from("crm_stages").select("id,name").eq("pipeline_id", currentPipeline!).order("position");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (isNew && open) {
      setForm({ pipeline_id: pipelineId, stage_id: initialStageId });
    } else {
      setForm({});
    }
  }, [open, isNew, pipelineId, initialStageId]);

  const current = isNew ? form : { ...deal, ...form };

  const save = async () => {
    if (!companyId) return;
    if (!current.title) { toast.error("Título obrigatório"); return; }
    if (!current.pipeline_id || !current.stage_id) { toast.error("Funil e etapa obrigatórios"); return; }

    const payload: Record<string, unknown> = {
      company_id: companyId,
      title: current.title,
      value: Number(current.value ?? 0),
      probability: Number(current.probability ?? 0),
      expected_close_date: current.expected_close_date || null,
      pipeline_id: current.pipeline_id,
      stage_id: current.stage_id,
      owner_id: current.owner_id || user?.id,
    };

    let id = dealId;
    if (isNew) {
      const { data: num } = await supabase.rpc("crm_next_deal_number", { _company_id: companyId });
      payload.number = num ?? "CRM-000001";
      payload.created_by = user?.id;
      const { data, error } = await supabase.from("crm_deals").insert(payload as never).select().single();
      if (error) { toast.error(error.message); return; }
      id = data.id;
    } else {
      const { error } = await supabase.from("crm_deals").update(payload as never).eq("id", dealId!);
      if (error) { toast.error(error.message); return; }
    }
    if (id) {
      await supabase.from("crm_deal_tags").delete().eq("deal_id", id);
      if (tags.length) await supabase.from("crm_deal_tags").insert(tags.map((t) => ({ deal_id: id!, tag_id: t, company_id: companyId })));
    }
    toast.success(isNew ? "Negócio criado" : "Negócio atualizado");
    qc.invalidateQueries({ queryKey: ["crm-deals-board"] });
    qc.invalidateQueries({ queryKey: ["crm-deals"] });
    onOpenChange(false);
  };

  const remove = async () => {
    if (!dealId || !confirm("Excluir este negócio?")) return;
    await supabase.from("crm_deals").delete().eq("id", dealId);
    toast.success("Negócio excluído");
    qc.invalidateQueries({ queryKey: ["crm-deals-board"] });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? "Novo Negócio" : current.title || "Negócio"}{!isNew && current.number && <span className="text-xs text-muted-foreground ml-2">{current.number}</span>}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="data" className="mt-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="data">Dados</TabsTrigger>
            <TabsTrigger value="timeline" disabled={isNew}>Timeline</TabsTrigger>
            <TabsTrigger value="notes" disabled={isNew}>Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-3 mt-4">
            <Field label="Título *"><Input value={current.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor"><Input type="number" value={current.value ?? ""} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} /></Field>
              <Field label="Probabilidade %"><Input type="number" value={current.probability ?? ""} onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))} /></Field>
              <Field label="Previsão"><Input type="date" value={current.expected_close_date ?? ""} onChange={(e) => setForm((f) => ({ ...f, expected_close_date: e.target.value }))} /></Field>
              <Field label="Funil">
                <Select value={current.pipeline_id ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, pipeline_id: v, stage_id: undefined }))}>
                  <SelectTrigger><SelectValue placeholder="Funil" /></SelectTrigger>
                  <SelectContent>{pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Etapa">
                <Select value={current.stage_id ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, stage_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Etapa" /></SelectTrigger>
                  <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Tags"><TagPicker selected={tags} onChange={setTags} /></Field>
            <div className="flex gap-2 pt-3 border-t">
              <Button onClick={save}>{isNew ? "Criar" : "Salvar"}</Button>
              {!isNew && <Button variant="destructive" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">{dealId && <TimelineList entityKind="deal" entityId={dealId} />}</TabsContent>
          <TabsContent value="notes" className="mt-4">{dealId && <NotesList entityKind="deal" entityId={dealId} />}</TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
