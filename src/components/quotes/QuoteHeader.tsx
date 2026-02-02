import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, Calendar } from "lucide-react";
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

interface QuoteHeaderProps {
  quoteNumber: number;
  customerName: string;
  status: QuoteStatus;
  validUntil: string | null;
  quoteDate: string | null;
  onStatusChange: (status: QuoteStatus) => void;
  isUpdating?: boolean;
}

const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  concept: { label: "Concept", variant: "secondary" },
  verstuurd: { label: "Verstuurd", variant: "default" },
  bekeken: { label: "Bekeken", variant: "default" },
  vervallen: { label: "Vervallen", variant: "destructive" },
  geaccepteerd: { label: "Geaccepteerd", variant: "outline" },
  afgewezen: { label: "Afgewezen", variant: "destructive" },
};

export function QuoteHeader({
  quoteNumber,
  customerName,
  status,
  validUntil,
  quoteDate,
  onStatusChange,
  isUpdating,
}: QuoteHeaderProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "d MMM yyyy", { locale: nl });
    } catch {
      return "-";
    }
  };

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
          <h1 className="font-display text-[28px] font-semibold text-foreground">
            Offerte #{quoteNumber}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Klant: {customerName}
          </p>
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
