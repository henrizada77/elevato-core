import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/inbox/queues")({ component: QueuesPage });

function QueuesPage() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#3b82f6", description: "" });

  const { data: queues = [] } = useQuery({
    queryKey: ["inbox-queues", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("inbox_queues").select("*").eq("company_id", companyId!).order("position");
      return data ?? [];
    },
  });

  const save = async () => {
    if (!form.name.trim() || !companyId) return;
    const { error } = await supabase.from("inbox_queues").insert({ ...form, company_id: companyId, position: queues.length });
    if (error) { toast.error(error.message); return; }
    toast.success("Fila criada");
    setOpen(false); setForm({ name: "", color: "#3b82f6", description: "" });
    qc.invalidateQueries({ queryKey: ["inbox-queues"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir fila?")) return;
    await supabase.from("inbox_queues").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["inbox-queues"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Filas de atendimento" description="Organize as conversas por departamento." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova fila</Button>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {queues.map((q: any) => (
          <Card key={q.id} className="p-4 flex items-center gap-3 shadow-soft">
            <span className="h-3 w-3 rounded-full" style={{ background: q.color }} />
            <div className="flex-1">
              <p className="font-medium">{q.name}</p>
              {q.description && <p className="text-xs text-muted-foreground">{q.description}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova fila</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Cor</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-20" /></div>
            <div className="space-y-1"><Label className="text-xs">Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button onClick={save} className="w-full">Criar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
