import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, ShieldCheck, Layers, Zap } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Elevo — Eleve seu negócio" },
      { name: "description", content: "Plataforma SaaS premium para gestão empresarial: CRM, atendimento, IA, automações e analytics em um só lugar." },
      { property: "og:title", content: "Elevo — Eleve seu negócio" },
      { property: "og:description", content: "Plataforma SaaS premium para gestão empresarial." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-hero" aria-hidden />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground shadow-soft hover:opacity-95">
            <Link to="/auth" search={{ mode: "signup" }}>
              Começar grátis
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-12 sm:pt-20">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-soft px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Plataforma all-in-one para empresas
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Eleve seu negócio com a{" "}
            <span className="text-gradient-brand">plataforma do futuro</span>
          </h1>
          <p className="mt-5 text-pretty text-base text-muted-foreground sm:text-lg">
            CRM, atendimento, inteligência artificial, automações e analytics —
            tudo integrado em um sistema moderno, rápido e preparado para escalar.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-95">
              <Link to="/auth" search={{ mode: "signup" }}>
                Iniciar trial gratuito <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">7 dias grátis • Sem cartão de crédito</p>
        </section>

        <section className="mx-auto mt-20 grid max-w-5xl gap-4 sm:grid-cols-3">
          {[
            { icon: Layers, title: "Modular", desc: "Ative apenas o que sua empresa precisa, quando precisar." },
            { icon: Zap, title: "Veloz", desc: "Interface ágil pensada para times que executam rápido." },
            { icon: ShieldCheck, title: "Seguro", desc: "Multi-tenant com isolamento total e RLS por empresa." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card/60 p-6 shadow-soft backdrop-blur transition-base hover:shadow-elegant"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Elevo. Todos os direitos reservados.</span>
          <span>Eleve seu negócio.</span>
        </div>
      </footer>
    </div>
  );
}
