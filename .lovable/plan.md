# Fase 2 — Módulo CRM do Elevo

Construirei o módulo CRM completo sobre a fundação da Fase 1 (multi-tenant, auth, design system, sidebar). Nada será removido nem reestilizado.

Dado o tamanho do escopo, proponho entregar em **3 sub-fases sequenciais**, cada uma 100% funcional ao final. Confirme se prefere assim ou se quer tudo numa tacada só (resposta mais longa, maior risco de erro).

---

## Sub-fase 2.A — Núcleo do CRM (esta entrega)

**Banco (uma migration única, multi-tenant via `company_id` + RLS):**
- `crm_companies` (empresas-cliente), `crm_contacts`, `crm_leads`, `crm_customers`
- `crm_pipelines`, `crm_stages`
- `crm_deals` (negócios) com FK para pipeline/stage/lead/customer
- `crm_tags` + tabelas pivot (`crm_lead_tags`, `crm_deal_tags`, `crm_customer_tags`)
- `crm_custom_fields` (definições) + `crm_custom_field_values` (JSONB por entidade)
- `crm_lead_sources`, `crm_win_reasons`, `crm_loss_reasons`
- `crm_timeline_events` (auditoria automática via triggers)
- `crm_attachments` (metadados; storage bucket `crm-attachments` privado)
- `crm_notes` (observações imutáveis)
- `crm_settings` (config por empresa: moeda, fuso, prefixo numeração, pipeline padrão, etc.)
- Políticas RLS escopadas via `is_company_member(auth.uid(), company_id)`; GRANTs corretos
- Triggers `updated_at` e timeline automática (insert/update/stage change)
- Seed automático na criação da empresa: pipeline "Vendas" + etapas padrão + origens/motivos básicos

**Frontend — rotas sob `_authenticated/app/crm/`:**
- `crm/index.tsx` — Dashboard Comercial (métricas, filtros por período)
- `crm/leads.tsx` — lista + CRUD + filtros + import/export
- `crm/customers.tsx` — lista + CRUD + conversão preservando histórico
- `crm/companies.tsx` — empresas
- `crm/contacts.tsx` — contatos vinculados a empresas
- `crm/pipelines/index.tsx` — lista de funis
- `crm/pipelines/$pipelineId.tsx` — **Kanban** com drag-and-drop (@dnd-kit) registrando timeline
- `crm/tags.tsx`
- `crm/settings.tsx` — central de config (funis/etapas/motivos/campos/origens/tags/numeração/conversão/gerais)
- `crm/automations.tsx` — placeholder "Em Breve"

**Componentes reutilizáveis novos:**
- `KanbanBoard`, `KanbanCard`, `KanbanColumn`
- `EntityDrawer` (painel lateral universal para Lead/Cliente/Negócio com abas: Dados, Timeline, Notas, Anexos, Campos)
- `TimelineList`, `TagPicker`, `CustomFieldRenderer`, `GlobalSearch` (Cmd+K)
- `ImportWizard` (upload CSV/XLSX → mapear colunas → preview → commit)
- `ExportButton` (CSV/Excel/PDF)
- `FiltersBar` (responsável, status, período, origem, cidade, estado, tags, funil, etapa)

**Sidebar:** adicionar grupo "CRM" expansível com os 7 itens.

**Server functions** (em `src/lib/crm/*.functions.ts`, protegidas por `requireSupabaseAuth`):
- `listLeads`, `upsertLead`, `convertLeadToCustomer`, `archiveLead`, `duplicateLead`
- `moveDeal` (atualiza stage + grava timeline), `upsertDeal`, `winDeal`, `loseDeal`
- `listPipelineBoard` (pipeline + etapas + deals agregados)
- `importLeads`, `exportEntities`
- `globalSearch`
- CRUDs de pipelines/stages/tags/custom-fields/sources/reasons/settings

**Bibliotecas a adicionar:** `@dnd-kit/core`, `@dnd-kit/sortable`, `papaparse`, `xlsx`, `jspdf`+`jspdf-autotable`.

---

## Sub-fase 2.B (próximo turno)
Anexos com Storage privado, Cmd+K global search refinado, import wizard com preview, exportações PDF/Excel/CSV, custom fields renderer completo nos formulários, polish mobile.

## Sub-fase 2.C (próximo turno)
Dashboard avançado com ranking de vendedores, gráficos, ticket médio, filtros salvos, área Automações (estrutura preparada para regras).

---

## Riscos / Decisões técnicas
- **Custom fields**: usarei JSONB em `crm_custom_field_values` (uma linha por entidade) para evitar EAV pesado.
- **Numeração de deals**: sequência por empresa via função `next_deal_number(company_id)` lendo `crm_settings.deal_prefix` + counter.
- **Timeline**: triggers SQL para eventos automáticos; server fns só inserem eventos manuais (notas, conversões).
- **Conversão Lead→Cliente**: função SQL transacional que copia tags, anexos, notas, deals e cria registro `crm_customers` mantendo `original_lead_id`.

Posso prosseguir com a **Sub-fase 2.A** (migration + telas + Kanban funcional)? Ou prefere ajustar o escopo antes?