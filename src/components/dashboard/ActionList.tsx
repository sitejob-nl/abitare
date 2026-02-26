import { cn } from "@/lib/utils";
import { useActionItems } from "@/hooks/useActionItems";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ActionList() {
  const { data: actions, isLoading } = useActionItems(6);
  const navigate = useNavigate();

  const handleClick = (action: { sourceType: string; sourceId: string }) => {
    if (action.sourceType === "quote") navigate(`/quotes/${action.sourceId}`);
    else if (action.sourceType === "order") navigate(`/orders/${action.sourceId}`);
    else if (action.sourceType === "mention") navigate(`/service/${action.sourceId}`);
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-base font-semibold text-foreground">Actiepunten</h2>
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
        <h2 className="text-base font-semibold text-foreground">Actiepunten</h2>
        <button className="text-[13px] font-medium text-primary hover:underline">
          Alles bekijken →
        </button>
      </div>
      {actions && actions.length > 0 ? (
        <ul>
          {actions.map((action) => (
            <li
              key={action.id}
              onClick={() => handleClick(action)}
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
              <span className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium",
                action.sourceType === "mention" 
                  ? "bg-violet-100 text-violet-700"
                  : "bg-muted text-foreground/70"
              )}>
                {action.type}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Geen openstaande actiepunten
        </div>
      )}
    </div>
  );
}
