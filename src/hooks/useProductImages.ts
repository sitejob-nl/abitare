import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  storage_path: string;
  type: string;
  media_type: string | null;
  sort_order: number;
  source: string;
  created_at: string;
}

export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-images', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_images' as any)
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as ProductImage[];
    },
    enabled: !!productId,
  });
}
