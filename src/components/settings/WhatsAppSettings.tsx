import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const WEBHOOK_URL = "https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/whatsapp-webhook";

export function WhatsAppSettings() {
  const [copied, setCopied] = useState(false);

  const { data: configStatus } = useQuery({
    queryKey: ["whatsapp-config-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { action: "status" },
      });
      if (error || !data?.connected) return { connected: false, phone: null };
      return { connected: true, phone: data.phone || null };
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isConnected = configStatus?.connected ?? false;
  const connectedPhone = configStatus?.phone ?? null;

  const { data: templates, isLoading: templatesLoading } = useWhatsAppTemplates(isConnected);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success">Goedgekeurd</Badge>;
      case "PENDING":
        return <Badge variant="warning">In afwachting</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Afgewezen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#25D366]/10">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp via SiteJob Connect</CardTitle>
              <CardDescription>WhatsApp-berichten ontvangen en versturen</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={isConnected
                ? "text-[#25D366] border-[#25D366]/30"
                : "text-muted-foreground border-muted-foreground/30"
              }
            >
              {isConnected ? "Verbonden" : "Niet gekoppeld"}
            </Badge>
            {isConnected && connectedPhone && (
              <span className="text-xs text-muted-foreground">{connectedPhone}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Webhook URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs break-all">
              {WEBHOOK_URL}
            </code>
            <Button variant="outline" size="icon" className="shrink-0" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
          <p>
            WhatsApp-berichten worden automatisch gekoppeld aan klanten op basis van telefoonnummer en getoond in de communicatie-tijdlijn. Je kunt ook berichten versturen vanuit het dashboard.
          </p>
          <p>
            Configureer de webhook URL in{" "}
            <a
              href="https://connect.sitejob.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-foreground"
            >
              SiteJob Connect
            </a>{" "}
            om berichten te ontvangen en te versturen.
          </p>
        </div>

        {isConnected && (
          <div>
            <p className="text-sm font-medium mb-2">Berichttemplates</p>
            {templatesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Templates laden...
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Naam</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Taal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t) => {
                      const lang = typeof t.language === "string" ? t.language : (t.language as any)?.code ?? "?";
                      return (
                        <TableRow key={`${t.name}-${lang}`}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{statusBadge(t.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{t.category}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{lang}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Geen templates gevonden.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
