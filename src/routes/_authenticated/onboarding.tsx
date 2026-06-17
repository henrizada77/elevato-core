import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { memberships, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && memberships.length > 0) {
      navigate({ to: "/app", replace: true });
    }
  }, [loading, memberships, navigate]);

  useEffect(() => {
    try {
      const pending = localStorage.getItem("elevo:pending-company");
      if (pending) setName(pending);
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.rpc("create_company_with_owner", {
      p_name: name,
      p_phone: phone || null,
      p_email: null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Falha ao criar empresa", { description: error.message });
      return;
    }
    try { localStorage.removeItem("elevo:pending-company"); } catch {}
    toast.success("Empresa criada! Bem-vindo ao Elevo.");
    await refresh();
    navigate({ to: "/app" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
      <div className="relative w-full max-w-md space-y-6 rounded-2xl border bg-card/90 p-8 shadow-elegant backdrop-blur">
        <div className="space-y-3 text-center">
          <Logo className="justify-center" />
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-soft px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Vamos configurar sua empresa
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Criar sua empresa</h1>
          <p className="text-sm text-muted-foreground">
            Seu trial de 7 dias começa agora.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company">Nome da empresa</Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="company" required value={name} onChange={(e) => setName(e.target.value)} className="pl-9" placeholder="Minha Empresa" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone (opcional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-gradient-brand text-primary-foreground shadow-soft hover:opacity-95">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar empresa e continuar
          </Button>
        </form>
      </div>
    </div>
  );
}
