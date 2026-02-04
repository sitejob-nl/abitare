import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Building2,
  FileText,
  MessageSquare,
  Plus,
} from "lucide-react";
import { InstallerLayout } from "@/components/installer/InstallerLayout";
import { useInstallerOrderDetail } from "@/hooks/useInstallerOrders";
import { useWorkReportByOrder, useCreateWorkReport } from "@/hooks/useWorkReports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusLabels: Record<string, string> = {
  montage_gepland: "Montage gepland",
  geleverd: "Geleverd",
};

export default function InstallerOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useInstallerOrderDetail(orderId);
  const { data: existingReport } = useWorkReportByOrder(orderId);
  const createReport = useCreateWorkReport();

  const handleStartWorkReport = async () => {
    if (!order) return;

    const result = await createReport.mutateAsync({
      order_id: order.id,
      customer_id: order.customer?.id || null,
      division_id: order.division?.id || null,
      work_date: new Date().toISOString().split("T")[0],
    });

    navigate(`/monteur/werkbon/${result.id}`);
  };

  const handleOpenExistingReport = () => {
    if (existingReport) {
      navigate(`/monteur/werkbon/${existingReport.id}`);
    }
  };

  if (isLoading) {
    return (
      <InstallerLayout>
        <div className="container max-w-2xl py-6">
          <Skeleton className="mb-6 h-8 w-48" />
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-6 w-32" />
              <Skeleton className="mb-2 h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardContent>
          </Card>
        </div>
      </InstallerLayout>
    );
  }

  if (!order) {
    return (
      <InstallerLayout>
        <div className="container max-w-2xl py-6">
          <Card className="p-12 text-center">
            <h3 className="font-semibold">Order niet gevonden</h3>
            <p className="text-sm text-muted-foreground">
              Deze order is niet toegewezen aan jou
            </p>
            <Button className="mt-4" onClick={() => navigate("/monteur")}>
              Terug naar overzicht
            </Button>
          </Card>
        </div>
      </InstallerLayout>
    );
  }

  const customer = order.customer;
  const customerName = customer
    ? customer.company_name || `${customer.first_name || ""} ${customer.last_name}`.trim()
    : "Onbekende klant";

  const address = customer?.delivery_street_address
    ? `${customer.delivery_street_address}, ${customer.delivery_postal_code} ${customer.delivery_city}`
    : customer?.street_address
    ? `${customer.street_address}, ${customer.postal_code} ${customer.city}`
    : null;

  const phone = customer?.mobile || customer?.phone;

  // Filter documents visible to installer
  const visibleDocuments = order.order_documents?.filter(
    (doc) => doc.visible_to_installer
  );

  // Filter notes of type "monteur" or "installer"
  const installerNotes = order.order_notes?.filter(
    (note) => note.note_type === "installer" || note.note_type === "monteur"
  );

  return (
    <InstallerLayout>
      <div className="container max-w-2xl py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/monteur")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Order #{order.order_number}</h1>
              <Badge variant="secondary">
                {statusLabels[order.status || ""] || order.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{customerName}</p>
          </div>
        </div>

        {/* Work Report Button */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            {existingReport ? (
              <Button
                onClick={handleOpenExistingReport}
                className="w-full min-h-[48px]"
              >
                <FileText className="mr-2 h-5 w-5" />
                Werkbon openen ({existingReport.status === "concept" ? "concept" : "ingediend"})
              </Button>
            ) : (
              <Button
                onClick={handleStartWorkReport}
                disabled={createReport.isPending}
                className="w-full min-h-[48px]"
              >
                <Plus className="mr-2 h-5 w-5" />
                {createReport.isPending ? "Aanmaken..." : "Werkbon starten"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="docs">
              Docs ({visibleDocuments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="notes">
              Notities ({installerNotes?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Klantgegevens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{customerName}</p>

                {address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm text-primary hover:underline"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {address}
                  </a>
                )}

                {customer?.delivery_floor && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {customer.delivery_floor}e verdieping
                      {customer.delivery_has_elevator === false && " (geen lift)"}
                      {customer.delivery_has_elevator === true && " (met lift)"}
                    </span>
                  </div>
                )}

                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {phone}
                  </a>
                )}

                {customer?.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Planning Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Planning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.expected_installation_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Montage:{" "}
                      <strong>
                        {format(
                          new Date(order.expected_installation_date),
                          "EEEE d MMMM yyyy",
                          { locale: nl }
                        )}
                      </strong>
                    </span>
                  </div>
                )}

                {order.expected_delivery_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Levering:{" "}
                      {format(new Date(order.expected_delivery_date), "d MMMM yyyy", {
                        locale: nl,
                      })}
                    </span>
                  </div>
                )}

                {order.delivery_notes && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
                    <strong className="text-amber-800">Levernotities:</strong>
                    <p className="mt-1 text-amber-700">{order.delivery_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Products (without prices) */}
            {order.order_lines && order.order_lines.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Producten ({order.order_lines.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {order.order_lines.map((line) => (
                      <li
                        key={line.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="font-medium text-muted-foreground">
                          {line.quantity}x
                        </span>
                        <span>{line.description}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="docs">
            {visibleDocuments && visibleDocuments.length > 0 ? (
              <div className="space-y-2">
                {visibleDocuments.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{doc.title || doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.document_type}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Geen documenten beschikbaar
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes">
            {installerNotes && installerNotes.length > 0 ? (
              <div className="space-y-2">
                {installerNotes.map((note) => (
                  <Card key={note.id} className="p-4">
                    <p className="text-sm">{note.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {format(new Date(note.created_at!), "d MMM yyyy HH:mm", {
                        locale: nl,
                      })}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Geen notities beschikbaar
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </InstallerLayout>
  );
}
