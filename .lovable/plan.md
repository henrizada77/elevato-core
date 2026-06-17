# Fase 4 — Business Management & Analytics

Escopo grande. Vou dividir em 4 sub-fases independentes e revisáveis, todas reaproveitando arquitetura, Design System, RLS por `company_id` e componentes já existentes (sem recriar nada).

## Sub-fase 4.A — Schema base (1 migration)

Novas tabelas em `public` (todas com `company_id`, RLS via `is_company_member`, GRANTs, triggers `set_updated_at`):

- `mgmt_teams` + `mgmt_team_members` — equipes e vínculos.
- `mgmt_goals` — metas (escopo: company/team/user, tipo: revenue/deals/leads/conversion, período mensal/anual, target, progresso calculado).
- `mgmt_commission_rules` — regras (escopo user/team/pipeline/product-stub, tipo percent/fixed, valor, ativo).
- `mgmt_commissions` — comissões geradas por deal ganho (deal_id, user_id, base, valor, status pending/paid/partial/canceled, paid_at).
- `mgmt_tasks` — tarefas (título, descrição, prioridade, status, due_at, owner_id, entidades vinculadas lead/customer/deal, archived).
- `mgmt_appointments` — agenda (tipo meeting/visit/reminder, start_at/end_at, location, attendees jsonb, google_event_id stub).
- `mgmt_notifications` — central (user_id destinatário, channel system/email/whatsapp/push, kind, title, body, read_at, related entity).
- `mgmt_dashboard_layouts` — layout por usuário (user_id, widgets jsonb).
- `mgmt_reports` — relatórios salvos (nome, tipo, filtros jsonb, columns jsonb, owner_id).
- `mgmt_activity_log` — histórico imutável (actor_id, action, entity_kind, entity_id, data jsonb) — só INSERT permitido via policy.
- `mgmt_admin_logs` — logs administrativos (login/logout/export/import/config).

Trigger em `crm_deals`: ao mudar para `won`, gera linhas em `mgmt_commissions` aplicando regras ativas + notificação.

## Sub-fase 4.B — Dashboard Executivo + KPIs + Filtros

- `/app/dashboard` (substituindo o atual ou expandindo): grid de widgets configuráveis com `react-grid-layout` (já em uso? — se não, usar grid Tailwind + drag simples via dnd-kit já instalado).
- Componentes: `KpiCard` (valor + delta vs período anterior + sparkline), `FiltersBar` global (período/usuário/equipe/funil/origem/tag/cidade/estado/status) persistida em `localStorage` por usuário.
- Server fns em `src/lib/mgmt/analytics.functions.ts`: `getExecutiveKpis`, `getKpisByUser`, `getKpisByTeam`, `getRevenueSeries`, `getFunnelDistribution`, `getLeadSourceMix`, `getOnlineUsers` (heartbeat via `profiles.last_seen_at`).
- Widgets disponíveis (toggláveis): Receita Total/Mensal/Prevista, Negócios Abertos/Ganhos/Perdidos, Leads, Clientes Ativos, Conversão, Ticket Médio, Tempo Médio Fechamento, Atendimentos, Usuários Online.
- Layout salvo em `mgmt_dashboard_layouts`.

## Sub-fase 4.C — Metas, Comissões, Receita, Ranking, Produtividade

- `/app/mgmt/goals` — CRUD + barra de progresso (atingido/meta, dias restantes).
- `/app/mgmt/commissions` — lista de comissões geradas + filtros + ações (marcar pago/parcial/cancelar) + regras em aba separada.
- `/app/mgmt/revenue` — painel financeiro comercial (prevista/realizada/perdida, gráficos por vendedor/origem/funil/período).
- `/app/mgmt/ranking` — tabs vendedores/equipes/funis/origens/clientes com ordenação dinâmica.
- `/app/mgmt/productivity` — painel individual + comparativo equipe.
- `/app/mgmt/tasks` — kanban + lista (reaproveita `KanbanBoard`).
- `/app/agenda` — calendário (usar `react-day-picker` já presente + vista semanal própria) com CRUD de compromissos.
- `/app/notifications` — central com filtros e marcar como lida; bell no header com contador.

## Sub-fase 4.D — Central de Relatórios + Elevo Analytics + Logs

- `/app/reports` — Central com catálogo: Leads, Clientes, Negócios, Funis, Conversões, Receitas, Comissões, Vendedores, Produtividade, Tags, Custom Fields, Origens. Cada relatório: filtros, seleção de colunas, ordenação, export PDF/Excel/CSV (reaproveita `src/lib/crm/export.ts`).
- Relatórios salvos em `mgmt_reports`.
- `/app/analytics` — **Elevo Analytics** com tabs: 📈 Comercial, 👥 Clientes, 💰 Financeiro, 🎯 Metas, 📊 Performance, 📋 Relatórios. Cada tab com filtros e gráficos Recharts próprios. Arquitetura pronta pra fontes externas (camada `src/lib/analytics/sources/` com adapters stub: meta-ads, google-ads, whatsapp, google-calendar).
- `/app/admin/logs` — visualização de `mgmt_activity_log` + `mgmt_admin_logs` (só admin via `has_role`).
- Hook `useActivityLog()` chamado em ações relevantes do app.
- Sidebar atualizada: grupo "Gestão" (Dashboard, Metas, Comissões, Receita, Ranking, Produtividade, Tarefas, Agenda), grupo "Analytics" (Elevo Analytics, Relatórios), item Notificações no header.

## Detalhes técnicos

- Todas as queries respeitam RLS (`is_company_member`) — sem service role em leituras de app.
- Server fns via `createServerFn` + `requireSupabaseAuth` (já wired).
- Gráficos: Recharts (já instalado). Drag de widgets: dnd-kit (já instalado).
- Sem mocks finais — toda métrica deriva de dados reais; quando origem ainda não existe (ligações/mensagens), exibir card com estado "Em breve / integração necessária", sem números falsos.
- Identidade visual e tokens semânticos preservados.

## Sequência de execução

Vou começar por **4.A (migration única)** agora. Depois 4.B → 4.C → 4.D em turnos separados, cada um revisável.

Confirma e eu disparo a migration?