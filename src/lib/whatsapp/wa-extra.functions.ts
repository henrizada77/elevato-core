/**
 * Extras para sessões WhatsApp: leitura única e simulação de conexão (dev/QA).
 * A simulação só existe enquanto a integração real (Stevo API) não está plugada.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getWaSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: row, error } = await supabase.from("wa_sessions").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

/**
 * Simulação de conexão: marca pending_qr → gera QR fake → após 8s marca connected.
 * Substituir pela chamada real à Stevo API quando disponível.
 */
export const simulateWaConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), step: z.enum(["qr", "connect"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    if (data.step === "qr") {
      const fake = `elevo-wa://session/${data.id}?token=${Math.random().toString(36).slice(2)}&ts=${Date.now()}`;
      await supabase.from("wa_sessions").update({ status: "pending_qr", qr_code: fake }).eq("id", data.id);
    } else {
      await supabase.from("wa_sessions").update({
        status: "connected", qr_code: null, last_connected_at: new Date().toISOString(),
      }).eq("id", data.id);
    }
    return { ok: true };
  });
