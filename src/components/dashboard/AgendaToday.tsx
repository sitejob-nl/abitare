import { cn } from "@/lib/utils";
import { useTodayAgenda } from "@/hooks/useTodayAgenda";
import { Loader2 } from "lucide-react";

export function AgendaToday() {
  const { data: agendaItems, isLoading } = useTodayAgenda();

  if (isLoading) {
    return (
      <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-base font-semibold text-foreground">Agenda vandaag</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Agenda vandaag</h2>
        <button className="text-[13px] font-medium text-primary hover:underline">
          Volledige agenda →
        </button>
      </div>
      {agendaItems && agendaItems.length > 0 ? (
        <div className="py-2">
          {agendaItems.map((item) => (
            <div
              key={item.id}
              className="flex cursor-pointer gap-3.5 px-6 py-3.5 transition-colors hover:bg-muted/50"
            >
              <div className="w-[50px] text-right text-[13px] font-semibold text-foreground/70">
                {item.time}
              </div>
              <div
                className={cn(
                  "mt-[5px] h-2.5 w-2.5 rounded-full",
                  `agenda-${item.type}`
                )}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Geen afspraken vandaag
        </div>
      )}
    </div>
  );
}
