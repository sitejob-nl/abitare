import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface StatusHistoryEntry {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  created_at: string | null;
  notes: string | null;
  changed_by: string | null;
  profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface StatusHistoryCardProps {
  history: StatusHistoryEntry[];
}

const statusLabels: Record<OrderStatus, string> = {
  nieuw: "Nieuw",
  bestel_klaar: "Bestel klaar",
  controle: "Controle",
  besteld: "Besteld",
  in_productie: "In productie",
  levering_gepland: "Levering gepland",
  geleverd: "Geleverd",
  montage_gepland: "Montage gepland",
  gemonteerd: "Gemonteerd",
  nazorg: "Nazorg",
  afgerond: "Afgerond",
};

const statusColors: Record<OrderStatus, string> = {
  nieuw: "bg-blue-100 text-blue-800",
  bestel_klaar: "bg-purple-100 text-purple-800",
  controle: "bg-orange-100 text-orange-800",
  besteld: "bg-cyan-100 text-cyan-800",
  in_productie: "bg-yellow-100 text-yellow-800",
  levering_gepland: "bg-indigo-100 text-indigo-800",
  geleverd: "bg-teal-100 text-teal-800",
  montage_gepland: "bg-pink-100 text-pink-800",
  gemonteerd: "bg-emerald-100 text-emerald-800",
  nazorg: "bg-amber-100 text-amber-800",
  afgerond: "bg-green-100 text-green-800",
};

export function StatusHistoryCard({ history }: StatusHistoryCardProps) {
  const sortedHistory = [...history].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Clock className="h-4 w-4" />
          Status Historie
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Geen statuswijzigingen gevonden.
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-4">
              {sortedHistory.map((entry, index) => (
                <div key={entry.id} className="relative flex gap-3">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 mt-1.5 h-4 w-4 rounded-full border-2 border-background ${
                      index === 0 ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    {/* Status change */}
                    <div className="flex flex-wrap items-center gap-1.5 text-sm">
                      {entry.from_status && (
                        <>
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusColors[entry.from_status]}`}
                          >
                            {statusLabels[entry.from_status]}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[entry.to_status]}`}
                      >
                        {statusLabels[entry.to_status]}
                      </Badge>
                    </div>

                    {/* Timestamp and user */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {entry.created_at
                          ? format(new Date(entry.created_at), "d MMM yyyy 'om' HH:mm", {
                              locale: nl,
                            })
                          : "Onbekende datum"}
                      </span>
                      {entry.profile && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.profile.full_name || entry.profile.email}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Notes */}
                    {entry.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
