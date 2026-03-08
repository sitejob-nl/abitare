import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  addToQueue,
  getPendingMutations,
  getAllMutations,
  updateMutationStatus,
  removeMutation,
  type OfflineMutation,
} from "@/lib/offlineQueue";
import { toast } from "sonner";

const MAX_RETRIES = 5;

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflicts, setConflicts] = useState<OfflineMutation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Refresh counts periodically
  useEffect(() => {
    refreshCounts();
    const interval = setInterval(refreshCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshCounts = useCallback(async () => {
    try {
      const all = await getAllMutations();
      setPendingCount(all.filter(m => m.status === "pending").length);
      setConflicts(all.filter(m => m.status === "conflict"));
    } catch {
      // IndexedDB not available
    }
  }, []);

  const queueMutation = useCallback(async (
    table: string,
    operation: OfflineMutation["operation"],
    data: Record<string, unknown>,
    matchColumn?: string,
    matchValue?: string,
  ) => {
    if (navigator.onLine) {
      // Try direct execution first
      try {
        await executeMutation({ table, operation, data, matchColumn, matchValue } as OfflineMutation);
        return { queued: false, success: true };
      } catch {
        // Fall through to queue
      }
    }

    await addToQueue({ table, operation, data, matchColumn, matchValue });
    await refreshCounts();
    toast.info("Opgeslagen in offline wachtrij", {
      description: "Wordt automatisch verstuurd bij verbinding.",
    });
    return { queued: true, success: true };
  }, [refreshCounts]);

  const executeMutation = async (mutation: OfflineMutation) => {
    const { table, operation, data, matchColumn, matchValue } = mutation;

    if (operation === "insert") {
      const { error } = await supabase.from(table as any).insert(data as any);
      if (error) throw error;
    } else if (operation === "update" && matchColumn && matchValue) {
      // Check for conflicts: fetch server version
      // Check for conflicts: fetch server version
      const { data: serverData, error: fetchErr } = await supabase
        .from(table as any)
        .select("*")
        .eq(matchColumn, matchValue)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      // If server has updated_at newer than our mutation, it's a conflict
      const serverRecord = serverData as Record<string, unknown> | null;
      if (serverRecord?.updated_at && mutation.createdAt) {
        const serverUpdated = new Date(serverRecord.updated_at as string).getTime();
        const mutationCreated = new Date(mutation.createdAt).getTime();
        if (serverUpdated > mutationCreated) {
          throw { conflict: true, serverVersion: serverRecord };
        }
      }

      const { error } = await supabase
        .from(table as any)
        .update(data as any)
        .eq(matchColumn, matchValue);
      if (error) throw error;
    } else if (operation === "upsert") {
      const { error } = await supabase.from(table as any).upsert(data as any);
      if (error) throw error;
    }
  };

  const processQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingMutations();
      let processed = 0;
      let failed = 0;

      for (const mutation of pending) {
        try {
          await updateMutationStatus(mutation.id, "processing");
          await executeMutation(mutation);
          await removeMutation(mutation.id);
          processed++;
        } catch (err: any) {
          if (err?.conflict) {
            await updateMutationStatus(mutation.id, "conflict", {
              serverVersion: err.serverVersion,
              retries: mutation.retries + 1,
            });
          } else if (mutation.retries >= MAX_RETRIES) {
            await updateMutationStatus(mutation.id, "failed", {
              errorMessage: err?.message || "Max retries reached",
              retries: mutation.retries + 1,
            });
            failed++;
          } else {
            await updateMutationStatus(mutation.id, "pending", {
              retries: mutation.retries + 1,
              errorMessage: err?.message,
            });
          }
        }
      }

      if (processed > 0) {
        toast.success(`${processed} offline wijziging(en) gesynchroniseerd`);
      }
      if (failed > 0) {
        toast.error(`${failed} wijziging(en) mislukt na ${MAX_RETRIES} pogingen`);
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshCounts();
    }
  }, [refreshCounts]);

  const resolveConflict = useCallback(async (
    mutationId: string,
    resolution: "keep_local" | "keep_server" | "discard"
  ) => {
    if (resolution === "discard" || resolution === "keep_server") {
      await removeMutation(mutationId);
    } else if (resolution === "keep_local") {
      // Re-queue as pending, it will force-update
      await updateMutationStatus(mutationId, "pending");
      await processQueue();
    }
    await refreshCounts();
  }, [processQueue, refreshCounts]);

  return {
    isOnline,
    pendingCount,
    conflicts,
    isSyncing,
    queueMutation,
    processQueue,
    resolveConflict,
    refreshCounts,
  };
}
