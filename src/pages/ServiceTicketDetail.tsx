import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  Plus,
  X,
  Send,
  ExternalLink,
  Download,
  Users,
  FileText,
  Package,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MentionTextarea, extractMentionedUserIds } from "@/components/service/MentionTextarea";
import { ComposeEmailDialog } from "@/components/customers/ComposeEmailDialog";
import { useServiceTicket } from "@/hooks/useServiceTicket";
import {
  useUpdateTicketStatus,
  useUpdateTicket,
  useAddTicketNote,
  useAssignUser,
  useUnassignUser,
} from "@/hooks/useServiceTicketMutations";
import { useProfiles } from "@/hooks/useUsers";
import { useCustomers } from "@/hooks/useCustomers";
import { useQuotes } from "@/hooks/useQuotes";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateQuote } from "@/hooks/useQuotes";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; className: string }> = {
  nieuw: { label: "Nieuw", className: "bg-blue-100 text-blue-700" },
  in_behandeling: { label: "In behandeling", className: "bg-yellow-100 text-yellow-700" },
  wacht_op_klant: { label: "Wacht op klant", className: "bg-orange-100 text-orange-700" },
  wacht_op_onderdelen: { label: "Wacht op onderdelen", className: "bg-purple-100 text-purple-700" },
  ingepland: { label: "Ingepland", className: "bg-cyan-100 text-cyan-700" },
  afgerond: { label: "Afgerond", className: "bg-green-100 text-green-700" },
  geannuleerd: { label: "Geannuleerd", className: "bg-gray-100 text-gray-700" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  laag: { label: "Laag", className: "bg-muted text-muted-foreground" },
  normaal: { label: "Normaal", className: "bg-blue-100 text-blue-700" },
  hoog: { label: "Hoog", className: "bg-warning/20 text-warning" },
  urgent: { label: "Urgent", className: "bg-destructive/20 text-destructive" },
};

const categoryLabels: Record<string, string> = {
  klacht: "Klacht",
  garantie: "Garantie",
  schade: "Schade",
  overig: "Overig",
};

type TicketStatus = "nieuw" | "in_behandeling" | "wacht_op_klant" | "wacht_op_onderdelen" | "ingepland" | "afgerond" | "geannuleerd";
type TicketPriority = "laag" | "normaal" | "hoog" | "urgent";

export default function ServiceTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useServiceTicket(id);
  const { data: users = [] } = useProfiles();
  const { data: customers = [] } = useCustomers({ limit: 200 });
  const { data: quotes = [] } = useQuotes({ limit: 200 });
  const { data: orders = [] } = useOrders({ limit: 200 });
  const updateStatus = useUpdateTicketStatus();
  const updateTicket = useUpdateTicket();
  const addNote = useAddTicketNote();
  const assignUser = useAssignUser();
  const unassignUser = useUnassignUser();
  const { toast } = useToast();

  const [noteContent, setNoteContent] = useState("");
  const [isAddingAssignee, setIsAddingAssignee] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [showExternalEmail, setShowExternalEmail] = useState(false);

  if (isLoading) {
    return (
      <AppLayout title="Service Ticket">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout title="Service Ticket">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ticket niet gevonden</p>
          <Button asChild className="mt-4">
            <Link to="/service">Terug naar overzicht</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.nieuw;
  const priority = priorityConfig[ticket.priority] || priorityConfig.normaal;
  const assignees = ticket.assignees || [];
  const notes = ticket.notes || [];
  const attachments = ticket.attachments || [];
  const statusHistory = ticket.status_history || [];

  const availableUsers = users.filter(
    (user) => !assignees.some((a) => a.user_id === user.id)
  );

  // Filter quotes and orders by selected customer if one is selected
  const filteredQuotes = ticket.customer_id
    ? quotes.filter((q) => q.customer_id === ticket.customer_id)
    : quotes;
  const filteredOrders = ticket.customer_id
    ? orders.filter((o) => o.customer_id === ticket.customer_id)
    : orders;

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({
      ticketId: ticket.id,
      fromStatus: ticket.status,
      toStatus: newStatus as TicketStatus,
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    updateTicket.mutate({
      id: ticket.id,
      priority: newPriority as TicketPriority,
    });
  };

  const handleCustomerChange = (customerId: string | null) => {
    updateTicket.mutate({
      id: ticket.id,
      customer_id: customerId,
      // Clear quote if customer changes
      quote_id: null,
    });
    setCustomerOpen(false);
  };

  const handleQuoteChange = (quoteId: string | null) => {
    updateTicket.mutate({
      id: ticket.id,
      quote_id: quoteId,
    } as any);
    setQuoteOpen(false);
  };

  const handleOrderChange = (orderId: string | null) => {
    updateTicket.mutate({
      id: ticket.id,
      order_id: orderId,
    } as any);
    setOrderOpen(false);
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    const mentionedUserIds = extractMentionedUserIds(noteContent, users);
    addNote.mutate(
      { ticketId: ticket.id, content: noteContent, mentionedUserIds },
      { onSuccess: () => setNoteContent("") }
    );
  };

  const handleAssignUser = (userId: string) => {
    assignUser.mutate({ ticketId: ticket.id, userId });
    setIsAddingAssignee(false);
  };

  const handleUnassignUser = (userId: string) => {
    unassignUser.mutate({ ticketId: ticket.id, userId });
  };

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("service-attachments")
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download mislukt",
        description: "Kon het bestand niet downloaden",
        variant: "destructive",
      });
    }
  };

  const getCustomerName = (customer: { first_name: string | null; last_name: string } | null) => {
    if (!customer) return "";
    return [customer.first_name, customer.last_name].filter(Boolean).join(" ");
  };

  // Render note content with highlighted @mentions
  const renderNoteContent = (content: string) => {
    const parts = content.split(/(@[^\s@]+(?:\s[^\s@]+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const name = part.slice(1);
        const isUser = users.some(
          (u) => u.full_name?.toLowerCase() === name.toLowerCase() || u.email.toLowerCase() === name.toLowerCase()
        );
        if (isUser) {
          return (
            <span key={i} className="font-medium text-primary bg-primary/10 rounded px-0.5">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  return (
    <AppLayout title={`Ticket #${ticket.ticket_number}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/service">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold">#{ticket.ticket_number}</h1>
              <Badge className={cn("text-xs", status.className)}>{status.label}</Badge>
              <Badge className={cn("text-xs", priority.className)}>{priority.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{ticket.subject}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Description */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Beschrijving</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {ticket.description || "Geen beschrijving"}
                </p>
              </CardContent>
            </Card>

            {/* Attachments */}
            {attachments.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Bijlagen ({attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between rounded-lg border p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">{attachment.file_name}</span>
                          {attachment.file_size && (
                            <span className="text-xs text-muted-foreground">
                              {(attachment.file_size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment.file_path, attachment.file_name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notities ({notes.length})
                  </CardTitle>
                  {ticket.submitter_email && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowExternalEmail(true)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Extern bericht
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {notes.length > 0 && (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                              {note.profile?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">
                            {note.profile?.full_name || "Onbekend"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{renderNoteContent(note.content)}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <MentionTextarea
                    value={noteContent}
                    onChange={setNoteContent}
                    rows={2}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddNote}
                    disabled={!noteContent.trim() || addNote.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Status History */}
            {statusHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Status geschiedenis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {statusHistory.map((entry) => {
                      const toStatus = statusConfig[entry.to_status] || statusConfig.nieuw;
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="text-xs text-muted-foreground w-32">
                            {format(new Date(entry.created_at), "d MMM HH:mm", { locale: nl })}
                          </span>
                          <Badge className={cn("text-xs", toStatus.className)}>
                            {toStatus.label}
                          </Badge>
                          <span className="text-muted-foreground">
                            door {entry.profile?.full_name || "Systeem"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - on mobile this goes below main content */}
          <div className="space-y-4 order-first lg:order-none">
            {/* Ticket info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nieuw">Nieuw</SelectItem>
                      <SelectItem value="in_behandeling">In behandeling</SelectItem>
                      <SelectItem value="wacht_op_klant">Wacht op klant</SelectItem>
                      <SelectItem value="wacht_op_onderdelen">Wacht op onderdelen</SelectItem>
                      <SelectItem value="ingepland">Ingepland</SelectItem>
                      <SelectItem value="afgerond">Afgerond</SelectItem>
                      <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Prioriteit</label>
                  <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laag">Laag</SelectItem>
                      <SelectItem value="normaal">Normaal</SelectItem>
                      <SelectItem value="hoog">Hoog</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Categorie</label>
                  <p className="text-sm">{categoryLabels[ticket.category] || ticket.category}</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Aangemaakt</label>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(ticket.created_at), "d MMMM yyyy", { locale: nl })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Customer & Quote linking */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Koppelingen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer selector */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Klant</label>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerOpen}
                        className="w-full justify-between"
                      >
                        {ticket.customer ? (
                          <span className="truncate">{getCustomerName(ticket.customer)}</span>
                        ) : (
                          <span className="text-muted-foreground">Selecteer klant...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Zoek klant..." />
                        <CommandList>
                          <CommandEmpty>Geen klant gevonden</CommandEmpty>
                          <CommandGroup>
                            {ticket.customer_id && (
                              <CommandItem onSelect={() => handleCustomerChange(null)}>
                                <X className="mr-2 h-4 w-4" />
                                Koppeling verwijderen
                              </CommandItem>
                            )}
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={`${customer.first_name || ""} ${customer.last_name}`}
                                onSelect={() => handleCustomerChange(customer.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    ticket.customer_id === customer.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {customer.first_name} {customer.last_name}
                                {customer.company_name && (
                                  <span className="ml-1 text-muted-foreground">
                                    ({customer.company_name})
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {ticket.customer && (
                    <Link
                      to={`/customers/${ticket.customer.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Bekijk klant <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Quote selector */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Offerte</label>
                  <Popover open={quoteOpen} onOpenChange={setQuoteOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={quoteOpen}
                        className="w-full justify-between"
                      >
                        {ticket.quote ? (
                          <span>Offerte #{ticket.quote.quote_number}</span>
                        ) : (
                          <span className="text-muted-foreground">Selecteer offerte...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Zoek offerte..." />
                        <CommandList>
                          <CommandEmpty>Geen offerte gevonden</CommandEmpty>
                          <CommandGroup>
                            {ticket.quote_id && (
                              <CommandItem onSelect={() => handleQuoteChange(null)}>
                                <X className="mr-2 h-4 w-4" />
                                Koppeling verwijderen
                              </CommandItem>
                            )}
                            {filteredQuotes.map((quote) => (
                              <CommandItem
                                key={quote.id}
                                value={`${quote.quote_number}`}
                                onSelect={() => handleQuoteChange(quote.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    ticket.quote_id === quote.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                #{quote.quote_number}
                                {quote.customer && (
                                  <span className="ml-1 text-muted-foreground truncate">
                                    - {(quote.customer as any).first_name} {(quote.customer as any).last_name}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {ticket.quote && (
                    <Link
                      to={`/quotes/${ticket.quote.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Bekijk offerte <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Order selector */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Order</label>
                  <Popover open={orderOpen} onOpenChange={setOrderOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={orderOpen}
                        className="w-full justify-between"
                      >
                        {ticket.order ? (
                          <span>Order #{ticket.order.order_number}</span>
                        ) : (
                          <span className="text-muted-foreground">Selecteer order...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Zoek order..." />
                        <CommandList>
                          <CommandEmpty>Geen order gevonden</CommandEmpty>
                          <CommandGroup>
                            {ticket.order_id && (
                              <CommandItem onSelect={() => handleOrderChange(null)}>
                                <X className="mr-2 h-4 w-4" />
                                Koppeling verwijderen
                              </CommandItem>
                            )}
                            {filteredOrders.map((order) => (
                              <CommandItem
                                key={order.id}
                                value={`${order.order_number}`}
                                onSelect={() => handleOrderChange(order.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    ticket.order_id === order.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                #{order.order_number}
                                {order.customer && (
                                  <span className="ml-1 text-muted-foreground truncate">
                                    - {(order.customer as any).first_name} {(order.customer as any).last_name}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {ticket.order && (
                    <Link
                      to={`/orders/${ticket.order.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Bekijk order <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submitter info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Indiener
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{ticket.submitter_name}</p>
                <a
                  href={`mailto:${ticket.submitter_email}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Mail className="h-3 w-3" />
                  {ticket.submitter_email}
                </a>
                {ticket.submitter_phone && (
                  <a
                    href={`tel:${ticket.submitter_phone}`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    {ticket.submitter_phone}
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Assignees */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Toegewezen</CardTitle>
                  {!isAddingAssignee && availableUsers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingAssignee(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {isAddingAssignee && (
                  <Select onValueChange={handleAssignUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer medewerker" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {assignees.length === 0 && !isAddingAssignee && (
                  <p className="text-sm text-muted-foreground">Geen medewerkers toegewezen</p>
                )}

                {assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {assignee.profile?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {assignee.profile?.full_name || assignee.profile?.email || "Onbekend"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleUnassignUser(assignee.user_id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {ticket.submitter_email && (
        <ComposeEmailDialog
          open={showExternalEmail}
          onOpenChange={setShowExternalEmail}
          customerEmail={ticket.submitter_email}
          customerId={ticket.customer_id || ""}
          customerName={ticket.submitter_name || "Klant"}
          ticketId={ticket.id}
          initialSubject={`Re: ${ticket.subject}`}
        />
      )}
    </AppLayout>
  );
}
