import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import type { EntityKind } from "@/lib/crm/context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props { entityKind: EntityKind; entityId: string }

export function CustomFieldsForm({ entityKind, entityId }: Props) {
  const companyId = useCompanyId();
  const [values, setValues] = useState<Record<string, unknown>>({});

  const { data: fields = [] } = useQuery({
    queryKey: ["crm-custom-fields", companyId, entityKind],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_custom_fields")
        .select("*")
        .eq("company_id", companyId!)
        .eq("archived", false)
        .contains("applies_to", [entityKind])
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const { data: stored = [] } = useQuery({
    queryKey: ["crm-cfv", entityKind, entityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_custom_field_values").select("*").eq("entity_kind", entityKind).eq("entity_id", entityId);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const map: Record<string, unknown> = {};
    stored.forEach((s) => { map[s.field_id] = s.value; });
    setValues(map);
  }, [stored]);

  const save = async (fieldId: string, value: unknown) => {
    if (!companyId) return;
    setValues((v) => ({ ...v, [fieldId]: value }));
    const { error } = await supabase.from("crm_custom_field_values").upsert({
      company_id: companyId,
      field_id: fieldId,
      entity_kind: entityKind,
      entity_id: entityId,
      value: value as never,
    }, { onConflict: "field_id,entity_kind,entity_id" });
    if (error) toast.error(error.message);
  };

  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum campo personalizado configurado para {entityKind}. Configure em <span className="font-medium">Configurações do CRM</span>.</p>;
  }

  return (
    <div className="space-y-3">
      {fields.map((f) => {
        const val = values[f.id];
        const opts = (f.options as string[] | null) ?? [];
        return (
          <div key={f.id} className="space-y-1">
            <Label className="text-xs">{f.label}{f.required && " *"}</Label>
            {f.field_type === "text" || f.field_type === "email" || f.field_type === "phone" || f.field_type === "url" ? (
              <Input value={(val as string) ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} onBlur={(e) => save(f.id, e.target.value)} />
            ) : f.field_type === "number" || f.field_type === "currency" ? (
              <Input type="number" value={(val as number) ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: Number(e.target.value) }))} onBlur={(e) => save(f.id, Number(e.target.value))} />
            ) : f.field_type === "date" ? (
              <Input type="date" value={(val as string) ?? ""} onChange={(e) => save(f.id, e.target.value)} />
            ) : f.field_type === "time" ? (
              <Input type="time" value={(val as string) ?? ""} onChange={(e) => save(f.id, e.target.value)} />
            ) : f.field_type === "checkbox" ? (
              <Checkbox checked={Boolean(val)} onCheckedChange={(c) => save(f.id, Boolean(c))} />
            ) : f.field_type === "select" ? (
              <Select value={(val as string) ?? ""} onValueChange={(v) => save(f.id, v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={(val as string) ?? ""} onChange={(e) => save(f.id, e.target.value)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
