import { useState } from "react";
import { Link, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePortalToken, useCustomerPortalTokens, useDeactivatePortalToken } from "@/hooks/usePortalToken";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface PortalTokenGeneratorProps {
  customerId: string;
  orderId: string;
  customerName: string;
}

export function PortalTokenGenerator({ customerId, orderId, customerName }: PortalTokenGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  const createToken = useCreatePortalToken();
  const { data: tokens, isLoading: tokensLoading } = useCustomerPortalTokens(customerId);
  const deactivateToken = useDeactivatePortalToken();

  const activeTokens = tokens?.filter((t) => t.is_active && (!t.expires_at || new Date(t.expires_at) > new Date()));

  const handleCreateToken = async () => {
    try {
      const newToken = await createToken.mutateAsync({
        customerId,
        orderId,
        expiresInDays: 30,
      });

      const portalUrl = `${window.location.origin}/portal/${newToken.token}`;
      
      toast({
        title: "Portal link aangemaakt",
        description: "De link is gekopieerd naar het klembord.",
      });

      await navigator.clipboard.writeText(portalUrl);
      setCopiedToken(newToken.token);
      
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (error) {
      toast({
        title: "Fout bij aanmaken",
        description: "De portal link kon niet worden aangemaakt.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async (token: string) => {
    const portalUrl = `${window.location.origin}/portal/${token}`;
    await navigator.clipboard.writeText(portalUrl);
    setCopiedToken(token);
    
    toast({
      title: "Link gekopieerd",
      description: "De portal link is gekopieerd naar het klembord.",
    });

    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleDeactivate = async (tokenId: string) => {
    try {
      await deactivateToken.mutateAsync(tokenId);
      toast({
        title: "Link gedeactiveerd",
        description: "De portal link is niet meer geldig.",
      });
    } catch (error) {
      toast({
        title: "Fout bij deactiveren",
        description: "De link kon niet worden gedeactiveerd.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="h-4 w-4 mr-2" />
          Klantenportaal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Klantenportaal</DialogTitle>
          <DialogDescription>
            Maak een unieke link aan waarmee {customerName} zijn orders, offertes en documenten kan bekijken.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Create new token */}
          <Button
            onClick={handleCreateToken}
            disabled={createToken.isPending}
            className="w-full"
          >
            {createToken.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link className="h-4 w-4 mr-2" />
            )}
            Nieuwe portal link aanmaken
          </Button>

          {/* Existing tokens */}
          {tokensLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeTokens && activeTokens.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Actieve links</Label>
              {activeTokens.map((token) => {
                const portalUrl = `${window.location.origin}/portal/${token.token}`;
                const isCopied = copiedToken === token.token;

                return (
                  <div
                    key={token.id}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <Input
                        value={portalUrl}
                        readOnly
                        className="text-xs bg-background"
                      />
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span>
                          Verloopt: {token.expires_at 
                            ? format(new Date(token.expires_at), "d MMM yyyy", { locale: nl })
                            : "Nooit"}
                        </span>
                        {token.last_accessed_at && (
                          <>
                            <span>•</span>
                            <span>
                              Laatst bezocht: {format(new Date(token.last_accessed_at), "d MMM", { locale: nl })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopyLink(token.token)}
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(portalUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nog geen portal links aangemaakt.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
