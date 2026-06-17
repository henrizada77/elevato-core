import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, CheckCircle2, XCircle, UserCog, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/crm/context";
import type { EntityKind } from "@/lib/crm/context";

const ICONS: Record<string, typeof Activity> = {
  created: Plus,
  stage_changed: ArrowRight,
  status_changed: RefreshCw,
  owner_changed: UserCog,
  deal_won: CheckCircle2,
  deal_lost: XCircle,
  converted: CheckCircle2,
  note_added: Activity,
};

export function TimelineList({ entityKind, entityId }: { entityKind: EntityKind; entityId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["crm-timeline", entityKind, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_timeline_events")
        .select("*")
        .eq("entity_kind", entityKind)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Carregando…</p>;
  if (events.length === 0) return <p className="text-sm text-muted-foreground p-4">Sem eventos registrados.</p>;

  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const Icon = ICONS[e.event_type] ?? Activity;
        return (
          <li key={e.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 pb-3 border-b border-border/40">
              <p className="text-sm font-medium">{e.title}</p>
              {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">{formatDateTime(e.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
