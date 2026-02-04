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
  organizer?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  webLink?: string;
}

export function useMicrosoftCalendarEvents(month: Date) {
  const { data: connection } = useMicrosoftConnection();

  const start = startOfMonth(subMonths(month, 1));
  const end = endOfMonth(addMonths(month, 1));

  return useQuery({
    queryKey: ["microsoft-calendar-events", format(start, "yyyy-MM"), format(end, "yyyy-MM")],
    queryFn: async (): Promise<MicrosoftCalendarEvent[]> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Niet ingelogd");
      }

      const startDateTime = start.toISOString();
      const endDateTime = end.toISOString();

      const { data, error } = await supabase.functions.invoke("microsoft-api", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: {
          endpoint: `/me/calendarview?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$orderby=start/dateTime&$top=100`,
          method: "GET",
        },
      });

      if (error) {
        throw new Error(error.message || "Kon agenda niet ophalen");
      }

      return data?.value || [];
    },
    enabled: !!connection?.is_active,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
