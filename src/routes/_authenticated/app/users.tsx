import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users as UsersIcon, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/users")({
  component: UsersPage,
});

const roleLabel: Record<string, string> = {
  master: "Master",
  admin: "Administrador",
  manager: "Gerente",
  seller: "Vendedor",
  agent: "Atendente",
  user: "Usuário",
};

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  master: "default",
  admin: "default",
  manager: "secondary",
  seller: "secondary",
  agent: "outline",
  user: "outline",
};

function UsersPage() {
  const { profile, memberships } = useAuth();
  const companyId = profile?.current_company_id ?? memberships[0]?.company_id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["company-members", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("company_members")
        .select("id, user_id, role, position, status, last_access_at, created_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const ids = members?.map((m) => m.user_id) ?? [];
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, phone")
        .in("id", ids);

      const map = new Map(profiles?.map((p) => [p.id, p]) ?? []);
      return members!.map((m) => ({ ...m, profile: map.get(m.user_id) }));
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie os membros da sua empresa e suas permissões."
        actions={
          <Button
            onClick={() => toast.info("Convite de usuários em breve.")}
            className="bg-gradient-brand text-primary-foreground shadow-soft hover:opacity-95"
          >
            <UserPlus className="mr-2 h-4 w-4" /> Convidar usuário
          </Button>
        }
      />

      <div className="rounded-xl border bg-card shadow-soft">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Nenhum usuário ainda"
            description="Convide membros para colaborar na sua empresa."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => {
                const name = m.profile?.full_name || m.profile?.email || "—";
                const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-brand text-xs text-primary-foreground">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.position || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariant[m.role] ?? "outline"}>{roleLabel[m.role] ?? m.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === "active" ? "secondary" : "outline"}>
                        {m.status === "active" ? "Ativo" : m.status === "invited" ? "Convidado" : "Suspenso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.last_access_at ? new Date(m.last_access_at).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
