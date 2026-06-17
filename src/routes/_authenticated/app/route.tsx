import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/sidebar";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Logo } from "@/components/brand/logo";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShellLayout,
});

function AppShellLayout() {
  const { memberships, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && memberships.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, memberships, navigate]);

  if (loading || memberships.length === 0) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="hidden lg:block">
                <Logo size="sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
