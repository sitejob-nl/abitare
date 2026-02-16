import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductImages, type ProductImage } from '@/hooks/useProductImages';
import { Image, Loader2 } from 'lucide-react';

interface ProductImageGalleryProps {
  productId: string;
}

export function ProductImageGallery({ productId }: ProductImageGalleryProps) {
  const { data: images, isLoading } = useProductImages(productId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4" />
            Afbeeldingen
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!images || images.length === 0) return null;

  const mainImage = images.find(img => img.type === 'main') || images[0];
  const otherImages = images.filter(img => img.id !== mainImage.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Image className="h-4 w-4" />
          Afbeeldingen ({images.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main image */}
        <div className="rounded-lg overflow-hidden border bg-muted">
          <img
            src={mainImage.url}
            alt="Product hoofdafbeelding"
            className="w-full h-auto max-h-64 object-contain"
            loading="lazy"
          />
        </div>

        {/* Other images */}
        {otherImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {otherImages.map((img) => (
              <div key={img.id} className="rounded-md overflow-hidden border bg-muted aspect-square">
                <img
                  src={img.url}
                  alt={`Product ${img.type}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

