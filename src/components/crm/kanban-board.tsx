import { useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/crm/context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Deal {
  id: string;
  number: string;
  title: string;
  value: number;
  stage_id: string;
  status: string;
}
interface Stage { id: string; name: string; color: string; position: number; kind: string }

interface Props {
  pipelineId: string;
  onOpenDeal: (id: string) => void;
  onCreateDeal: (stageId: string) => void;
}

export function KanbanBoard({ pipelineId, onOpenDeal, onCreateDeal }: Props) {
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages", pipelineId],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_stages").select("*").eq("pipeline_id", pipelineId).order("position");
      if (error) throw error;
      return data as Stage[];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["crm-deals-board", pipelineId],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_deals").select("id,number,title,value,stage_id,status").eq("pipeline_id", pipelineId).eq("status", "open").order("position");
      if (error) throw error;
      return data as Deal[];
    },
  });

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    stages.forEach((s) => (map[s.id] = []));
    deals.forEach((d) => { (map[d.stage_id] ??= []).push(d); });
    return map;
  }, [stages, deals]);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const dealId = String(e.active.id);
    const newStageId = String(e.over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;
    const targetStage = stages.find((s) => s.id === newStageId);
    // optimistic
    qc.setQueryData<Deal[]>(["crm-deals-board", pipelineId], (old) => (old ?? []).map((d) => d.id === dealId ? { ...d, stage_id: newStageId } : d));
    const updates: Record<string, unknown> = { stage_id: newStageId };
    if (targetStage?.kind === "won") { updates.status = "won"; updates.closed_at = new Date().toISOString(); }
    if (targetStage?.kind === "lost") { updates.status = "lost"; updates.closed_at = new Date().toISOString(); }
    const { error } = await supabase.from("crm_deals").update(updates).eq("id", dealId);
    if (error) { toast.error(error.message); qc.invalidateQueries({ queryKey: ["crm-deals-board", pipelineId] }); return; }
    qc.invalidateQueries({ queryKey: ["crm-deals-board", pipelineId] });
  };

  const activeDeal = deals.find((d) => d.id === activeId);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Column key={stage.id} stage={stage} deals={dealsByStage[stage.id] ?? []} onOpenDeal={onOpenDeal} onCreateDeal={onCreateDeal} />
        ))}
      </div>
      <DragOverlay>
        {activeDeal && <DealCard deal={activeDeal} dragging />}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ stage, deals, onOpenDeal, onCreateDeal }: { stage: Stage; deals: Deal[]; onOpenDeal: (id: string) => void; onCreateDeal: (stageId: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((s, d) => s + Number(d.value || 0), 0);
  return (
    <div className="w-72 shrink-0 flex flex-col">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
          <h3 className="font-medium text-sm">{stage.name}</h3>
          <Badge variant="secondary" className="h-5 text-xs">{deals.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onCreateDeal(stage.id)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="px-1 text-xs text-muted-foreground mb-2">{formatCurrency(total)}</p>
      <div ref={setNodeRef} className={`flex-1 min-h-[200px] rounded-lg p-2 space-y-2 transition-colors ${isOver ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/30"}`}>
        {deals.map((d) => <DraggableDeal key={d.id} deal={d} onOpen={() => onOpenDeal(d.id)} />)}
      </div>
    </div>
  );
}

function DraggableDeal({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div ref={setNodeRef} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <DealCard deal={deal} onOpen={onOpen} listeners={listeners} />
    </div>
  );
}

function DealCard({ deal, onOpen, listeners, dragging }: { deal: Deal; onOpen?: () => void; listeners?: Record<string, unknown>; dragging?: boolean }) {
  return (
    <Card className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${dragging ? "shadow-lg ring-2 ring-primary" : ""}`} onClick={onOpen}>
      <div className="flex items-start gap-2">
        <button {...listeners} className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{deal.number}</p>
          <p className="text-sm font-medium truncate">{deal.title}</p>
          <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(deal.value)}</p>
        </div>
      </div>
    </Card>
  );
}
