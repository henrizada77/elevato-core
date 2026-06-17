# Plano de execução — Fases 2.B/2.C + Fase 3

Dada a escala (Atendimento + IA + Planos + Marketplace + Master + Assistente AI), proponho dividir em **sub-fases entregáveis**, cada uma com migration aprovada antes do código.

---

## Sub-fase 2.B — Finalização do CRM (1 turno)

**Frontend apenas, sem migration:**
- Exportações **CSV / Excel / PDF** em Leads, Customers, Deals (usando `papaparse`, `xlsx`, `jspdf`).
- **ImportWizard** funcional (CSV → mapeamento de colunas → preview → insert em lote).
- **CustomFieldsForm** integrado nos drawers de Lead/Deal/Customer (já existe componente, conectar nas telas).
- **FiltersBar** com filtros salvos (localStorage por enquanto).
- **Dashboard avançado** `/app/crm`: ranking de vendedores, ticket médio, motivos de perda, evolução mensal (Recharts já instalado).

## Sub-fase 2.C — Automação base (1 turno)

- Migration: `crm_automations` (triggers JSON), `crm_automation_runs` (logs).
- Tela `/app/crm/automations` para CRUD de regras simples (ex.: "ao mover para etapa X, criar tarefa Y").
- Execução fica como *stub* server-function — preparada, sem engine ativo ainda.

---

## Fase 3 — dividida em 4 sub-fases

### 3.A — Schema base Atendimento + IA + Planos (1 migration grande)

Tabelas novas (todas com `company_id`, RLS via `is_company_member`, GRANTs):

**Atendimento:**
- `inbox_channels` (whatsapp/email/webchat/instagram — placeholder)
- `inbox_queues` (Comercial, Financeiro, Suporte…)
- `inbox_conversations` (cliente, canal, fila, responsável, status, tags, last_message_at, unread_count)
- `inbox_messages` (direction, type=text/audio/image/video/pdf/file, content, media_url, sender_id, ack_status)
- `inbox_participants` (atendentes atribuídos)
- `inbox_notes` (observações internas)
- `inbox_events` (timeline: atribuído/transferido/finalizado/reaberto)
- `inbox_attachments`

**WhatsApp (estrutura, sem comunicação real):**
- `wa_sessions` (instance_name, status, qr_code, token criptografado, webhook_url)
- `wa_webhook_events` (payload bruto recebido)

**IA:**
- `ai_providers` (openai/gemini/anthropic — enum)
- `ai_credentials` (company_id, provider, api_key_encrypted, model_default, is_active)
- `ai_usage_logs` (provider, model, tokens_in/out, cost_estimate, feature, user_id, latency_ms)
- `ai_assistant_threads` (Elevo AI: thread por usuário/empresa)
- `ai_assistant_messages` (role, content, tool_calls jsonb)

**SaaS / Planos:**
- `billing_plans` (slug start/grow/scale, name, price_cents, max_users, max_inboxes, features jsonb, modules jsonb)
- `billing_subscriptions` (company_id, plan_id, status=trial/active/past_due/canceled, trial_ends_at, current_period_end, gateway, gateway_subscription_id)
- `billing_invoices` (status, amount, due_at, paid_at, gateway_invoice_id)
- `billing_webhook_events` (gateway, event_type, payload, processed_at)
- `billing_modules` (catálogo do Marketplace: crm/inbox/ai/marketing/finance/inventory/clinic/workshop/realestate)
- `company_modules` (company_id, module_id, enabled, enabled_at)

**Seeds:** filas padrão, planos default, módulos do marketplace.
**Função:** `encrypt_api_key`/`decrypt_api_key` via `pgsodium` ou prefixo simples (decisão: usar `extensions.pgcrypto` + chave do server — server fns só descriptografam server-side).

### 3.B — UI Atendimento + camadas de serviço (1 turno)

- Sidebar: novo grupo "Atendimento" com Inbox, Filas, Atendentes.
- Rotas:
  - `/app/inbox` — layout 3 colunas (filtros laterais / lista de conversas / painel da conversa)
  - `/app/inbox/queues`
  - `/app/inbox/agents`
- Componentes: `ConversationList`, `ConversationView`, `MessageBubble`, `MessageComposer`, `InternalNotePanel`, `ConversationSidebar` (cliente vinculado, lead, deal, tags).
- **Camada `src/lib/whatsapp/`** (services + types, sem chamadas reais):
  - `wa-service.functions.ts` — `createSession`, `getQrCode`, `disconnect`, `sendMessage` (stub que apenas persiste localmente).
  - `src/routes/api/public/wa-webhook.ts` — endpoint preparado, valida assinatura, grava em `wa_webhook_events`.

### 3.C — IA + Assistente Elevo AI (1 turno)

- `src/lib/ai/ai-service.functions.ts` — **camada única** que todo o app usa:
  - `runCompletion({ feature, prompt, context })` → busca credencial da empresa, descriptografa, chama provider via AI SDK (`@ai-sdk/openai` ou Lovable Gateway como fallback), grava `ai_usage_logs`.
  - `summarizeConversation`, `summarizeLead`, `summarizeCustomer`, `suggestReply`, `generateInsights`, `smartSearch` — todas usam `runCompletion`.
- Rota `/app/settings/ai` — cadastro de API key por provider, teste de conexão, status, último uso, contagem de requisições.
- **Assistente Elevo AI** `/app/assistant`:
  - Chat persistido em `ai_assistant_threads/messages`.
  - Server route streaming `/api/assistant/chat` com **tools** AI SDK que consultam CRM/Inbox respeitando `company_id` e RLS (via `requireSupabaseAuth`):
    - `tool: search_leads`, `tool: list_stalled_leads`, `tool: top_sellers`, `tool: deals_near_close`, `tool: customer_history`, `tool: high_value_opportunities`, `tool: monthly_sales_report`, `tool: tagged_customers_without_contact`.
  - UI com `react-markdown`, render de `message.parts`.

### 3.D — SaaS + Painel Master + Marketplace (1 turno)

- `src/lib/billing/` — services (`subscription-service.functions.ts`, `plan-service.functions.ts`).
- `src/lib/payments/` — adapters `asaas.ts`, `stripe.ts`, `mercadopago.ts` (interface comum, **sem cobrança real**).
- `src/routes/api/public/billing-webhook.ts` — recebe e grava `billing_webhook_events`.
- Tela `/app/settings/billing` — plano atual, trial, upgrade/downgrade (UI), histórico de faturas.
- Tela `/app/marketplace` — lista módulos, toggle ativar/desativar por empresa.
- **Painel Master** `/app/master` (já existe, expandir):
  - Lista empresas com plano, status, trial, # usuários, # conversas, consumo IA, MRR estimado, logs.
  - Filtros e busca.

---

## Decisões técnicas

| Tema | Decisão |
|---|---|
| Criptografia de API keys | `pgcrypto` + chave em `SUPABASE_VAULT` ou secret server-only. Descriptografia só em server fn com `requireSupabaseAuth`. |
| Provider IA padrão | OpenAI via chave do cliente. Lovable AI Gateway só no Assistente Elevo AI (fallback opcional). |
| Streaming Assistente | `useChat` + `streamText` + tools via `tanstack-ai-chat` |
| WhatsApp | Apenas estrutura nesta fase. Stevo API entra na Fase 4. |
| Pagamentos | Adapters mockados. Webhook endpoint pronto. |
| Realtime Inbox | Supabase Realtime nas tabelas `inbox_messages`/`inbox_conversations` (assinatura no client). |

---

## Sequência de entrega

1. **Agora**: Sub-fase 2.B (exports + import + dashboard avançado + custom fields nos drawers).
2. **Próximo turno**: Sub-fase 2.C (automações base — migration + tela).
3. **Depois**: 3.A (migration grande Atendimento+IA+SaaS) → aprovação.
4. 3.B → 3.C → 3.D, um por turno.

Cada sub-fase é independente, não quebra as anteriores e pode ser revisada isoladamente.

**Confirma essa sequência? Posso iniciar pela 2.B agora.**