/**
 * Calculate the dealer/selling price from a catalog price based on supplier settings.
 *
 * For "points" price systems the catalog price (in points) is multiplied by
 * `points_to_eur` to convert to EUR, then by `price_factor`.
 * For regular price systems the catalog price is simply multiplied by `price_factor`.
 *
 * This mirrors the database function `calc_selling_price`.
 */
export interface SupplierPriceConfig {
  price_system?: string | null;
  points_to_eur?: number | null;
  price_factor?: number | null;
}

export function calculateDealerPrice(
  catalogPrice: number,
  supplier: SupplierPriceConfig | null | undefined
): number {
  if (!supplier) return catalogPrice;

  const factor = supplier.price_factor ?? 1.0;

  if (supplier.price_system === "points" && supplier.points_to_eur != null) {
    return Math.round(catalogPrice * supplier.points_to_eur * factor * 100) / 100;
  }

  return Math.round(catalogPrice * factor * 100) / 100;
}
