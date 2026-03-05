import { useEffect, useCallback, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Link2, Unlink, ExternalLink, CheckCircle2, AlertCircle, Bell, BellOff, RefreshCw, Upload, Download, Users, FileText, Package, Zap, ShieldCheck, Activity } from "lucide-react";
import { useDivisions } from "@/hooks/useDivisions";
import { useExactOnlineConnections, useRegisterExactTenant, useDisconnectExact, useManageWebhooks, useSyncCustomers, useSyncContacts, useSyncQuotes, useSyncItems, useExactSyncQueueStatus, useTestExactConnection, useCheckWebhookStatus } from "@/hooks/useExactOnline";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function ExactOnlineSettings() {
  const queryClient = useQueryClient();
  const { data: divisions, isLoading: divisionsLoading } = useDivisions();
  const { data: connections, isLoading: connectionsLoading } = useExactOnlineConnections();
  const { data: queueStatus } = useExactSyncQueueStatus();
  const registerTenant = useRegisterExactTenant();
  const disconnectExact = useDisconnectExact();
  const manageWebhooks = useManageWebhooks();
  const syncCustomers = useSyncCustomers();
  const syncContacts = useSyncContacts();
  const syncQuotes = useSyncQuotes();
  const syncItems = useSyncItems();
  const testConnection = useTestExactConnection();
  const checkWebhooks = useCheckWebhookStatus();
  const [connectingDivisionId, setConnectingDivisionId] = useState<string | null>(null);
  const [webhookResults, setWebhookResults] = useState<Record<string, any>>({});

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
      const result = await registerTenant.mutateAsync(divisionId);
      const tenantId = result.tenant_id;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Exact Online Koppeling</h2>
          <p className="text-sm text-muted-foreground">
            Koppel je Abitare vestigingen aan Exact Online administraties voor automatische synchronisatie.
          </p>
        </div>
        {queueStatus && (queueStatus.pending > 0 || queueStatus.processing > 0) && (
          <Badge variant="secondary" className="gap-1">
            <Activity className="h-3 w-3" />
            {queueStatus.pending + queueStatus.processing} in queue
          </Badge>
        )}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <Zap className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Automatische synchronisatie actief</p>
            <p className="text-muted-foreground mt-1">
              Wijzigingen aan klanten, orders en offertes worden automatisch gesynchroniseerd met Exact Online.
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
                    <SyncBlock
                      title="Klanten synchroniseren"
                      description="Synchroniseer klanten (accounts) tussen Abitare en Exact Online"
                      icon={<Users className="h-4 w-4 text-muted-foreground" />}
                      divisionId={division.id}
                      isPending={syncCustomers.isPending}
                      onPush={() => syncCustomers.mutate({ action: "push", divisionId: division.id })}
                      onPull={() => syncCustomers.mutate({ action: "pull", divisionId: division.id })}
                      onSync={() => syncCustomers.mutate({ action: "sync", divisionId: division.id })}
                    />

                    {/* Contact Sync Controls */}
                    <SyncBlock
                      title="Contactpersonen synchroniseren"
                      description="Synchroniseer contactpersonen gekoppeld aan klant-accounts"
                      icon={<Users className="h-4 w-4 text-muted-foreground" />}
                      divisionId={division.id}
                      isPending={syncContacts.isPending}
                      onPush={() => syncContacts.mutate({ action: "push", divisionId: division.id })}
                      onPull={() => syncContacts.mutate({ action: "pull", divisionId: division.id })}
                      onSync={() => syncContacts.mutate({ action: "sync", divisionId: division.id })}
                    />

                    {/* Items Sync Controls */}
                    <SyncBlock
                      title="Artikelen synchroniseren"
                      description="Synchroniseer producten/artikelen met Exact Online Items"
                      icon={<Package className="h-4 w-4 text-muted-foreground" />}
                      divisionId={division.id}
                      isPending={syncItems.isPending}
                      onPush={() => syncItems.mutate({ action: "push", divisionId: division.id })}
                      onPull={() => syncItems.mutate({ action: "pull", divisionId: division.id })}
                      onSync={() => syncItems.mutate({ action: "sync", divisionId: division.id })}
                    />

                    {/* Quotes Sync Controls */}
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Offertes synchroniseren</p>
                          <p className="text-xs text-muted-foreground">
                            Push offertes naar Exact Online en haal statussen op
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncQuotes.mutate({ action: "push", divisionId: division.id })}
                          disabled={syncQuotes.isPending}
                        >
                          {syncQuotes.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Push naar Exact
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncQuotes.mutate({ action: "pull_status", divisionId: division.id })}
                          disabled={syncQuotes.isPending}
                        >
                          {syncQuotes.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Status ophalen
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
                            Ontvang updates wanneer data in Exact wijzigt (accounts, facturen, orders, artikelen, offertes)
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

function SyncBlock({
  title,
  description,
  icon,
  divisionId,
  isPending,
  onPush,
  onPull,
  onSync,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  divisionId: string;
  isPending: boolean;
  onPush: () => void;
  onPull: () => void;
  onSync: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onPush} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Push naar Exact
        </Button>
        <Button variant="outline" size="sm" onClick={onPull} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          Haal uit Exact
        </Button>
        <Button size="sm" onClick={onSync} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Volledige sync
        </Button>
      </div>
    </div>
  );
}
