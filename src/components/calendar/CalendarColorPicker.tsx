import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PRESET_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#14B8A6", // teal
  "#6366F1", // indigo
  "#84CC16", // lime
  "#A855F7", // purple
];

export function CalendarColorPicker() {
  const queryClient = useQueryClient();

  const { data: currentColor } = useQuery({
    queryKey: ["my-calendar-color"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return null;
      const { data } = await supabase
        .from("profiles")
        .select("calendar_color")
        .eq("id", sessionData.session.user.id)
        .single();
      return data?.calendar_color || null;
    },
  });

  const updateColor = useMutation({
    mutationFn: async (color: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Niet ingelogd");
      const { error } = await supabase
        .from("profiles")
        .update({ calendar_color: color })
        .eq("id", sessionData.session.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-calendar-color"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Agendakleur opgeslagen" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Agendakleur
        </CardTitle>
        <CardDescription>
          Kies een kleur voor je agenda-items. Collega's zien deze kleur bij jouw afspraken.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => updateColor.mutate(color)}
              className="relative h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              style={{
                backgroundColor: color,
                borderColor: currentColor === color ? "hsl(var(--foreground))" : "transparent",
              }}
            >
              {currentColor === color && (
                <Check className="h-4 w-4 text-white absolute inset-0 m-auto" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
