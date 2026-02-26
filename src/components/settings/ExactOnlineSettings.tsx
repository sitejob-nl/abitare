import { useEffect, useCallback, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Link2, Unlink, ExternalLink, CheckCircle2, AlertCircle, Bell, BellOff, RefreshCw, Upload, Download } from "lucide-react";
import { useDivisions } from "@/hooks/useDivisions";
import { useExactOnlineConnections, useRegisterExactTenant, useDisconnectExact, useManageWebhooks, useSyncCustomers } from "@/hooks/useExactOnline";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function ExactOnlineSettings() {
  const queryClient = useQueryClient();
  const { data: divisions, isLoading: divisionsLoading } = useDivisions();
  const { data: connections, isLoading: connectionsLoading } = useExactOnlineConnections();
  const registerTenant = useRegisterExactTenant();
  const disconnectExact = useDisconnectExact();
  const manageWebhooks = useManageWebhooks();
  const syncCustomers = useSyncCustomers();
  const [connectingDivisionId, setConnectingDivisionId] = useState<string | null>(null);

  // Listen for postMessage from the Connect popup
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "exact-connected") {
      toast.success("Exact Online succesvol gekoppeld!");
      queryClient.invalidateQueries({ queryKey: ["exact-online-connections"] });
      setConnectingDivisionId(null);
    }
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const isLoading = divisionsLoading || connectionsLoading;

  const getConnectionForDivision = (divisionId: string) => {
    return connections?.find((c) => c.division_id === divisionId);
  };

  const handleConnect = async (divisionId: string) => {
    setConnectingDivisionId(divisionId);
    try {
      // Register tenant first (idempotent)
      const result = await registerTenant.mutateAsync(divisionId);
      const tenantId = result.tenant_id;

      // Open Connect popup
      window.open(
        `https://connect.sitejob.nl/exact-setup?tenant_id=${tenantId}`,
        "exact-setup",
        "width=600,height=700"
      );
    } catch {
      setConnectingDivisionId(null);
    }
  };

  const handleDisconnect = (connectionId: string) => {
    if (confirm("Weet je zeker dat je deze Exact Online koppeling wilt verwijderen?")) {
      disconnectExact.mutate(connectionId);
    }
  };

  const handleToggleWebhooks = (divisionId: string, currentlyEnabled: boolean) => {
    manageWebhooks.mutate({
      action: currentlyEnabled ? "unsubscribe" : "subscribe",
      divisionId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Exact Online Koppeling</h2>
        <p className="text-sm text-muted-foreground">
          Koppel je Abitare vestigingen aan Exact Online administraties voor automatische synchronisatie van klanten en facturen.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-start gap-3 pt-4">
          <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Hoe werkt het?</p>
            <p className="text-blue-700 mt-1">
              Klik op "Koppelen" bij een vestiging om in te loggen bij Exact Online.
              Na autorisatie wordt de verbinding automatisch opgeslagen en kun je klanten en facturen synchroniseren.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Vestigingen
        </h3>

        <div className="grid gap-4">
          {divisions?.map((division) => {
            const connection = getConnectionForDivision(division.id);
            const isConnected = !!connection && connection.is_active;
            const isConnecting = connectingDivisionId === division.id;

            return (
              <Card key={division.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{division.name}</CardTitle>
                      {isConnected ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Gekoppeld
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Niet gekoppeld
                        </Badge>
                      )}
                    </div>

                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(connection.id)}
                        disabled={disconnectExact.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        {disconnectExact.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Unlink className="h-4 w-4 mr-2" />
                            Ontkoppelen
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(division.id)}
                        disabled={isConnecting || registerTenant.isPending}
                      >
                        {isConnecting || registerTenant.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Link2 className="h-4 w-4 mr-2" />
                            Koppelen
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {division.code && (
                    <CardDescription>Code: {division.code}</CardDescription>
                  )}
                </CardHeader>

                {isConnected && connection.exact_division && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Exact Division: <strong>{connection.exact_division}</strong></span>
                      {connection.company_name && (
                        <span>Bedrijf: <strong>{connection.company_name}</strong></span>
                      )}
                      {connection.connected_at && (
                        <span>
                          Gekoppeld op: {new Date(connection.connected_at).toLocaleDateString("nl-NL")}
                        </span>
                      )}
                    </div>

                    {/* Customer Sync Controls */}
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Klanten synchroniseren</p>
                          <p className="text-xs text-muted-foreground">
                            Synchroniseer klanten tussen Abitare en Exact Online
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncCustomers.mutate({ action: "push", divisionId: division.id })}
                          disabled={syncCustomers.isPending}
                        >
                          {syncCustomers.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Push naar Exact
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncCustomers.mutate({ action: "pull", divisionId: division.id })}
                          disabled={syncCustomers.isPending}
                        >
                          {syncCustomers.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Haal uit Exact
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => syncCustomers.mutate({ action: "sync", divisionId: division.id })}
                          disabled={syncCustomers.isPending}
                        >
                          {syncCustomers.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Volledige sync
                        </Button>
                      </div>
                    </div>

                    {/* Webhook Toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        {connection.webhooks_enabled ? (
                          <Bell className="h-4 w-4 text-green-600" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">Real-time webhooks</p>
                          <p className="text-xs text-muted-foreground">
                            Ontvang updates wanneer data in Exact wijzigt
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={connection.webhooks_enabled ?? false}
                        onCheckedChange={() => handleToggleWebhooks(division.id, connection.webhooks_enabled ?? false)}
                        disabled={manageWebhooks.isPending}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {!divisions?.length && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Geen vestigingen gevonden</p>
                  <p className="text-sm">Voeg eerst vestigingen toe in het tabblad "Vestigingen"</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
