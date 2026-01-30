import { UserPlus, FileText, Calendar, BarChart3 } from "lucide-react";

const quickActions = [
  { icon: UserPlus, label: "Nieuwe klant" },
  { icon: FileText, label: "Nieuwe offerte" },
  { icon: Calendar, label: "Afspraak plannen" },
  { icon: BarChart3, label: "Rapport maken" },
];

export function QuickAccess() {
  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Snelle acties</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 p-5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2.5 rounded-lg border border-transparent bg-muted/50 px-4 py-5 transition-all hover:border-primary hover:bg-primary-subtle"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[13px] font-medium text-foreground">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
