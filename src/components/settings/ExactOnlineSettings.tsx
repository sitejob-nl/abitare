import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Unlink, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useDivisions } from "@/hooks/useDivisions";
import { useExactOnlineConnections, useStartExactAuth, useDisconnectExact } from "@/hooks/useExactOnline";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export function ExactOnlineSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: divisions, isLoading: divisionsLoading } = useDivisions();
  const { data: connections, isLoading: connectionsLoading } = useExactOnlineConnections();
  const startAuth = useStartExactAuth();
  const disconnectExact = useDisconnectExact();

  // Handle OAuth callback result
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      toast.success("Exact Online succesvol gekoppeld!");
      setSearchParams({});
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: "Ontbrekende parameters in OAuth response",
        invalid_state: "Ongeldige state parameter",
        config_error: "Configuratiefout op de server",
        token_exchange_failed: "Kon toegangstoken niet verkrijgen",
        failed_to_get_division: "Kon Exact Online division niet ophalen",
        no_division: "Geen division gevonden in Exact Online",
        db_error: "Fout bij opslaan van verbinding",
        unexpected_error: "Onverwachte fout opgetreden",
      };
      toast.error(errorMessages[error] || `OAuth fout: ${error}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const isLoading = divisionsLoading || connectionsLoading;

  const getConnectionForDivision = (divisionId: string) => {
    return connections?.find((c) => c.division_id === divisionId);
  };

  const handleConnect = (divisionId: string) => {
    startAuth.mutate(divisionId);
  };

  const handleDisconnect = (connectionId: string) => {
    if (confirm("Weet je zeker dat je deze Exact Online koppeling wilt verwijderen?")) {
      disconnectExact.mutate(connectionId);
    }
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
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Exact Online Koppeling</h2>
        <p className="text-sm text-muted-foreground">
          Koppel je Abitare vestigingen aan Exact Online administraties voor automatische synchronisatie van klanten en facturen.
        </p>
      </div>

      {/* Info Card */}
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

      {/* Divisions List */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Vestigingen
        </h3>

        <div className="grid gap-4">
          {divisions?.map((division) => {
            const connection = getConnectionForDivision(division.id);
            const isConnected = !!connection && connection.is_active;

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
                        disabled={startAuth.isPending}
                      >
                        {startAuth.isPending ? (
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
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Exact Division: <strong>{connection.exact_division}</strong></span>
                      {connection.connected_at && (
                        <span>
                          Gekoppeld op: {new Date(connection.connected_at).toLocaleDateString("nl-NL")}
                        </span>
                      )}
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
