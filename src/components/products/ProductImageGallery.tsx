import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductImages, type ProductImage } from '@/hooks/useProductImages';
import { Image, Loader2, Ruler, Zap, FileText, Box, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductImageGalleryProps {
  productId: string;
}

const MEDIA_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  photo: { label: 'Foto\'s', icon: <Image className="h-3.5 w-3.5" /> },
  dimension_drawing: { label: 'Maattekeningen', icon: <Ruler className="h-3.5 w-3.5" /> },
  energy_label: { label: 'Energielabels', icon: <Zap className="h-3.5 w-3.5" /> },
  datasheet: { label: 'Datasheets', icon: <FileText className="h-3.5 w-3.5" /> },
  '3d_model': { label: '3D', icon: <Box className="h-3.5 w-3.5" /> },
};

function isPdf(url: string) {
  return url.toLowerCase().endsWith('.pdf');
}

function ImageGrid({ images, onSelect }: { images: ProductImage[]; onSelect: (img: ProductImage) => void }) {
  if (images.length === 1) {
    const img = images[0];
    if (isPdf(img.url)) {
      return (
        <a href={img.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border p-3 text-sm text-primary hover:bg-muted transition-colors">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">Document openen</span>
          <ExternalLink className="h-3.5 w-3.5 ml-auto shrink-0" />
        </a>
      );
    }
    return (
      <div className="rounded-lg overflow-hidden border bg-muted cursor-pointer" onClick={() => onSelect(img)}>
        <img src={img.url} alt="Product" className="w-full h-auto max-h-64 object-contain" loading="lazy" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {images.map((img) =>
        isPdf(img.url) ? (
          <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border p-3 text-sm text-primary hover:bg-muted transition-colors">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">Document openen</span>
            <ExternalLink className="h-3.5 w-3.5 ml-auto shrink-0" />
          </a>
        ) : (
          <div key={img.id} className="rounded-md overflow-hidden border bg-muted cursor-pointer aspect-video" onClick={() => onSelect(img)}>
            <img src={img.url} alt="Product" className="w-full h-full object-contain" loading="lazy" />
          </div>
        )
      )}
    </div>
  );
}

export function ProductImageGallery({ productId }: ProductImageGalleryProps) {
  const { data: images, isLoading } = useProductImages(productId);
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4" />
            Media
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!images || images.length === 0) return null;

  // Group by media_type
  const grouped: Record<string, ProductImage[]> = {};
  for (const img of images) {
    const type = img.media_type || 'photo';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(img);
  }

  const availableTypes = Object.keys(MEDIA_TYPE_CONFIG).filter((t) => grouped[t]?.length);

  if (availableTypes.length === 0) return null;

  // If only one type, no tabs needed
  const singleType = availableTypes.length === 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Image className="h-4 w-4" />
          Media ({images.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Lightbox */}
        {selectedImage && !isPdf(selectedImage.url) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setSelectedImage(null)}>
            <img src={selectedImage.url} alt="Product vergroting" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" />
          </div>
        )}

        {singleType ? (
          <ImageGrid images={grouped[availableTypes[0]]} onSelect={setSelectedImage} />
        ) : (
          <Tabs defaultValue={availableTypes[0]}>
            <TabsList className="w-full flex-wrap h-auto gap-1">
              {availableTypes.map((type) => {
                const cfg = MEDIA_TYPE_CONFIG[type];
                return (
                  <TabsTrigger key={type} value={type} className="text-xs gap-1">
                    {cfg.icon}
                    {cfg.label}
                    <span className="text-muted-foreground ml-0.5">({grouped[type].length})</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {availableTypes.map((type) => (
              <TabsContent key={type} value={type}>
                <ImageGrid images={grouped[type]} onSelect={setSelectedImage} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
