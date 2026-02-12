import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JsonPayload {
  fileName: string;
  data: Record<string, unknown>;
  stats: {
    products: number;
    ranges: number;
    prices: number;
  };
}

interface BulkChunkResult {
  fileName: string;
  success: boolean;
  products_inserted?: number;
  products_updated?: number;
  ranges_created?: number;
  prices_inserted?: number;
  error?: string;
}

interface BulkProgress {
  current: number;
  total: number;
  results: BulkChunkResult[];
}

export function useJsonImport() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);

  const parseJsonFiles = async (files: FileList): Promise<JsonPayload[]> => {
    const payloads: JsonPayload[] = [];

    for (const file of Array.from(files)) {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.import_mode || !data.price_group_data) {
        throw new Error(`${file.name}: Ongeldig JSON formaat (import_mode of price_group_data ontbreekt)`);
      }

      const pgd = data.price_group_data;
      payloads.push({
        fileName: file.name,
        data,
        stats: {
          products: pgd.products?.length || 0,
          ranges: pgd.ranges?.length || 0,
          prices: pgd.prices?.length || 0,
        },
      });
    }

    // Sort by filename for consistent ordering
    payloads.sort((a, b) => a.fileName.localeCompare(b.fileName));
    return payloads;
  };

  const importJsonChunks = async (
    payloads: JsonPayload[],
    overrideSupplierId?: string
  ) => {
    setIsImporting(true);
    setBulkProgress({ current: 0, total: payloads.length, results: [] });

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast({ title: 'Niet ingelogd', variant: 'destructive' });
      setIsImporting(false);
      return;
    }

    const results: BulkChunkResult[] = [];

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      setBulkProgress(prev => prev ? { ...prev, current: i + 1 } : null);

      try {
        const body = { ...payload.data };
        if (overrideSupplierId) {
          body.supplier_id = overrideSupplierId;
        }

        const response = await fetch(
          `https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/import-products`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          results.push({
            fileName: payload.fileName,
            success: false,
            error: error.error || `HTTP ${response.status}`,
          });
        } else {
          const result = await response.json();
          results.push({
            fileName: payload.fileName,
            success: true,
            products_inserted: result.products_inserted || 0,
            products_updated: result.products_updated || 0,
            ranges_created: result.ranges_created || 0,
            prices_inserted: result.prices_inserted || 0,
          });
        }
      } catch (err) {
        results.push({
          fileName: payload.fileName,
          success: false,
          error: err instanceof Error ? err.message : 'Onbekende fout',
        });
      }

      setBulkProgress(prev => prev ? { ...prev, results: [...results] } : null);

      // Delay between chunks
      if (i < payloads.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setIsImporting(false);

    const successCount = results.filter(r => r.success).length;
    toast({
      title: 'JSON import voltooid',
      description: `${successCount}/${payloads.length} chunks succesvol verwerkt.`,
      variant: successCount === payloads.length ? 'default' : 'destructive',
    });

    return results;
  };

  return {
    parseJsonFiles,
    importJsonChunks,
    isImporting,
    bulkProgress,
    resetProgress: () => setBulkProgress(null),
  };
}

export type { JsonPayload, BulkChunkResult, BulkProgress };
