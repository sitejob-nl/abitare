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
} from "lucide-react";
import { useMicrosoftConnection } from "@/hooks/useMicrosoftConnection";
import { ComposeEmailDialog } from "@/components/customers/ComposeEmailDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface OrderCommunicationTabProps {
  orderId: string;
  customerId: string;
  customerEmail: string | null | undefined;
  customerName: string;
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

export function OrderCommunicationTab({
  orderId,
  customerId,
  customerEmail,
  customerName,
}: OrderCommunicationTabProps) {
  const { data: connection, isLoading: connectionLoading } = useMicrosoftConnection();
  const { data: logs, isLoading: logsLoading } = useCommunicationLog(orderId);
  const [showCompose, setShowCompose] = useState(false);

  if (!connectionLoading && !connection?.is_active) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Verbind je Microsoft account in Instellingen om emails te versturen.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!customerEmail) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Geen email adres bekend voor deze klant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Communicatie
              {logs && logs.length > 0 && (
                <Badge variant="secondary">{logs.length}</Badge>
              )}
            </CardTitle>
            <Button size="sm" onClick={() => setShowCompose(true)}>
              <Send className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : logs && logs.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
                  >
                    <div className="mt-0.5">
                      {log.direction === "outbound" ? (
                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {log.subject || "(geen onderwerp)"}
                        </span>
                      </div>
                      {log.body_preview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {log.body_preview}
                        </p>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.sent_at), "d MMM yyyy HH:mm", { locale: nl })}
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

      <ComposeEmailDialog
        open={showCompose}
        onOpenChange={setShowCompose}
        customerEmail={customerEmail}
        customerId={customerId}
        customerName={customerName}
        orderId={orderId}
      />
    </>
  );
}
