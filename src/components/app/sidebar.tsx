import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  Shield,
  LogOut,
  UserCircle,
  Tag,
  Workflow,
  Contact,
  Zap,
  BarChart3,
  Inbox,
  Sparkles,
  Store,
  CreditCard,
  KeyRound,
  Smartphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const mainNav = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, exact: true },
  { title: "Assistente AI", url: "/app/assistant", icon: Sparkles },
  { title: "Marketplace", url: "/app/marketplace", icon: Store },
  { title: "Usuários", url: "/app/users", icon: Users },
  { title: "Empresa", url: "/app/settings", icon: Building2 },
];

const inboxNav = [
  { title: "Caixa de entrada", url: "/app/inbox", icon: Inbox, exact: true },
  { title: "WhatsApp", url: "/app/inbox/whatsapp", icon: Smartphone },
  { title: "Filas", url: "/app/inbox/queues", icon: Workflow },
];

const crmNav = [
  { title: "Visão geral", url: "/app/crm", icon: BarChart3, exact: true },
  { title: "Leads", url: "/app/crm/leads", icon: UserCircle },
  { title: "Clientes", url: "/app/crm/customers", icon: Users },
  { title: "Empresas", url: "/app/crm/companies", icon: Building2 },
  { title: "Contatos", url: "/app/crm/contacts", icon: Contact },
  { title: "Funis", url: "/app/crm/pipelines", icon: Workflow },
  { title: "Tags", url: "/app/crm/tags", icon: Tag },
  { title: "Automações", url: "/app/crm/automations", icon: Zap },
  { title: "Configurações", url: "/app/crm/settings", icon: Settings },
];

const settingsNav = [
  { title: "Preferências", url: "/app/preferences", icon: Settings },
  { title: "Inteligência Artificial", url: "/app/settings/ai", icon: KeyRound },
  { title: "Plano e cobrança", url: "/app/settings/billing", icon: CreditCard },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isPlatformMaster, signOut } = useAuth();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const initials = (profile?.full_name || profile?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-4">
        <Link to="/app" className="flex items-center">
          <Logo size="sm" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Atendimento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {inboxNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isPlatformMaster && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/app/master")} tooltip="Painel Master">
                    <Link to="/app/master" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Painel Master</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-brand text-xs text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{profile?.full_name || "Usuário"}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
