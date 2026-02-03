import { useState } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
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
  useUpdateSupplierTradeplace
} from "@/hooks/useTradeplace";
import { useToast } from "@/hooks/use-toast";
import { SupplierTradeplaceDialog } from "@/components/suppliers/SupplierTradeplaceDialog";
import type { Supplier } from "@/hooks/useSuppliers";

const SUPABASE_PROJECT_ID = "lqfqxspaamzhtgxhvlib";

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
                <CardTitle className="text-lg">Tradeplace Direct Connection</CardTitle>
                <CardDescription>
                  Real-time verbinding met apparatenfabrikanten
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
                Actief
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
                <p className="font-medium">Tradeplace is nog niet geconfigureerd</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Om Tradeplace te activeren:
                </p>
                <ol className="mt-2 ml-4 list-decimal text-sm text-muted-foreground space-y-1">
                  <li>Vraag een account aan via <a href="mailto:connect@tradeplace.com" className="text-primary hover:underline">connect@tradeplace.com</a></li>
                  <li>Voeg de volgende secrets toe in Supabase Dashboard:
                    <ul className="ml-4 mt-1 list-disc">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">TRADEPLACE_API_KEY</code></li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">TRADEPLACE_RETAILER_GLN</code></li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">TRADEPLACE_WEBHOOK_SECRET</code> (optioneel)</li>
                    </ul>
                  </li>
                </ol>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 gap-2"
                  asChild
                >
                  <a 
                    href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/settings/functions`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Supabase Secrets
                  </a>
                </Button>
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
            </div>
          )}

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
