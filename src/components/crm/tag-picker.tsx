import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Tag { id: string; name: string; color: string }

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
}

export function TagPicker({ selected, onChange, compact }: Props) {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: tags = [] } = useQuery({
    queryKey: ["crm-tags", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_tags").select("id,name,color").eq("company_id", companyId!).eq("archived", false).order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const createTag = async () => {
    if (!newName.trim() || !companyId) return;
    const { data, error } = await supabase.from("crm_tags").insert({ company_id: companyId, name: newName.trim(), color: randomColor() }).select().single();
    if (error) { toast.error(error.message); return; }
    setNewName("");
    qc.invalidateQueries({ queryKey: ["crm-tags", companyId] });
    onChange([...selected, data.id]);
  };

  const selectedTags = tags.filter((t) => selected.includes(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selectedTags.map((t) => (
        <Badge key={t.id} variant="secondary" style={{ backgroundColor: t.color + "22", color: t.color, borderColor: t.color + "44" }} className="border gap-1">
          {t.name}
          {!compact && (
            <button onClick={() => toggle(t.id)} aria-label="Remover tag" className="hover:opacity-70"><X className="h-3 w-3" /></button>
          )}
        </Badge>
      ))}
      {!compact && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 gap-1 text-xs"><Plus className="h-3 w-3" /> Tag</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 space-y-2" align="start">
            <div className="max-h-48 overflow-y-auto space-y-1">
              {tags.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhuma tag ainda.</p>}
              {tags.map((t) => (
                <button key={t.id} onClick={() => toggle(t.id)} className="w-full flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-muted text-left">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                  <span className="flex-1">{t.name}</span>
                  {selected.includes(t.id) && <span className="text-xs text-primary">✓</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-1 border-t pt-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova tag" className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && createTag()} />
              <Button size="sm" onClick={createTag} disabled={!newName.trim()}>Add</Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function randomColor() {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#3b82f6"];
  return colors[Math.floor(Math.random() * colors.length)];
}
