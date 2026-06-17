import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/crm/tags")({ component: TagsPage });

function TagsPage() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ color: "#6366f1" });

  const { data: tags = [] } = useQuery({
    queryKey: ["crm-tags-page", companyId], enabled: !!companyId,
    queryFn: async () => { const { data } = await supabase.from("crm_tags").select("*").eq("company_id", companyId!).order("name"); return data ?? []; }
  });

  const save = async () => {
    if (!companyId || !form.name) return toast.error("Nome obrigatório");
    const payload = { name: form.name, color: form.color, suggested: !!form.suggested, archived: !!form.archived, company_id: companyId };
    const op = editing ? supabase.from("crm_tags").update(payload).eq("id", editing.id) : supabase.from("crm_tags").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["crm-tags-page"] }); qc.invalidateQueries({ queryKey: ["crm-tags"] });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tags" description="Organize seus leads, clientes e negócios com tags coloridas." actions={<Button onClick={() => { setEditing(null); setForm({ color: "#6366f1" }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nova Tag</Button>} />
      <Card className="shadow-soft p-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((t: any) => (
            <button key={t.id} onClick={() => { setEditing(t); setForm(t); setOpen(true); }} className="group">
              <Badge variant="secondary" style={{ backgroundColor: t.color + "22", color: t.color, borderColor: t.color + "44" }} className="border gap-2">
                {t.name}
                {t.suggested && <span className="text-[10px] opacity-70">★</span>}
                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
              </Badge>
            </button>
          ))}
          {tags.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tag ainda.</p>}
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Tag</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Cor</Label><Input type="color" value={form.color ?? "#6366f1"} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-20 p-1" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.suggested} onChange={(e) => setForm({ ...form, suggested: e.target.checked })} /> Tag sugerida</label>
            {editing && <div className="flex gap-2"><Button variant="destructive" onClick={async () => { if (!confirm("Excluir tag?")) return; await supabase.from("crm_tags").delete().eq("id", editing.id); qc.invalidateQueries({ queryKey: ["crm-tags-page"] }); qc.invalidateQueries({ queryKey: ["crm-tags"] }); setOpen(false); }}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button></div>}
            <Button onClick={save} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
