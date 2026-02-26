import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMsConnectedUsers, useCalendarSubscriptions } from "@/hooks/useMicrosoftCalendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Users, ChevronDown, ChevronUp } from "lucide-react";

export function CalendarSubscriptionPanel() {
  const [expanded, setExpanded] = useState(false);
  const { data: connectedUsers } = useMsConnectedUsers();
  const { data: subscriptions } = useCalendarSubscriptions();
  const queryClient = useQueryClient();

  const subscribedIds = new Set(
    subscriptions
      ?.filter(s => (s as any).is_visible)
      .map(s => (s as any).target_user_id) || []
  );

  const toggleSubscription = useMutation({
    mutationFn: async ({ targetUserId, visible }: { targetUserId: string; visible: boolean }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not logged in");

      if (visible) {
        await supabase.from("calendar_subscriptions").upsert({
          user_id: sessionData.session.user.id,
          target_user_id: targetUserId,
          is_visible: true,
        }, { onConflict: "user_id,target_user_id" });
      } else {
        await supabase.from("calendar_subscriptions")
          .update({ is_visible: false })
          .eq("user_id", sessionData.session.user.id)
          .eq("target_user_id", targetUserId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["microsoft-calendar-events"] });
    },
  });

  if (!connectedUsers || connectedUsers.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <Button
        variant="ghost"
        className="w-full justify-between px-4 py-3 h-auto"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4" />
          Collega-agenda's
          {subscribedIds.size > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {subscribedIds.size}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {connectedUsers.map((user) => (
            <label
              key={user.userId}
              className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2"
            >
              <Checkbox
                checked={subscribedIds.has(user.userId)}
                onCheckedChange={(checked) =>
                  toggleSubscription.mutate({ targetUserId: user.userId, visible: !!checked })
                }
              />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {user.calendarColor && (
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: user.calendarColor }}
                  />
                )}
                <span className="text-sm truncate">{user.fullName}</span>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
