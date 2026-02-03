import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Search, List, Columns3 } from "lucide-react";
import { useServiceTickets } from "@/hooks/useServiceTickets";
import { ServiceKanbanBoard } from "@/components/service/ServiceKanbanBoard";
import { ServiceTicketTable } from "@/components/service/ServiceTicketTable";

type ViewMode = "list" | "kanban";

export default function Service() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: tickets = [], isLoading } = useServiceTickets();

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          ticket.subject.toLowerCase().includes(searchLower) ||
          ticket.submitter_name.toLowerCase().includes(searchLower) ||
          ticket.submitter_email.toLowerCase().includes(searchLower) ||
          ticket.ticket_number.toString().includes(search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && ticket.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && ticket.category !== categoryFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "all" && ticket.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, search, statusFilter, categoryFilter, priorityFilter]);

  return (
    <AppLayout title="Service Tickets">
      <div className="space-y-4">
      {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Service Tickets</h1>
            <p className="text-sm text-muted-foreground">
              Beheer klachten, garantie en service aanvragen
            </p>
          </div>
          <Button asChild>
            <Link to="/service/new">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nieuw ticket</span>
              <span className="sm:hidden">Nieuw</span>
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoeken..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="nieuw">Nieuw</SelectItem>
                <SelectItem value="in_behandeling">In behandeling</SelectItem>
                <SelectItem value="wacht_op_klant">Wacht op klant</SelectItem>
                <SelectItem value="wacht_op_onderdelen">Wacht op onderdelen</SelectItem>
                <SelectItem value="ingepland">Ingepland</SelectItem>
                <SelectItem value="afgerond">Afgerond</SelectItem>
                <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle categorieën</SelectItem>
                <SelectItem value="klacht">Klacht</SelectItem>
                <SelectItem value="garantie">Garantie</SelectItem>
                <SelectItem value="schade">Schade</SelectItem>
                <SelectItem value="overig">Overig</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Prioriteit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle prioriteiten</SelectItem>
                <SelectItem value="laag">Laag</SelectItem>
                <SelectItem value="normaal">Normaal</SelectItem>
                <SelectItem value="hoog">Hoog</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as ViewMode)}
              >
                <ToggleGroupItem value="list" aria-label="Lijstweergave">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="kanban" aria-label="Kanbanweergave">
                  <Columns3 className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === "kanban" ? (
          <ServiceKanbanBoard tickets={filteredTickets} isLoading={isLoading} />
        ) : (
          <ServiceTicketTable tickets={filteredTickets} isLoading={isLoading} />
        )}
      </div>
    </AppLayout>
  );
}
