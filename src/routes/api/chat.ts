/**
 * Streaming chat para o Assistente Elevo AI.
 * Usa as credenciais da empresa (OpenAI/Gemini/Anthropic) ou Lovable AI Gateway como fallback.
 */
import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  createLovableAiGatewayProvider,
  createOpenAIProvider,
  createGeminiProvider,
  createAnthropicProvider,
} from "@/lib/ai-gateway.server";

type Provider = "openai" | "gemini" | "anthropic" | "lovable";
const DEFAULTS: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
  anthropic: "claude-3-5-haiku-20241022",
  lovable: "google/gemini-3-flash-preview",
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const url = process.env.SUPABASE_URL!;
        const pub = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(url, pub, {
          global: { headers: { Authorization: auth } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return new Response("Unauthorized", { status: 401 });

        const { data: prof } = await supabase.from("profiles").select("current_company_id").eq("id", user.id).single();
        const companyId = prof?.current_company_id;
        if (!companyId) return new Response("No company", { status: 400 });

        const body = await request.json();
        const messages = body.messages as UIMessage[];
        const threadId = body.threadId as string | undefined;
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

        // Resolve provedor
        const { data: creds } = await supabase
          .from("ai_credentials")
          .select("provider, default_model, api_key_encrypted")
          .eq("company_id", companyId).eq("is_active", true).limit(1).maybeSingle();

        let modelInst: any; let providerName: Provider; let modelName: string;
        if (creds?.api_key_encrypted) {
          const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
          const { data: plain } = await admin.rpc("ai_decrypt_key", {
            _cipher: creds.api_key_encrypted, _secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          });
          providerName = creds.provider as Provider;
          modelName = creds.default_model || DEFAULTS[providerName];
          const p = providerName === "openai" ? createOpenAIProvider(plain as string)
            : providerName === "gemini" ? createGeminiProvider(plain as string)
            : createAnthropicProvider(plain as string);
          modelInst = p(modelName);
        } else if (process.env.LOVABLE_API_KEY) {
          providerName = "lovable"; modelName = DEFAULTS.lovable;
          modelInst = createLovableAiGatewayProvider(process.env.LOVABLE_API_KEY)(modelName);
        } else {
          return new Response("Sem IA configurada. Cadastre uma chave em Configurações → IA.", { status: 402 });
        }

        // Tools que consultam dados da empresa, respeitando company_id
        const tools = {
          listStalledLeads: tool({
            description: "Lista leads parados há mais de N dias sem atualização.",
            inputSchema: z.object({ days: z.number().int().min(1).max(180).default(7) }),
            execute: async ({ days }) => {
              const since = new Date(Date.now() - days * 86400000).toISOString();
              const { data } = await supabase.from("crm_leads")
                .select("id,name,status,estimated_value,updated_at,company_text")
                .eq("company_id", companyId).eq("archived", false).lt("updated_at", since)
                .order("updated_at").limit(20);
              return { count: data?.length ?? 0, leads: data ?? [] };
            },
          }),
          topSellers: tool({
            description: "Retorna os vendedores que mais venderam no mês.",
            inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(5) }),
            execute: async ({ limit }) => {
              const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
              const { data } = await supabase.from("crm_deals")
                .select("owner_id,value").eq("company_id", companyId).eq("status", "won")
                .gte("closed_at", start.toISOString());
              const m = new Map<string, number>();
              (data ?? []).forEach((d: any) => d.owner_id && m.set(d.owner_id, (m.get(d.owner_id) ?? 0) + Number(d.value || 0)));
              const ids = Array.from(m.keys());
              const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
              const pm = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || p.email]));
              return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)
                .map(([id, total]) => ({ name: pm.get(id) ?? "—", total }));
            },
          }),
          dealsNearClose: tool({
            description: "Lista negócios próximos da data de fechamento prevista.",
            inputSchema: z.object({ days: z.number().int().min(1).max(60).default(7) }),
            execute: async ({ days }) => {
              const until = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
              const { data } = await supabase.from("crm_deals")
                .select("id,number,title,value,expected_close_date,probability")
                .eq("company_id", companyId).eq("status", "open")
                .lte("expected_close_date", until).order("expected_close_date").limit(20);
              return data ?? [];
            },
          }),
          highValueOpportunities: tool({
            description: "Lista as oportunidades em aberto de maior valor.",
            inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(10) }),
            execute: async ({ limit }) => {
              const { data } = await supabase.from("crm_deals")
                .select("id,number,title,value,probability,expected_close_date")
                .eq("company_id", companyId).eq("status", "open")
                .order("value", { ascending: false }).limit(limit);
              return data ?? [];
            },
          }),
          monthlySalesReport: tool({
            description: "Resumo das vendas do mês corrente.",
            inputSchema: z.object({}),
            execute: async () => {
              const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
              const { data } = await supabase.from("crm_deals")
                .select("value,status").eq("company_id", companyId).gte("created_at", start.toISOString());
              let won = 0, lost = 0, open = 0, wonCount = 0;
              (data ?? []).forEach((d: any) => {
                const v = Number(d.value || 0);
                if (d.status === "won") { won += v; wonCount++; }
                else if (d.status === "lost") lost += v; else open += v;
              });
              return { won, lost, open, wonCount, totalDeals: data?.length ?? 0 };
            },
          }),
          customerHistory: tool({
            description: "Resumo do histórico de um cliente (negócios e timeline).",
            inputSchema: z.object({ customerId: z.string().uuid() }),
            execute: async ({ customerId }) => {
              const [cust, deals, timeline] = await Promise.all([
                supabase.from("crm_customers").select("name,email,phone,city,state,created_at").eq("id", customerId).eq("company_id", companyId).single(),
                supabase.from("crm_deals").select("number,title,value,status,closed_at").eq("customer_id", customerId).eq("company_id", companyId).limit(20),
                supabase.from("crm_timeline_events").select("event_type,title,created_at").eq("entity_kind", "customer").eq("entity_id", customerId).order("created_at", { ascending: false }).limit(20),
              ]);
              return { customer: cust.data, deals: deals.data ?? [], timeline: timeline.data ?? [] };
            },
          }),
          searchLeads: tool({
            description: "Busca leads por nome, email, telefone ou empresa.",
            inputSchema: z.object({ query: z.string().min(2) }),
            execute: async ({ query }) => {
              const { data } = await supabase.from("crm_leads")
                .select("id,name,status,company_text,email,phone,estimated_value")
                .eq("company_id", companyId)
                .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,company_text.ilike.%${query}%`)
                .limit(15);
              return data ?? [];
            },
          }),
        };

        const result = streamText({
          model: modelInst,
          system: `Você é o Assistente Elevo AI, integrado ao CRM e Central de Atendimento da empresa.
Sempre responda em português brasileiro, de forma direta e executiva.
Use as tools disponíveis para consultar dados reais antes de responder. Nunca invente números.
Quando apresentar listas, use markdown com tabelas ou bullets.`,
          messages: convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
          onFinish: async ({ text }) => {
            // Persiste mensagens (best-effort)
            if (!threadId) return;
            const lastUser = [...messages].reverse().find((m) => m.role === "user");
            const userText = lastUser?.parts?.map((p: any) => p.type === "text" ? p.text : "").join("") ?? "";
            await supabase.from("ai_assistant_messages").insert([
              { thread_id: threadId, company_id: companyId, role: "user", content: userText },
              { thread_id: threadId, company_id: companyId, role: "assistant", content: text },
            ]);
            await supabase.from("ai_assistant_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
          },
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});
