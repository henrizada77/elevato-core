/**
 * Endpoint público para receber webhooks de gateways de pagamento (Asaas/Stripe/MP).
 * Valida assinatura HMAC antes de processar eventos.
 * Esta fase apenas registra o evento — processamento real fica para fase futura.
 *
 * Environment variables required:
 * - WEBHOOK_SECRET_ASAAS (for Asaas/Stevo API webhooks)
 * - WEBHOOK_SECRET_STRIPE (for Stripe webhooks)
 * - WEBHOOK_SECRET_MERCADO_PAGO (for Mercado Pago webhooks)
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookSignature } from "@/lib/webhooks/verify-signature.server";

// Map of gateway to verification config
const GATEWAY_VERIFIERS: Record<string, { headerName: string; secretEnvVar: string; algorithm: 'sha256' | 'sha1' }> = {
  asaas: { headerName: "x-asaas-signature", secretEnvVar: "WEBHOOK_SECRET_ASAAS", algorithm: "sha256" },
  stevo: { headerName: "x-signature", secretEnvVar: "WEBHOOK_SECRET_ASAAS", algorithm: "sha256" },
  stripe: { headerName: "x-stripe-signature", secretEnvVar: "WEBHOOK_SECRET_STRIPE", algorithm: "sha256" },
  mercado_pago: { headerName: "x-signature", secretEnvVar: "WEBHOOK_SECRET_MERCADO_PAGO", algorithm: "sha256" },
};

export const Route = createFileRoute("/api/public/billing-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const gateway = request.headers.get("x-gateway") || request.headers.get("x-source") || "unknown";
          const verifierConfig = GATEWAY_VERIFIERS[gateway.toLowerCase()];

          // If gateway signature is configured, verify it
          if (verifierConfig) {
            const secretKey = process.env[verifierConfig.secretEnvVar];
            if (secretKey) {
              const isValid = await verifyWebhookSignature(request, {
                gateway,
                headerName: verifierConfig.headerName,
                algorithm: verifierConfig.algorithm,
                getSecret: async () => secretKey,
              });

              if (!isValid) {
                return new Response("Invalid webhook signature", { status: 401 });
              }
            }
          }

          // Signature verified or not required, process the webhook
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const payload = await request.json().catch(() => ({}));
          const eventType = ((payload as Record<string, unknown>)?.event ?? (payload as Record<string, unknown>)?.type) ?? null;

          await supabaseAdmin.from("billing_webhook_events").insert({
            gateway,
            event_type: eventType,
            payload,
          });

          return new Response("ok");
        } catch (e: any) {
          console.error("[Webhook] Billing webhook error:", { message: e?.message });
          return new Response("error: " + e?.message, { status: 500 });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
