import { useState } from "react";
import Papa from "papaparse";
import { Upload, FileText, ArrowRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Field = { key: string; label: string };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entity: "lead" | "customer";
}

const LEAD_FIELDS: Field[] = [
  { key: "name", label: "Nome *" },
  { key: "company_text", label: "Empresa" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "document", label: "CPF/CNPJ" },
  { key: "job_title", label: "Cargo" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado" },
  { key: "estimated_value", label: "Valor estimado" },
  { key: "notes", label: "Observações" },
];

const CUSTOMER_FIELDS: Field[] = [
  { key: "name", label: "Nome *" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "document", label: "CPF/CNPJ" },
  { key: "job_title", label: "Cargo" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado" },
  { key: "notes", label: "Observações" },
];

export function ImportWizard({ open, onOpenChange, entity }: Props) {
  const companyId = useCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fields = entity === "lead" ? LEAD_FIELDS : CUSTOMER_FIELDS;
  const table = entity === "lead" ? "crm_leads" : "crm_customers";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep(1); setRawRows([]); setHeaders([]); setMapping({}); setLoading(false);
  };

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = res.meta.fields ?? [];
        setHeaders(hs);
        setRawRows(res.data);
        // auto-map by normalized name
        const auto: Record<string, string> = {};
        fields.forEach((f) => {
          const found = hs.find((h) => h.toLowerCase().replace(/\s|_/g, "") === f.key.replace(/_/g, ""));
          if (found) auto[f.key] = found;
        });
        setMapping(auto);
        setStep(2);
      },
      error: (err) => toast.error("Erro ao ler CSV: " + err.message),
    });
  };

  const mapped = rawRows
    .map((r) => {
      const obj: Record<string, unknown> = {};
      for (const f of fields) {
        const src = mapping[f.key];
        if (src) {
          const v = r[src];
          if (v !== undefined && v !== "") obj[f.key] = f.key === "estimated_value" ? Number(v) || 0 : v;
        }
      }
      return obj;
    })
    .filter((r) => r.name);

  const doImport = async () => {
    if (!companyId || mapped.length === 0) return;
    setLoading(true);
    const payload = mapped.map((r) => ({ ...r, company_id: companyId, created_by: user?.id }));
    const { error } = await supabase.from(table as never).insert(payload as never);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${payload.length} registros importados`);
    qc.invalidateQueries({ queryKey: [entity === "lead" ? "crm-leads" : "crm-customers"] });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar {entity === "lead" ? "Leads" : "Clientes"} via CSV</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">Selecione um arquivo CSV com cabeçalho na primeira linha</p>
              <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="max-w-sm mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground">
              Campos esperados: {fields.map((f) => f.label).join(", ")}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> {rawRows.length} linhas lidas. Mapeie as colunas:
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Select value={mapping[f.key] ?? "__none"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Não importar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Não importar —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 border-t">
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} disabled={!mapping.name}>
                Pré-visualizar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm">
              <strong>{mapped.length}</strong> registros válidos serão importados.
              {mapped.length < rawRows.length && (
                <span className="text-muted-foreground"> ({rawRows.length - mapped.length} sem nome serão ignorados)</span>
              )}
            </p>
            <div className="max-h-80 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>{fields.filter((f) => mapping[f.key]).map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {mapped.slice(0, 10).map((r, i) => (
                    <TableRow key={i}>
                      {fields.filter((f) => mapping[f.key]).map((f) => (
                        <TableCell key={f.key} className="text-xs">{String(r[f.key] ?? "")}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={doImport} disabled={loading || mapped.length === 0}>
                <Check className="h-4 w-4 mr-1" /> {loading ? "Importando…" : `Importar ${mapped.length}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
