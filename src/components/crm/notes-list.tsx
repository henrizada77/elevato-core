import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCompanyId, formatDateTime } from "@/lib/crm/context";
import type { EntityKind } from "@/lib/crm/context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function NotesList({ entityKind, entityId }: { entityKind: EntityKind; entityId: string }) {
  const companyId = useCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: notes = [] } = useQuery({
    queryKey: ["crm-notes", entityKind, entityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_notes").select("*").eq("entity_kind", entityKind).eq("entity_id", entityId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = async () => {
    if (!content.trim() || !companyId) return;
    setSaving(true);
    const { error } = await supabase.from("crm_notes").insert({
      company_id: companyId,
      entity_kind: entityKind,
      entity_id: entityId,
      content: content.trim(),
      author_id: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setContent("");
    qc.invalidateQueries({ queryKey: ["crm-notes", entityKind, entityId] });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Adicionar observação interna…" rows={3} />
        <div className="flex justify-end">
          <Button size="sm" onClick={add} disabled={saving || !content.trim()}>{saving ? "Salvando…" : "Adicionar"}</Button>
        </div>
      </div>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-md border bg-muted/30 p-3">
            <p className="text-sm whitespace-pre-wrap">{n.content}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{formatDateTime(n.created_at)}</p>
          </li>
        ))}
        {notes.length === 0 && <p className="text-sm text-muted-foreground">Sem observações.</p>}
      </ul>
    </div>
  );
}
