import { useEffect } from "react";
import { CheckSquare, Square, Loader2, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrderChecklist } from "@/hooks/useOrderChecklist";
import { Badge } from "@/components/ui/badge";

interface ChecklistCardProps {
  orderId: string;
}

export function ChecklistCard({ orderId }: ChecklistCardProps) {
  const { data: items, isLoading, initChecklist, toggleItem, allChecked } = useOrderChecklist(orderId);

  const hasItems = items && items.length > 0;
  const checkedCount = items?.filter((i) => i.checked).length ?? 0;
  const totalCount = items?.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Bestelklaar checklist
          </CardTitle>
          {hasItems && (
            <Badge variant={allChecked ? "default" : "secondary"} className="text-[10px]">
              {checkedCount}/{totalCount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : !hasItems ? (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground mb-2">
              Nog geen checklist aangemaakt.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => initChecklist.mutate(orderId)}
              disabled={initChecklist.isPending}
            >
              {initChecklist.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Checklist aanmaken
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem.mutate({ itemId: item.id, checked: !item.checked })}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-muted",
                  item.checked && "text-muted-foreground"
                )}
                disabled={toggleItem.isPending}
              >
                {item.checked ? (
                  <CheckSquare className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={cn(item.checked && "line-through")}>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
