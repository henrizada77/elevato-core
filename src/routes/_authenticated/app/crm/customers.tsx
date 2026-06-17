import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId, formatDate } from "@/lib/crm/context";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/app/empty-state";
import { ExportButton } from "@/components/crm/export-button";
import { ImportWizard } from "@/components/crm/import-wizard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/crm/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const companyId = useCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: customers = [] } = useQuery({
    queryKey: ["crm-customers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_customers").select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const openNew = () => { setEditing(null); setForm({}); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm(c); setOpen(true); };

  const save = async () => {
    if (!companyId || !form.name) { toast.error("Nome obrigatório"); return; }
    const payload = { ...form, company_id: companyId, created_by: user?.id };
    delete payload.created_at; delete payload.updated_at;
    if (editing) {
      const { error } = await supabase.from("crm_customers").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("crm_customers").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Cliente salvo");
    qc.invalidateQueries({ queryKey: ["crm-customers"] });
    setOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir cliente?")) return;
    await supabase.from("crm_customers").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["crm-customers"] });
  };

  const exportRows = useMemo(() => customers.map((c: any) => ({
    Nome: c.name, Email: c.email ?? "", Telefone: c.phone ?? "", WhatsApp: c.whatsapp ?? "",
    Documento: c.document ?? "", Cidade: c.city ?? "", Estado: c.state ?? "", Criado: c.created_at,
  })), [customers]);

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description={`${customers.length} clientes ativos`} actions={
        <>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" /> Importar</Button>
          <ExportButton rows={exportRows} filename="clientes" title="Clientes" />
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Cliente</Button>
        </>
      } />
      <Card className="shadow-soft">
        {customers.length === 0 ? (
          <EmptyState icon={Plus} title="Nenhum cliente" description="Converta leads ou crie clientes manualmente." action={<Button onClick={openNew}>Criar Cliente</Button>} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Cidade</TableHead><TableHead>Criado</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell>{c.city || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Nome *"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Fld>
            <Fld label="Email"><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Fld>
            <Fld label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Fld>
            <Fld label="WhatsApp"><Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Fld>
            <Fld label="CPF/CNPJ"><Input value={form.document ?? ""} onChange={(e) => setForm({ ...form, document: e.target.value })} /></Fld>
            <Fld label="Cargo"><Input value={form.job_title ?? ""} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></Fld>
            <Fld label="Cidade"><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Fld>
            <Fld label="Estado"><Input value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Fld>
          </div>
          <Button onClick={save}>Salvar</Button>
        </DialogContent>
      </Dialog>

      <ImportWizard open={importOpen} onOpenChange={setImportOpen} entity="customer" />
    </div>
  );
}
function Fld({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
