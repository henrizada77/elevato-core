import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Plus, MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/lib/crm/context";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/assistant")({ component: AssistantPage });

const SUGGESTIONS = [
  "Quais leads estão parados há mais de 7 dias?",
  "Qual vendedor mais vendeu este mês?",
  "Mostre os negócios próximos do fechamento.",
  "Quais oportunidades têm maior valor?",
  "Gere um relatório das vendas do último mês.",
];

function AssistantPage() {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: threads = [] } = useQuery({
    queryKey: ["ai-threads", user?.id], enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("ai_assistant_threads").select("*").order("last_message_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["ai-stats", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data: cred } = await supabase.from("ai_credentials").select("provider, default_model, last_test_at").eq("is_active", true).maybeSingle();
      const { count } = await supabase.from("ai_usage_logs").select("*", { count: "exact", head: true }).eq("company_id", companyId!);
      return { cred, count };
    },
  });

  const createThread = async () => {
    if (!user?.id || !companyId) return;
    const { data, error } = await supabase.from("ai_assistant_threads").insert({ user_id: user.id, company_id: companyId, title: "Nova conversa" }).select().single();
    if (error || !data) return;
    setActiveThread(data.id);
    qc.invalidateQueries({ queryKey: ["ai-threads"] });
  };

  const deleteThread = async (id: string) => {
    await supabase.from("ai_assistant_threads").delete().eq("id", id);
    if (activeThread === id) setActiveThread(null);
    qc.invalidateQueries({ queryKey: ["ai-threads"] });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Assistente Elevo AI"
        description="Pergunte qualquer coisa sobre seus leads, clientes e negócios."
        actions={
          stats?.cred ? (
            <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> {stats.cred.provider} • {stats.count ?? 0} usos</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> Lovable AI (fallback)</Badge>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[260px_1fr] h-[calc(100vh-200px)]">
        <Card className="shadow-soft overflow-hidden flex flex-col">
          <div className="p-3 border-b">
            <Button onClick={createThread} className="w-full" size="sm"><Plus className="h-4 w-4 mr-1" /> Nova conversa</Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma conversa ainda.</p>
            ) : threads.map((t: any) => (
              <div key={t.id} className={`flex items-center gap-2 p-2 hover:bg-muted/40 group ${activeThread === t.id ? "bg-muted/60" : ""}`}>
                <button onClick={() => setActiveThread(t.id)} className="flex-1 text-left text-sm truncate flex items-center gap-2">
                  <MessageSquare className="h-3 w-3 shrink-0" /> {t.title}
                </button>
                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteThread(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="shadow-soft overflow-hidden flex flex-col">
          {activeThread ? (
            <ChatWindow threadId={activeThread} scrollRef={scrollRef} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="h-14 w-14 rounded-full bg-gradient-brand flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Bem-vindo ao Elevo AI</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">Crie uma nova conversa e pergunte sobre seus leads, vendas, clientes e oportunidades.</p>
              <div className="grid gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={createThread} className="text-left text-sm p-3 rounded-md border hover:bg-muted/40 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ChatWindow({ threadId, scrollRef }: { threadId: string; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const [input, setInput] = useState("");

  const { data: history = [] } = useQuery({
    queryKey: ["ai-messages", threadId],
    queryFn: async () => {
      const { data } = await supabase.from("ai_assistant_messages").select("*").eq("thread_id", threadId).order("created_at");
      return (data ?? []).map((m: any) => ({
        id: m.id, role: m.role, parts: [{ type: "text" as const, text: m.content ?? "" }],
      }));
    },
  });

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: history as any,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
      },
      body: { threadId },
    }),
    onError: (e) => console.error("chat error", e),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, scrollRef]);

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  };

  const loading = status === "submitted" || status === "streaming";

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && <EmptyState icon={Sparkles} title="Comece a conversa" description="Faça uma pergunta sobre seus dados." />}
        {messages.map((m) => {
          const text = m.parts.map((p: any) => p.type === "text" ? p.text : "").join("");
          return (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm">{text}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm prose-p:my-1 prose-ul:my-1 prose-table:my-2">
                    <ReactMarkdown>{text || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && <p className="text-xs text-muted-foreground">Pensando…</p>}
      </div>

      <div className="border-t p-3 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
          placeholder="Pergunte algo ao Elevo AI…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button onClick={send} disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
      </div>
    </>
  );
}
