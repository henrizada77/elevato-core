import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Smartphone, Power, RefreshCw, CheckCircle2, QrCode } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/app/empty-state";
import {
  listWaSessions, createWaSession, disconnectWaSession,
} from "@/lib/whatsapp/wa-service.functions";
import { getWaSession, simulateWaConnect } from "@/lib/whatsapp/wa-extra.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/inbox/whatsapp")({ component: WhatsAppPage });

const STATUS: Record<string, { label: string; variant: any }> = {
  connected: { label: "Conectado", variant: "default" },
  pending_qr: { label: "Aguardando QR", variant: "secondary" },
  disconnected: { label: "Desconectado", variant: "outline" },
};

function WhatsAppPage() {
  const qc = useQueryClient();
  const list = useServerFn(listWaSessions);
  const create = useServerFn(createWaSession);
  const disc = useServerFn(disconnectWaSession);

  const [newOpen, setNewOpen] = useState(false);
  const [instance, setInstance] = useState("");
  const [phone, setPhone] = useState("");
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ["wa-sessions"], queryFn: () => list(),
    refetchInterval: 5000,
  });

  const handleCreate = async () => {
    if (instance.trim().length < 2) { toast.error("Nome da instância obrigatório"); return; }
    const row: any = await create({ data: { instanceName: instance, phoneNumber: phone || undefined } });
    setNewOpen(false); setInstance(""); setPhone("");
    qc.invalidateQueries({ queryKey: ["wa-sessions"] });
    setQrSessionId(row.id);
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Desconectar esta sessão?")) return;
    await disc({ data: { id } });
    qc.invalidateQueries({ queryKey: ["wa-sessions"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        description="Conecte instâncias do WhatsApp para receber e enviar mensagens pela Caixa de Entrada."
        actions={<Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova conexão</Button>}
      />

      {sessions.length === 0 ? (
        <Card className="shadow-soft border-dashed">
          <CardContent className="py-12">
            <EmptyState
              icon={Smartphone}
              title="Nenhuma instância conectada"
              description="Crie uma nova conexão para gerar o QR Code e parear seu WhatsApp."
              action={<Button onClick={() => setNewOpen(true)}>Conectar WhatsApp</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sessions.map((s: any) => {
            const st = STATUS[s.status] ?? STATUS.disconnected;
            return (
              <Card key={s.id} className="shadow-soft">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-md bg-gradient-soft flex items-center justify-center text-primary">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{s.instance_name}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.phone_number ?? "Sem número"} {s.last_connected_at ? `• ${new Date(s.last_connected_at).toLocaleString("pt-BR")}` : ""}
                    </p>
                  </div>
                  {s.status !== "connected" ? (
                    <Button size="sm" variant="outline" onClick={() => setQrSessionId(s.id)}>
                      <QrCode className="h-4 w-4 mr-1" /> QR
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => handleDisconnect(s.id)}>
                      <Power className="h-4 w-4 mr-1" /> Desconectar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Modo de desenvolvimento: a integração real com a Stevo API ainda não está plugada. O QR Code aqui é simulado para testar o fluxo.
      </p>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova conexão WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome da instância</Label>
              <Input value={instance} onChange={(e) => setInstance(e.target.value)} placeholder="ex: comercial-01" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone (opcional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
            </div>
            <Button onClick={handleCreate} className="w-full">Criar e gerar QR</Button>
          </div>
        </DialogContent>
      </Dialog>

      {qrSessionId && <QrDialog sessionId={qrSessionId} onClose={() => { setQrSessionId(null); qc.invalidateQueries({ queryKey: ["wa-sessions"] }); }} />}
    </div>
  );
}

function QrDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const get = useServerFn(getWaSession);
  const sim = useServerFn(simulateWaConnect);
  const [session, setSession] = useState<any>(null);
  const [phase, setPhase] = useState<"loading" | "qr" | "connected">("loading");

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    let qrTimer: ReturnType<typeof setTimeout> | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const s: any = await get({ data: { id: sessionId } });
      if (!mounted) return;
      setSession(s);
      if (s?.status === "connected") {
        setPhase("connected");
        if (timer) clearInterval(timer);
      } else if (s?.qr_code) {
        setPhase("qr");
      }
    };

    // Inicia: pede QR (simulado)
    sim({ data: { id: sessionId, step: "qr" } }).then(() => {
      tick();
      timer = setInterval(tick, 3000);
      // Simula conexão após 12s
      connectTimer = setTimeout(() => {
        sim({ data: { id: sessionId, step: "connect" } }).then(tick);
      }, 12000);
    });

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
      if (qrTimer) clearTimeout(qrTimer);
      if (connectTimer) clearTimeout(connectTimer);
    };
  }, [sessionId, get, sim]);

  const refresh = async () => {
    setPhase("loading");
    await sim({ data: { id: sessionId, step: "qr" } });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Parear WhatsApp</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {phase === "connected" ? (
            <>
              <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="font-medium">Conectado com sucesso</p>
              <p className="text-xs text-muted-foreground text-center">A instância <strong>{session?.instance_name}</strong> está pronta para enviar e receber mensagens.</p>
              <Button onClick={onClose}>Concluir</Button>
            </>
          ) : phase === "qr" && session?.qr_code ? (
            <>
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={session.qr_code} size={220} />
              </div>
              <p className="text-sm text-center">
                Abra o WhatsApp no celular → <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong> e escaneie o código.
              </p>
              <Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="h-3 w-3 mr-1" /> Gerar novo QR</Button>
              <p className="text-xs text-muted-foreground">Aguardando leitura…</p>
            </>
          ) : (
            <>
              <div className="h-40 w-40 rounded-md border border-dashed animate-pulse" />
              <p className="text-sm text-muted-foreground">Gerando QR Code…</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
