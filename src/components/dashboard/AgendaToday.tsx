import { cn } from "@/lib/utils";

interface AgendaItem {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  type: "showroom" | "inmeet" | "montage" | "levering";
}

const agendaItems: AgendaItem[] = [
  {
    id: "1",
    time: "09:30",
    title: "Showroombezoek",
    subtitle: "Fam. Bakker",
    type: "showroom",
  },
  {
    id: "2",
    time: "11:00",
    title: "Inmeetafspraak",
    subtitle: "Dhr. Hendriks - Roermond",
    type: "inmeet",
  },
  {
    id: "3",
    time: "14:00",
    title: "Montage dag 2",
    subtitle: "Mevr. Smeets - Weert",
    type: "montage",
  },
  {
    id: "4",
    time: "16:30",
    title: "Levering apparatuur",
    subtitle: "Order #2025-038",
    type: "levering",
  },
];

export function AgendaToday() {
  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Agenda vandaag</h2>
        <button className="text-[13px] font-medium text-primary hover:underline">
          Volledige agenda →
        </button>
      </div>
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
    </div>
  );
}
