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
import { Send, Loader2, FileText } from "lucide-react";
import { useSendEmailWithAttachments } from "@/hooks/useMicrosoftMail";
import { useMicrosoftConnection } from "@/hooks/useMicrosoftConnection";
import { generateQuotePdfBase64 } from "@/lib/generateQuotePdfBase64";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateQuote } from "@/hooks/useQuotes";
import { toast } from "sonner";

interface SendQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: {
    id: string;
    quote_number: number;
    quote_date: string | null;
    valid_until: string | null;
    payment_terms_description: string | null;
    discount_amount: number | null;
    customer: any;
    division: any;
    show_line_prices?: boolean;
    show_article_codes?: boolean;
  };
  sections: any[];
}

export function SendQuoteDialog({ open, onOpenChange, quote, sections }: SendQuoteDialogProps) {
  const customer = quote.customer || {};
  const customerEmail = customer.email || "";
  const customerName = customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Klant";

  const [to, setTo] = useState(customerEmail);
  const [subject, setSubject] = useState(`Offerte #${quote.quote_number} - ${customerName}`);
  const [body, setBody] = useState(
    `Beste ${customerName},\n\nBijgevoegd vindt u onze offerte #${quote.quote_number}.\n\nMocht u vragen hebben, neem gerust contact met ons op.\n\nMet vriendelijke groet`
  );
  const [isSending, setIsSending] = useState(false);

  const { data: connection } = useMicrosoftConnection();
  const { mutateAsync: sendEmail } = useSendEmailWithAttachments();
  const updateQuote = useUpdateQuote();
  const { user, activeDivisionId } = useAuth();

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTo(customerEmail);
      setSubject(`Offerte #${quote.quote_number} - ${customerName}`);
      setBody(`Beste ${customerName},\n\nBijgevoegd vindt u onze offerte #${quote.quote_number}.\n\nMocht u vragen hebben, neem gerust contact met ons op.\n\nMet vriendelijke groet`);
    }
    onOpenChange(newOpen);
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error("Vul alle velden in");
      return;
    }

    if (!connection?.is_active) {
      toast.error("Microsoft koppeling niet actief", {
        description: "Ga naar Instellingen → Koppelingen om Microsoft te verbinden.",
      });
      return;
    }

    setIsSending(true);

    try {
      // Generate PDF
      const { base64, filename } = generateQuotePdfBase64(
        {
          quote_number: quote.quote_number,
          quote_date: quote.quote_date,
          valid_until: quote.valid_until,
          payment_terms_description: quote.payment_terms_description,
          discount_amount: quote.discount_amount,
          customer: quote.customer,
          division: quote.division,
          show_line_prices: quote.show_line_prices,
          show_article_codes: quote.show_article_codes,
        },
        sections
      );

      // Send email with PDF attachment
      await sendEmail({
        to: [to],
        subject,
        body: body.replace(/\n/g, "<br>"),
        attachments: [
          {
            name: filename,
            contentType: "application/pdf",
            contentBytes: base64,
          },
        ],
      });

      // Update quote status to 'verstuurd'
      await updateQuote.mutateAsync({
        id: quote.id,
        status: "verstuurd",
        sent_at: new Date().toISOString(),
      });

      // Log communication
      await supabase.from("communication_log").insert({
        type: "email" as const,
        direction: "outbound" as const,
        subject,
        body_preview: body.substring(0, 500),
        customer_id: customer.id || null,
        division_id: activeDivisionId || null,
        sent_by: user?.id || null,
        sent_at: new Date().toISOString(),
      });

      toast.success("Offerte verstuurd naar klant");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending quote:", error);
      toast.error("Fout bij verzenden", {
        description: error.message || "Probeer het opnieuw.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Offerte versturen naar klant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* PDF preview badge */}
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Offerte-{quote.quote_number}.pdf wordt automatisch bijgevoegd
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="send-to">Aan</Label>
            <Input
              id="send-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@voorbeeld.nl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="send-subject">Onderwerp</Label>
            <Input
              id="send-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="send-body">Bericht</Label>
            <Textarea
              id="send-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {!connection?.is_active && (
            <p className="text-sm text-destructive">
              ⚠ Microsoft koppeling is niet actief. Verbind eerst je account via Instellingen.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={isSending || !connection?.is_active}>
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Versturen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
