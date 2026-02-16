import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PimsImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  total: number;
  images_downloaded?: number;
  images_queued?: number;
  image_errors?: number;
  errors?: string[];
}

export function usePimsImport() {
  const { toast } = useToast();
  const [progress, setProgress] = useState<string>('');

  const importMutation = useMutation({
    mutationFn: async ({
      supplierId,
      categoryId,
      format,
      fileContent,
      fileName,
    }: {
      supplierId: string;
      categoryId?: string;
      format: 'bmecat' | 'csv' | 'tradepi';
      fileContent: string; // base64
      fileName: string;
    }): Promise<PimsImportResult> => {
      setProgress('Authenticatie controleren...');
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Niet ingelogd');

      setProgress('Bestand uploaden en verwerken...');
      const response = await fetch(
        `https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/pims-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            supplier_id: supplierId,
            category_id: categoryId,
            format,
            file_content: fileContent,
            file_name: fileName,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'PIMS import mislukt');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setProgress('');
      toast({
        title: 'PIMS import geslaagd',
        description: `${data.inserted} nieuw, ${data.updated} bijgewerkt, ${data.images_queued || data.images_downloaded || 0} afbeeldingen in wachtrij.`,
      });
    },
    onError: (error: Error) => {
      setProgress('');
      toast({
        title: 'PIMS import mislukt',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    importPims: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    importResult: importMutation.data,
    importError: importMutation.error,
    progress,
    reset: () => {
      importMutation.reset();
      setProgress('');
    },
  };
}
