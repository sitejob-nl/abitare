import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Paperclip, X, FileText, Loader2 } from "lucide-react";
import { useSendEmailWithAttachments } from "@/hooks/useMicrosoftMail";
import { useCustomerQuotes, CustomerQuote } from "@/hooks/useCustomerQuotes";
import { useQuoteSections, QuoteSection } from "@/hooks/useQuoteSections";
import { useQuoteLines, QuoteLine } from "@/hooks/useQuoteLines";
import { generateQuotePdfBase64 } from "@/lib/generateQuotePdfBase64";
import { toast } from "sonner";

interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string;
}

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerEmail: string;
  customerId: string;
  customerName: string;
  replyToId?: string;
  initialSubject?: string;
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  customerEmail,
  customerId,
  customerName,
  replyToId,
  initialSubject = "",
}: ComposeEmailDialogProps) {
  const [to, setTo] = useState(customerEmail);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { mutate: sendEmail, isPending: isSending } = useSendEmailWithAttachments();
  const { data: quotes } = useCustomerQuotes(customerId);

  const handleSend = () => {
    if (!to || !subject || !body) {
      toast.error("Vul alle velden in");
      return;
    }

    sendEmail(
      {
        to: [to],
        subject,
        body: body.replace(/\n/g, "<br>"),
        attachments,
        replyToId,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSubject("");
          setBody("");
          setAttachments([]);
          setSelectedQuoteId("");
        },
      }
    );
  };

  const handleAddQuotePdf = async () => {
    if (!selectedQuoteId) {
      toast.error("Selecteer eerst een offerte");
      return;
    }

    const quote = quotes?.find((q) => q.id === selectedQuoteId);
    if (!quote) return;

    setIsGeneratingPdf(true);
    
    try {
      // We need to fetch sections and lines for this quote
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Fetch sections
      const { data: sections, error: sectionsError } = await supabase
        .from("quote_sections")
        .select("*")
        .eq("quote_id", selectedQuoteId)
        .order("sort_order", { ascending: true });

      if (sectionsError) throw sectionsError;

      // Fetch lines
      const { data: lines, error: linesError } = await supabase
        .from("quote_lines")
        .select("*")
        .eq("quote_id", selectedQuoteId)
        .order("sort_order", { ascending: true });

      if (linesError) throw linesError;

      // Combine sections with their lines
      const sectionsWithLines = (sections || []).map((section) => ({
        ...section,
        quote_lines: (lines || []).filter((line) => line.section_id === section.id),
      }));

      // Generate PDF
      const quoteData = {
        quote_number: quote.quote_number,
        quote_date: quote.quote_date,
        valid_until: quote.valid_until,
        payment_terms_description: quote.payment_terms_description,
        discount_amount: quote.discount_amount,
        customer: {
          first_name: null,
          last_name: customerName,
          company_name: null,
          street_address: null,
          postal_code: null,
          city: null,
          email: customerEmail,
          phone: null,
        },
        division: null,
      };

      const { base64, filename } = generateQuotePdfBase64(quoteData, sectionsWithLines);

      // Add to attachments
      setAttachments((prev) => [
        ...prev,
        {
          name: filename,
          contentType: "application/pdf",
          contentBytes: base64,
        },
      ]);

      setSelectedQuoteId("");
      toast.success(`${filename} toegevoegd als bijlage`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Kon PDF niet genereren");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {replyToId ? "Beantwoorden" : "Nieuwe email"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">Aan</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@voorbeeld.nl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Onderwerp</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Onderwerp van uw bericht"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Bericht</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Schrijf uw bericht..."
              className="min-h-[150px]"
            />
          </div>

          {/* Attachments section */}
          <div className="space-y-3">
            <Label>Bijlagen</Label>
            
            {/* Quote selector */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecteer een offerte" />
                </SelectTrigger>
                <SelectContent>
                  {quotes?.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      Offerte #{quote.quote_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddQuotePdf}
                disabled={!selectedQuoteId || isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4 mr-2" />
                )}
                Voeg PDF toe
              </Button>
            </div>

            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="border rounded-md p-3 space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted/50 rounded px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{attachment.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Verzenden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
