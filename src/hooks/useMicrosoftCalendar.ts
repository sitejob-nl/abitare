import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMicrosoftConnection } from "./useMicrosoftConnection";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export interface MicrosoftCalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName?: string;
  };
  isAllDay?: boolean;
  sensitivity?: "normal" | "personal" | "private" | "confidential";
  organizer?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  webLink?: string;
  // Added for multi-user: track whose calendar this event came from
  _ownerEmail?: string;
  _ownerName?: string;
  _ownerColor?: string;
}

export function useMicrosoftCalendarEvents(month: Date, subscribedEmails?: { email: string; name: string; color: string }[]) {
  const { data: connection } = useMicrosoftConnection();

  const start = startOfMonth(subMonths(month, 1));
  const end = endOfMonth(addMonths(month, 1));

  return useQuery({
    queryKey: ["microsoft-calendar-events", format(start, "yyyy-MM"), format(end, "yyyy-MM"), subscribedEmails?.map(s => s.email).join(",")],
    queryFn: async (): Promise<MicrosoftCalendarEvent[]> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Niet ingelogd");
      }

      const startDateTime = start.toISOString();
      const endDateTime = end.toISOString();

      const allEvents: MicrosoftCalendarEvent[] = [];

      // Fetch own calendar (/me)
      const { data, error } = await supabase.functions.invoke("microsoft-api", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: {
          endpoint: `/me/calendarview?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$orderby=start/dateTime&$top=100&$select=id,subject,start,end,location,isAllDay,sensitivity,organizer,webLink`,
          method: "GET",
        },
      });

      if (!error && data?.value) {
        const ownEvents = (data.value as MicrosoftCalendarEvent[]).map(e => ({
          ...e,
          _ownerEmail: connection?.microsoft_email || "me",
          _ownerName: "Mijn agenda",
        }));
        allEvents.push(...ownEvents);
      }

      // Fetch subscribed colleague calendars
      if (subscribedEmails && subscribedEmails.length > 0) {
        const results = await Promise.allSettled(
          subscribedEmails.map(async (sub) => {
            const { data: colData, error: colError } = await supabase.functions.invoke("microsoft-api", {
              headers: {
                Authorization: `Bearer ${sessionData.session!.access_token}`,
              },
              body: {
                endpoint: `/users/${sub.email}/calendarview?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$orderby=start/dateTime&$top=100&$select=id,subject,start,end,location,isAllDay,sensitivity,organizer,webLink`,
                method: "GET",
              },
            });

            if (colError) return [];
            return ((colData?.value || []) as MicrosoftCalendarEvent[]).map(e => ({
              ...e,
              id: `${sub.email}-${e.id}`, // ensure unique IDs
              _ownerEmail: sub.email,
              _ownerName: sub.name,
              _ownerColor: sub.color,
            }));
          })
        );

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            allEvents.push(...result.value);
          }
        });
      }

      return allEvents;
    },
    enabled: !!connection?.is_active,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to manage calendar subscriptions
export function useCalendarSubscriptions() {
  return useQuery({
    queryKey: ["calendar-subscriptions"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return [];

      const { data, error } = await supabase
        .from("calendar_subscriptions")
        .select("*, target:profiles!calendar_subscriptions_target_user_id_fkey(id, full_name, email, calendar_color)")
        .eq("user_id", sessionData.session.user.id);

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook to get all MS-connected colleagues for the subscription picker
export function useMsConnectedUsers() {
  return useQuery({
    queryKey: ["ms-connected-users"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return [];

      const { data, error } = await supabase
        .from("microsoft_connections")
        .select("user_id, microsoft_email, user:profiles!microsoft_connections_user_id_fkey(id, full_name, email, calendar_color)")
        .eq("is_active", true)
        .neq("user_id", sessionData.session.user.id);

      if (error) throw error;
      return (data || []).map(c => {
        const user = c.user as unknown as { id: string; full_name: string | null; email: string; calendar_color: string | null } | null;
        return {
          userId: c.user_id,
          microsoftEmail: c.microsoft_email,
          fullName: user?.full_name || c.microsoft_email || "Onbekend",
          email: user?.email || "",
          calendarColor: user?.calendar_color || null,
        };
      });
    },
  });
}
