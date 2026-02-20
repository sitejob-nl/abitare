import { cn } from "@/lib/utils";
import { usePriceGroups } from "@/hooks/usePriceGroups";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Sparkles } from "lucide-react";

interface PriceGroupSelectorProps {
  supplierId: string;
  value: string | null;
  onChange: (priceGroupId: string, priceGroupCode: string) => void;
}

export function WizardPriceGroupSelector({ supplierId, value, onChange }: PriceGroupSelectorProps) {
  const { data: priceGroups, isLoading } = usePriceGroups(supplierId);

  const glassGroups = priceGroups?.filter((pg) => pg.is_glass) || [];
  const standardGroups = priceGroups?.filter((pg) => !pg.is_glass) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!priceGroups || priceGroups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Geen prijsgroepen gevonden voor deze leverancier.</p>
        <p className="text-sm mt-2">
          Zorg dat de STOSA prijslijst is geïmporteerd.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Kies prijsgroep</h3>
        <p className="text-sm text-muted-foreground">
          De prijsgroep bepaalt de prijzen voor alle producten in deze sectie
        </p>
      </div>

      {standardGroups.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Standaard deuren</h4>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {standardGroups.map((pg) => (
              <PriceGroupButton
                key={pg.id}
                code={pg.code}
                selected={value === pg.id}
                onClick={() => onChange(pg.id, pg.code)}
              />
            ))}
          </div>
        </div>
      )}

      {glassGroups.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Glasdeuren
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {glassGroups.map((pg) => (
              <PriceGroupButton
                key={pg.id}
                code={pg.code}
                selected={value === pg.id}
                onClick={() => onChange(pg.id, pg.code)}
                isGlass
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
        <strong>Let op:</strong> De prijsgroep staat op het orderformulier vermeld als een letter (A, B)
        of nummer (1-10) naast elk product.
      </div>
    </div>
  );
}

interface PriceGroupButtonProps {
  code: string;
  selected: boolean;
  onClick: () => void;
  isGlass?: boolean;
}

function PriceGroupButton({ code, selected, onClick, isGlass }: PriceGroupButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-h-[64px]",
        "hover:border-primary hover:bg-primary/5",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        selected
          ? "border-primary bg-primary/10"
          : "border-muted",
        isGlass && !selected && "border-accent bg-accent/20"
      )}
    >
      {selected && (
        <div className="absolute top-1 right-1">
          <Check className="h-3 w-3 text-primary" />
        </div>
      )}

      <span
        className={cn(
          "text-xl font-bold",
          selected ? "text-primary" : "text-foreground",
          isGlass && !selected && "text-accent-foreground"
        )}
      >
        {code}
      </span>

      {isGlass && (
        <span className="text-[10px] text-muted-foreground mt-0.5">glas</span>
      )}
    </button>
  );
}
