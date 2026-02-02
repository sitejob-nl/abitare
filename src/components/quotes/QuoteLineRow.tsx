import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { QuoteLine, useUpdateQuoteLine, useDeleteQuoteLine, calculateLineTotal } from "@/hooks/useQuoteLines";
import { cn } from "@/lib/utils";

interface QuoteLineRowProps {
  line: QuoteLine;
  quoteId: string;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function QuoteLineRow({ line, quoteId }: QuoteLineRowProps) {
  const updateLine = useUpdateQuoteLine();
  const deleteLine = useDeleteQuoteLine();
  
  const [quantity, setQuantity] = useState(line.quantity?.toString() || "1");
  const [unitPrice, setUnitPrice] = useState(line.unit_price?.toString() || "0");
  const [discount, setDiscount] = useState(line.discount_percentage?.toString() || "0");

  const handleBlur = (field: "quantity" | "unit_price" | "discount_percentage", value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (field === "quantity" && numValue !== line.quantity) {
      updateLine.mutate({ id: line.id, quoteId, quantity: numValue });
    } else if (field === "unit_price" && numValue !== line.unit_price) {
      updateLine.mutate({ id: line.id, quoteId, unit_price: numValue });
    } else if (field === "discount_percentage" && numValue !== line.discount_percentage) {
      updateLine.mutate({ id: line.id, quoteId, discount_percentage: numValue });
    }
  };

  const handleDelete = () => {
    if (confirm("Weet je zeker dat je deze regel wilt verwijderen?")) {
      deleteLine.mutate({ id: line.id, quoteId });
    }
  };

  // Calculate display total from current input values
  const displayTotal = calculateLineTotal(
    parseFloat(quantity) || 0,
    parseFloat(unitPrice) || 0,
    parseFloat(discount) || 0
  );

  return (
    <TableRow className={cn(
      "group",
      line.is_group_header && "bg-muted/50 font-medium"
    )}>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {line.article_code || "-"}
      </TableCell>
      <TableCell className="max-w-[200px]">
        <span className="line-clamp-2 text-sm">{line.description}</span>
      </TableCell>
      <TableCell className="w-20">
        <Input
          type="number"
          min="0"
          step="1"
          className="h-8 text-right text-sm"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={(e) => handleBlur("quantity", e.target.value)}
        />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {line.unit || "stuk"}
      </TableCell>
      <TableCell className="w-24">
        <Input
          type="number"
          min="0"
          step="0.01"
          className="h-8 text-right text-sm"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          onBlur={(e) => handleBlur("unit_price", e.target.value)}
        />
      </TableCell>
      <TableCell className="w-16">
        <Input
          type="number"
          min="0"
          max="100"
          step="1"
          className="h-8 text-right text-sm"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          onBlur={(e) => handleBlur("discount_percentage", e.target.value)}
        />
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(displayTotal)}
      </TableCell>
      <TableCell className="w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteLine.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
