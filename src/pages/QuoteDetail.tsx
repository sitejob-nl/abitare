import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Loader2, Send, Save } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useQuote, useUpdateQuote, QuoteStatus } from "@/hooks/useQuotes";
import { useQuoteSections } from "@/hooks/useQuoteSections";
import { QuoteHeader } from "@/components/quotes/QuoteHeader";
import { QuoteSectionCard } from "@/components/quotes/QuoteSectionCard";
import { QuoteTotals } from "@/components/quotes/QuoteTotals";
import { AddSectionDialog } from "@/components/quotes/AddSectionDialog";
import { toast } from "@/hooks/use-toast";

function getCustomerName(customer: { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

const QuoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAddSection, setShowAddSection] = useState(false);

  const { data: quote, isLoading: quoteLoading, error: quoteError } = useQuote(id);
  const { data: sections, isLoading: sectionsLoading } = useQuoteSections(id);
  const updateQuote = useUpdateQuote();

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

  const handleSave = async () => {
    if (!id || !sections) return;

    // Calculate totals from sections
    let subtotalProducts = 0;
    let subtotalMontage = 0;

    sections.forEach((section) => {
      const sectionTotal = section.quote_lines?.reduce(
        (sum, line) => sum + (line.line_total || 0),
        0
      ) || 0;

      if (section.section_type === "montage") {
        subtotalMontage += sectionTotal;
      } else {
        subtotalProducts += sectionTotal;
      }
    });

    const discountAmount = quote?.discount_amount || 0;
    const totalExclVat = subtotalProducts + subtotalMontage - discountAmount;
    const totalVat = totalExclVat * 0.21;
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

  const handleSend = () => {
    // Future: implement sending functionality
    toast({
      title: "Binnenkort beschikbaar",
      description: "De verzend functionaliteit wordt later toegevoegd.",
    });
  };

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
    <AppLayout title={`Offerte #${quote.quote_number}`} breadcrumb={`Offertes / #${quote.quote_number}`}>
      <QuoteHeader
        quoteNumber={quote.quote_number}
        customerName={getCustomerName(customer)}
        status={quote.status as QuoteStatus}
        validUntil={quote.valid_until}
        quoteDate={quote.quote_date}
        onStatusChange={handleStatusChange}
        isUpdating={updateQuote.isPending}
      />

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

      {/* Sections */}
      <div className="space-y-4">
        {sections && sections.length > 0 ? (
          sections.map((section) => (
            <QuoteSectionCard
              key={section.id}
              section={section}
              quoteId={id!}
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

      {/* Totals */}
      {sections && sections.length > 0 && (
        <QuoteTotals
          sections={sections}
          discountAmount={quote.discount_amount || 0}
          paymentTerms={quote.payment_terms_description || undefined}
        />
      )}

      {/* Action buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleSave}
          disabled={updateQuote.isPending}
        >
          {updateQuote.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Opslaan
        </Button>

        <Button className="gap-2" onClick={handleSend}>
          <Send className="h-4 w-4" />
          Versturen naar klant
        </Button>
      </div>

      <AddSectionDialog
        open={showAddSection}
        onOpenChange={setShowAddSection}
        quoteId={id!}
        existingSectionsCount={sections?.length || 0}
      />
    </AppLayout>
  );
};

export default QuoteDetail;
