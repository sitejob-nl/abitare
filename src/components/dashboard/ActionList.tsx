import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  title: string;
  meta: string[];
  type: string;
  priority: "high" | "medium" | "low";
}

const actions: ActionItem[] = [
  {
    id: "1",
    title: "Offerte opvolgen - Fam. Janssen",
    meta: ["📞 Terugbellen", "Verlopen: 2 dagen"],
    type: "Offerte",
    priority: "high",
  },
  {
    id: "2",
    title: "Montage tekening controleren",
    meta: ["Order #2025-042", "Dhr. Pietersen"],
    type: "Controle",
    priority: "high",
  },
  {
    id: "3",
    title: "Leverdatum bevestigen",
    meta: ["Order #2025-039", "Mevr. De Vries"],
    type: "Planning",
    priority: "medium",
  },
  {
    id: "4",
    title: "Nieuwe lead - Website formulier",
    meta: ["Fam. Bakker", "Interesse: Design keuken"],
    type: "Lead",
    priority: "low",
  },
];

export function ActionList() {
  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Actiepunten</h2>
        <button className="text-[13px] font-medium text-primary hover:underline">
          Alles bekijken →
        </button>
      </div>
      <ul>
        {actions.map((action) => (
          <li
            key={action.id}
            className="flex cursor-pointer items-center gap-4 border-b border-border-light px-6 py-4 transition-colors last:border-b-0 hover:bg-muted/50"
          >
            <div
              className={cn(
                "h-10 w-1 rounded-sm",
                action.priority === "high" && "priority-high",
                action.priority === "medium" && "priority-medium",
                action.priority === "low" && "priority-low"
              )}
            />
            <div className="flex-1">
              <div className="mb-1 text-sm font-medium text-foreground">
                {action.title}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {action.meta.map((item, i) => (
                  <span key={i}>{item}</span>
                ))}
              </div>
            </div>
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/70">
              {action.type}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
