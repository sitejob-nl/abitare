import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuoteSection, useDeleteQuoteSection, SECTION_TYPES } from "@/hooks/useQuoteSections";
import { QuoteLine } from "@/hooks/useQuoteLines";
import { QuoteLineRow } from "./QuoteLineRow";
import { AddProductDialog } from "./AddProductDialog";

interface QuoteSectionCardProps {
  section: QuoteSection & { quote_lines: QuoteLine[] };
  quoteId: string;
  onEdit?: () => void;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function QuoteSectionCard({ section, quoteId, onEdit }: QuoteSectionCardProps) {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const deleteSection = useDeleteQuoteSection();

  const handleDelete = () => {
    if (confirm(`Weet je zeker dat je de sectie "${section.title || section.section_type}" wilt verwijderen? Alle regels in deze sectie worden ook verwijderd.`)) {
      deleteSection.mutate({ id: section.id, quoteId });
    }
  };

  const sectionLabel = SECTION_TYPES.find(t => t.value === section.section_type)?.label || section.section_type;
  const lines = section.quote_lines || [];
  
  // Calculate section subtotal from lines
  const subtotal = lines.reduce((sum, line) => sum + (line.line_total || 0), 0);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/30 py-3 px-4">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
            <CardTitle className="text-base font-semibold">
              {section.title || sectionLabel}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              ({sectionLabel})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteSection.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="w-24 text-[11px] uppercase tracking-wide">Artikel</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide">Omschrijving</TableHead>
                    <TableHead className="w-20 text-right text-[11px] uppercase tracking-wide">Aantal</TableHead>
                    <TableHead className="w-16 text-[11px] uppercase tracking-wide">Eenheid</TableHead>
                    <TableHead className="w-24 text-right text-[11px] uppercase tracking-wide">Prijs</TableHead>
                    <TableHead className="w-16 text-right text-[11px] uppercase tracking-wide">%</TableHead>
                    <TableHead className="w-28 text-right text-[11px] uppercase tracking-wide">Totaal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <QuoteLineRow key={line.id} line={line} quoteId={quoteId} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nog geen producten in deze sectie
            </div>
          )}

          {/* Section footer */}
          <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowAddProduct(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Product toevoegen
            </Button>
            <div className="text-sm">
              <span className="text-muted-foreground">Sectie totaal:</span>
              <span className="ml-2 font-semibold">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddProductDialog
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        quoteId={quoteId}
        sectionId={section.id}
      />
    </>
  );
}
