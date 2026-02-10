import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export interface OrderGateContext {
  currentStatus: OrderStatus | string | null;
  paymentStatus: string | null;
  depositRequired: boolean;
  depositInvoiceSent: boolean;
  checklistComplete?: boolean;
}

export interface GateResult {
  allowed: boolean;
  reason: string | null;
}

/**
 * Validates whether a status transition is allowed based on business rules (gates).
 *
 * Rules:
 * - To "bestel_klaar" or "besteld": if deposit_required, payment must be "deels_betaald" or "betaald"
 * - To "besteld": previous status must be "controle" (vier-ogen principe)
 */
export function validateStatusTransition(
  targetStatus: OrderStatus,
  context: OrderGateContext
): GateResult {
  const { currentStatus, paymentStatus, depositRequired, checklistComplete } = context;

  // Gate: checklist must be complete before bestel_klaar
  if (targetStatus === "bestel_klaar") {
    if (checklistComplete === false) {
      return {
        allowed: false,
        reason: "Niet alle checklist-items zijn afgevinkt.",
      };
    }
  }

  // Gate: deposit payment required before bestel_klaar or besteld
  if (targetStatus === "bestel_klaar" || targetStatus === "besteld") {
    if (depositRequired && paymentStatus !== "betaald" && paymentStatus !== "deels_betaald") {
      return {
        allowed: false,
        reason: "Aanbetaling moet (deels) betaald zijn voordat deze status bereikt kan worden.",
      };
    }
  }

  // Gate: besteld requires previous status to be "controle" (vier-ogen principe)
  if (targetStatus === "besteld") {
    if (currentStatus !== "controle") {
      return {
        allowed: false,
        reason: "Order moet eerst de status 'Controle' hebben gehad (vier-ogen principe).",
      };
    }
  }

  return { allowed: true, reason: null };
}

/**
 * Returns a map of all statuses with their gate result for a given order context.
 */
export function getBlockedStatuses(
  context: OrderGateContext
): Record<string, GateResult> {
  const allStatuses: OrderStatus[] = [
    "nieuw", "bestel_klaar", "controle", "besteld",
    "in_productie", "levering_gepland", "geleverd",
    "montage_gepland", "gemonteerd", "nazorg", "afgerond",
  ];

  const results: Record<string, GateResult> = {};
  for (const status of allStatuses) {
    results[status] = validateStatusTransition(status, context);
  }
  return results;
}
