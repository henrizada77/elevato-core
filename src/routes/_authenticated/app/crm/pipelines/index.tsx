import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/app/empty-state";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/crm/pipelines/")({ component: PipelinesPage });

function PipelinesPage() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const { data: pipelines = [] } = useQuery({
    queryKey: ["crm-pipelines-list", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_pipelines").select("*").eq("company_id", companyId!).order("position");
      return data ?? [];
    }
  });

  const create = async () => {
    if (!companyId || !name.trim()) return;
    const { data, error } = await supabase.from("crm_pipelines").insert({ company_id: companyId, name: name.trim(), position: pipelines.length }).select().single();
    if (error) return toast.error(error.message);
    // seed default stages
    await supabase.from("crm_stages").insert([
      { company_id: companyId, pipeline_id: data.id, name: "Novo", color: "#94a3b8", position: 0, kind: "initial", probability: 10 },
      { company_id: companyId, pipeline_id: data.id, name: "Em Andamento", color: "#60a5fa", position: 1, kind: "open", probability: 50 },
      { company_id: companyId, pipeline_id: data.id, name: "Ganho", color: "#22c55e", position: 2, kind: "won", probability: 100 },
      { company_id: companyId, pipeline_id: data.id, name: "Perdido", color: "#ef4444", position: 3, kind: "lost", probability: 0 },
    ]);
    qc.invalidateQueries({ queryKey: ["crm-pipelines-list"] });
    setOpen(false); setName("");
    toast.success("Funil criado");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Funis" description="Cada empresa pode criar funis ilimitados." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Funil</Button>} />
      {pipelines.length === 0 ? (
        <Card className="shadow-soft"><EmptyState icon={Plus} title="Nenhum funil" description="Crie seu primeiro funil." action={<Button onClick={() => setOpen(true)}>Criar Funil</Button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pipelines.map((p: any) => (
            <Link key={p.id} to="/app/crm/pipelines/$pipelineId" params={{ pipelineId: p.id }}>
              <Card className="p-5 hover:shadow-lg transition-shadow cursor-pointer shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                      <h3 className="font-semibold">{p.name}</h3>
                      {p.is_default && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                    </div>
                    {p.archived && <p className="text-xs text-muted-foreground mt-1">Arquivado</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Funil</DialogTitle></DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do funil" autoFocus onKeyDown={(e) => e.key === "Enter" && create()} />
          <Button onClick={create}>Criar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
