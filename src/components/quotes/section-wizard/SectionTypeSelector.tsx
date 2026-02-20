import { cn } from "@/lib/utils";
import type { SectionType } from "@/types/quote-sections";
import { WIZARD_SECTION_TYPES } from "@/types/quote-sections";
import { LayoutGrid, Refrigerator, Square, Droplet, Package } from "lucide-react";

interface SectionTypeSelectorProps {
  value: SectionType | null;
  onChange: (type: SectionType) => void;
}

const ICONS: Record<SectionType, React.ReactNode> = {
  keukenmeubelen: <LayoutGrid className="h-8 w-8" />,
  apparatuur: <Refrigerator className="h-8 w-8" />,
  werkbladen: <Square className="h-8 w-8" />,
  sanitair: <Droplet className="h-8 w-8" />,
  diversen: <Package className="h-8 w-8" />,
};

export function SectionTypeSelector({ value, onChange }: SectionTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Wat voor sectie wil je toevoegen?</h3>
        <p className="text-sm text-muted-foreground">
          Kies het type producten dat je aan de offerte wilt toevoegen
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {WIZARD_SECTION_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all",
              "hover:border-primary hover:bg-primary/5",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              value === type.value
                ? "border-primary bg-primary/10"
                : "border-muted"
            )}
          >
            <div
              className={cn(
                "text-muted-foreground transition-colors",
                value === type.value && "text-primary"
              )}
            >
              {ICONS[type.value]}
            </div>
            <div className="text-center">
              <div
                className={cn(
                  "font-medium",
                  value === type.value && "text-primary"
                )}
              >
                {type.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {type.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
