import { cn } from "@/lib/utils";
import { useStosaModels } from "@/hooks/useStosaData";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChefHat } from "lucide-react";

interface StosaModelSelectorProps {
  value: string | null;
  onChange: (modelCode: string, modelName: string) => void;
}

export function StosaModelSelector({ value, onChange }: StosaModelSelectorProps) {
  const { data: models, isLoading } = useStosaModels();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Kies STOSA model</h3>
        <p className="text-sm text-muted-foreground">
          Selecteer de keukenlijn voor deze sectie
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {models?.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onChange(model.code, model.name)}
            className={cn(
              "relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left",
              "hover:border-primary hover:bg-primary/5",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              value === model.code
                ? "border-primary bg-primary/10"
                : "border-muted"
            )}
          >
            {value === model.code && (
              <div className="absolute top-3 right-3">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={cn(
                "flex items-center justify-center h-12 w-12 rounded-lg shrink-0",
                value === model.code
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <ChefHat className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div
                className={cn(
                  "font-medium",
                  value === model.code && "text-primary"
                )}
              >
                {model.name}
              </div>
              {model.description && (
                <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {model.description}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
