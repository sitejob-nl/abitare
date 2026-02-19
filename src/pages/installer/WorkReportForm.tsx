import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, Save, Send, User, AlertTriangle } from "lucide-react";
import { InstallerLayout } from "@/components/installer/InstallerLayout";
import { PhotoUploader } from "@/components/installer/PhotoUploader";
import { TaskChecklist } from "@/components/installer/TaskChecklist";
import { TimeTracker } from "@/components/installer/TimeTracker";
import { SignaturePad } from "@/components/installer/SignaturePad";
import { DamageRecordForm, type DamageRecord } from "@/components/installer/DamageRecordForm";
import {
  useWorkReport,
  useUpdateWorkReport,
  useSubmitWorkReport,
  useUploadWorkReportPhoto,
  useDeleteWorkReportPhoto,
  useAddWorkReportTask,
  useToggleWorkReportTask,
} from "@/hooks/useWorkReports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusLabels: Record<string, string> = {
  concept: "Concept",
  ingediend: "Ingediend",
  goedgekeurd: "Goedgekeurd",
};

const statusColors: Record<string, string> = {
  concept: "bg-yellow-100 text-yellow-800",
  ingediend: "bg-blue-100 text-blue-800",
  goedgekeurd: "bg-green-100 text-green-800",
};

export default function WorkReportForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading } = useWorkReport(id);
  const updateReport = useUpdateWorkReport();
  const submitReport = useSubmitWorkReport();
  const uploadPhoto = useUploadWorkReportPhoto();
  const deletePhoto = useDeleteWorkReportPhoto();
  const addTask = useAddWorkReportTask();
  const toggleTask = useToggleWorkReportTask();

  // Form state
  const [workDate, setWorkDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  
  // Damage state
  const [hasDamage, setHasDamage] = useState<boolean | null>(null);
  const [damageRecords, setDamageRecords] = useState<DamageRecord[]>([]);

  // Fetch order lines for article linking
  const { data: orderLines = [] } = useQuery({
    queryKey: ["installer-order-lines", report?.order?.id],
    queryFn: async () => {
      if (!report?.order?.id) return [];
      const { data, error } = await supabase
        .from("order_lines")
        .select("id, description, article_code, quantity")
        .eq("order_id", report.order.id)
        .eq("is_group_header", false)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!report?.order?.id,
  });

  // Fetch existing damage records
  const { data: existingDamages } = useQuery({
    queryKey: ["work-report-damages", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("work_report_damages")
        .select("*")
        .eq("work_report_id", id)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Initialize form when report loads
  useEffect(() => {
    if (report) {
      setWorkDate(report.work_date || "");
      setStartTime(report.start_time || "");
      setEndTime(report.end_time || "");
      setWorkDescription(report.work_description || "");
      setMaterialsUsed(report.materials_used || "");
      setInternalNotes(report.internal_notes || "");
      setHasDamage(report.has_damage ?? null);
    }
  }, [report]);

  // Sync existing damages to local state
  useEffect(() => {
    if (existingDamages && existingDamages.length > 0) {
      setDamageRecords(existingDamages.map(d => ({
        id: d.id,
        description: d.description,
        position: d.position || "",
        measurements: d.measurements || "",
        order_line_id: d.order_line_id || null,
      })));
    }
  }, [existingDamages]);

  const handleSave = async () => {
    if (!id) return;

    // Calculate total hours
    let totalHours: number | null = null;
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      const diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMinutes > 0) {
        totalHours = Math.round(diffMinutes / 60 * 100) / 100;
      }
    }

    await updateReport.mutateAsync({
      id,
      data: {
        work_date: workDate,
        start_time: startTime || null,
        end_time: endTime || null,
        total_hours: totalHours,
        work_description: workDescription || null,
        materials_used: materialsUsed || null,
        internal_notes: internalNotes || null,
      },
    });
  };

  // Count damage photos
  const damagePhotos = useMemo(() => {
    return (report?.work_report_photos || []).filter(p => p.photo_type === "schade");
  }, [report?.work_report_photos]);

  // Validate damage flow before submit
  const canSubmit = useMemo(() => {
    if (hasDamage === null) return false;
    if (hasDamage) {
      return damagePhotos.length > 0 && damageRecords.length > 0;
    }
    return true;
  }, [hasDamage, damagePhotos.length, damageRecords.length]);

  const saveDamageRecords = async () => {
    if (!id) return;
    // Delete existing, then insert new
    await supabase.from("work_report_damages").delete().eq("work_report_id", id);
    if (damageRecords.length > 0) {
      const rows = damageRecords.map(d => ({
        work_report_id: id,
        description: d.description,
        position: d.position || null,
        measurements: d.measurements || null,
        order_line_id: d.order_line_id || null,
        photo_urls: [],
      }));
      await supabase.from("work_report_damages").insert(rows);
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    
    if (hasDamage === null) {
      toast.error("Beantwoord eerst de schadebeoordeling");
      return;
    }
    if (hasDamage && damagePhotos.length === 0) {
      toast.error("Voeg minimaal 1 schadefoto toe voordat je de werkbon indient");
      return;
    }
    if (hasDamage && damageRecords.length === 0) {
      toast.error("Voeg minimaal 1 schaderegistratie toe");
      return;
    }

    // Save damage flag + records
    await updateReport.mutateAsync({
      id,
      data: { has_damage: hasDamage } as any,
    });
    await saveDamageRecords();

    await handleSave();
    await submitReport.mutateAsync(id);
    navigate("/monteur/werkbonnen");
  };

  const handlePhotoUpload = async (
    file: File,
    photoType: "voor" | "tijdens" | "na" | "schade",
    caption?: string
  ) => {
    if (!id) return;
    await uploadPhoto.mutateAsync({
      workReportId: id,
      file,
      photoType,
      caption,
    });
  };

  const handlePhotoDelete = async (photoId: string, filePath: string) => {
    if (!id) return;
    await deletePhoto.mutateAsync({
      photoId,
      filePath,
      workReportId: id,
    });
  };

  const handleAddTask = async (description: string) => {
    if (!id) return;
    await addTask.mutateAsync({ workReportId: id, description });
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    if (!id) return;
    await toggleTask.mutateAsync({ taskId, isCompleted, workReportId: id });
  };

  const isReadOnly = report?.status !== "concept";

  if (isLoading) {
    return (
      <InstallerLayout>
        <div className="container max-w-2xl py-6">
          <Skeleton className="mb-6 h-8 w-48" />
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-6 w-32" />
              <Skeleton className="mb-2 h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </InstallerLayout>
    );
  }

  if (!report) {
    return (
      <InstallerLayout>
        <div className="container max-w-2xl py-6">
          <Card className="p-12 text-center">
            <h3 className="font-semibold">Werkbon niet gevonden</h3>
            <Button className="mt-4" onClick={() => navigate("/monteur/werkbonnen")}>
              Terug naar overzicht
            </Button>
          </Card>
        </div>
      </InstallerLayout>
    );
  }

  const customerName = report.customer
    ? report.customer.company_name ||
      `${report.customer.first_name || ""} ${report.customer.last_name}`.trim()
    : "Onbekende klant";

  return (
    <InstallerLayout>
      <div className="container max-w-2xl py-6 pb-24">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">WB-{report.report_number}</h1>
              <Badge className={statusColors[report.status]}>
                {statusLabels[report.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {customerName}
              {report.order && ` • Order #${report.order.order_number}`}
            </p>
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos">
              Foto's ({report.work_report_photos?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Taken ({report.work_report_tasks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="signature">Handtekening</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {/* Date & Time */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Datum & Tijd</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workDate">Werkdatum</Label>
                  <Input
                    id="workDate"
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    disabled={isReadOnly}
                    className="min-h-[44px]"
                  />
                </div>
                <TimeTracker
                  startTime={startTime}
                  endTime={endTime}
                  onStartTimeChange={setStartTime}
                  onEndTimeChange={setEndTime}
                  disabled={isReadOnly}
                />
              </CardContent>
            </Card>

            {/* Work Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Werkzaamheden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workDescription">Omschrijving</Label>
                  <Textarea
                    id="workDescription"
                    placeholder="Beschrijf de uitgevoerde werkzaamheden..."
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    disabled={isReadOnly}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materialsUsed">Gebruikte materialen</Label>
                  <Textarea
                    id="materialsUsed"
                    placeholder="Welke materialen zijn gebruikt?"
                    value={materialsUsed}
                    onChange={(e) => setMaterialsUsed(e.target.value)}
                    disabled={isReadOnly}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Interne notities</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Notities voor intern gebruik (niet zichtbaar voor klant)..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  disabled={isReadOnly}
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Foto's</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUploader
                  workReportId={id!}
                  photos={report.work_report_photos || []}
                  onUpload={handlePhotoUpload}
                  onDelete={handlePhotoDelete}
                  disabled={isReadOnly}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Takenlijst</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskChecklist
                  tasks={report.work_report_tasks || []}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  disabled={isReadOnly}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signature Tab */}
          <TabsContent value="signature">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Handtekening klant</CardTitle>
              </CardHeader>
              <CardContent>
                <SignaturePad
                  disabled={isReadOnly}
                  existingSignature={(report as any).customer_signature_url || null}
                  onSave={async (dataUrl) => {
                    if (!id) return;
                    // Convert data URL to blob and upload
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    const file = new File([blob], `signature-${id}.png`, { type: "image/png" });

                    await uploadPhoto.mutateAsync({
                      workReportId: id,
                      file,
                      photoType: "na" as const,
                      caption: "Handtekening klant",
                    });
                    setSignatureSaved(true);
                  }}
                />
                {signatureSaved && (
                  <p className="mt-2 text-sm text-primary">✓ Handtekening opgeslagen</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Damage Assessment - always visible when not read-only */}
        {!isReadOnly && (
          <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Schadebeoordeling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">Is er beschadiging geconstateerd? *</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={hasDamage === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHasDamage(false)}
                  >
                    Nee, geen schade
                  </Button>
                  <Button
                    type="button"
                    variant={hasDamage === true ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setHasDamage(true)}
                  >
                    Ja, schade geconstateerd
                  </Button>
                </div>
              </div>

              {hasDamage === true && (
                <div className="space-y-3 rounded-lg border border-destructive/30 p-3 bg-destructive/5">
                  <DamageRecordForm
                    damages={damageRecords}
                    orderLines={orderLines}
                    onAdd={(damage) => setDamageRecords(prev => [...prev, damage])}
                    onRemove={(index) => setDamageRecords(prev => prev.filter((_, i) => i !== index))}
                    onUpdate={(index, damage) => setDamageRecords(prev => prev.map((d, i) => i === index ? damage : d))}
                  />
                  <div className="text-sm text-muted-foreground">
                    <strong>Schadefoto's ({damagePhotos.length}):</strong>
                    {damagePhotos.length === 0 ? (
                      <p className="text-destructive mt-1">
                        ⚠ Upload minimaal 1 schadefoto via het tabblad "Foto's" (type: schade)
                      </p>
                    ) : (
                      <p className="mt-1 text-primary">✓ {damagePhotos.length} foto('s) geüpload</p>
                    )}
                  </div>
                </div>
              )}

              {hasDamage === null && (
                <p className="text-xs text-orange-600">
                  ⚠ Je moet de schadebeoordeling invullen voordat je de werkbon kunt indienen.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Fixed Bottom Actions */}
        {!isReadOnly && (
          <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 lg:left-64">
            <div className="container flex max-w-2xl gap-3">
              <Button
                variant="outline"
                className="flex-1 min-h-[48px]"
                onClick={handleSave}
                disabled={updateReport.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateReport.isPending ? "Opslaan..." : "Opslaan"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="flex-1 min-h-[48px]"
                    disabled={!canSubmit}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Indienen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Werkbon indienen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Na het indienen kun je de werkbon niet meer bewerken.
                      {hasDamage && " Er is schade geregistreerd bij deze werkbon."}
                      {" "}Weet je zeker dat je de werkbon wilt indienen?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit}>
                      Indienen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </InstallerLayout>
  );
}
