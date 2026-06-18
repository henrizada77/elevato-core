/**
 * Master Panel data — apenas usuários com papel platform 'master' acessam.
 * Usa client admin pois a visão é cross-tenant.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertMaster(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_platform_role", { _user_id: userId, _role: "master" });
  if (error || !data) throw new Error("Forbidden");
}

export const getMasterOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertMaster(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [companies, subs, modules, plans, aiLogs] = await Promise.all([
      supabaseAdmin.from("companies").select("id,name,status,created_at"),
      supabaseAdmin.from("billing_subscriptions").select("company_id,status,plan_id,trial_ends_at,current_period_end"),
      supabaseAdmin.from("company_modules").select("company_id,module_id,enabled"),
      supabaseAdmin.from("billing_plans").select("id,slug,name,price_cents"),
      supabaseAdmin.from("ai_usage_logs").select("id", { count: "exact", head: true }),
    ]);

    const planMap = new Map((plans.data ?? []).map((p: any) => [p.id, p]));
    const now = Date.now();
    const in7d = now + 7 * 86400000;
    const last30 = now - 30 * 86400000;

    let mrrCents = 0;
    let trial = 0;
    let trialExpSoon = 0;
    let active = 0;
    let churn30 = 0;
    (subs.data ?? []).forEach((s: any) => {
      if (s.status === "active") {
        active++;
        const p: any = planMap.get(s.plan_id);
        if (p) mrrCents += Number(p.price_cents || 0);
      } else if (s.status === "trial") {
        trial++;
        const end = s.trial_ends_at ? new Date(s.trial_ends_at).getTime() : 0;
        if (end > 0 && end < in7d) trialExpSoon++;
      } else if (s.status === "cancelled" || s.status === "canceled") {
        const end = s.current_period_end ? new Date(s.current_period_end).getTime() : 0;
        if (end > last30) churn30++;
      }
    });

    const enabledModules = (modules.data ?? []).filter((m: any) => m.enabled).length;

    return {
      totals: {
        companies: companies.data?.length ?? 0,
        active, trial, trialExpSoon, churn30,
        mrrBRL: mrrCents / 100,
        enabledModules,
        aiCalls: aiLogs.count ?? 0,
      },
      plans: plans.data ?? [],
    };
  });

export const listMasterSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertMaster(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id,status,trial_ends_at,current_period_end,company_id,plan:billing_plans(name,slug,price_cents),company:companies(name)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const listMasterModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertMaster(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("company_modules")
      .select("enabled,module:billing_modules(slug,name),company:companies(name)")
      .eq("enabled", true);
    return data ?? [];
  });

export const listMasterActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertMaster(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("mgmt_activity_log")
      .select("id,company_id,kind,title,created_at,company:companies(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const setCompanyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid(), status: z.enum(["active","trial","suspended","cancelled"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMaster(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("companies").update({ status: data.status }).eq("id", data.companyId);
    if (error) throw error;
    return { ok: true };
  });
