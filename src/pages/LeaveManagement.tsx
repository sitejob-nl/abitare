import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Check, X, Trash2, Loader2, CalendarDays } from "lucide-react";
import { format, parseISO, differenceInBusinessDays, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLeaveRequests,
  useCreateLeaveRequest,
  useUpdateLeaveStatus,
  useDeleteLeaveRequest,
  LEAVE_TYPES,
} from "@/hooks/useLeaveRequests";

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

export default function LeaveManagement() {
  const { user, roles } = useAuth();
  const isManager = roles.includes("admin") || roles.includes("manager");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("vakantie");
  const [notes, setNotes] = useState("");

  const { data: requests = [], isLoading } = useLeaveRequests();
  const createLeave = useCreateLeaveRequest();
  const updateStatus = useUpdateLeaveStatus();
  const deleteLeave = useDeleteLeaveRequest();

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Vul start- en einddatum in", variant: "destructive" });
      return;
    }
    try {
      await createLeave.mutateAsync({
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        notes: notes || undefined,
      });
      toast({ title: "Verlofaanvraag ingediend" });
      setDialogOpen(false);
      setStartDate("");
      setEndDate("");
      setNotes("");
      setLeaveType("vakantie");
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

  const getDays = (start: string, end: string) => {
    try {
      return differenceInBusinessDays(parseISO(end), parseISO(start)) + 1;
    } catch {
      return 0;
    }
  };

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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nog geen verlofaanvragen</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const isOwn = req.user_id === user?.id;
            const days = getDays(req.start_date, req.end_date);
            const typeLabel = LEAVE_TYPES.find((t) => t.value === req.leave_type)?.label || req.leave_type;

            return (
              <Card key={req.id}>
                <CardContent className="py-4 px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {(req as any).profile?.full_name || "Onbekend"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {typeLabel}
                        </Badge>
                        <Badge className={`text-xs ${STATUS_COLORS[req.status] || ""}`}>
                          {STATUS_LABELS[req.status] || req.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(req.start_date), "d MMM yyyy", { locale: nl })}
                        {" — "}
                        {format(parseISO(req.end_date), "d MMM yyyy", { locale: nl })}
                        <span className="ml-2 text-xs">({days} werkdag{days !== 1 ? "en" : ""})</span>
                      </div>
                      {req.notes && (
                        <p className="text-xs text-muted-foreground">{req.notes}</p>
                      )}
                      {req.approved_by && (req as any).approver && (
                        <p className="text-xs text-muted-foreground">
                          {req.status === "goedgekeurd" ? "Goedgekeurd" : "Afgekeurd"} door{" "}
                          {(req as any).approver.full_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isManager && req.status === "aangevraagd" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(req.id)}
                            title="Goedkeuren"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Einddatum</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </div>
            {startDate && endDate && (
              <p className="text-sm text-muted-foreground">
                {getDays(startDate, endDate)} werkdag(en)
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
              {createLeave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Indienen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
