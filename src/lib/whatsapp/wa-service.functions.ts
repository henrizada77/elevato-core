/**
 * Camada de serviços WhatsApp (Stevo API).
 * Esta fase apenas persiste sessões e estados — sem comunicação real.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function companyId(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("current_company_id").eq("id", userId).single();
  return data?.current_company_id as string;
}

export const listWaSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const cid = await companyId(supabase, userId);
    const { data, error } = await supabase.from("wa_sessions").select("*").eq("company_id", cid).order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createWaSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ instanceName: z.string().min(2), phoneNumber: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const cid = await companyId(supabase, userId);
    const { error, data: row } = await supabase.from("wa_sessions").insert({
      company_id: cid, instance_name: data.instanceName, phone_number: data.phoneNumber,
      status: "pending_qr", qr_code: null,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const disconnectWaSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    await supabase.from("wa_sessions").update({ status: "disconnected", qr_code: null }).eq("id", data.id);
    return { ok: true };
  });

export const sendWaMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ conversationId: z.string().uuid(), content: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const cid = await companyId(supabase, userId);
    // Stub: apenas persiste a mensagem localmente.
    const { error } = await supabase.from("inbox_messages").insert({
      company_id: cid, conversation_id: data.conversationId,
      direction: "outbound", msg_type: "text", content: data.content,
      sender_id: userId, ack_status: "queued",
    });
    if (error) throw error;
    await supabase.from("inbox_conversations").update({
      last_message_at: new Date().toISOString(), last_message_preview: data.content.slice(0, 80),
    }).eq("id", data.conversationId);
    return { ok: true };
  });
