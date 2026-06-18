/**
 * Provider-agnostic webhook signature verification utility.
 * Supports HMAC-based signature verification for different gateway providers.
 *
 * Usage:
 * const isValid = await verifyWebhookSignature(request, {
 *   gateway: 'asaas',
 *   headerName: 'x-asaas-signature',
 *   algorithm: 'sha256',
 *   getSecret: async () => process.env.WEBHOOK_SECRET_ASAAS!,
 * });
 *
 * if (!isValid) return new Response('Invalid signature', { status: 401 });
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface WebhookVerifierConfig {
  /** Gateway name for logging (e.g., 'asaas', 'stripe', 'evolution-api') */
  gateway: string;
  /** HTTP header name containing the signature */
  headerName: string;
  /** HMAC algorithm to use */
  algorithm: 'sha256' | 'sha1' | 'md5';
  /** Function to retrieve the webhook secret */
  getSecret: () => Promise<string>;
}

/**
 * Verifies a webhook request signature using HMAC.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param request The incoming request
 * @param config Verification configuration
 * @returns true if signature is valid, false otherwise
 * @throws Error if secret cannot be retrieved
 */
export async function verifyWebhookSignature(
  request: Request,
  config: WebhookVerifierConfig,
): Promise<boolean> {
  // Extract signature from header
  const providedSignature = request.headers.get(config.headerName);
  if (!providedSignature) {
    logFailedVerification(config.gateway, 'missing_signature');
    return false;
  }

  try {
    // Get the webhook secret
    const secret = await config.getSecret();
    if (!secret) {
      logFailedVerification(config.gateway, 'secret_not_configured');
      return false;
    }

    // Clone the request to read the body (request can only be read once)
    const clonedRequest = request.clone();
    const body = await clonedRequest.text();

    // Compute expected signature
    const hmac = createHmac(config.algorithm, secret);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');

    // Timing-safe comparison to prevent timing attacks
    try {
      const isValid = timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
      return isValid;
    } catch {
      // timingSafeEqual throws if buffer lengths differ or on format error
      logFailedVerification(config.gateway, 'signature_mismatch');
      return false;
    }
  } catch (error) {
    logFailedVerification(config.gateway, `error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Logs failed verification attempts without exposing secrets.
 * Should be sent to your logging service (Sentry, LogRocket, etc.)
 */
function logFailedVerification(gateway: string, reason: string): void {
  const timestamp = new Date().toISOString();
  const message = `[Webhook] Failed verification: gateway=${gateway}, reason=${reason}, timestamp=${timestamp}`;
  
  // Replace with your structured logging service
  // For now, log to console in development only
  if (process.env.NODE_ENV === 'development') {
    console.warn(message);
  }
  
  // NOTE: Implement structured logging service integration (e.g., Sentry)
  // Example: reportWebhookFailure({ gateway, reason, timestamp });
}
