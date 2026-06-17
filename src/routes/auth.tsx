import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Phone, Building2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/app/theme-toggle";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — Elevo" },
      { name: "description", content: "Acesse a plataforma Elevo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(mode === "signup" ? "signup" : "login");

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/app" });
    }
  }, [loading, session, navigate]);

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-brand lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" aria-hidden />
        <div className="relative">
          <Logo size="lg" className="text-primary-foreground [&>span]:text-primary-foreground" />
        </div>
        <div className="relative space-y-4 text-primary-foreground">
          <h2 className="text-3xl font-semibold tracking-tight">Eleve seu negócio.</h2>
          <p className="max-w-md text-primary-foreground/80">
            Uma plataforma única para CRM, atendimento, automações, IA e gestão.
            Tudo conectado para você crescer mais rápido.
          </p>
        </div>
        <p className="relative text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} Elevo
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col bg-background">
        <header className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Logo />
          <ThemeToggle />
        </header>
        <div className="hidden justify-end p-4 lg:flex">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">
                {tab === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {tab === "login"
                  ? "Acesse sua plataforma Elevo."
                  : "Comece com 7 dias grátis, sem cartão."}
              </p>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-6">
                <LoginForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-6">
                <SignupForm onSuccess={() => setTab("login")} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Credenciais inválidas", { description: error.message });
      return;
    }
    toast.success("Bem-vindo!");
  };

  const handleReset = async () => {
    if (!email) {
      toast.error("Informe o e-mail para redefinir a senha.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um e-mail com o link de redefinição.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="login-email" label="E-mail" icon={Mail}>
        <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" className="pl-9" />
      </Field>
      <Field id="login-password" label="Senha" icon={Lock}>
        <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
      </Field>
      <div className="flex justify-end">
        <button type="button" onClick={handleReset} className="text-xs text-primary hover:underline">
          Esqueci minha senha
        </button>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-primary-foreground shadow-soft hover:opacity-95">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Entrar
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">← Voltar para o início</Link>
      </p>
    </form>
  );
}

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    if (error) {
      setLoading(false);
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }

    // If session is already returned (auto-confirm), create the company
    if (data.session) {
      const { error: rpcError } = await supabase.rpc("create_company_with_owner", {
        p_name: companyName,
        p_phone: phone || null,
        p_email: email,
      });
      if (rpcError) {
        setLoading(false);
        toast.error("Conta criada, mas falhou ao criar empresa", { description: rpcError.message });
        return;
      }
      toast.success("Conta e empresa criadas! Bem-vindo ao Elevo.");
      // AuthProvider listener will pick up the session and the router will redirect.
    } else {
      toast.success("Verifique seu e-mail para confirmar a conta.");
      // Save desired company name in localStorage so onboarding can pick it up
      try { localStorage.setItem("elevo:pending-company", companyName); } catch {}
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="su-name" label="Seu nome" icon={User}>
          <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Maria Silva" className="pl-9" />
        </Field>
        <Field id="su-company" label="Empresa" icon={Building2}>
          <Input id="su-company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Minha Empresa" className="pl-9" />
        </Field>
      </div>
      <Field id="su-email" label="E-mail" icon={Mail}>
        <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" className="pl-9" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="su-phone" label="Telefone" icon={Phone}>
          <Input id="su-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" className="pl-9" />
        </Field>
        <Field id="su-password" label="Senha" icon={Lock}>
          <Input id="su-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín. 8 caracteres" className="pl-9" />
        </Field>
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-primary-foreground shadow-soft hover:opacity-95">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta e iniciar trial
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Ao continuar, você concorda com nossos Termos de Uso.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
