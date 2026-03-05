import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Send,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  MessageCircle,
} from "lucide-react";
import { useMicrosoftConnection } from "@/hooks/useMicrosoftConnection";
import { useCustomerEmails } from "@/hooks/useCustomerEmails";
import { ComposeEmailDialog } from "@/components/customers/ComposeEmailDialog";
import { ComposeWhatsAppDialog } from "@/components/customers/ComposeWhatsAppDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface OrderCommunicationTabProps {
  orderId: string;
  customerId: string;
  customerEmail: string | null | undefined;
  customerName: string;
  customerPhone?: string | null;
}

function useCommunicationLog(orderId: string) {
  return useQuery({
    queryKey: ["communication-log", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communication_log")
        .select("*")
        .eq("order_id", orderId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

type TimelineItem = {
  id: string;
  type: "email" | "whatsapp" | "note";
  direction: "inbound" | "outbound";
  subject: string;
  preview: string;
  date: Date;
  source: "log" | "graph";
};

function getTypeIcon(type: string, direction: string) {
  if (type === "whatsapp") {
    return direction === "outbound" ? (
      <ArrowUpRight className="h-4 w-4 text-[#25D366]" />
    ) : (
      <MessageCircle className="h-4 w-4 text-[#25D366]" />
    );
  }
  return direction === "outbound" ? (
    <ArrowUpRight className="h-4 w-4 text-blue-500" />
  ) : (
    <ArrowDownLeft className="h-4 w-4 text-green-500" />
  );
}

export function OrderCommunicationTab({
  orderId,
  customerId,
  customerEmail,
  customerName,
  customerPhone,
}: OrderCommunicationTabProps) {
  const { data: connection, isLoading: connectionLoading } = useMicrosoftConnection();
  const { data: logs, isLoading: logsLoading } = useCommunicationLog(orderId);
  const { data: graphEmails, isLoading: emailsLoading } = useCustomerEmails(customerEmail);
  const [showCompose, setShowCompose] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const microsoftConnected = !connectionLoading && connection?.is_active;
  const canSendEmail = microsoftConnected && customerEmail;
  const canSendWhatsApp = !!customerPhone;

  // Build merged timeline from communication_log + live Graph emails
  const timeline: TimelineItem[] = [];

  // Add communication_log entries
  if (logs) {
    for (const log of logs) {
      timeline.push({
        id: `log-${log.id}`,
        type: log.type as "email" | "whatsapp",
        direction: log.direction as "inbound" | "outbound",
        subject: log.subject || "(geen onderwerp)",
        preview: log.body_preview || "",
        date: new Date(log.sent_at),
        source: "log",
      });
    }
  }

  // Add live Microsoft Graph emails (filtered to avoid duplicates with logged ones)
  if (microsoftConnected && graphEmails) {
    const loggedMessageIds = new Set(
      logs?.filter((l) => l.external_message_id).map((l) => l.external_message_id) || []
    );

    for (const email of graphEmails) {
      if (!loggedMessageIds.has(email.id)) {
        const isFromCustomer =
          email.from?.emailAddress?.address?.toLowerCase() === customerEmail?.toLowerCase();
        timeline.push({
          id: `graph-${email.id}`,
          type: "email",
          direction: isFromCustomer ? "inbound" : "outbound",
          subject: email.subject || "(geen onderwerp)",
          preview: email.bodyPreview || "",
          date: new Date(email.receivedDateTime),
          source: "graph",
        });
      }
    }
  }

  // Sort by date descending
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  const isLoading = logsLoading || (microsoftConnected && emailsLoading);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Communicatie
              {timeline.length > 0 && (
                <Badge variant="secondary">{timeline.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {canSendWhatsApp && (
                <Button size="sm" variant="outline" onClick={() => setShowWhatsApp(true)} className="text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
              {canSendEmail && (
                <Button size="sm" onClick={() => setShowCompose(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Email
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : timeline.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {timeline.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
                  >
                    <div className="mt-0.5">
                      {getTypeIcon(item.type, item.direction)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {item.subject}
                        </span>
                        {item.type === "whatsapp" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#25D366] border-[#25D366]/30">
                            WhatsApp
                          </Badge>
                        )}
                        {item.source === "graph" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Outlook
                          </Badge>
                        )}
                      </div>
                      {item.preview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.preview}
                        </p>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(item.date, "d MMM yyyy HH:mm", { locale: nl })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nog geen communicatie voor deze order</p>
            </div>
          )}
        </CardContent>
      </Card>

      {canSendEmail && (
        <ComposeEmailDialog
          open={showCompose}
          onOpenChange={setShowCompose}
          customerEmail={customerEmail!}
          customerId={customerId}
          customerName={customerName}
          orderId={orderId}
        />
      )}

      {canSendWhatsApp && (
        <ComposeWhatsAppDialog
          open={showWhatsApp}
          onOpenChange={setShowWhatsApp}
          phoneNumber={customerPhone!}
          customerId={customerId}
          customerName={customerName}
          orderId={orderId}
        />
      )}
    </>
  );
}
