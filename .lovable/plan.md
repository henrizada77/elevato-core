## Plano antes da Etapa 4

Quatro entregas focadas, reutilizando o que já existe.

### 1. Engine de Automações (CRM)
A UI em `/app/crm/automations` já cria regras (`crm_automations`). Falta executá-las.

- **Migration**: tabela `crm_automation_runs` (log de execuções: rule_id, entity, status, error, payload) + função `crm_run_automation(rule_id uuid, entity_kind text, entity_id uuid, payload jsonb)` SECURITY DEFINER que aplica as ações suportadas (`create_task` → `mgmt_tasks`, `add_tag` → `crm_*_tags`, `assign_owner` → update, `send_notification` → `mgmt_notifications`, `convert_to_customer` → `crm_convert_lead_to_customer`).
- **Triggers** em `crm_leads` / `crm_deals` que casam evento → regras ativas da empresa e chamam `crm_run_automation` para cada uma, registrando em `crm_automation_runs`.
- Aba "Execuções" em `/app/crm/automations` mostrando histórico (últimas 50, com status e erro).

### 2. Painel Master expandido (SaaS)
Adicionar a `/app/master` métricas reais e abas:

- **KPIs**: MRR estimado (soma de `billing_plans.price_monthly` por assinatura ativa), trials ativos, trials expirando 7d, churn 30d, módulos ativados, tickets de IA usados (placeholder 0 por enquanto).
- **Tabs**: Empresas (já existe) · Assinaturas (lista `billing_subscriptions` com plano, status, período) · Módulos (`company_modules` ativados por empresa) · Atividade (últimos eventos de `mgmt_activity_log`).
- Filtros por status; ações: suspender/reativar empresa (update em `companies.status`).

### 3. UI real para sessões WhatsApp + QR Code
Tabela `wa_sessions` já existe. Criar:

- Rota `/app/inbox/whatsapp` com lista de sessões, botão "Nova conexão" (cria com status `pending_qr`).
- **Componente QR**: modal que faz polling a cada 3s em `getWaSession(id)` (server fn nova). Renderiza QR via `qrcode` lib quando `qr_code` presente; mostra "Conectado" quando `status='connected'`; botão desconectar.
- Server fn `simulateWaConnect(id)` (dev): preenche `qr_code` com payload fake e depois marca `connected` — placeholder até integração real Stevo. Documentado no código.
- Webhook `/api/public/wa-webhook` (já existe) recebe `{ instanceId, status, qr }` e atualiza a sessão via service role.

### 4. Assistente usando credencial do usuário
Já existe `/app/settings/ai` (OpenAI/Gemini/Anthropic com pgcrypto). O `/api/chat` hoje usa só Lovable AI Gateway.

- Refatorar `src/routes/api/chat.ts`: ler credencial ativa da empresa (via `ai_decrypt_key`); se existir, usar `createOpenAICompatible` com o baseURL/model do provedor; senão, fallback para Lovable AI Gateway. Tudo server-side.
- Em `/app/assistant` exibir badge "usando: OpenAI (gpt-4o-mini)" ou "usando: Lovable AI (padrão)" lido de uma nova server fn `getActiveAiProvider`.

### Ordem de execução
1. Migration única (automation runs + triggers + função).
2. Refactor `chat.ts` + badge no assistente.
3. Página WhatsApp + componente QR (instalar `qrcode`).
4. Painel Master expandido.

Depois disso, sigo direto para a **Etapa 4 (Dashboards, Metas, Comissões, Relatórios, Analytics)** começando pelo 4.B.

Confirma para eu iniciar?
