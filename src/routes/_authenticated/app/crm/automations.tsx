import { createFileRoute } from "@tanstack/react-router";
import { Zap, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/crm/automations")({ component: AutomationsPage });

const examples = [
  { title: "Lead em Proposta → criar tarefa", desc: "Quando um lead entrar na etapa Proposta, criar tarefa automaticamente para o responsável." },
  { title: "Negócio Ganho → converter Lead", desc: "Quando um negócio for marcado como Ganho, converter o lead em cliente automaticamente." },
  { title: "Cliente inativo 7 dias → lembrete", desc: "Se um cliente ficar 7 dias sem contato, gerar um lembrete para o responsável." },
  { title: "Origem específica → adicionar tag", desc: "Quando um lead vier de uma origem específica, adicionar uma tag automaticamente." },
];

function AutomationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Automações" description="Crie regras inteligentes para o seu CRM trabalhar por você." actions={<Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> Em breve</Badge>} />
      <Card className="shadow-soft border-dashed">
        <CardContent className="py-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-soft text-primary"><Zap className="h-6 w-6" /></div>
          <h2 className="text-lg font-semibold">Módulo em desenvolvimento</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">A estrutura está pronta. Em breve você poderá criar gatilhos e ações que automatizam o ciclo comercial.</p>
        </CardContent>
      </Card>
      <div>
        <h3 className="font-medium mb-3 text-sm">Exemplos do que será possível:</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {examples.map((e) => (
            <Card key={e.title} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><Zap className="h-4 w-4" /></div>
                <div>
                  <p className="font-medium text-sm">{e.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
