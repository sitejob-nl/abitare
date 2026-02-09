import { useState } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  Copy,
  ExternalLink, 
  Loader2, 
  RefreshCw,
  Settings2,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  useTradeplaceConfig, 
  useTestTradeplaceConnection,
  useTradeplaceSuppliers,
} from "@/hooks/useTradeplace";
import { useToast } from "@/hooks/use-toast";
import { SupplierTradeplaceDialog } from "@/components/suppliers/SupplierTradeplaceDialog";
import type { Supplier } from "@/hooks/useSuppliers";

const SUPABASE_PROJECT_ID = "lqfqxspaamzhtgxhvlib";
const WEBHOOK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/tradeplace-webhook`;

export function TradeplaceSettings() {
  const { toast } = useToast();
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useTradeplaceConfig();
  const { mutate: testConnection, isPending: testingConnection } = useTestTradeplaceConnection();
  const { data: suppliers, isLoading: suppliersLoading } = useTradeplaceSuppliers();
  
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const handleTestConnection = () => {
    testConnection(undefined, {
      onSuccess: (data) => {
        toast({
          title: data.success ? "Verbinding succesvol" : "Verbinding mislukt",
          description: data.message,
          variant: data.success ? "default" : "destructive"
        });
      },
      onError: (error) => {
        toast({
          title: "Fout bij testen",
          description: error instanceof Error ? error.message : "Onbekende fout",
          variant: "destructive"
        });
      }
    });
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast({ title: "Gekopieerd", description: "Webhook URL gekopieerd naar klembord" });
  };

  const tradeplaceSuppliers = suppliers?.filter(s => 
    s.supplier_type === 'apparatuur' || s.tradeplace_enabled
  ) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Tradeplace TMH2</CardTitle>
                <CardDescription>
                  Real-time B2B-koppeling met apparatenfabrikanten via TradeXML 2.0
                </CardDescription>
              </div>
            </div>
            {configLoading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Laden...
              </Badge>
            ) : config?.configured ? (
              <Badge variant="default" className="gap-1 bg-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Actief ({config.environment?.toUpperCase()})
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Niet geconfigureerd
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!config?.configured && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <p className="font-medium">Tradeplace TMH2 is nog niet geconfigureerd</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Om Tradeplace TMH2 te activeren:
                </p>
                <ol className="mt-2 ml-4 list-decimal text-sm text-muted-foreground space-y-1">
                  <li>Vraag een TMH2 account aan via <a href="mailto:connect@tradeplace.com" className="text-primary hover:underline">connect@tradeplace.com</a></li>
                  <li>Na goedkeuring ontvang je een username en password per e-mail</li>
                  <li>Voeg de volgende secrets toe via Lovable (Instellingen):
                    <ul className="ml-4 mt-1 list-disc">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">TRADEPLACE_USERNAME</code> — TMH2 login username</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">TRADEPLACE_PASSWORD</code> — TMH2 login password</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">TRADEPLACE_RETAILER_GLN</code> — Je eigen GLN-nummer</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">TRADEPLACE_ENVIRONMENT</code> — <code className="text-xs bg-muted px-1 py-0.5 rounded">test</code> of <code className="text-xs bg-muted px-1 py-0.5 rounded">live</code></li>
                    </ul>
                  </li>
                  <li>Configureer in TMH2 Admin de webhook URL (zie hieronder)</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          {config?.configured && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Retailer GLN</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {config.retailer_gln}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refetchConfig()}
                    disabled={configLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${configLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Test verbinding"
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Omgeving</p>
                <p className="text-sm text-muted-foreground">
                  {config.environment === 'live' ? '🟢 LIVE' : '🟡 TEST'} — {config.base_url}
                </p>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Webhook URL section */}
          <div>
            <h4 className="text-sm font-medium mb-2">Webhook URL (voor TMH2 Admin)</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Voer deze URL in bij TMH2 Admin onder "Outbound &gt; Transport HTTP" om bevestigingen en verzendmeldingen te ontvangen.
            </p>
            <div className="flex items-center gap-2 rounded-lg border p-2 bg-muted/50">
              <code className="text-xs flex-1 break-all font-mono">{WEBHOOK_URL}</code>
              <Button variant="ghost" size="sm" onClick={handleCopyWebhookUrl}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <h4 className="text-sm font-medium mb-3">Gekoppelde fabrikanten</h4>
            {suppliersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Laden...
              </div>
            ) : tradeplaceSuppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Geen apparatuurleveranciers gevonden. Voeg eerst leveranciers toe.
              </p>
            ) : (
              <div className="space-y-2">
                {tradeplaceSuppliers.map((supplier) => (
                  <div 
                    key={supplier.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        supplier.tradeplace_enabled && supplier.tradeplace_gln 
                          ? 'bg-green-500' 
                          : 'bg-muted-foreground/30'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplier.tradeplace_gln 
                            ? `GLN: ${supplier.tradeplace_gln}` 
                            : 'GLN niet ingesteld'}
                          {(supplier as any).tradeplace_tp_id && ` · TP-ID: ${(supplier as any).tradeplace_tp_id}`}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedSupplier(supplier as Supplier)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://admin.tradeplace.com"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                TMH2 Admin
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedSupplier && (
        <SupplierTradeplaceDialog
          supplier={selectedSupplier}
          open={!!selectedSupplier}
          onOpenChange={(open) => !open && setSelectedSupplier(null)}
        />
      )}
    </div>
  );
}
