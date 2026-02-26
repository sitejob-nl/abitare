import { useState } from "react";
import { Bell, ShoppingCart, CreditCard, Calendar, Wrench, ExternalLink, AtSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  type: "order" | "payment" | "calendar" | "service" | "mention";
  title: string;
  description: string;
  url: string;
  createdAt: Date;
  isRead?: boolean;
  mentionId?: string;
}

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch recent orders (last 7 days)
  const { data: recentOrders } = useQuery({
    queryKey: ["notifications-orders"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, created_at, customers(last_name, company_name)")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);
      
      return data || [];
    },
  });

  // Fetch unpaid orders
  const { data: unpaidOrders } = useQuery({
    queryKey: ["notifications-unpaid"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, total_incl_vat, customers(last_name, company_name)")
        .eq("payment_status", "open")
        .order("created_at", { ascending: false })
        .limit(5);
      
      return data || [];
    },
  });

  // Fetch upcoming installations (next 7 days)
  const { data: upcomingInstallations } = useQuery({
    queryKey: ["notifications-installations"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, expected_installation_date, customers(last_name, company_name)")
        .gte("expected_installation_date", today)
        .lte("expected_installation_date", nextWeek.toISOString().split("T")[0])
        .order("expected_installation_date", { ascending: true })
        .limit(5);
      
      return data || [];
    },
  });

  // Fetch open service tickets
  const { data: openTickets } = useQuery({
    queryKey: ["notifications-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_tickets")
        .select("id, ticket_number, subject, status")
        .in("status", ["nieuw", "in_behandeling"])
        .order("created_at", { ascending: false })
        .limit(5);
      
      return data || [];
    },
  });

  // Fetch unread mentions for current user
  const { data: unreadMentions } = useQuery({
    queryKey: ["user-mentions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("user_mentions")
        .select(`
          id, content_preview, created_at, is_read,
          ticket:service_tickets(id, ticket_number, subject),
          mentioner:profiles!user_mentions_mentioned_by_fkey(full_name)
        `)
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mark mention as read
  const markRead = useMutation({
    mutationFn: async (mentionId: string) => {
      await supabase.from("user_mentions").update({ is_read: true }).eq("id", mentionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-mentions"] });
    },
  });

  // Build notifications list
  const notifications: Notification[] = [];

  // Add mention notifications first (highest priority)
  unreadMentions?.forEach((mention: any) => {
    const ticket = mention.ticket;
    const mentioner = mention.mentioner;
    notifications.push({
      id: `mention-${mention.id}`,
      type: "mention",
      title: `${mentioner?.full_name || "Iemand"} heeft je getagd`,
      description: ticket ? `Ticket #${ticket.ticket_number}: ${mention.content_preview || ticket.subject}` : (mention.content_preview || ""),
      url: ticket ? `/service/${ticket.id}` : "/service",
      createdAt: new Date(mention.created_at),
      mentionId: mention.id,
    });
  });

  recentOrders?.forEach((order: any) => {
    const customerName = order.customers?.company_name || order.customers?.last_name || "Onbekend";
    notifications.push({
      id: `order-${order.id}`,
      type: "order",
      title: `Nieuwe order #${order.order_number}`,
      description: customerName,
      url: `/orders/${order.id}`,
      createdAt: new Date(order.created_at),
    });
  });

  unpaidOrders?.forEach((order: any) => {
    const customerName = order.customers?.company_name || order.customers?.last_name || "Onbekend";
    notifications.push({
      id: `payment-${order.id}`,
      type: "payment",
      title: `Openstaande betaling`,
      description: `Order #${order.order_number} - ${customerName}`,
      url: `/orders/${order.id}`,
      createdAt: new Date(),
    });
  });

  upcomingInstallations?.forEach((order: any) => {
    const customerName = order.customers?.company_name || order.customers?.last_name || "Onbekend";
    notifications.push({
      id: `install-${order.id}`,
      type: "calendar",
      title: `Installatie gepland`,
      description: `${format(new Date(order.expected_installation_date), "d MMM", { locale: nl })} - ${customerName}`,
      url: `/orders/${order.id}`,
      createdAt: new Date(order.expected_installation_date),
    });
  });

  openTickets?.forEach((ticket: any) => {
    notifications.push({
      id: `ticket-${ticket.id}`,
      type: "service",
      title: `Service ticket #${ticket.ticket_number}`,
      description: ticket.subject,
      url: `/service/${ticket.id}`,
      createdAt: new Date(),
    });
  });

  // Sort by date (newest first) and limit
  const sortedNotifications = notifications
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 15);

  const unreadCount = (unreadMentions?.length || 0);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="h-4 w-4 text-primary" />;
      case "payment":
        return <CreditCard className="h-4 w-4 text-warning" />;
      case "calendar":
        return <Calendar className="h-4 w-4 text-success" />;
      case "service":
        return <Wrench className="h-4 w-4 text-danger" />;
      case "mention":
        return <AtSign className="h-4 w-4 text-violet-600" />;
    }
  };

  const handleClick = (notification: Notification) => {
    // Mark mention as read when clicked
    if (notification.mentionId) {
      markRead.mutate(notification.mentionId);
    }
    navigate(notification.url);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9 md:h-10 md:w-10">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover z-50">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaties</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {unreadCount} ongelezen
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {sortedNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Geen nieuwe meldingen
            </div>
          ) : (
            sortedNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer focus:bg-accent ${notification.type === "mention" ? "bg-violet-50/50" : ""}`}
                onClick={() => handleClick(notification)}
              >
                <div className="mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{notification.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {notification.description}
                  </p>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
