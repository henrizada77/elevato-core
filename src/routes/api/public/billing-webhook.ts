/**
 * Endpoint público para receber webhooks de gateways de pagamento (Asaas/Stripe/MP).
 * Esta fase apenas registra o evento — processamento real fica para fase futura.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/billing-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload = await request.json().catch(() => ({}));
          const gateway = request.headers.get("x-gateway") || "unknown";
          const eventType = (payload as any)?.event ?? (payload as any)?.type ?? null;
          await supabaseAdmin.from("billing_webhook_events").insert({
            gateway, event_type: eventType, payload,
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
