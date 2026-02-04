import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Send,
  ArrowLeft,
  Reply,
  ExternalLink,
  Loader2,
  Paperclip,
  AlertCircle,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMicrosoftConnection } from "@/hooks/useMicrosoftConnection";
import { useCustomerEmails } from "@/hooks/useCustomerEmails";
import { useMicrosoftEmail, MicrosoftEmail } from "@/hooks/useMicrosoftMail";
import { ComposeEmailDialog } from "./ComposeEmailDialog";
import { cn } from "@/lib/utils";

interface CustomerCommunicationTabProps {
  customerId: string;
  customerEmail: string | null | undefined;
  customerName: string;
}

export function CustomerCommunicationTab({
  customerId,
  customerEmail,
  customerName,
}: CustomerCommunicationTabProps) {
  const isMobile = useIsMobile();
  const { data: connection, isLoading: connectionLoading } = useMicrosoftConnection();
  const { data: emails, isLoading: emailsLoading } = useCustomerEmails(customerEmail);
  
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<MicrosoftEmail | null>(null);

  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId);
  };

  const handleBackToList = () => {
    setSelectedEmailId(null);
  };

  const handleReply = (email: MicrosoftEmail) => {
    setReplyToEmail(email);
    setShowComposeDialog(true);
  };

  const handleNewEmail = () => {
    setReplyToEmail(null);
    setShowComposeDialog(true);
  };

  // No Microsoft connection
  if (!connectionLoading && !connection?.is_active) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Microsoft account niet verbonden</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Verbind je Microsoft account om emails te bekijken en te versturen.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/settings"}>
            Ga naar Instellingen
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No customer email
  if (!customerEmail) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Geen email adres bekend</h3>
          <p className="text-sm text-muted-foreground">
            Voeg een email adres toe aan deze klant om de communicatie te bekijken.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderEmailList = () => (
    <div className="space-y-1">
      {emailsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : emails && emails.length > 0 ? (
        emails.map((email) => (
          <div
            key={email.id}
            className={cn(
              "p-3 rounded-md cursor-pointer transition-colors",
              selectedEmailId === email.id
                ? "bg-primary/10 border-l-2 border-primary"
                : "hover:bg-muted/50",
              !email.isRead && "bg-muted/30"
            )}
            onClick={() => handleEmailClick(email.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {!email.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                  <span className={cn(
                    "text-sm truncate",
                    !email.isRead && "font-semibold"
                  )}>
                    {email.from?.emailAddress?.address?.toLowerCase() === customerEmail?.toLowerCase()
                      ? `Van: ${customerName}`
                      : `Aan: ${customerName}`}
                  </span>
                </div>
                <p className={cn(
                  "text-sm truncate mt-0.5",
                  !email.isRead ? "font-medium" : "text-muted-foreground"
                )}>
                  {email.subject || "(geen onderwerp)"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {email.bodyPreview}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(email.receivedDateTime), "d MMM", { locale: nl })}
                </span>
                {email.hasAttachments && (
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Geen emails gevonden met deze klant</p>
        </div>
      )}
    </div>
  );

  const EmailDetailContent = ({ emailId }: { emailId: string }) => {
    const { data: email, isLoading } = useMicrosoftEmail(emailId);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!email) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          Email niet gevonden
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 -ml-2"
              onClick={handleBackToList}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Terug
            </Button>
          )}
          <h2 className="font-semibold text-lg">{email.subject || "(geen onderwerp)"}</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-sm text-muted-foreground">
            <span>Van: {email.from?.emailAddress?.name || email.from?.emailAddress?.address}</span>
            <span>
              {format(new Date(email.receivedDateTime), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
            </span>
          </div>
          {email.toRecipients && email.toRecipients.length > 0 && (
            <div className="text-sm text-muted-foreground mt-1">
              Aan: {email.toRecipients.map(r => r.emailAddress?.address).join(", ")}
            </div>
          )}
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 p-4">
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: email.body?.content || email.bodyPreview || "",
            }}
          />
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 border-t flex flex-wrap gap-2">
          <Button size="sm" onClick={() => handleReply(email)}>
            <Reply className="h-4 w-4 mr-2" />
            Beantwoorden
          </Button>
          {email.webLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(email.webLink, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Openen in Outlook
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Communicatie
              {emails && emails.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {emails.length}
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" onClick={handleNewEmail}>
              <Send className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nieuwe email</span>
              <span className="sm:hidden">Email</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isMobile ? (
            // Mobile: Full width list, detail in sheet
            <>
              <div className="px-4 pb-4">
                {renderEmailList()}
              </div>
              <Sheet open={!!selectedEmailId} onOpenChange={(open) => !open && handleBackToList()}>
                <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
                  {selectedEmailId && <EmailDetailContent emailId={selectedEmailId} />}
                </SheetContent>
              </Sheet>
            </>
          ) : (
            // Desktop: Split view
            <div className="flex h-[500px]">
              <div className="w-1/3 border-r overflow-hidden">
                <ScrollArea className="h-full px-2">
                  {renderEmailList()}
                </ScrollArea>
              </div>
              <div className="flex-1 overflow-hidden">
                {selectedEmailId ? (
                  <EmailDetailContent emailId={selectedEmailId} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Selecteer een email om te bekijken</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ComposeEmailDialog
        open={showComposeDialog}
        onOpenChange={setShowComposeDialog}
        customerEmail={customerEmail}
        customerId={customerId}
        customerName={customerName}
        replyToId={replyToEmail?.id}
        initialSubject={replyToEmail ? `Re: ${replyToEmail.subject}` : ""}
      />
    </>
  );
}
