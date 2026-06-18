/**
 * Endpoint público para receber webhooks da Stevo API (WhatsApp).
 * Valida assinatura HMAC antes de processar eventos.
 * Esta fase apenas registra o evento bruto para processamento futuro.
 *
 * Environment variables required:
 * - WEBHOOK_SECRET_EVOLUTION_API (for Evolution API/WhatsApp webhooks)
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookSignature } from "@/lib/webhooks/verify-signature.server";

export const Route = createFileRoute("/api/public/wa-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const gateway = "evolution-api";
          const secretKey = process.env.WEBHOOK_SECRET_EVOLUTION_API;

          // Verify signature if secret is configured
          if (secretKey) {
            const isValid = await verifyWebhookSignature(request, {
              gateway,
              headerName: "x-signature",
              algorithm: "sha256",
              getSecret: async () => secretKey,
            });

            if (!isValid) {
              return new Response("Invalid webhook signature", { status: 401 });
            }
          }

          // Signature verified or not required, process the webhook
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload = await request.json().catch(() => ({}));
          const sessionId = request.headers.get("x-session-id") || null;
          const eventType = ((payload as Record<string, unknown>)?.event) ?? null;

          await supabaseAdmin.from("wa_webhook_events").insert({
            session_id: sessionId,
            event_type: eventType,
            payload,
          });

          return new Response("ok");
        } catch (e: any) {
          console.error("[Webhook] WhatsApp webhook error:", { message: e?.message });
          return new Response("error: " + e?.message, { status: 500 });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
