import { useCurrentServiceBudget } from "@/hooks/useServiceBudget";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ServiceBudget() {
  const { isAdminOrManager } = useAuth();
  const { data: budget, isLoading } = useCurrentServiceBudget();

  // Only show to admin/manager
  if (!isAdminOrManager) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-base font-semibold text-foreground">Service Budget {new Date().getFullYear()}</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-base font-semibold text-foreground">Service Budget {new Date().getFullYear()}</h2>
        </div>
        <div className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Geen budget ingesteld voor dit jaar</p>
        </div>
      </div>
    );
  }

  const spent = budget.used_amount || 0;
  const total = budget.total_budget || 0;
  const percentage = total > 0 ? (spent / total) * 100 : 0;
  const bonusPercentage = budget.bonus_percentage || 10;
  const potentialBonus = Math.round((total - spent) * (bonusPercentage / 100));

  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Service Budget {budget.year}</h2>
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">Besteed</span>
          <span className="text-[13px] font-semibold text-foreground">
            € {spent.toLocaleString("nl-NL")} / € {total.toLocaleString("nl-NL")}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border-light pt-4">
          <span className="text-[13px] text-muted-foreground">Potentiële bonus ({bonusPercentage}%)</span>
          <span className="text-sm font-semibold text-success">
            € {potentialBonus.toLocaleString("nl-NL")}
          </span>
        </div>
      </div>
    </div>
  );
}
