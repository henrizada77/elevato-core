import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, User, CheckCheck, MessageSquare, StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useServerFn } from "@tanstack/react-start";
import { sendWaMessage } from "@/lib/whatsapp/wa-service.functions";
import { toast } from "sonner";

interface Props { conversationId: string }

export function ConversationView({ conversationId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const send = useServerFn(sendWaMessage);

  const { data: conv } = useQuery({
    queryKey: ["inbox-conv", conversationId],
    queryFn: async () => {
      const { data } = await supabase.from("inbox_conversations")
        .select("*, inbox_queues(name,color), inbox_channels(kind,name)")
        .eq("id", conversationId).single();
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["inbox-messages", conversationId],
    queryFn: async () => {
      const { data } = await supabase.from("inbox_messages")
        .select("*").eq("conversation_id", conversationId).order("created_at");
      return data ?? [];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const ch = supabase
      .channel(`inbox-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inbox_messages", filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey: ["inbox-messages", conversationId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, qc]);

  const handleSend = async () => {
    if (!text.trim()) return;
    if (isInternal) {
      const { error } = await supabase.from("inbox_messages").insert({
        company_id: conv?.company_id, conversation_id: conversationId,
        direction: "internal", msg_type: "text", content: text,
        sender_id: user?.id, is_internal: true,
      });
      if (error) { toast.error(error.message); return; }
    } else {
      try { await send({ data: { conversationId, content: text } }); }
      catch (e: any) { toast.error(e?.message ?? "Erro ao enviar"); return; }
    }
    setText("");
    qc.invalidateQueries({ queryKey: ["inbox-messages", conversationId] });
    qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
  };

  const assignToMe = async () => {
    await supabase.from("inbox_conversations").update({ assignee_id: user?.id, status: "assigned" }).eq("id", conversationId);
    qc.invalidateQueries();
    toast.success("Atribuído a você");
  };
  const resolve = async () => {
    await supabase.from("inbox_conversations").update({ status: "resolved" }).eq("id", conversationId);
    qc.invalidateQueries();
    toast.success("Conversa finalizada");
  };

  if (!conv) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar><AvatarFallback className="bg-gradient-brand text-primary-foreground">{conv.contact_name?.charAt(0)?.toUpperCase()}</AvatarFallback></Avatar>
        <div className="flex-1">
          <p className="font-semibold">{conv.contact_name}</p>
          <p className="text-xs text-muted-foreground">{conv.contact_phone || conv.contact_email || "—"} • {conv.inbox_channels?.name ?? "Canal direto"}</p>
        </div>
        <Badge variant="outline">{conv.status}</Badge>
        {!conv.assignee_id && <Button size="sm" variant="outline" onClick={assignToMe}><User className="h-4 w-4 mr-1" /> Assumir</Button>}
        {conv.status !== "resolved" && <Button size="sm" onClick={resolve}><CheckCheck className="h-4 w-4 mr-1" /> Finalizar</Button>}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhuma mensagem ainda.</p>
        ) : messages.map((m: any) => (
          <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : m.is_internal ? "justify-center" : "justify-start"}`}>
            <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
              m.is_internal ? "bg-amber-100 dark:bg-amber-900/30 text-foreground border border-amber-300/50"
              : m.direction === "outbound" ? "bg-primary text-primary-foreground"
              : "bg-muted"}`}>
              {m.is_internal && <p className="text-[10px] uppercase font-semibold mb-1 flex items-center gap-1"><StickyNote className="h-3 w-3" /> Nota interna</p>}
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              <p className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t">
        <Tabs value={isInternal ? "note" : "reply"} onValueChange={(v) => setIsInternal(v === "note")}>
          <TabsList className="rounded-none border-b w-full justify-start h-9 bg-transparent">
            <TabsTrigger value="reply" className="text-xs"><MessageSquare className="h-3 w-3 mr-1" /> Responder</TabsTrigger>
            <TabsTrigger value="note" className="text-xs"><StickyNote className="h-3 w-3 mr-1" /> Nota interna</TabsTrigger>
          </TabsList>
          <TabsContent value="reply" className="p-3 m-0">
            <Composer text={text} setText={setText} onSend={handleSend} placeholder="Digite uma resposta…" />
          </TabsContent>
          <TabsContent value="note" className="p-3 m-0 bg-amber-50/50 dark:bg-amber-950/20">
            <Composer text={text} setText={setText} onSend={handleSend} placeholder="Nota visível apenas para sua equipe…" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Composer({ text, setText, onSend, placeholder }: { text: string; setText: (v: string) => void; onSend: () => void; placeholder: string }) {
  return (
    <div className="flex gap-2">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} />
      <Button onClick={onSend} disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
    </div>
  );
}
