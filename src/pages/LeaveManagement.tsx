import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, X, Trash2, Loader2, CalendarDays, Clock } from "lucide-react";
import { format, parseISO, differenceInBusinessDays } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLeaveRequests,
  useCreateLeaveRequest,
  useUpdateLeaveStatus,
  useDeleteLeaveRequest,
  LEAVE_TYPES,
  type LeaveRequest,
} from "@/hooks/useLeaveRequests";
import { useProfiles } from "@/hooks/useUsers";
import { WorkScheduleEditor } from "@/components/leave/WorkScheduleEditor";

const STATUS_COLORS: Record<string, string> = {
  aangevraagd: "bg-amber-100 text-amber-800",
  goedgekeurd: "bg-green-100 text-green-800",
  afgekeurd: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  aangevraagd: "Aangevraagd",
  goedgekeurd: "Goedgekeurd",
  afgekeurd: "Afgekeurd",
};

type SortOption = "date_desc" | "date_asc" | "name_asc";

export default function LeaveManagement() {
  const { user, roles } = useAuth();
  const isManager = roles.includes("admin") || roles.includes("manager");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("vakantie");
  const [notes, setNotes] = useState("");
  const [isPartialDay, setIsPartialDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  // Filter state
  const [filterStatus, setFilterStatus] = useState("alle");
  const [filterType, setFilterType] = useState("alle");
  const [filterUser, setFilterUser] = useState("alle");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");

  const { data: requests = [], isLoading } = useLeaveRequests();
  const { data: profiles = [] } = useProfiles();
  const createLeave = useCreateLeaveRequest();
  const updateStatus = useUpdateLeaveStatus();
  const deleteLeave = useDeleteLeaveRequest();

  // Filtered and sorted list
  const filteredRequests = useMemo(() => {
    let list = [...requests];

    if (filterStatus !== "alle") {
      list = list.filter((r) => r.status === filterStatus);
    }
    if (filterType !== "alle") {
      list = list.filter((r) => r.leave_type === filterType);
    }
    if (filterUser !== "alle") {
      list = list.filter((r) => r.user_id === filterUser);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return a.start_date.localeCompare(b.start_date);
        case "name_asc":
          return (a.profile?.full_name || "").localeCompare(b.profile?.full_name || "");
        case "date_desc":
        default:
          return b.start_date.localeCompare(a.start_date);
      }
    });

    return list;
  }, [requests, filterStatus, filterType, filterUser, sortBy]);

  const resetDialog = () => {
    setStartDate("");
    setEndDate("");
    setNotes("");
    setLeaveType("vakantie");
    setIsPartialDay(false);
    setStartTime("09:00");
    setEndTime("17:00");
  };

  const handleSubmit = async () => {
    if (!startDate || (!isPartialDay && !endDate)) {
      toast({ title: "Vul de datumvelden in", variant: "destructive" });
      return;
    }
    if (isPartialDay && startTime >= endTime) {
      toast({ title: "Eindtijd moet na starttijd liggen", variant: "destructive" });
      return;
    }
    try {
      await createLeave.mutateAsync({
        start_date: startDate,
        end_date: isPartialDay ? startDate : endDate,
        leave_type: leaveType,
        notes: notes || undefined,
        is_partial_day: isPartialDay,
        start_time: isPartialDay ? startTime : null,
        end_time: isPartialDay ? endTime : null,
      });
      toast({ title: "Verlofaanvraag ingediend" });
      setDialogOpen(false);
      resetDialog();
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  const handleApprove = (id: string) => {
    updateStatus.mutate(
      { id, status: "goedgekeurd" },
      { onSuccess: () => toast({ title: "Verlof goedgekeurd" }) }
    );
  };

  const handleReject = (id: string) => {
    updateStatus.mutate(
      { id, status: "afgekeurd" },
      { onSuccess: () => toast({ title: "Verlof afgekeurd" }) }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Weet je zeker dat je deze aanvraag wilt verwijderen?")) {
      deleteLeave.mutate(id, {
        onSuccess: () => toast({ title: "Aanvraag verwijderd" }),
      });
    }
  };

  const formatDuration = (req: LeaveRequest) => {
    if (req.is_partial_day && req.start_time && req.end_time) {
      return `${req.start_time.slice(0, 5)} – ${req.end_time.slice(0, 5)}`;
    }
    try {
      const days = differenceInBusinessDays(parseISO(req.end_date), parseISO(req.start_date)) + 1;
      return `${days} werkdag${days !== 1 ? "en" : ""}`;
    } catch {
      return "";
    }
  };

  const getDays = (start: string, end: string) => {
    try {
      return differenceInBusinessDays(parseISO(end), parseISO(start)) + 1;
    } catch {
      return 0;
    }
  };

  // Unique users in requests for filter dropdown
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    requests.forEach((r) => {
      if (r.profile?.full_name) map.set(r.user_id, r.profile.full_name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [requests]);

  const renderLeaveList = () => (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            <SelectItem value="aangevraagd">Aangevraagd</SelectItem>
            <SelectItem value="goedgekeurd">Goedgekeurd</SelectItem>
            <SelectItem value="afgekeurd">Afgekeurd</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle types</SelectItem>
            {LEAVE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isManager && uniqueUsers.length > 1 && (
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Medewerker" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle medewerkers</SelectItem>
              {uniqueUsers.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Sorteren" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Datum (nieuw → oud)</SelectItem>
            <SelectItem value="date_asc">Datum (oud → nieuw)</SelectItem>
            <SelectItem value="name_asc">Naam A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {requests.length === 0
                ? "Nog geen verlofaanvragen"
                : "Geen resultaten met de huidige filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isOwn = req.user_id === user?.id;
            const typeLabel =
              LEAVE_TYPES.find((t) => t.value === req.leave_type)?.label || req.leave_type;

            return (
              <Card key={req.id}>
                <CardContent className="py-4 px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {req.profile?.full_name || "Onbekend"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {typeLabel}
                        </Badge>
                        <Badge className={`text-xs ${STATUS_COLORS[req.status] || ""}`}>
                          {STATUS_LABELS[req.status] || req.status}
                        </Badge>
                        {req.is_partial_day && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            Deeldag
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(req.start_date), "d MMM yyyy", { locale: nl })}
                        {!req.is_partial_day && req.start_date !== req.end_date && (
                          <>
                            {" — "}
                            {format(parseISO(req.end_date), "d MMM yyyy", { locale: nl })}
                          </>
                        )}
                        <span className="ml-2 text-xs">({formatDuration(req)})</span>
                      </div>
                      {req.notes && (
                        <p className="text-xs text-muted-foreground">{req.notes}</p>
                      )}
                      {req.approved_by && req.approver && (
                        <p className="text-xs text-muted-foreground">
                          {req.status === "goedgekeurd" ? "Goedgekeurd" : "Afgekeurd"} door{" "}
                          {req.approver.full_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isManager && req.status === "aangevraagd" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleApprove(req.id)}
                            title="Goedkeuren"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleReject(req.id)}
                            title="Afkeuren"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(isOwn || isManager) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(req.id)}
                          title="Verwijderen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <AppLayout title="Verlof" breadcrumb="Verlof">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-foreground">
            Verlofbeheer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vraag verlof aan en bekijk de status
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Verlof aanvragen</span>
          <span className="sm:hidden">Nieuw</span>
        </Button>
      </div>

      {isManager ? (
        <Tabs defaultValue="aanvragen">
          <TabsList>
            <TabsTrigger value="aanvragen">Aanvragen</TabsTrigger>
            <TabsTrigger value="werkroosters">Werkroosters</TabsTrigger>
          </TabsList>
          <TabsContent value="aanvragen">{renderLeaveList()}</TabsContent>
          <TabsContent value="werkroosters">
            <WorkScheduleEditor />
          </TabsContent>
        </Tabs>
      ) : (
        renderLeaveList()
      )}

      {/* New leave request dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Verlof aanvragen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type verlof</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="partial"
                checked={isPartialDay}
                onCheckedChange={(v) => setIsPartialDay(v === true)}
              />
              <Label htmlFor="partial" className="text-sm cursor-pointer">
                Deel van de dag (bijv. tandarts, afspraak)
              </Label>
            </div>

            <div className={`grid gap-3 ${isPartialDay ? "grid-cols-1" : "grid-cols-2"}`}>
              <div className="space-y-2">
                <Label>{isPartialDay ? "Datum" : "Startdatum"}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              {!isPartialDay && (
                <div className="space-y-2">
                  <Label>Einddatum</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                  />
                </div>
              )}
            </div>

            {isPartialDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Van</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tot</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {!isPartialDay && startDate && endDate && (
              <p className="text-sm text-muted-foreground">
                {getDays(startDate, endDate)} werkdag(en)
              </p>
            )}

            {isPartialDay && startTime && endTime && startTime < endTime && (
              <p className="text-sm text-muted-foreground">
                {startTime} – {endTime}
              </p>
            )}

            <div className="space-y-2">
              <Label>Opmerking (optioneel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bijv. reden of bijzonderheden"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSubmit} disabled={createLeave.isPending}>
              {createLeave.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Indienen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
