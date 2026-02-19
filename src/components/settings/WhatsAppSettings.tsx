import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const WEBHOOK_URL = "https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/whatsapp-webhook";

export function WhatsAppSettings() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <CardDescription>Inkomende WhatsApp-berichten ontvangen</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[#25D366] border-[#25D366]/30">
            Geconfigureerd
          </Badge>
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
            Inkomende WhatsApp-berichten worden automatisch gekoppeld aan klanten op basis van telefoonnummer en getoond in de communicatie-tijdlijn.
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
            om berichten te ontvangen.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
