import { InstallerLayout } from "@/components/installer/InstallerLayout";
import { WorkReportCard } from "@/components/installer/WorkReportCard";
import { useWorkReports } from "@/hooks/useWorkReports";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck } from "lucide-react";

export default function WorkReports() {
  const { data: reports, isLoading } = useWorkReports();

  return (
    <InstallerLayout>
      <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Mijn Werkbonnen</h1>
          <p className="text-muted-foreground">
            Overzicht van al je werkbonnen
          </p>
        </div>

        {/* Report List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="mb-2 h-5 w-24" />
                <Skeleton className="mb-3 h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </Card>
            ))}
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((report) => (
              <WorkReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">Geen werkbonnen</h3>
            <p className="text-sm text-muted-foreground">
              Je hebt nog geen werkbonnen aangemaakt
            </p>
          </Card>
        )}
      </div>
    </InstallerLayout>
  );
}
