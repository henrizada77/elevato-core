import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { DealDrawer } from "@/components/crm/deal-drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyId } from "@/lib/crm/context";

export const Route = createFileRoute("/_authenticated/app/crm/pipelines/$pipelineId")({
  component: PipelineBoardPage,
});

function PipelineBoardPage() {
  const { pipelineId } = Route.useParams();
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const [dealId, setDealId] = useState<string | null>(null);
  const [newDealStage, setNewDealStage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: pipeline } = useQuery({
    queryKey: ["crm-pipeline", pipelineId],
    queryFn: async () => { const { data } = await supabase.from("crm_pipelines").select("*").eq("id", pipelineId).single(); return data; }
  });
  const { data: pipelines = [] } = useQuery({
    queryKey: ["crm-pipelines-switch", companyId], enabled: !!companyId,
    queryFn: async () => { const { data } = await supabase.from("crm_pipelines").select("id,name").eq("company_id", companyId!).eq("archived", false); return data ?? []; }
  });

  const openDeal = (id: string) => { setDealId(id); setNewDealStage(null); setDrawerOpen(true); };
  const createDeal = (stageId: string) => { setDealId(null); setNewDealStage(stageId); setDrawerOpen(true); };

  return (
    <div className="space-y-4">
      <PageHeader
        title={pipeline?.name || "Funil"}
        description="Arraste cards para mover entre etapas. Mover para Ganho ou Perdido encerra o negócio."
        actions={
          <>
            <Link to="/app/crm/pipelines"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Funis</Button></Link>
            <Select value={pipelineId} onValueChange={(v) => navigate({ to: "/app/crm/pipelines/$pipelineId", params: { pipelineId: v } })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => createDeal("")}><Plus className="h-4 w-4 mr-1" /> Negócio</Button>
            <Link to="/app/crm/settings"><Button variant="outline" size="icon"><SettingsIcon className="h-4 w-4" /></Button></Link>
          </>
        }
      />
      <KanbanBoard pipelineId={pipelineId} onOpenDeal={openDeal} onCreateDeal={createDeal} />
      <DealDrawer open={drawerOpen} onOpenChange={setDrawerOpen} dealId={dealId} pipelineId={pipelineId} initialStageId={newDealStage} />
    </div>
  );
}
