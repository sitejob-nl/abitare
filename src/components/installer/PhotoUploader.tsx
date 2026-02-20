import { useState, useRef } from "react";
import { Camera, X, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type PhotoType = "voor" | "tijdens" | "na" | "schade";

interface Photo {
  id: string;
  file_path: string;
  file_name: string;
  photo_type: PhotoType;
  caption: string | null;
}

interface PhotoUploaderProps {
  workReportId: string;
  photos: Photo[];
  onUpload: (file: File, photoType: PhotoType, caption?: string) => Promise<void>;
  onDelete: (photoId: string, filePath: string) => Promise<void>;
  disabled?: boolean;
}

const photoTypeLabels: Record<PhotoType, string> = {
  voor: "Voor",
  tijdens: "Tijdens",
  na: "Na",
  schade: "Schade",
};

export function PhotoUploader({
  workReportId,
  photos,
  onUpload,
  onDelete,
  disabled,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<PhotoType>("tijdens");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await onUpload(file, selectedType);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const getPhotoUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from("work-report-photos")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const groupedPhotos = photos.reduce((acc, photo) => {
    const type = photo.photo_type as PhotoType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(photo);
    return acc;
  }, {} as Record<PhotoType, Photo[]>);

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedType}
          onValueChange={(v) => setSelectedType(v as PhotoType)}
          disabled={disabled}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(photoTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || uploading}
          className="min-h-[44px] gap-2"
        >
          <Camera className="h-4 w-4" />
          Camera
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="min-h-[44px] gap-2"
        >
          <Upload className="h-4 w-4" />
          Bestand
        </Button>

        {uploading && (
          <span className="text-sm text-muted-foreground">Uploaden...</span>
        )}
      </div>

      {/* Photo Grid by Type */}
      {Object.entries(photoTypeLabels).map(([type, label]) => {
        const typePhotos = groupedPhotos[type as PhotoType] || [];
        if (typePhotos.length === 0) return null;

        return (
          <div key={type} className="space-y-2">
            <Label className="text-sm font-medium">{label}</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {typePhotos.map((photo) => (
                <Card key={photo.id} className="group relative overflow-hidden">
                  <img
                    src={getPhotoUrl(photo.file_path)}
                    alt={photo.caption || photo.file_name}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                  {!disabled && (
                    <button
                      onClick={() => onDelete(photo.id, photo.file_path)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-2 sm:p-1.5 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  )}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-xs text-white">
                      {photo.caption}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {photos.length === 0 && (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nog geen foto's toegevoegd
          </p>
          <p className="text-xs text-muted-foreground">
            Maak foto's met de camera of upload bestanden
          </p>
        </Card>
      )}
    </div>
  );
}
