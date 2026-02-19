import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";

interface ComposeWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  customerId?: string;
  customerName: string;
  orderId?: string;
  ticketId?: string;
}

export function ComposeWhatsAppDialog({
  open,
  onOpenChange,
  phoneNumber,
  customerId,
  customerName,
  orderId,
  ticketId,
}: ComposeWhatsAppDialogProps) {
  const [to, setTo] = useState(phoneNumber);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"text" | "template">("text");
  const [templateName, setTemplateName] = useState("");
  const [templateLang, setTemplateLang] = useState("nl");
  const { sendMessage } = useWhatsApp();
  const { data: templates, isLoading: templatesLoading } = useWhatsAppTemplates(open);

  const approvedTemplates = templates?.filter((t) => t.status === "APPROVED") ?? [];

  const handleTemplateSelect = (value: string) => {
    const tpl = approvedTemplates.find((t) => `${t.name}__${t.language}` === value);
    if (tpl) {
      setTemplateName(tpl.name);
      setTemplateLang(typeof tpl.language === "string" ? tpl.language : (tpl.language as any)?.code ?? "nl");
    }
  };

  const handleSend = () => {
    if (messageType === "text" && !message.trim()) return;
    if (messageType === "template" && !templateName.trim()) return;

    sendMessage.mutate(
      {
        to,
        message: messageType === "text" ? message : undefined,
        type: messageType,
        template: messageType === "template"
          ? { name: templateName, language: { code: templateLang } }
          : undefined,
        customer_id: customerId,
        order_id: orderId,
        ticket_id: ticketId,
      },
      {
        onSuccess: () => {
          setMessage("");
          setTemplateName("");
          onOpenChange(false);
        },
      }
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setTo(phoneNumber);
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            WhatsApp aan {customerName}
          </DialogTitle>
          <DialogDescription>
            Verstuur een WhatsApp-bericht. Buiten het 24-uurs servicevenster kun je alleen templates versturen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="wa-to">Telefoonnummer</Label>
            <Input
              id="wa-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+31 6 12345678"
            />
          </div>

          <Tabs value={messageType} onValueChange={(v) => setMessageType(v as "text" | "template")}>
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1">Vrij bericht</TabsTrigger>
              <TabsTrigger value="template" className="flex-1">Template</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Typ je bericht..."
                rows={4}
              />
            </TabsContent>

            <TabsContent value="template" className="mt-3 space-y-3">
              <div>
                <Label>Template</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={templatesLoading ? "Laden..." : "Kies een template..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedTemplates.map((t) => {
                      const lang = typeof t.language === "string" ? t.language : (t.language as any)?.code ?? "?";
                      return (
                        <SelectItem key={`${t.name}__${lang}`} value={`${t.name}__${lang}`}>
                          {t.name} ({t.category} · {lang})
                        </SelectItem>
                      );
                    })}
                    {!templatesLoading && approvedTemplates.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Geen goedgekeurde templates gevonden
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {templateName && (
                <p className="text-xs text-muted-foreground">
                  Geselecteerd: <span className="font-medium">{templateName}</span> ({templateLang})
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendMessage.isPending || (messageType === "text" ? !message.trim() : !templateName.trim())}
            className="bg-[#25D366] hover:bg-[#1da851] text-white"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Versturen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
