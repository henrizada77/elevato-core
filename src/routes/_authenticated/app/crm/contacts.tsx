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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app/empty-state";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/crm/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: items = [] } = useQuery({
    queryKey: ["crm-contacts", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_contacts")
        .select("id,name,role,email,phone,whatsapp,crm_company_id,crm_companies(name)")
        .eq("company_id", companyId!)
        .order("name");
      return data ?? [];
    },
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["crm-co-opts", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_companies").select("id,name").eq("company_id", companyId!);
      return data ?? [];
    },
  });

  const save = async () => {
    if (!companyId || !form.name) return toast.error("Nome obrigatório");
    const payload = { ...form, company_id: companyId };
    delete payload.created_at; delete payload.updated_at; delete payload.crm_companies;
    const op = editing ? supabase.from("crm_contacts").update(payload).eq("id", editing.id) : supabase.from("crm_contacts").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Contato salvo"); qc.invalidateQueries({ queryKey: ["crm-contacts"] }); setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Contatos" description={`${items.length} contatos`} actions={<Button onClick={() => { setEditing(null); setForm({}); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo Contato</Button>} />
      <Card className="shadow-soft">
        {items.length === 0 ? <EmptyState icon={Plus} title="Nenhum contato" description="Cadastre contatos vinculados às empresas." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>Empresa</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {items.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.role || "—"}</TableCell>
                  <TableCell>{c.crm_companies?.name || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{c.phone || c.whatsapp || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setForm(c); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("Excluir?")) return;
                        await supabase.from("crm_contacts").delete().eq("id", c.id);
                        qc.invalidateQueries({ queryKey: ["crm-contacts"] });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Contato</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Cargo</Label><Input value={form.role ?? ""} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label className="text-xs">Empresa</Label>
              <Select value={form.crm_company_id ?? ""} onValueChange={(v) => setForm({ ...form, crm_company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
          </div>
          <Button onClick={save}>Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
