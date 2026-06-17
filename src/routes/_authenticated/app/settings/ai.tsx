import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Trash2, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listAiCredentials, saveAiCredential, deleteAiCredential, testAiCredential } from "@/lib/ai/ai-service.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings/ai")({ component: AiSettings });

const PROVIDERS = [
  { value: "openai", label: "OpenAI (GPT)", default: "gpt-4o-mini" },
  { value: "gemini", label: "Google Gemini", default: "gemini-1.5-flash" },
  { value: "anthropic", label: "Anthropic (Claude)", default: "claude-3-5-haiku-20241022" },
];

function AiSettings() {
  const qc = useQueryClient();
  const list = useServerFn(listAiCredentials);
  const save = useServerFn(saveAiCredential);
  const del = useServerFn(deleteAiCredential);
  const test = useServerFn(testAiCredential);
  const [form, setForm] = useState({ provider: "openai", apiKey: "", defaultModel: "" });
  const [saving, setSaving] = useState(false);

  const { data: creds = [] } = useQuery({ queryKey: ["ai-creds"], queryFn: () => list() });

  const onSave = async () => {
    if (!form.apiKey.trim()) { toast.error("Informe a chave de API"); return; }
    setSaving(true);
    try {
      await save({ data: { provider: form.provider as any, apiKey: form.apiKey, defaultModel: form.defaultModel || undefined } });
      toast.success("Credencial salva e criptografada");
      setForm({ provider: "openai", apiKey: "", defaultModel: "" });
      qc.invalidateQueries({ queryKey: ["ai-creds"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setSaving(false); }
  };

  const onTest = async (provider: string) => {
    const r = await test({ data: { provider: provider as any } });
    if (r.ok) toast.success("Conexão OK: " + r.message);
    else toast.error("Falhou: " + r.message);
    qc.invalidateQueries({ queryKey: ["ai-creds"] });
  };

  const onDelete = async (id: string) => {
    if (!confirm("Remover credencial?")) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["ai-creds"] });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Inteligência Artificial" description="Conecte sua própria chave de API. Toda IA do Elevo passa por uma camada única e segura." />

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Adicionar credencial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Provedor</Label>
              <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v, defaultModel: PROVIDERS.find(p => p.value === v)?.default ?? "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">API Key</Label>
              <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-…" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Modelo padrão (opcional)</Label>
            <Input value={form.defaultModel} onChange={(e) => setForm({ ...form, defaultModel: e.target.value })} placeholder={PROVIDERS.find(p => p.value === form.provider)?.default} />
          </div>
          <Button onClick={onSave} disabled={saving}>{saving ? "Salvando…" : "Salvar credencial"}</Button>
          <p className="text-xs text-muted-foreground">A chave é criptografada (pgcrypto) e nunca exposta no frontend.</p>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Credenciais ativas</CardTitle></CardHeader>
        <CardContent>
          {creds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma credencial cadastrada. O Elevo AI usará o gateway padrão (com créditos limitados).</p>
          ) : (
            <ul className="divide-y">
              {creds.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{c.provider}</Badge>
                    <div>
                      <p className="text-sm font-medium">{c.default_model || "Modelo padrão"}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.last_test_at ? (
                          <>
                            {c.last_test_status === "success"
                              ? <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> Testado</span>
                              : <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" /> Falhou</span>}
                            {" • "}{new Date(c.last_test_at).toLocaleString("pt-BR")}
                          </>
                        ) : "Não testado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onTest(c.provider)}>Testar</Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
