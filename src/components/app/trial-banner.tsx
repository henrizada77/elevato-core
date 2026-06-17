import { differenceInDays, isPast } from "date-fns";
import { Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrialBannerProps {
  status: "trial" | "active" | "trial_expired" | "suspended" | "cancelled";
  trialEnd: string | Date;
  className?: string;
}

export function TrialBanner({ status, trialEnd, className }: TrialBannerProps) {
  const end = typeof trialEnd === "string" ? new Date(trialEnd) : trialEnd;

  if (status === "active") return null;

  if (status === "trial_expired" || (status === "trial" && isPast(end))) {
    return (
      <div className={cn(
        "flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm",
        className,
      )}>
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="font-medium text-destructive">Trial expirado.</span>
        <span className="text-muted-foreground">Entre em contato para ativar seu plano.</span>
      </div>
    );
  }

  if (status === "trial") {
    const daysLeft = Math.max(0, differenceInDays(end, new Date()));
    return (
      <div className={cn(
        "flex items-center gap-3 rounded-lg border border-primary/20 bg-gradient-soft px-4 py-2.5 text-sm",
        className,
      )}>
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium">
          {daysLeft === 0 ? "Último dia do trial" : `${daysLeft} dia${daysLeft > 1 ? "s" : ""} restantes`}
        </span>
        <span className="text-muted-foreground">no seu período gratuito.</span>
      </div>
    );
  }

  return null;
}
