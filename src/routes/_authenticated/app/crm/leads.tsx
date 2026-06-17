import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId, formatCurrency, formatDate } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadDrawer } from "@/components/crm/lead-drawer";
import { EmptyState } from "@/components/app/empty-state";
import { ExportButton } from "@/components/crm/export-button";
import { ImportWizard } from "@/components/crm/import-wizard";

export const Route = createFileRoute("/_authenticated/app/crm/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const companyId = useCompanyId();
  const [search, setSearch] = useState("");
  const [drawerLead, setDrawerLead] = useState<string | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: leads = [] } = useQuery({
    queryKey: ["crm-leads", companyId, search],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("crm_leads").select("*").eq("company_id", companyId!).eq("archived", false).order("created_at", { ascending: false });
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,company_text.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const total = useMemo(() => leads.reduce((s, l) => s + Number(l.estimated_value || 0), 0), [leads]);

  const exportRows = useMemo(() => leads.map((l) => ({
    Nome: l.name, Empresa: l.company_text ?? "", Email: l.email ?? "", Telefone: l.phone ?? "",
    WhatsApp: l.whatsapp ?? "", Cidade: l.city ?? "", Estado: l.state ?? "",
    Valor: Number(l.estimated_value ?? 0), Status: l.status, Criado: l.created_at,
  })), [leads]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${leads.length} leads • ${formatCurrency(total)} em pipeline estimado`}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" /> Importar</Button>
            <ExportButton rows={exportRows} filename="leads" title="Leads" />
            <Button onClick={() => setDrawerLead("new")}><Plus className="h-4 w-4 mr-1" /> Novo Lead</Button>
          </>
        }
      />
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, email, telefone…" className="pl-9" />
        </div>
      </div>

      <Card className="shadow-soft">
        {leads.length === 0 ? (
          <EmptyState icon={Plus} title="Nenhum lead ainda" description="Crie seu primeiro lead para começar a vender." action={<Button onClick={() => setDrawerLead("new")}>Criar Lead</Button>} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setDrawerLead(l.id)}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.company_text || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.email || l.phone || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(l.estimated_value)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(l.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <LeadDrawer open={drawerLead !== null} onOpenChange={(o) => !o && setDrawerLead(null)} leadId={drawerLead} />
      <ImportWizard open={importOpen} onOpenChange={setImportOpen} entity="lead" />
    </div>
  );
}
