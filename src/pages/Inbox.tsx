import { useState } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Mail,
  MailOpen,
  Send,
  Reply,
  Paperclip,
  Star,
  Loader2,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { useMicrosoftConnection } from "@/hooks/useMicrosoftConnection";
import {
  useMicrosoftEmails,
  useMicrosoftEmail,
  useSendEmail,
  type MicrosoftEmail,
} from "@/hooks/useMicrosoftMail";
import { useStartMicrosoftAuth } from "@/hooks/useMicrosoftConnection";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

function EmailListItem({
  email,
  isSelected,
  onClick,
}: {
  email: MicrosoftEmail;
  isSelected: boolean;
  onClick: () => void;
}) {
  const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Onbekend";
  const receivedDate = parseISO(email.receivedDateTime);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 sm:px-4 py-3 border-b border-border transition-colors hover:bg-muted/50",
        isSelected && "bg-muted",
        !email.isRead && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex-shrink-0 mt-1">
          {email.isRead ? (
            <MailOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Mail className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-sm truncate",
                !email.isRead && "font-semibold"
              )}
            >
              {senderName}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {format(receivedDate, "d MMM", { locale: nl })}
            </span>
          </div>
          <p
            className={cn(
              "text-sm truncate mt-0.5",
              !email.isRead ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {email.subject || "(Geen onderwerp)"}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5 hidden sm:block">
            {email.bodyPreview}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {email.importance === "high" && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          )}
          {email.hasAttachments && (
            <Paperclip className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </button>
  );
}

function EmailDetail({
  emailId,
  onBack,
  onReply,
  showBackButton = true,
}: {
  emailId: string;
  onBack: () => void;
  onReply: (email: MicrosoftEmail) => void;
  showBackButton?: boolean;
}) {
  const { data: email, isLoading } = useMicrosoftEmail(emailId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Email niet gevonden
      </div>
    );
  }

  const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Onbekend";
  const senderEmail = email.from?.emailAddress?.address || "";
  const receivedDate = parseISO(email.receivedDateTime);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-border bg-muted/30">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">
            {email.subject || "(Geen onderwerp)"}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => onReply(email)}>
          <Reply className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Beantwoorden</span>
        </Button>
        {email.webLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(email.webLink, "_blank")}
          >
            <ExternalLink className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Outlook</span>
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">
              {senderName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{senderName}</span>
                {email.importance === "high" && (
                  <Badge variant="destructive" className="text-xs">
                    Belangrijk
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{senderEmail}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(receivedDate, "EEEE d MMMM yyyy 'om' HH:mm", {
                  locale: nl,
                })}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(email.body?.content || email.bodyPreview || ""),
            }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  replyTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyTo?: MicrosoftEmail | null;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const sendEmail = useSendEmail();

  // Set initial values when replying
  useState(() => {
    if (replyTo) {
      setTo(replyTo.from?.emailAddress?.address || "");
      setSubject(`Re: ${replyTo.subject || ""}`);
      setBody("");
    } else {
      setTo("");
      setSubject("");
      setBody("");
    }
  });

  const handleSend = async () => {
    if (!to.trim()) return;

    await sendEmail.mutateAsync({
      to: to.split(",").map((e) => e.trim()),
      subject,
      body: body.replace(/\n/g, "<br>"),
      replyToId: replyTo?.id,
    });

    onOpenChange(false);
    setTo("");
    setSubject("");
    setBody("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{replyTo ? "Beantwoorden" : "Nieuwe email"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Aan</label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@voorbeeld.nl"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Onderwerp</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Onderwerp"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Bericht</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Typ je bericht..."
              rows={10}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSend} disabled={sendEmail.isPending}>
              {sendEmail.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Verzenden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Inbox = () => {
  const { data: connection, isLoading: connectionLoading } = useMicrosoftConnection();
  const { data: emails, isLoading: emailsLoading } = useMicrosoftEmails();
  const startAuth = useStartMicrosoftAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<MicrosoftEmail | null>(null);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["microsoft-emails"] });
  };

  const handleReply = (email: MicrosoftEmail) => {
    setReplyTo(email);
    setComposeOpen(true);
  };

  const handleCompose = () => {
    setReplyTo(null);
    setComposeOpen(true);
  };

  const handleSelectEmail = (emailId: string) => {
    setSelectedEmailId(emailId);
  };

  const handleBackToList = () => {
    setSelectedEmailId(null);
  };

  // Not connected state
  if (!connectionLoading && !connection?.is_active) {
    return (
      <AppLayout title="Inbox" breadcrumb="Inbox">
        <div className="mb-6">
          <h1 className="font-display text-xl sm:text-[28px] font-semibold text-foreground">
            Inbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Berichten en notificaties
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary/10 mb-4 sm:mb-6">
              <Mail className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>

            <h2 className="text-lg sm:text-xl font-semibold text-foreground text-center">
              Verbind je Microsoft account
            </h2>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
              Koppel je Microsoft account om je emails te bekijken en te
              beantwoorden vanuit Abitare.
            </p>

            <Button
              className="mt-6 w-full sm:w-auto"
              onClick={() => startAuth.mutate()}
              disabled={startAuth.isPending}
            >
              {startAuth.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Koppel Microsoft Account
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const isLoading = connectionLoading || emailsLoading;

  // Mobile: Show email detail in Sheet
  const renderMobileEmailDetail = () => {
    if (!selectedEmailId) return null;

    return (
      <Sheet open={!!selectedEmailId} onOpenChange={(open) => !open && handleBackToList()}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Email Details</SheetTitle>
          </SheetHeader>
          <EmailDetail
            emailId={selectedEmailId}
            onBack={handleBackToList}
            onReply={handleReply}
          />
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <AppLayout title="Inbox" breadcrumb="Inbox">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-[28px] font-semibold text-foreground">
            Inbox
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">
            {connection?.microsoft_email || "Microsoft emails"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Vernieuwen</span>
          </Button>
          <Button size="sm" onClick={handleCompose} className="flex-1 sm:flex-none">
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nieuw</span>
          </Button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/30">
            <Input placeholder="Zoeken in emails..." className="h-9" />
          </div>
          <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : emails && emails.length > 0 ? (
              emails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isSelected={selectedEmailId === email.id}
                  onClick={() => handleSelectEmail(email.id)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="h-8 w-8 mb-2" />
                <p className="text-sm">Geen emails gevonden</p>
              </div>
            )}
          </ScrollArea>
        </Card>
        {renderMobileEmailDetail()}
      </div>

      {/* Desktop Layout - Email Client Style */}
      <div className="hidden md:grid md:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[500px]">
        {/* Email List Panel */}
        <Card className="overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border bg-muted/30">
            <Input placeholder="Zoeken in emails..." className="h-9" />
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : emails && emails.length > 0 ? (
              emails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isSelected={selectedEmailId === email.id}
                  onClick={() => handleSelectEmail(email.id)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="h-8 w-8 mb-2" />
                <p className="text-sm">Geen emails gevonden</p>
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Email Detail Panel */}
        <Card className="overflow-hidden">
          {selectedEmailId ? (
            <EmailDetail
              emailId={selectedEmailId}
              onBack={handleBackToList}
              onReply={handleReply}
              showBackButton={false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MailOpen className="h-12 w-12 mb-4" />
              <p className="text-sm">Selecteer een email om te lezen</p>
            </div>
          )}
        </Card>
      </div>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        replyTo={replyTo}
      />
    </AppLayout>
  );
};

export default Inbox;
