import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that clears the React Query cache when the active division changes.
 * This ensures data is refetched with the new division filter.
 * Should be called once in the app layout.
 */
export function useDivisionChange() {
  const queryClient = useQueryClient();
  const { activeDivisionId } = useAuth();
  const previousDivisionId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Skip the initial render (when previousDivisionId is undefined)
    if (previousDivisionId.current === undefined) {
      previousDivisionId.current = activeDivisionId;
      return;
    }

    // Only clear cache if division actually changed
    if (previousDivisionId.current !== activeDivisionId) {
      queryClient.clear();
      previousDivisionId.current = activeDivisionId;
    }
  }, [activeDivisionId, queryClient]);
}
