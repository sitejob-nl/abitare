import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, Calendar, Settings2, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { QuoteStatus } from "@/hooks/useQuotes";
import { useSupplier } from "@/hooks/useSuppliers";
import { useProductRange } from "@/hooks/useProductRanges";
import { useProductColor } from "@/hooks/useProductColors";

interface QuoteHeaderProps {
  quoteNumber: number;
  customerName: string;
  status: QuoteStatus;
  validUntil: string | null;
  quoteDate: string | null;
  onStatusChange: (status: QuoteStatus) => void;
  isUpdating?: boolean;
  reference?: string | null;
  category?: string | null;
  defaultSupplierId?: string | null;
  defaultRangeId?: string | null;
  defaultColorId?: string | null;
  onConfigClick?: () => void;
  requiresTransport?: boolean;
  requiresKooiaap?: boolean;
}

const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  concept: { label: "Concept", variant: "secondary" },
  verstuurd: { label: "Verstuurd", variant: "default" },
  bekeken: { label: "Bekeken", variant: "default" },
  vervallen: { label: "Vervallen", variant: "destructive" },
  geaccepteerd: { label: "Geaccepteerd", variant: "outline" },
  afgewezen: { label: "Afgewezen", variant: "destructive" },
};

const categoryLabels: Record<string, string> = {
  keuken: "Keuken",
  sanitair: "Sanitair",
  meubels: "Meubels",
  tegels: "Tegels",
};

export function QuoteHeader({
  quoteNumber,
  customerName,
  status,
  validUntil,
  quoteDate,
  onStatusChange,
  isUpdating,
  reference,
  category,
  defaultSupplierId,
  defaultRangeId,
  defaultColorId,
  onConfigClick,
  requiresTransport,
  requiresKooiaap,
}: QuoteHeaderProps) {
  const { data: supplier } = useSupplier(defaultSupplierId);
  const { data: range } = useProductRange(defaultRangeId);
  const { data: color } = useProductColor(defaultColorId);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "d MMM yyyy", { locale: nl });
    } catch {
      return "-";
    }
  };

  // Build config summary
  const configParts: string[] = [];
  if (supplier?.name) configParts.push(supplier.name);
  if (range?.name || range?.code) configParts.push(range.name || range.code);
  if (color?.name) configParts.push(`Front: ${color.name}`);
  const configSummary = configParts.length > 0 ? configParts.join(" — ") : null;

  return (
    <div className="mb-6 space-y-4">
      {/* Back link */}
      <Link to="/quotes">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Terug naar offertes
        </Button>
      </Link>

      {/* Main header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[28px] font-semibold text-foreground">
              {reference || `Offerte #${quoteNumber}`}
            </h1>
            {category && (
              <Badge variant="outline" className="text-xs">
                {categoryLabels[category] || category}
              </Badge>
            )}
            {requiresTransport && (
              <Badge variant="outline" className="text-xs gap-1">
                <Truck className="h-3 w-3" />
                Transport{requiresKooiaap ? " + Kooiaap" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {reference ? `Offerte #${quoteNumber} — ` : ""}Klant: {customerName}
          </p>
          {/* Config summary */}
          {configSummary && (
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-xs text-muted-foreground">{configSummary}</p>
              {onConfigClick && (
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onConfigClick}>
                  <Settings2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          {!configSummary && onConfigClick && (
            <Button variant="ghost" size="sm" className="gap-1.5 mt-1 -ml-2 text-xs text-muted-foreground" onClick={onConfigClick}>
              <Settings2 className="h-3 w-3" />
              Configuratie instellen
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          {/* Status selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select
              value={status}
              onValueChange={(value) => onStatusChange(value as QuoteStatus)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue>
                  <Badge variant={statusConfig[status]?.variant || "secondary"}>
                    {statusConfig[status]?.label || status}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Datum: {formatDate(quoteDate)}
            </span>
            <span>
              Geldig tot: {formatDate(validUntil)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
