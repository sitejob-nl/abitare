import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, Unlink, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  useMicrosoftConnection,
  useStartMicrosoftAuth,
  useDisconnectMicrosoft,
} from "@/hooks/useMicrosoftConnection";

export function MicrosoftSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: connection, isLoading, refetch } = useMicrosoftConnection();
  const startAuth = useStartMicrosoftAuth();
  const disconnect = useDisconnectMicrosoft();

  // Handle OAuth callback messages
  useEffect(() => {
    const microsoftConnected = searchParams.get("microsoft_connected");
    const microsoftError = searchParams.get("microsoft_error");

    if (microsoftConnected === "true") {
      toast.success("Microsoft account gekoppeld!", {
        description: "Je kunt nu agenda en email integratie gebruiken.",
      });
      refetch();
      // Clean up URL
      searchParams.delete("microsoft_connected");
      setSearchParams(searchParams, { replace: true });
    }

    if (microsoftError) {
      toast.error("Fout bij koppelen", {
        description: decodeURIComponent(microsoftError),
      });
      // Clean up URL
      searchParams.delete("microsoft_error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);

  const handleConnect = () => {
    startAuth.mutate();
  };

  const handleDisconnect = () => {
    disconnect.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Microsoft 365 Koppeling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Laden...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Microsoft 365 Koppeling</CardTitle>
        <CardDescription>
          Koppel je Outlook account voor agenda en email integratie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection ? (
          <>
            <div className="flex items-start gap-3 p-3 bg-accent/50 rounded-lg border border-border">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">
                  Gekoppeld als {connection.microsoft_email}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Gekoppeld op:{" "}
                  {format(new Date(connection.connected_at), "d MMMM yyyy", {
                    locale: nl,
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnect.isPending}
                className="text-destructive hover:text-destructive"
              >
                {disconnect.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-4 w-4" />
                )}
                Ontkoppelen
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                Nog niet gekoppeld. Koppel je Microsoft account om agenda en email
                integratie te gebruiken.
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={startAuth.isPending}
              size="sm"
            >
              {startAuth.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              Koppel Microsoft Account
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
