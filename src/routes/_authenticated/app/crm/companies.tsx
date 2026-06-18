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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/app/empty-state";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/crm/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: items = [] } = useQuery({
    queryKey: ["crm-co", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_companies")
        .select("id,name,segment,website,cnpj,address,city,state,phone,email")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const save = async () => {
    if (!companyId || !form.name) return toast.error("Nome obrigatório");
    const payload = { ...form, company_id: companyId };
    delete payload.created_at; delete payload.updated_at;
    const op = editing ? supabase.from("crm_companies").update(payload).eq("id", editing.id) : supabase.from("crm_companies").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Empresa salva");
    qc.invalidateQueries({ queryKey: ["crm-co"] });
    setOpen(false);
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from("crm_companies").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["crm-co"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Empresas" description={`${items.length} empresas`} actions={<Button onClick={() => { setEditing(null); setForm({}); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nova Empresa</Button>} />
      <Card className="shadow-soft">
        {items.length === 0 ? <EmptyState icon={Plus} title="Nenhuma empresa" description="Cadastre empresas para vincular contatos e clientes." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Segmento</TableHead><TableHead>CNPJ</TableHead><TableHead>Cidade</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.segment || "—"}</TableCell>
                  <TableCell>{c.cnpj || "—"}</TableCell>
                  <TableCell>{c.city || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setForm(c); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Empresa</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[["Nome *","name"],["Segmento","segment"],["Site","website"],["CNPJ","cnpj"],["Endereço","address"],["Cidade","city"],["Estado","state"],["Telefone","phone"],["Email","email"]].map(([l,k]) => (
              <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
          </div>
          <Button onClick={save}>Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
