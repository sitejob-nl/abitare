import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ServiceTicket } from "@/hooks/useServiceTickets";

interface ServiceTicketTableProps {
  tickets: ServiceTicket[];
  isLoading: boolean;
}

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

export function ServiceTicketTable({ tickets, isLoading }: ServiceTicketTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">Geen tickets gevonden</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">#</TableHead>
            <TableHead>Onderwerp</TableHead>
            <TableHead>Indiener</TableHead>
            <TableHead>Categorie</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioriteit</TableHead>
            <TableHead>Toegewezen</TableHead>
            <TableHead className="text-right">Datum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => {
            const status = statusConfig[ticket.status] || statusConfig.nieuw;
            const priority = priorityConfig[ticket.priority] || priorityConfig.normaal;
            const assignees = ticket.assignees || [];

            return (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-sm">
                  {ticket.ticket_number}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/service/${ticket.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {ticket.subject}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-sm">{ticket.submitter_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ticket.submitter_email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {categoryLabels[ticket.category] || ticket.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", status.className)}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", priority.className)}>
                    {priority.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {assignees.length > 0 ? (
                    <div className="flex -space-x-1">
                      {assignees.slice(0, 3).map((a) => (
                        <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[10px]">
                            {a.profile?.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {assignees.length > 3 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
                          +{assignees.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {format(new Date(ticket.created_at), "d MMM yyyy", { locale: nl })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
