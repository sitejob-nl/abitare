import { useState, Fragment } from "react";
import { Trash2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { QuoteLine, useUpdateQuoteLine, useDeleteQuoteLine, useCreateQuoteLine, calculateLineTotal } from "@/hooks/useQuoteLines";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface QuoteLineRowProps {
  line: QuoteLine;
  quoteId: string;
  lineNumber?: number;
  subLines?: QuoteLine[];
}


function formatDimension(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  // Convert mm to cm for display (divide by 10)
  return Math.round(value / 10).toString();
}

export function QuoteLineRow({ line, quoteId, lineNumber, subLines = [] }: QuoteLineRowProps) {
  const updateLine = useUpdateQuoteLine();
  const deleteLine = useDeleteQuoteLine();
  const createLine = useCreateQuoteLine();
  
  const [quantity, setQuantity] = useState(line.quantity?.toString() || "1");
  const [unitPrice, setUnitPrice] = useState(line.unit_price?.toString() || "0");

  const handleBlur = (field: "quantity" | "unit_price", value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (field === "quantity" && numValue !== line.quantity) {
      updateLine.mutate({ id: line.id, quoteId, quantity: numValue });
    } else if (field === "unit_price" && numValue !== line.unit_price) {
      updateLine.mutate({ id: line.id, quoteId, unit_price: numValue });
    }
  };

  const handleDuplicate = () => {
    const { id, created_at, product, ...rest } = line as any;
    createLine.mutate(
      {
        ...rest,
        quote_id: quoteId,
        sort_order: (line.sort_order || 0) + 1,
      },
      {
        onSuccess: () => toast({ title: "Regel gedupliceerd" }),
      }
    );
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
    line.discount_percentage || 0
  );

  // Group header row styling
  if (line.is_group_header) {
    return (
      <TableRow className="bg-accent/30 hover:bg-accent/40">
        <TableCell className="text-center"></TableCell>
        <TableCell className="font-mono text-xs"></TableCell>
        <TableCell colSpan={4} className="font-semibold text-sm py-2">
          {line.group_title || line.description}
        </TableCell>
        <TableCell className="text-right"></TableCell>
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

  return (
    <Fragment>
      {/* Main line */}
      <TableRow className="group">
        <TableCell className="text-center text-sm font-medium">
          {lineNumber}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {line.article_code || "-"}
        </TableCell>
        <TableCell className="max-w-[280px]">
          <div className="space-y-0.5">
            <span className="line-clamp-1 text-sm">{line.description}</span>
            {line.extra_description && (
              <span className="block text-xs text-muted-foreground line-clamp-1">
                {line.extra_description}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center text-sm text-muted-foreground">
          {formatDimension(line.height_mm)}
        </TableCell>
        <TableCell className="text-center text-sm text-muted-foreground">
          {formatDimension(line.width_mm)}
        </TableCell>
        <TableCell className="w-20">
          <Input
            type="number"
            min="0"
            step="0.01"
            className="h-8 text-right text-sm"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={(e) => handleBlur("quantity", e.target.value)}
          />
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(displayTotal)}
        </TableCell>
        <TableCell className="w-10">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              onClick={handleDuplicate}
              disabled={createLine.isPending}
              title="Dupliceren (F7)"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteLine.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Sub-lines */}
      {subLines.map((subLine) => (
        <SubLineRow 
          key={subLine.id} 
          line={subLine} 
          quoteId={quoteId} 
        />
      ))}
    </Fragment>
  );
}

// Sub-line component for accessories/sub-items
function SubLineRow({ line, quoteId }: { line: QuoteLine; quoteId: string }) {
  const deleteLine = useDeleteQuoteLine();
  const [quantity, setQuantity] = useState(line.quantity?.toString() || "1");

  const handleDelete = () => {
    if (confirm("Weet je zeker dat je deze subregel wilt verwijderen?")) {
      deleteLine.mutate({ id: line.id, quoteId });
    }
  };

  const displayTotal = calculateLineTotal(
    parseFloat(quantity) || 0,
    line.unit_price || 0,
    line.discount_percentage || 0
  );

  return (
    <TableRow className="group bg-muted/10">
      <TableCell className="text-center text-xs text-muted-foreground pl-6">
        {line.sub_line_number || "."}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {line.article_code || ""}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground pl-4">
        {line.description}
      </TableCell>
      <TableCell></TableCell>
      <TableCell></TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">
        {line.quantity}
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">
        {formatCurrency(displayTotal)}
      </TableCell>
      <TableCell className="w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteLine.isPending}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
