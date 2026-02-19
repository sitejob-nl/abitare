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
  MessageCircle,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMicrosoftConnection } from "@/hooks/useMicrosoftConnection";
import { useCustomerEmails } from "@/hooks/useCustomerEmails";
import { useMicrosoftEmail, MicrosoftEmail } from "@/hooks/useMicrosoftMail";
import { ComposeEmailDialog } from "./ComposeEmailDialog";
import { ComposeWhatsAppDialog } from "./ComposeWhatsAppDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface CustomerCommunicationTabProps {
  customerId: string;
  customerEmail: string | null | undefined;
  customerName: string;
  customerPhone?: string | null;
}

export function CustomerCommunicationTab({
  customerId,
  customerEmail,
  customerName,
  customerPhone,
}: CustomerCommunicationTabProps) {
  const isMobile = useIsMobile();
  const { data: connection, isLoading: connectionLoading } = useMicrosoftConnection();
  const { data: emails, isLoading: emailsLoading } = useCustomerEmails(customerEmail);
  
  // Fetch WhatsApp messages from communication_log
  const { data: whatsappLogs, isLoading: whatsappLoading } = useQuery({
    queryKey: ["customer-whatsapp-logs", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communication_log")
        .select("*")
        .eq("customer_id", customerId)
        .eq("type", "whatsapp")
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedWhatsAppLog, setSelectedWhatsAppLog] = useState<any | null>(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<MicrosoftEmail | null>(null);

  const microsoftConnected = !connectionLoading && connection?.is_active;
  const hasEmail = !!customerEmail;
  const canSendWhatsApp = !!customerPhone;

  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId);
    setSelectedWhatsAppLog(null);
  };

  const handleWhatsAppClick = (log: any) => {
    setSelectedWhatsAppLog(log);
    setSelectedEmailId(null);
  };

  const handleBackToList = () => {
    setSelectedEmailId(null);
    setSelectedWhatsAppLog(null);
  };

  const handleReply = (email: MicrosoftEmail) => {
    setReplyToEmail(email);
    setShowComposeDialog(true);
  };

  const handleNewEmail = () => {
    setReplyToEmail(null);
    setShowComposeDialog(true);
  };

  // Build a combined timeline
  type TimelineItem = { kind: "email"; data: any; date: Date } | { kind: "whatsapp"; data: any; date: Date };
  const timeline: TimelineItem[] = [];

  if (microsoftConnected && emails) {
    for (const email of emails) {
      timeline.push({ kind: "email", data: email, date: new Date(email.receivedDateTime) });
    }
  }
  if (whatsappLogs) {
    for (const log of whatsappLogs) {
      timeline.push({ kind: "whatsapp", data: log, date: new Date(log.sent_at) });
    }
  }
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  const isLoading = (microsoftConnected && emailsLoading) || whatsappLoading;

  // No data sources available at all
  if (!connectionLoading && !microsoftConnected && !whatsappLoading && (!whatsappLogs || whatsappLogs.length === 0) && !hasEmail) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Geen communicatie beschikbaar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Verbind je Microsoft account of configureer WhatsApp om communicatie te bekijken.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/settings"}>
            Ga naar Instellingen
          </Button>
        </CardContent>
      </Card>
    );
  }

  const renderTimeline = () => (
    <div className="space-y-1">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : timeline.length > 0 ? (
        timeline.map((item) => {
          if (item.kind === "email") {
            const email = item.data;
            return (
              <div
                key={`email-${email.id}`}
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
                      <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
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
            );
          } else {
            const log = item.data;
            return (
              <div
                key={`wa-${log.id}`}
                className={cn(
                  "p-3 rounded-md cursor-pointer transition-colors",
                  selectedWhatsAppLog?.id === log.id
                    ? "bg-primary/10 border-l-2 border-primary"
                    : "hover:bg-muted/50"
                )}
                onClick={() => handleWhatsAppClick(log)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5 text-[#25D366] shrink-0" />
                      <span className="text-sm truncate font-medium">
                        {log.subject || "WhatsApp bericht"}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#25D366] border-[#25D366]/30 shrink-0">
                        WA
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {log.body_preview}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(log.sent_at), "d MMM", { locale: nl })}
                  </span>
                </div>
              </div>
            );
          }
        })
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Geen communicatie gevonden met deze klant</p>
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

  const WhatsAppDetailContent = ({ log }: { log: any }) => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        {isMobile && (
          <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Terug
          </Button>
        )}
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
          <h2 className="font-semibold text-lg">{log.subject || "WhatsApp bericht"}</h2>
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          {format(new Date(log.sent_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
        </div>
        {log.metadata?.from_number && (
          <div className="text-sm text-muted-foreground mt-1">
            Van: {log.metadata.sender_name || log.metadata.from_number} ({log.metadata.from_number})
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 p-4">
        <p className="text-sm whitespace-pre-wrap">{log.body_preview}</p>
      </ScrollArea>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Communicatie
              {timeline.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {timeline.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {canSendWhatsApp && (
                <Button size="sm" variant="outline" onClick={() => setShowWhatsAppDialog(true)} className="text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">WhatsApp</span>
                  <span className="sm:hidden">WA</span>
                </Button>
              )}
              {microsoftConnected && hasEmail && (
                <Button size="sm" onClick={handleNewEmail}>
                  <Send className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Nieuwe email</span>
                  <span className="sm:hidden">Email</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isMobile ? (
            // Mobile: Full width list, detail in sheet
            <>
              <div className="px-4 pb-4">
                {renderTimeline()}
              </div>
              <Sheet open={!!(selectedEmailId || selectedWhatsAppLog)} onOpenChange={(open) => !open && handleBackToList()}>
                <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
                  {selectedEmailId && <EmailDetailContent emailId={selectedEmailId} />}
                  {selectedWhatsAppLog && <WhatsAppDetailContent log={selectedWhatsAppLog} />}
                </SheetContent>
              </Sheet>
            </>
          ) : (
            // Desktop: Split view
            <div className="flex h-[500px]">
              <div className="w-1/3 border-r overflow-hidden">
                <ScrollArea className="h-full px-2">
                  {renderTimeline()}
                </ScrollArea>
              </div>
              <div className="flex-1 overflow-hidden">
                {selectedEmailId ? (
                  <EmailDetailContent emailId={selectedEmailId} />
                ) : selectedWhatsAppLog ? (
                  <WhatsAppDetailContent log={selectedWhatsAppLog} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Selecteer een bericht om te bekijken</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {microsoftConnected && hasEmail && (
        <ComposeEmailDialog
          open={showComposeDialog}
          onOpenChange={setShowComposeDialog}
          customerEmail={customerEmail!}
          customerId={customerId}
          customerName={customerName}
          replyToId={replyToEmail?.id}
          initialSubject={replyToEmail ? `Re: ${replyToEmail.subject}` : ""}
        />
      )}

      {canSendWhatsApp && (
        <ComposeWhatsAppDialog
          open={showWhatsAppDialog}
          onOpenChange={setShowWhatsAppDialog}
          phoneNumber={customerPhone!}
          customerId={customerId}
          customerName={customerName}
        />
      )}
    </>
  );
}
