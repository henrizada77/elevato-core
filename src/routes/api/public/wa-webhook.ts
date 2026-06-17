/**
 * Endpoint público para receber webhooks da Stevo API (WhatsApp).
 * Esta fase apenas registra o evento bruto para processamento futuro.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/wa-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload = await request.json().catch(() => ({}));
          const sessionId = request.headers.get("x-session-id") || null;
          const eventType = (payload as any)?.event ?? null;
          await supabaseAdmin.from("wa_webhook_events").insert({
            session_id: sessionId, event_type: eventType, payload,
          });
          return new Response("ok");
        } catch (e: any) {
          return new Response("error: " + e?.message, { status: 500 });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
