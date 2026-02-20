import { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, Trash2, GripVertical, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuoteSection, useDeleteQuoteSection, SECTION_TYPES, useUpdateQuoteSection } from "@/hooks/useQuoteSections";
import { QuoteLine, useUpdateQuoteLine } from "@/hooks/useQuoteLines";
import { EditableLineRow } from "./EditableLineRow";
import { AddProductDialog } from "./AddProductDialog";
import { useProductRange } from "@/hooks/useProductRanges";
import { usePriceGroup } from "@/hooks/usePriceGroups";
import { QuoteSectionConfig, SectionConfigDisplay } from "./QuoteSectionConfig";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

interface SortableSectionCardProps {
  section: QuoteSection & { quote_lines: QuoteLine[] };
  quoteId: string;
  quoteDefaultRangeId?: string | null;
  onEdit?: () => void;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function SortableSectionCard({ section, quoteId, quoteDefaultRangeId, onEdit }: SortableSectionCardProps) {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const deleteSection = useDeleteQuoteSection();
  const updateLine = useUpdateQuoteLine();

  // Derive supplier ID: direct supplier_id takes priority, then range, then price_group
  const { data: sectionRange } = useProductRange(section.range_id);
  const { data: priceGroup } = usePriceGroup(section.price_group_id);
  const sectionSupplierId = (section as any).supplier_id || sectionRange?.supplier_id || priceGroup?.supplier_id || null;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDelete = () => {
    if (confirm(`Weet je zeker dat je de sectie "${section.title || section.section_type}" wilt verwijderen? Alle regels in deze sectie worden ook verwijderd.`)) {
      deleteSection.mutate({ id: section.id, quoteId });
    }
  };

  const handleLineDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const lines = section.quote_lines || [];
    const oldIndex = lines.findIndex((l) => l.id === active.id);
    const newIndex = lines.findIndex((l) => l.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Update sort_order for the moved line
    const newSortOrder = lines[newIndex].sort_order ?? newIndex;
    updateLine.mutate({ 
      id: active.id as string, 
      quoteId, 
      sort_order: newSortOrder 
    });
  };

  const sectionLabel = SECTION_TYPES.find(t => t.value === section.section_type)?.label || section.section_type;
  const lines = section.quote_lines || [];
  
  // Separate main lines from sub-lines
  const mainLines = useMemo(() => 
    lines.filter(line => !line.parent_line_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [lines]
  );
  
  const subLinesMap = useMemo(() => {
    const map = new Map<string, QuoteLine[]>();
    lines.filter(line => line.parent_line_id).forEach(subLine => {
      const parentId = subLine.parent_line_id!;
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(subLine);
    });
    return map;
  }, [lines]);

  const subtotal = lines.reduce((sum, line) => sum + (line.line_total || 0), 0);

  let lineNumber = 0;

  const lineIds = mainLines.map(l => l.id);

  return (
    <>
      <Card 
        ref={setNodeRef}
        style={style}
        className={cn(
          "overflow-hidden",
          isDragging && "opacity-50 shadow-lg"
        )}
        {...attributes}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/30 py-2.5 md:py-3 px-3 md:px-4">
          <div className="flex items-center gap-2 min-w-0">
            <button {...listeners} className="cursor-grab touch-none shrink-0">
              <GripVertical className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground" />
            </button>
            <CardTitle className="text-sm md:text-base font-semibold uppercase tracking-wide truncate">
              {section.title || sectionLabel}
            </CardTitle>
            <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">
              ({sectionLabel})
            </span>
          </div>
          <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setShowConfig(true)}
              title="Configuratie"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hidden sm:flex"
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

        <SectionConfigDisplay section={section} />

        <CardContent className="p-0">
          {lines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="w-6"></TableHead>
                    <TableHead className="w-10 text-center text-[11px] uppercase tracking-wide">no</TableHead>
                    <TableHead className="w-24 text-[11px] uppercase tracking-wide">code</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide">omschrijving</TableHead>
                    <TableHead className="w-14 text-center text-[11px] uppercase tracking-wide">hg</TableHead>
                    <TableHead className="w-14 text-center text-[11px] uppercase tracking-wide">br</TableHead>
                    <TableHead className="w-20 text-right text-[11px] uppercase tracking-wide">aantal</TableHead>
                    <TableHead className="w-28 text-right text-[11px] uppercase tracking-wide">bedrag</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleLineDragEnd}
                  >
                    <SortableContext items={lineIds} strategy={verticalListSortingStrategy}>
                      {mainLines.map((line) => {
                        if (!line.is_group_header) {
                          lineNumber++;
                        }
                        const subLines = subLinesMap.get(line.id) || [];
                        
                        return (
                          <EditableLineRow 
                            key={line.id} 
                            line={line} 
                            quoteId={quoteId}
                            lineNumber={line.is_group_header ? undefined : lineNumber}
                            subLines={subLines}
                            sectionRangeId={section.range_id}
                            quoteDefaultRangeId={quoteDefaultRangeId}
                            sectionPriceGroupId={section.price_group_id}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nog geen producten in deze sectie
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t bg-muted/10 px-3 md:px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 w-full sm:w-auto"
              onClick={() => setShowAddProduct(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Product toevoegen
            </Button>
            <div className="text-sm text-center sm:text-right">
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
        sectionRangeId={section.range_id}
        quoteDefaultRangeId={quoteDefaultRangeId}
        sectionSupplierId={sectionSupplierId}
        sectionPriceGroupId={section.price_group_id}
      />

      <QuoteSectionConfig
        section={section}
        open={showConfig}
        onOpenChange={setShowConfig}
      />
    </>
  );
}
