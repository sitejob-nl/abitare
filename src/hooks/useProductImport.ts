import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductRow {
  article_code: string;
  name: string;
  description?: string;
  cost_price?: number;
  base_price?: number;
}

interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  total: number;
  errors?: string[];
}

interface PriceGroupProduct {
  article_code: string;
  name: string;
  base_price?: number;
  width_mm?: number;
  height_mm?: number;
  depth_mm?: number;
  discount_group?: string;
  catalog_code?: string;
}

interface PriceGroupRange {
  code: string;
  name: string;
  count: number;
}

interface PriceGroupPrice {
  article_code: string;
  range_code: string;
  price: number;
  variant_2_code?: string;
  variant_2_name?: string;
}

interface PriceGroupImportResult {
  success: boolean;
  products_inserted: number;
  products_updated: number;
  ranges_created: number;
  prices_inserted: number;
  errors?: string[];
}

export function useProductImport() {
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async ({
      products,
      supplierId,
      categoryId,
    }: {
      products: ProductRow[];
      supplierId: string;
      categoryId?: string;
    }): Promise<ImportResult> => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('Niet ingelogd');
      }

      const response = await fetch(
        `https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/import-products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            products,
            supplier_id: supplierId,
            category_id: categoryId,
            import_mode: 'standard',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import mislukt');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Import geslaagd',
        description: `${data.inserted} nieuwe producten toegevoegd, ${data.updated} bestaande bijgewerkt.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import mislukt',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    importProducts: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    importResult: importMutation.data,
    importError: importMutation.error,
  };
}

export function usePriceGroupImport() {
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async ({
      products,
      ranges,
      prices,
      supplierId,
      categoryId,
    }: {
      products: PriceGroupProduct[];
      ranges: PriceGroupRange[];
      prices: PriceGroupPrice[];
      supplierId: string;
      categoryId?: string;
    }): Promise<PriceGroupImportResult> => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('Niet ingelogd');
      }

      const response = await fetch(
        `https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/import-products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            import_mode: 'price_groups',
            supplier_id: supplierId,
            category_id: categoryId,
            price_group_data: {
              products,
              ranges: ranges.map(r => ({ code: r.code, name: r.name })),
              prices,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import mislukt');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Import geslaagd',
        description: `${data.products_inserted + data.products_updated} producten verwerkt, ${data.ranges_created} prijsgroepen aangemaakt, ${data.prices_inserted.toLocaleString()} prijzen toegevoegd.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import mislukt',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    importPriceGroups: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    importResult: importMutation.data,
    importError: importMutation.error,
  };
}

// Helper function to parse price strings like "€ 1,275.00" or "1.275,00"
export function parsePrice(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value;
  
  let str = String(value).trim();
  
  // Remove currency symbols (€, $, £, ¥) and spaces
  str = str.replace(/[€$£¥\s]/g, '');
  
  // Check for special values (e.g., "-" means no price)
  if (str === '-' || str === '' || str === '--') return undefined;
  
  // Auto-detect format based on last separator position
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  
  // Determine if comma or dot is the decimal separator
  const isCommaDecimal = lastComma > lastDot;
  
  if (isCommaDecimal) {
    // European format: 1.275,00 → 1275.00
    str = str.replace(/\./g, '');   // Remove thousand separators
    str = str.replace(',', '.');    // Comma → decimal
  } else {
    // US format: 1,275.00 → 1275.00
    str = str.replace(/,/g, '');    // Remove thousand separators
  }
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? undefined : parsed;
}
