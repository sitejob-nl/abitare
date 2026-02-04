import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, User, Clock, FileText, Camera, CheckSquare, CheckCircle, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useWorkReportByOrderAdmin } from "@/hooks/useWorkReports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

const photoTypeLabels: Record<string, string> = {
  voor: "Voor",
  tijdens: "Tijdens",
  na: "Na",
  schade: "Schade",
};

function formatDate(date: string | null): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "d MMMM yyyy", { locale: nl });
  } catch {
    return "-";
  }
}

function formatTime(time: string | null): string {
  if (!time) return "-";
  return time.substring(0, 5);
}

export default function InstallationDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading } = useWorkReportByOrderAdmin(orderId);

  if (isLoading) {
    return (
      <AppLayout title="Werkbon" breadcrumb="Montage / Werkbon">
        <div className="max-w-3xl">
          <Skeleton className="mb-6 h-8 w-48" />
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-6 w-32" />
              <Skeleton className="mb-2 h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!report) {
    return (
      <AppLayout title="Werkbon" breadcrumb="Montage / Werkbon">
        <div className="max-w-3xl">
          <Button variant="ghost" onClick={() => navigate("/installation")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar overzicht
          </Button>
          <Card className="p-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">Geen werkbon gevonden</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Er is nog geen werkbon aangemaakt voor deze order.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const customerName = report.customer
    ? report.customer.company_name ||
      `${report.customer.first_name || ""} ${report.customer.last_name}`.trim()
    : "Onbekende klant";

  const installerName = report.installer?.full_name || "Onbekende monteur";

  return (
    <AppLayout title={`Werkbon WB-${report.report_number}`} breadcrumb="Montage / Werkbon">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/installation")} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">WB-{report.report_number}</h1>
              <Badge className={statusColors[report.status]}>{statusLabels[report.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {customerName}
              {report.order && ` • Order #${report.order.order_number}`}
            </p>
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos">Foto's ({report.work_report_photos?.length || 0})</TabsTrigger>
            <TabsTrigger value="tasks">Taken ({report.work_report_tasks?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {/* Installer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Monteur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{installerName}</p>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Datum & Tijd
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Werkdatum</p>
                    <p className="font-medium">{formatDate(report.work_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Starttijd</p>
                    <p className="font-medium">{formatTime(report.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Eindtijd</p>
                    <p className="font-medium">{formatTime(report.end_time)}</p>
                  </div>
                </div>
                {report.total_hours && (
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">Totaal gewerkte uren</p>
                    <p className="text-lg font-semibold">{report.total_hours} uur</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Werkzaamheden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Omschrijving</p>
                  <p className="mt-1 whitespace-pre-wrap">{report.work_description || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gebruikte materialen</p>
                  <p className="mt-1 whitespace-pre-wrap">{report.materials_used || "-"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Internal Notes */}
            {report.internal_notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Interne notities</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{report.internal_notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-4 w-4" />
                  Foto's
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.work_report_photos && report.work_report_photos.length > 0 ? (
                  <div className="space-y-6">
                    {(["voor", "tijdens", "na", "schade"] as const).map((type) => {
                      const photos = report.work_report_photos?.filter((p) => p.photo_type === type) || [];
                      if (photos.length === 0) return null;

                      return (
                        <div key={type}>
                          <h4 className="mb-3 font-medium text-muted-foreground">{photoTypeLabels[type]}</h4>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {photos.map((photo) => (
                              <PhotoThumbnail key={photo.id} photo={photo} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen foto's geüpload.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckSquare className="h-4 w-4" />
                  Takenlijst
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.work_report_tasks && report.work_report_tasks.length > 0 ? (
                  <div className="space-y-2">
                    {report.work_report_tasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3",
                          task.is_completed ? "bg-green-50 border-green-200" : "bg-card"
                        )}
                      >
                        {task.is_completed ? (
                          <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <span className={cn(task.is_completed && "text-muted-foreground line-through")}>
                          {task.description}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen taken toegevoegd.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// Photo thumbnail component with signed URL
function PhotoThumbnail({ photo }: { photo: { id: string; file_path: string; caption?: string | null } }) {
  const { data: signedUrl } = useSignedPhotoUrl(photo.file_path);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
      {signedUrl ? (
        <img
          src={signedUrl}
          alt={photo.caption || "Werkbon foto"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Camera className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
          <p className="truncate text-xs text-white">{photo.caption}</p>
        </div>
      )}
    </div>
  );
}

// Hook for signed photo URLs
import { useQuery } from "@tanstack/react-query";

function useSignedPhotoUrl(filePath: string) {
  return useQuery({
    queryKey: ["photo-url", filePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("work-report-photos")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
