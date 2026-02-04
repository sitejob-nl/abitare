import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, ChevronRight, FileCheck, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WorkReportCardProps {
  report: {
    id: string;
    report_number: number;
    status: string;
    work_date: string;
    start_time: string | null;
    end_time: string | null;
    total_hours: number | null;
    order: { id: string; order_number: number } | null;
    customer: {
      id: string;
      first_name: string | null;
      last_name: string;
      company_name: string | null;
    } | null;
  };
}

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

export function WorkReportCard({ report }: WorkReportCardProps) {
  const customer = report.customer;
  const customerName = customer
    ? customer.company_name || `${customer.first_name || ""} ${customer.last_name}`.trim()
    : "Onbekende klant";

  return (
    <Link to={`/monteur/werkbon/${report.id}`}>
      <Card className="p-4 transition-all hover:bg-muted/50 hover:shadow-md active:scale-[0.99]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">WB-{report.report_number}</span>
              <Badge
                variant="secondary"
                className={statusColors[report.status] || ""}
              >
                {statusLabels[report.status] || report.status}
              </Badge>
            </div>

            {/* Customer & Order */}
            <p className="text-sm font-medium">{customerName}</p>
            {report.order && (
              <p className="text-sm text-muted-foreground">
                Order #{report.order.order_number}
              </p>
            )}

            {/* Date & Time */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(report.work_date), "d MMM yyyy", { locale: nl })}
              </div>
              {report.total_hours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {report.total_hours} uur
                </div>
              )}
            </div>
          </div>

          <ChevronRight className="mt-2 h-5 w-5 flex-shrink-0 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  );
}
