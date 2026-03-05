import { useState, useRef, useEffect } from "react";
import { Trash2, GripVertical, Check, X, Palette, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuoteLine, useUpdateQuoteLine, useDeleteQuoteLine, useCreateQuoteLine, calculateLineTotal } from "@/hooks/useQuoteLines";
import { fetchProductPrice } from "@/hooks/useProductPrices";
import { useProductRanges, useProductRange } from "@/hooks/useProductRanges";
import { usePriceGroups } from "@/hooks/usePriceGroups";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface EditableLineRowProps {
  line: QuoteLine;
  quoteId: string;
  lineNumber?: number;
  subLines?: QuoteLine[];
  sectionRangeId?: string | null;
  quoteDefaultRangeId?: string | null;
  sectionPriceGroupId?: string | null;
  sectionSupplierId?: string | null;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDimension(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return Math.round(value / 10).toString();
}

function parseDimension(value: string): number | null {
  const num = parseInt(value);
  if (isNaN(num)) return null;
  return num * 10; // Convert cm to mm
}

export function EditableLineRow({ line, quoteId, lineNumber, subLines = [], sectionRangeId, quoteDefaultRangeId, sectionPriceGroupId, sectionSupplierId }: EditableLineRowProps) {
  const updateLine = useUpdateQuoteLine();
  const deleteLine = useDeleteQuoteLine();
  const createLine = useCreateQuoteLine();
  
  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [description, setDescription] = useState(line.description || "");
  const [extraDescription, setExtraDescription] = useState(line.extra_description || "");
  const [quantity, setQuantity] = useState(line.quantity?.toString() || "1");
  const [unitPrice, setUnitPrice] = useState(line.unit_price?.toString() || "0");
  const [heightMm, setHeightMm] = useState(formatDimension(line.height_mm));
  const [widthMm, setWidthMm] = useState(formatDimension(line.width_mm));
  const [articleCode, setArticleCode] = useState(line.article_code || "");
  const [showOverridePopover, setShowOverridePopover] = useState(false);

  // Override range/price group data
  const overrideRangeId = (line as any).range_override_id as string | null;
  const { data: overrideRange } = useProductRange(overrideRangeId);
  const { data: ranges } = useProductRanges();
  const { data: priceGroups } = usePriceGroups(sectionSupplierId || undefined);
  const hasPriceGroups = !!sectionPriceGroupId && (priceGroups?.length ?? 0) > 0;

  const inputRef = useRef<HTMLInputElement>(null);

  // DnD setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: line.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const handleSave = (field: string) => {
    const updates: Record<string, any> = {};
    
    switch (field) {
      case "description":
        if (description !== line.description) updates.description = description;
        if (extraDescription !== (line.extra_description || "")) updates.extra_description = extraDescription || null;
        break;
      case "quantity":
        const qty = parseFloat(quantity) || 0;
        if (qty !== line.quantity) updates.quantity = qty;
        break;
      case "unit_price":
        const price = parseFloat(unitPrice) || 0;
        if (price !== line.unit_price) updates.unit_price = price;
        break;
      case "height":
        const h = parseDimension(heightMm);
        if (h !== line.height_mm) updates.height_mm = h;
        break;
      case "width":
        const w = parseDimension(widthMm);
        if (w !== line.width_mm) updates.width_mm = w;
        break;
      case "article_code":
        if (articleCode !== (line.article_code || "")) updates.article_code = articleCode || null;
        break;
    }

    if (Object.keys(updates).length > 0) {
      updateLine.mutate({ id: line.id, quoteId, ...updates });
    }
    setEditingField(null);
  };

  const handleCancel = (field: string) => {
    switch (field) {
      case "description":
        setDescription(line.description || "");
        setExtraDescription(line.extra_description || "");
        break;
      case "quantity":
        setQuantity(line.quantity?.toString() || "1");
        break;
      case "unit_price":
        setUnitPrice(line.unit_price?.toString() || "0");
        break;
      case "height":
        setHeightMm(formatDimension(line.height_mm));
        break;
      case "width":
        setWidthMm(formatDimension(line.width_mm));
        break;
      case "article_code":
        setArticleCode(line.article_code || "");
        break;
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave(field);
    } else if (e.key === "Escape") {
      handleCancel(field);
    }
  };

  const handleDuplicate = () => {
    const { id, created_at, product, ...rest } = line as any;
    createLine.mutate(
      { ...rest, quote_id: quoteId, sort_order: (line.sort_order || 0) + 1 },
      { onSuccess: () => toast({ title: "Regel gedupliceerd" }) }
    );
  };

  const handleDelete = () => {
    if (confirm("Weet je zeker dat je deze regel wilt verwijderen?")) {
      deleteLine.mutate({ id: line.id, quoteId });
    }
  };

  const handleOverrideChange = async (value: string) => {
    const newOverrideId = value === "none" ? null : value;
    setShowOverridePopover(false);

    // Update the override in DB
    updateLine.mutate({ id: line.id, quoteId, range_override_id: newOverrideId } as any);

    // Refetch the price if there's a product
    if (line.product_id) {
      try {
        const currentPriceType = ((line as any).price_type || "abitare") as "abitare" | "boekprijs";
        const priceResult = await fetchProductPrice(line.product_id, sectionRangeId || null, newOverrideId, quoteDefaultRangeId, currentPriceType, sectionPriceGroupId);
        if (priceResult.price != null) {
          updateLine.mutate({ id: line.id, quoteId, unit_price: priceResult.price, range_override_id: newOverrideId } as any);
        }
      } catch (error) {
        console.error("Error fetching override price:", error);
      }
    }
  };

  const handlePriceTypeChange = async (newType: string) => {
    // Update price_type in DB
    updateLine.mutate({ id: line.id, quoteId, price_type: newType } as any);

    // Refetch price with new type
    if (line.product_id) {
      try {
        const priceResult = await fetchProductPrice(
          line.product_id, 
          sectionRangeId || null, 
          overrideRangeId, 
          quoteDefaultRangeId,
          newType as "abitare" | "boekprijs",
          sectionPriceGroupId
        );
        if (priceResult.price != null) {
          updateLine.mutate({ id: line.id, quoteId, unit_price: priceResult.price, price_type: newType } as any);
        }
      } catch (error) {
        console.error("Error fetching price for type change:", error);
      }
    }
  };

  const displayTotal = calculateLineTotal(
    parseFloat(quantity) || 0,
    parseFloat(unitPrice) || 0,
    line.discount_percentage || 0
  );

  // Group header row styling
  if (line.is_group_header) {
    return (
      <TableRow 
        ref={setNodeRef}
        style={style}
        className={cn(
          "bg-accent/30 hover:bg-accent/40",
          isDragging && "opacity-50"
        )}
        {...attributes}
      >
        <TableCell className="w-6">
          <button {...listeners} className="cursor-grab touch-none">
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          </button>
        </TableCell>
        <TableCell className="text-center"></TableCell>
        <TableCell className="font-mono text-xs"></TableCell>
        <TableCell colSpan={4} className="font-semibold text-sm py-2">
          {editingField === "description" ? (
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "description")}
                className="h-7 text-sm"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSave("description")}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCancel("description")}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span 
              className="cursor-pointer hover:bg-accent/50 px-1 py-0.5 rounded"
              onClick={() => setEditingField("description")}
            >
              {line.group_title || line.description}
            </span>
          )}
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

  const renderEditableCell = (
    field: string,
    value: string,
    setValue: (v: string) => void,
    displayValue: string,
    className?: string,
    type: "text" | "number" = "text"
  ) => {
    if (editingField === field) {
      return (
        <div className="flex items-center gap-0.5">
          <Input
            ref={inputRef}
            type={type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, field)}
            className={cn("h-7 text-sm min-w-0", className)}
          />
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => handleSave(field)}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    return (
      <span 
        className="cursor-pointer hover:bg-accent/30 px-1 py-0.5 rounded transition-colors"
        onClick={() => setEditingField(field)}
      >
        {displayValue || "-"}
      </span>
    );
  };

  return (
    <>
      <TableRow 
        ref={setNodeRef}
        style={style}
        className={cn(
          "group",
          isDragging && "opacity-50 bg-accent/20"
        )}
        {...attributes}
      >
        <TableCell className="w-6">
          <button {...listeners} className="cursor-grab touch-none">
            <GripVertical className="h-4 w-4 text-muted-foreground/30 hover:text-muted-foreground" />
          </button>
        </TableCell>
        <TableCell className="text-center text-sm font-medium w-10">
          {lineNumber}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground w-24">
          {renderEditableCell("article_code", articleCode, setArticleCode, articleCode, "w-20")}
        </TableCell>
        <TableCell className="max-w-[280px]">
          {editingField === "description" ? (
            <div className="space-y-1">
              <div className="flex items-center gap-0.5">
                <Input
                  ref={inputRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, "description")}
                  placeholder="Omschrijving"
                  className="h-7 text-sm"
                />
              </div>
              <Input
                value={extraDescription}
                onChange={(e) => setExtraDescription(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "description")}
                placeholder="Extra omschrijving (optioneel)"
                className="h-7 text-sm text-muted-foreground"
              />
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleSave("description")}>
                  <Check className="h-3 w-3 mr-1" /> Opslaan
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleCancel("description")}>
                  <X className="h-3 w-3 mr-1" /> Annuleren
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div
                className="cursor-pointer hover:bg-accent/30 px-1 py-0.5 rounded transition-colors"
                onClick={() => setEditingField("description")}
              >
                <span className="line-clamp-1 text-sm">{line.description}</span>
                {line.extra_description && (
                  <span className="block text-xs text-muted-foreground line-clamp-1">
                    {line.extra_description}
                  </span>
                )}
              </div>
              {/* Price source indicator */}
              {(line as any).price_source_metadata && (
                <Badge variant="outline" className="text-[10px] h-5 border-emerald-300 text-emerald-700 bg-emerald-50" title={JSON.stringify((line as any).price_source_metadata)}>
                  {(line as any).price_source_metadata?.source === "manual" ? "Handmatig" : "Prijsgroep"}
                </Badge>
              )}
              {/* Override badge and price type badge */}
              {line.product_id && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Popover open={showOverridePopover} onOpenChange={setShowOverridePopover}>
                    <PopoverTrigger asChild>
                      <button
                        className="inline-flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {overrideRangeId ? (
                          <Badge variant="outline" className="text-[10px] h-5 gap-1 cursor-pointer border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100">
                            <Palette className="h-3 w-3" />
                            Override: {overrideRange?.code || "..."}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-5 gap-1 cursor-pointer opacity-0 group-hover:opacity-60 hover:!opacity-100">
                            <Palette className="h-3 w-3" />
                            Prijsgroep
                          </Badge>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Override prijsgroep</p>
                        <Select
                          value={overrideRangeId || "none"}
                          onValueChange={handleOverrideChange}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Geen override</SelectItem>
                            {hasPriceGroups
                              ? priceGroups?.map((pg) => (
                                  <SelectItem key={pg.id} value={pg.id}>
                                    {pg.code} - {pg.name}
                                  </SelectItem>
                                ))
                              : ranges?.map((range) => (
                                  <SelectItem key={range.id} value={range.id}>
                                    {range.code} - {range.name || range.collection || ""}
                                  </SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {/* Price type toggle */}
                  <button
                    className="inline-flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentType = ((line as any).price_type || "abitare") as string;
                      const newType = currentType === "abitare" ? "boekprijs" : "abitare";
                      handlePriceTypeChange(newType);
                    }}
                  >
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] h-5 cursor-pointer",
                        (line as any).price_type === "boekprijs" 
                          ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100" 
                          : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                      )}
                    >
                      {(line as any).price_type === "boekprijs" ? "Boekprijs" : "Abitare"}
                    </Badge>
                  </button>
                </div>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="text-center text-sm text-muted-foreground w-14">
          {renderEditableCell("height", heightMm, setHeightMm, formatDimension(line.height_mm), "w-12 text-center", "number")}
        </TableCell>
        <TableCell className="text-center text-sm text-muted-foreground w-14">
          {renderEditableCell("width", widthMm, setWidthMm, formatDimension(line.width_mm), "w-12 text-center", "number")}
        </TableCell>
        <TableCell className="w-20">
          {editingField === "quantity" ? (
            <div className="flex items-center gap-0.5">
              <Input
                ref={inputRef}
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "quantity")}
                className="h-7 text-right text-sm w-16"
              />
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleSave("quantity")}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span 
              className="cursor-pointer hover:bg-accent/30 px-2 py-1 rounded block text-right"
              onClick={() => setEditingField("quantity")}
            >
              {line.quantity}
            </span>
          )}
        </TableCell>
        <TableCell className="text-right font-medium w-28">
          {editingField === "unit_price" ? (
            <div className="flex items-center gap-0.5 justify-end">
              <Input
                ref={inputRef}
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "unit_price")}
                className="h-7 text-right text-sm w-20"
              />
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleSave("unit_price")}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span 
              className="cursor-pointer hover:bg-accent/30 px-2 py-1 rounded"
              onClick={() => setEditingField("unit_price")}
              title={`Stukprijs: ${formatCurrency(line.unit_price)}`}
            >
              {formatCurrency(displayTotal)}
            </span>
          )}
        </TableCell>
        <TableCell className="w-16">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              onClick={handleDuplicate}
              disabled={createLine.isPending}
              title="Dupliceren"
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
        <EditableSubLineRow 
          key={subLine.id} 
          line={subLine} 
          quoteId={quoteId} 
        />
      ))}
    </>
  );
}

function EditableSubLineRow({ line, quoteId }: { line: QuoteLine; quoteId: string }) {
  const updateLine = useUpdateQuoteLine();
  const deleteLine = useDeleteQuoteLine();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [description, setDescription] = useState(line.description || "");
  const [quantity, setQuantity] = useState(line.quantity?.toString() || "1");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: line.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingField]);

  const handleSave = (field: string) => {
    const updates: Record<string, any> = {};
    if (field === "description" && description !== line.description) {
      updates.description = description;
    }
    if (field === "quantity") {
      const qty = parseFloat(quantity) || 0;
      if (qty !== line.quantity) updates.quantity = qty;
    }
    if (Object.keys(updates).length > 0) {
      updateLine.mutate({ id: line.id, quoteId, ...updates });
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === "Enter") {
      handleSave(field);
    } else if (e.key === "Escape") {
      setEditingField(null);
    }
  };

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
    <TableRow 
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-muted/10",
        isDragging && "opacity-50"
      )}
      {...attributes}
    >
      <TableCell className="w-6 pl-6">
        <button {...listeners} className="cursor-grab touch-none">
          <GripVertical className="h-3 w-3 text-muted-foreground/30" />
        </button>
      </TableCell>
      <TableCell className="text-center text-xs text-muted-foreground">
        {line.sub_line_number || "."}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {line.article_code || ""}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground pl-4">
        {editingField === "description" ? (
          <Input
            ref={inputRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "description")}
            onBlur={() => handleSave("description")}
            className="h-6 text-xs"
          />
        ) : (
          <span 
            className="cursor-pointer hover:bg-accent/30 px-1 rounded"
            onClick={() => setEditingField("description")}
          >
            {line.description}
          </span>
        )}
      </TableCell>
      <TableCell></TableCell>
      <TableCell></TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">
        {editingField === "quantity" ? (
          <Input
            ref={inputRef}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "quantity")}
            onBlur={() => handleSave("quantity")}
            className="h-6 text-xs text-right w-12"
          />
        ) : (
          <span 
            className="cursor-pointer hover:bg-accent/30 px-1 rounded"
            onClick={() => setEditingField("quantity")}
          >
            {line.quantity}
          </span>
        )}
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
