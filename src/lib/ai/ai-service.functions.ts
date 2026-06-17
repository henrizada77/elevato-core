/**
 * AI Service — camada única de comunicação com provedores de IA.
 * Toda chamada de IA do app deve passar por aqui.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import {
  createLovableAiGatewayProvider,
  createOpenAIProvider,
  createGeminiProvider,
  createAnthropicProvider,
} from "@/lib/ai-gateway.server";

type Provider = "openai" | "gemini" | "anthropic" | "lovable";

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
  anthropic: "claude-3-5-haiku-20241022",
  lovable: "google/gemini-3-flash-preview",
};

async function getCompanyId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("current_company_id").eq("id", userId).single();
  if (error || !data?.current_company_id) throw new Error("Empresa não encontrada");
  return data.current_company_id as string;
}

async function resolveProvider(
  supabase: any,
  companyId: string,
  preferred?: Provider,
): Promise<{ provider: Provider; model: any; modelName: string } | null> {
  // Tenta credencial ativa da empresa
  const { data: creds } = await supabase
    .from("ai_credentials")
    .select("provider, default_model, api_key_encrypted")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const found = preferred
    ? (creds ?? []).find((c: any) => c.provider === preferred)
    : (creds ?? [])[0];

  if (found && found.api_key_encrypted) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { data: decrypted, error } = await supabaseAdmin.rpc("ai_decrypt_key", {
      _cipher: found.api_key_encrypted,
      _secret: secret,
    });
    if (error || !decrypted) return null;
    const apiKey = decrypted as string;
    const provider = found.provider as Provider;
    const modelName = found.default_model || DEFAULT_MODELS[provider];
    const p =
      provider === "openai" ? createOpenAIProvider(apiKey)
      : provider === "gemini" ? createGeminiProvider(apiKey)
      : provider === "anthropic" ? createAnthropicProvider(apiKey)
      : createLovableAiGatewayProvider(apiKey);
    return { provider, model: p(modelName), modelName };
  }

  // Fallback Lovable AI Gateway (apenas Assistente Elevo AI)
  const lovable = process.env.LOVABLE_API_KEY;
  if (lovable) {
    const gateway = createLovableAiGatewayProvider(lovable);
    return { provider: "lovable", model: gateway(DEFAULT_MODELS.lovable), modelName: DEFAULT_MODELS.lovable };
  }
  return null;
}

async function logUsage(
  supabase: any,
  companyId: string,
  userId: string,
  provider: Provider,
  model: string,
  feature: string,
  result: { tokensIn?: number; tokensOut?: number; latencyMs: number; success: boolean; error?: string },
) {
  await supabase.from("ai_usage_logs").insert({
    company_id: companyId, user_id: userId, provider, model, feature,
    tokens_in: result.tokensIn ?? 0, tokens_out: result.tokensOut ?? 0,
    latency_ms: result.latencyMs, success: result.success, error_message: result.error ?? null,
  });
}

/* ====================== CORE RUN COMPLETION ====================== */
export const runCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      feature: z.string(),
      prompt: z.string().min(1),
      system: z.string().optional(),
      preferredProvider: z.enum(["openai", "gemini", "anthropic", "lovable"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const companyId = await getCompanyId(supabase, userId);
    const resolved = await resolveProvider(supabase, companyId, data.preferredProvider as Provider | undefined);
    if (!resolved) {
      throw new Error("Nenhuma credencial de IA configurada. Vá em Configurações → Inteligência Artificial.");
    }
    const t0 = Date.now();
    try {
      const result = await generateText({
        model: resolved.model,
        system: data.system,
        prompt: data.prompt,
      });
      const latencyMs = Date.now() - t0;
      await logUsage(supabase, companyId, userId, resolved.provider, resolved.modelName, data.feature, {
        tokensIn: result.usage?.inputTokens,
        tokensOut: result.usage?.outputTokens,
        latencyMs, success: true,
      });
      return { text: result.text, provider: resolved.provider, model: resolved.modelName };
    } catch (e: any) {
      await logUsage(supabase, companyId, userId, resolved.provider, resolved.modelName, data.feature, {
        latencyMs: Date.now() - t0, success: false, error: e?.message ?? String(e),
      });
      throw e;
    }
  });

/* ====================== CRUD DE CREDENCIAIS ====================== */
export const listAiCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const companyId = await getCompanyId(supabase, userId);
    const { data, error } = await supabase
      .from("ai_credentials")
      .select("id, provider, default_model, is_active, last_test_at, last_test_status, created_at, updated_at")
      .eq("company_id", companyId)
      .order("provider");
    if (error) throw error;
    return data ?? [];
  });

export const saveAiCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      provider: z.enum(["openai", "gemini", "anthropic"]),
      apiKey: z.string().min(10),
      defaultModel: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const companyId = await getCompanyId(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { data: cipher, error: encErr } = await supabaseAdmin.rpc("ai_encrypt_key", {
      _plain: data.apiKey, _secret: secret,
    });
    if (encErr) throw encErr;
    const { error } = await supabase.from("ai_credentials").upsert({
      company_id: companyId,
      provider: data.provider,
      api_key_encrypted: cipher,
      default_model: data.defaultModel || DEFAULT_MODELS[data.provider as Provider],
      is_active: true,
      created_by: userId,
    }, { onConflict: "company_id,provider" });
    if (error) throw error;
    return { ok: true };
  });

export const deleteAiCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase.from("ai_credentials").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const testAiCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ provider: z.enum(["openai", "gemini", "anthropic", "lovable"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const companyId = await getCompanyId(supabase, userId);
    const resolved = await resolveProvider(supabase, companyId, data.provider as Provider);
    if (!resolved) return { ok: false, message: "Credencial não encontrada" };
    try {
      const r = await generateText({ model: resolved.model, prompt: "Responda apenas: OK" });
      await supabase.from("ai_credentials").update({
        last_test_at: new Date().toISOString(),
        last_test_status: "success",
      }).eq("company_id", companyId).eq("provider", data.provider);
      return { ok: true, message: r.text.trim().slice(0, 100) };
    } catch (e: any) {
      await supabase.from("ai_credentials").update({
        last_test_at: new Date().toISOString(),
        last_test_status: "error",
      }).eq("company_id", companyId).eq("provider", data.provider);
      return { ok: false, message: e?.message ?? String(e) };
    }
  });

/* ====================== FEATURES ====================== */
export const summarizeLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: lead } = await supabase.from("crm_leads").select("*").eq("id", data.leadId).single();
    if (!lead) throw new Error("Lead não encontrado");
    const prompt = `Resuma este lead de forma executiva em 3 bullets:\n${JSON.stringify(lead, null, 2)}`;
    return runCompletionInternal(supabase, userId, "summarize_lead", prompt);
  });

export const summarizeCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ customerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: cust } = await supabase.from("crm_customers").select("*").eq("id", data.customerId).single();
    if (!cust) throw new Error("Cliente não encontrado");
    const prompt = `Resuma este cliente e destaque oportunidades:\n${JSON.stringify(cust, null, 2)}`;
    return runCompletionInternal(supabase, userId, "summarize_customer", prompt);
  });

async function runCompletionInternal(supabase: any, userId: string, feature: string, prompt: string) {
  const companyId = await getCompanyId(supabase, userId);
  const resolved = await resolveProvider(supabase, companyId);
  if (!resolved) throw new Error("Configure uma IA em Configurações → Inteligência Artificial");
  const t0 = Date.now();
  try {
    const r = await generateText({ model: resolved.model, prompt });
    await logUsage(supabase, companyId, userId, resolved.provider, resolved.modelName, feature, {
      tokensIn: r.usage?.inputTokens, tokensOut: r.usage?.outputTokens,
      latencyMs: Date.now() - t0, success: true,
    });
    return { text: r.text };
  } catch (e: any) {
    await logUsage(supabase, companyId, userId, resolved.provider, resolved.modelName, feature, {
      latencyMs: Date.now() - t0, success: false, error: e?.message,
    });
    throw e;
  }
}
