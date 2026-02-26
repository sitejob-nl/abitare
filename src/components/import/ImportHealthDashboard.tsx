import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Package, Clock, TrendingDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface SupplierHealth {
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  product_count: number;
  products_without_price: number;
  last_import_at: string | null;
  last_import_source: string | null;
  last_import_errors: number;
}

export function ImportHealthDashboard() {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ["import-health"],
    queryFn: async () => {
      // Fetch suppliers with product counts
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");

      if (!suppliers) return [];

      // Fetch product counts per supplier
      const { data: productCounts } = await supabase
        .from("products")
        .select("supplier_id")
        .eq("is_active", true);

      // Fetch products without price
      const { data: noPriceProducts } = await supabase
        .from("products")
        .select("supplier_id, id")
        .eq("is_active", true)
        .is("base_price", null);

      // Check which of those have product_prices
      const noPriceIds = noPriceProducts?.map(p => p.id) || [];
      let idsWithPrices = new Set<string>();
      if (noPriceIds.length > 0) {
        // Check in batches
        for (let i = 0; i < noPriceIds.length; i += 500) {
          const chunk = noPriceIds.slice(i, i + 500);
          const { data: pp } = await supabase
            .from("product_prices")
            .select("product_id")
            .in("product_id", chunk);
          pp?.forEach(p => idsWithPrices.add(p.product_id!));
        }
      }

      // Fetch latest import per supplier
      const { data: imports } = await supabase
        .from("import_logs")
        .select("supplier_id, created_at, source, errors")
        .order("created_at", { ascending: false });

      // Build maps
      const countMap = new Map<string, number>();
      productCounts?.forEach(p => {
        if (p.supplier_id) countMap.set(p.supplier_id, (countMap.get(p.supplier_id) || 0) + 1);
      });

      const noPriceMap = new Map<string, number>();
      noPriceProducts?.forEach(p => {
        if (p.supplier_id && !idsWithPrices.has(p.id)) {
          noPriceMap.set(p.supplier_id, (noPriceMap.get(p.supplier_id) || 0) + 1);
        }
      });

      const importMap = new Map<string, { created_at: string; source: string; errors: number }>();
      imports?.forEach(imp => {
        if (imp.supplier_id && !importMap.has(imp.supplier_id)) {
          importMap.set(imp.supplier_id, {
            created_at: imp.created_at,
            source: imp.source,
            errors: imp.errors || 0,
          });
        }
      });

      return suppliers.map((s): SupplierHealth => {
        const lastImport = importMap.get(s.id);
        return {
          supplier_id: s.id,
          supplier_name: s.name,
          supplier_code: s.code || "",
          product_count: countMap.get(s.id) || 0,
          products_without_price: noPriceMap.get(s.id) || 0,
          last_import_at: lastImport?.created_at || null,
          last_import_source: lastImport?.source || null,
          last_import_errors: lastImport?.errors || 0,
        };
      });
    },
    staleTime: 60000,
  });

  if (isLoading || !healthData) return null;

  const warnings = healthData.filter(s => s.product_count === 0 || s.products_without_price > 10);
  const healthy = healthData.filter(s => s.product_count > 0 && s.products_without_price <= 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Import Health Dashboard
          {warnings.length > 0 && (
            <Badge variant="destructive" className="ml-2">{warnings.length} waarschuwing{warnings.length !== 1 ? "en" : ""}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {healthData.map((s) => {
            const hasWarning = s.product_count === 0;
            const hasPriceWarning = s.products_without_price > 10;

            return (
              <div
                key={s.supplier_id}
                className={`rounded-lg border p-3 space-y-2 ${hasWarning ? "border-destructive/50 bg-destructive/5" : hasPriceWarning ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm truncate">{s.supplier_name}</div>
                  {hasWarning ? (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  ) : hasPriceWarning ? (
                    <TrendingDown className="h-4 w-4 text-orange-500 shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Producten:</span>
                    <span className={`ml-1 font-medium ${s.product_count === 0 ? "text-destructive" : ""}`}>
                      {s.product_count}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Zonder prijs:</span>
                    <span className={`ml-1 font-medium ${s.products_without_price > 10 ? "text-orange-600" : ""}`}>
                      {s.products_without_price}
                    </span>
                  </div>
                </div>

                {s.last_import_at && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(s.last_import_at), { addSuffix: true, locale: nl })}
                    <span>({s.last_import_source})</span>
                    {s.last_import_errors > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1 ml-1">
                        {s.last_import_errors} fouten
                      </Badge>
                    )}
                  </div>
                )}
                {!s.last_import_at && (
                  <div className="text-xs text-muted-foreground italic">Nog nooit geïmporteerd</div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
