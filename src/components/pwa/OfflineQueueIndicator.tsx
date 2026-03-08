import { Cloud, CloudOff, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import type { OfflineMutation } from "@/lib/offlineQueue";

export function OfflineQueueIndicator() {
  const { isOnline, pendingCount, conflicts, isSyncing, processQueue, resolveConflict } = useOfflineQueue();

  // Don't show if online and nothing pending
  if (isOnline && pendingCount === 0 && conflicts.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isOnline ? (
            isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Cloud className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <CloudOff className="h-4 w-4 text-destructive" />
          )}
          {(pendingCount > 0 || conflicts.length > 0) && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {pendingCount + conflicts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Offline wachtrij</h4>
            <Badge variant={isOnline ? "success" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>

          {pendingCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {pendingCount} wijziging(en) wachtend
              </span>
              {isOnline && (
                <Button size="sm" variant="outline" onClick={() => processQueue()} disabled={isSyncing}>
                  {isSyncing ? "Synchroniseren..." : "Nu synchroniseren"}
                </Button>
              )}
            </div>
          )}

          {!isOnline && pendingCount === 0 && conflicts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Je bent offline. Wijzigingen worden lokaal opgeslagen.
            </p>
          )}

          {conflicts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                {conflicts.length} conflict(en)
              </div>
              {conflicts.map((conflict) => (
                <ConflictItem
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={resolveConflict}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ConflictItem({
  conflict,
  onResolve,
}: {
  conflict: OfflineMutation;
  onResolve: (id: string, resolution: "keep_local" | "keep_server" | "discard") => void;
}) {
  return (
    <div className="rounded border p-2 text-xs space-y-2">
      <p className="font-medium">
        {conflict.table} — {conflict.operation}
      </p>
      <p className="text-muted-foreground">
        Data is server-side gewijzigd terwijl je offline was.
      </p>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={() => onResolve(conflict.id, "keep_local")}
        >
          Mijn versie
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={() => onResolve(conflict.id, "keep_server")}
        >
          Serverversie
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 text-destructive"
          onClick={() => onResolve(conflict.id, "discard")}
        >
          Verwijder
        </Button>
      </div>
    </div>
  );
}
