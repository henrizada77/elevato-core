import { useAuth } from "@/lib/auth";

/** Returns the current active company id (multi-tenant scope). */
export function useCompanyId(): string | null {
  const { profile, memberships } = useAuth();
  return profile?.current_company_id ?? memberships[0]?.company_id ?? null;
}

export const ENTITY_KINDS = ["lead", "customer", "company", "contact", "deal"] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export const STAGE_KINDS = ["initial", "open", "won", "lost"] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

export const DEAL_STATUSES = ["open", "won", "lost"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const LEAD_STATUSES = ["new", "working", "converted", "archived", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function formatCurrency(value: number | null | undefined, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(value ?? 0));
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("pt-BR");
}
