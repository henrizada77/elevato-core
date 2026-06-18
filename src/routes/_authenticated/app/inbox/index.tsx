import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Inbox, Search, Filter, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCompanyId } from "@/lib/crm/context";
import { PageHeader } from "@/components/app/page-header";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { ConversationView } from "@/components/inbox/conversation-view";

function formatDistanceToNow(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export const Route = createFileRoute("/_authenticated/app/inbox/")({ component: InboxPage });

type Filter = "all" | "unassigned" | "mine" | "open" | "resolved" | "archived";

function InboxPage() {
  const companyId = useCompanyId();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["inbox-conversations", companyId, filter, search],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("inbox_conversations")
        .select("id,contact_name,contact_phone,contact_email,last_message_at,last_message_preview,unread_count,assignee_id,status,inbox_queues(name,color),inbox_channels(kind,name)")
        .eq("company_id", companyId!)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter === "unassigned") q = q.is("assignee_id", null).neq("status", "archived");
      else if (filter === "mine") q = q.eq("assignee_id", user?.id ?? "00000000-0000-0000-0000-000000000000");
      else if (filter === "open") q = q.in("status", ["open", "pending", "assigned"]);
      else if (filter === "resolved") q = q.eq("status", "resolved");
      else if (filter === "archived") q = q.eq("status", "archived");
      else q = q.neq("status", "archived");

      if (search) q = q.or(`contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%,contact_email.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Atendimento"
        description="Central de conversas com seus clientes."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/app/inbox/queues"><Filter className="h-4 w-4 mr-1" /> Filas</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr] h-[calc(100vh-200px)]">
        {/* Lista de conversas */}
        <Card className="flex flex-col overflow-hidden shadow-soft">
          <div className="p-3 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversa…" className="pl-9 h-9" />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="w-full grid grid-cols-3 h-8">
                <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
                <TabsTrigger value="mine" className="text-xs">Minhas</TabsTrigger>
                <TabsTrigger value="unassigned" className="text-xs">Pendentes</TabsTrigger>
              </TabsList>
              <TabsList className="w-full grid grid-cols-3 h-8 mt-1">
                <TabsTrigger value="open" className="text-xs">Abertas</TabsTrigger>
                <TabsTrigger value="resolved" className="text-xs">Finalizadas</TabsTrigger>
                <TabsTrigger value="archived" className="text-xs">Arquivadas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <EmptyState icon={Inbox} title="Sem conversas" description="As conversas aparecerão aqui quando seus clientes entrarem em contato." />
            ) : (
              <ul className="divide-y">
                {conversations.map((c: any) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left p-3 hover:bg-muted/40 transition-colors flex gap-3 ${selectedId === c.id ? "bg-muted/60" : ""}`}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-gradient-brand text-xs text-primary-foreground">
                          {c.contact_name?.charAt(0)?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{c.contact_name}</p>
                          {c.last_message_at && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(c.last_message_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.last_message_preview ?? "Sem mensagens"}</p>
                        <div className="flex gap-1 mt-1">
                          {c.inbox_queues?.name && <Badge variant="outline" className="text-[10px] h-4 px-1">{c.inbox_queues.name}</Badge>}
                          {c.unread_count > 0 && <Badge className="text-[10px] h-4 px-1">{c.unread_count}</Badge>}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Painel da conversa */}
        <Card className="overflow-hidden shadow-soft">
          {selectedId ? (
            <ConversationView conversationId={selectedId} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState icon={MessageSquare} title="Selecione uma conversa" description="Escolha um atendimento ao lado para começar." />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
