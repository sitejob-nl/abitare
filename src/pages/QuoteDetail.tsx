import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Loader2, Send, Save, FileDown, Settings2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuote, useUpdateQuote, QuoteStatus } from "@/hooks/useQuotes";
import { useQuoteSections, useUpdateQuoteSection } from "@/hooks/useQuoteSections";
import { QuoteHeader } from "@/components/quotes/QuoteHeader";
import { SortableSectionCard } from "@/components/quotes/SortableSectionCard";
import { QuoteTotals } from "@/components/quotes/QuoteTotals";
import { QuoteDiscountEditor } from "@/components/quotes/QuoteDiscountEditor";
import { QuoteActions } from "@/components/quotes/QuoteActions";
import { AddSectionDialog } from "@/components/quotes/AddSectionDialog";
import { QuoteConfigDialog } from "@/components/quotes/QuoteConfigDialog";
import { SendQuoteDialog } from "@/components/quotes/SendQuoteDialog";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import { toast } from "@/hooks/use-toast";
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

function getCustomerName(customer: { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

const QuoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAddSection, setShowAddSection] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const { data: quote, isLoading: quoteLoading, error: quoteError } = useQuote(id);
  const { data: sections, isLoading: sectionsLoading } = useQuoteSections(id);
  const updateQuote = useUpdateQuote();
  const updateSection = useUpdateQuoteSection();

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

  // Redirect if quote not found
  useEffect(() => {
    if (quoteError) {
      toast({
        title: "Offerte niet gevonden",
        description: "De offerte bestaat niet of je hebt geen toegang.",
        variant: "destructive",
      });
      navigate("/quotes");
    }
  }, [quoteError, navigate]);

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!id) return;
    
    try {
      await updateQuote.mutateAsync({ id, status: newStatus });
      toast({
        title: "Status bijgewerkt",
        description: `De status is gewijzigd naar "${newStatus}".`,
      });
    } catch (error) {
      toast({
        title: "Fout bij bijwerken",
        description: "De status kon niet worden bijgewerkt.",
        variant: "destructive",
      });
    }
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sections) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Update sort_order for the moved section
    const newSortOrder = sections[newIndex].sort_order ?? newIndex;
    updateSection.mutate({ 
      id: active.id as string, 
      sort_order: newSortOrder 
    });
  };

  const handleSave = async () => {
    if (!id || !sections) return;

    // Calculate totals from sections
    let subtotalProducts = 0;
    let subtotalMontage = 0;
    const vatByRate = new Map<number, number>();

    sections.forEach((section) => {
      const sectionTotal = section.quote_lines?.reduce(
        (sum, line) => sum + (line.line_total || 0),
        0
      ) || 0;

      const discountAmt = section.discount_percentage 
        ? (sectionTotal * (section.discount_percentage || 0)) / 100
        : (section.discount_amount || 0);
      const sectionNet = sectionTotal - discountAmt;
      const discFraction = sectionTotal > 0 ? sectionNet / sectionTotal : 1;

      section.quote_lines?.forEach((line) => {
        const rate = line.vat_rate ?? 21;
        const lineNet = (line.line_total || 0) * discFraction;
        vatByRate.set(rate, (vatByRate.get(rate) || 0) + lineNet);
      });

      if (section.section_type === "montage") {
        subtotalMontage += sectionNet;
      } else {
        subtotalProducts += sectionNet;
      }
    });

    const discountAmount = quote?.discount_amount || 0;
    const totalExclVat = subtotalProducts + subtotalMontage - discountAmount;
    const subBefore = subtotalProducts + subtotalMontage;
    const qFraction = subBefore > 0 ? totalExclVat / subBefore : 1;
    let totalVat = 0;
    vatByRate.forEach((base, rate) => {
      totalVat += base * qFraction * (rate / 100);
    });
    const totalInclVat = totalExclVat + totalVat;

    try {
      await updateQuote.mutateAsync({
        id,
        subtotal_products: subtotalProducts,
        subtotal_montage: subtotalMontage,
        total_excl_vat: totalExclVat,
        total_vat: totalVat,
        total_incl_vat: totalInclVat,
      });

      toast({
        title: "Offerte opgeslagen",
        description: "De totalen zijn bijgewerkt.",
      });
    } catch (error) {
      toast({
        title: "Fout bij opslaan",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = () => {
    if (!quote || !sections) return;

    try {
      generateQuotePdf(
        {
          quote_number: quote.quote_number,
          quote_date: quote.quote_date,
          valid_until: quote.valid_until,
          payment_terms_description: quote.payment_terms_description,
          discount_amount: quote.discount_amount,
          customer: quote.customer as any,
          division: quote.division as any,
          show_line_prices: (quote as any).show_line_prices,
          show_article_codes: (quote as any).show_article_codes,
        },
        sections
      );

      toast({
        title: "PDF geëxporteerd",
        description: `De offerte is gedownload als PDF.`,
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Fout bij exporteren",
        description: "Er is iets misgegaan bij het genereren van de PDF.",
        variant: "destructive",
      });
    }
  };

  const handleSend = () => {
    setShowSendDialog(true);
  };

  // Calculate subtotal for discount editor
  const subtotalExclVat = useMemo(() => {
    if (!sections) return 0;
    return sections.reduce((total, section) => {
      const sectionTotal = section.quote_lines?.reduce(
        (sum, line) => sum + (line.line_total || 0),
        0
      ) || 0;
      return total + sectionTotal;
    }, 0);
  }, [sections]);

  const sectionIds = useMemo(() => sections?.map(s => s.id) || [], [sections]);

  if (quoteLoading || sectionsLoading) {
    return (
      <AppLayout title="Offerte" breadcrumb="Offerte laden...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!quote) {
    return null;
  }

  const customer = quote.customer as { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null;

  return (
    <AppLayout title={`Offerte ${quote.reference || `#${quote.quote_number}`}`} breadcrumb={`Offertes / ${quote.reference || `#${quote.quote_number}`}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <QuoteHeader
          quoteNumber={quote.quote_number}
          customerName={getCustomerName(customer)}
          status={quote.status as QuoteStatus}
          validUntil={quote.valid_until}
          quoteDate={quote.quote_date}
          onStatusChange={handleStatusChange}
          isUpdating={updateQuote.isPending}
          reference={quote.reference}
          category={quote.category}
          defaultSupplierId={quote.default_supplier_id}
          defaultRangeId={quote.default_range_id}
          defaultColorId={quote.default_color_id}
          onConfigClick={() => setShowConfig(true)}
          requiresTransport={(quote as any).requires_transport ?? false}
          requiresKooiaap={(quote as any).requires_kooiaap ?? false}
        />
        <QuoteActions 
          quoteId={id!} 
          quoteNumber={quote.quote_number}
          customerName={getCustomerName(customer)}
          totalAmount={quote.total_incl_vat || 0}
          status={quote.status || "concept"}
          hasOrder={Array.isArray(quote.orders) && quote.orders.length > 0}
        />
      </div>

      {/* Add section button */}
      <div className="mb-4">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowAddSection(true)}
        >
          <Plus className="h-4 w-4" />
          Nieuwe sectie
        </Button>
      </div>

      {/* Sections + Sticky sidebar layout */}
      <div className="lg:flex lg:gap-6">
        <div className="flex-1 min-w-0">
          {/* Sections with drag & drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {sections && sections.length > 0 ? (
                  sections.map((section) => (
                    <SortableSectionCard
                      key={section.id}
                      section={section}
                      quoteId={id!}
                      quoteDefaultRangeId={quote.default_range_id}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      Deze offerte heeft nog geen secties.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Klik op "Nieuwe sectie" om te beginnen.
                    </p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Discount & Payment terms editor */}
          {sections && sections.length > 0 && (
            <QuoteDiscountEditor
              quoteId={id!}
              discountAmount={quote.discount_amount || 0}
              discountPercentage={quote.discount_percentage}
              discountDescription={quote.discount_description}
              paymentTermsDescription={quote.payment_terms_description}
              paymentCondition={quote.payment_condition}
              subtotalExclVat={subtotalExclVat}
            />
          )}

          {/* Totals - mobile only */}
          <div className="lg:hidden">
            {sections && sections.length > 0 && (
              <QuoteTotals
                sections={sections}
                discountAmount={quote.discount_amount || 0}
                paymentTerms={quote.payment_terms_description || undefined}
              />
            )}
          </div>
        </div>

        {/* Sticky sidebar - desktop only */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-20">
            {sections && sections.length > 0 && (
              <QuoteTotals
                sections={sections}
                discountAmount={quote.discount_amount || 0}
                paymentTerms={quote.payment_terms_description || undefined}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 flex-1 sm:flex-none"
            onClick={handleSave}
            disabled={updateQuote.isPending}
          >
            {updateQuote.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Opslaan</span>
            <span className="sm:hidden">Opslaan</span>
          </Button>

          <Button
            variant="outline"
            className="gap-2 flex-1 sm:flex-none"
            onClick={handleExportPdf}
            disabled={!sections || sections.length === 0}
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">PDF Exporteren</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>

        <Button className="gap-2 w-full sm:w-auto" onClick={handleSend}>
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Versturen naar klant</span>
          <span className="sm:hidden">Versturen</span>
        </Button>
      </div>

      <AddSectionDialog
        open={showAddSection}
        onOpenChange={setShowAddSection}
        quoteId={id!}
        existingSectionsCount={sections?.length || 0}
        quoteDefaultSupplierId={quote.default_supplier_id}
        quoteDefaultRangeId={quote.default_range_id}
        quoteDefaultPriceGroupId={quote.default_price_group_id}
      />

      <QuoteConfigDialog
        open={showConfig}
        onOpenChange={setShowConfig}
        quoteId={id!}
        currentCategory={quote.category}
        currentReference={quote.reference}
        currentSupplierId={quote.default_supplier_id}
        currentRangeId={quote.default_range_id}
        currentColorId={quote.default_color_id}
        currentPriceGroupId={quote.default_price_group_id}
        currentCorpusColorId={quote.default_corpus_color_id}
        currentRequiresTransport={(quote as any).requires_transport ?? false}
        currentRequiresKooiaap={(quote as any).requires_kooiaap ?? false}
        currentShowLinePrices={(quote as any).show_line_prices ?? true}
        currentShowArticleCodes={(quote as any).show_article_codes ?? true}
      />

      {quote && sections && (
        <SendQuoteDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          quote={{
            id: quote.id,
            quote_number: quote.quote_number,
            quote_date: quote.quote_date,
            valid_until: quote.valid_until,
            payment_terms_description: quote.payment_terms_description,
            discount_amount: quote.discount_amount,
            customer: quote.customer,
            division: quote.division as any,
            show_line_prices: (quote as any).show_line_prices,
            show_article_codes: (quote as any).show_article_codes,
          }}
          sections={sections}
        />
      )}
    </AppLayout>
  );

export default QuoteDetail;
