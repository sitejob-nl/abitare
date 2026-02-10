import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, User, Euro } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface OrderKanbanCardProps {
  order: {
    id: string;
    order_number: number;
    total_incl_vat: number | null;
    expected_delivery_date: string | null;
    payment_status: string | null;
    deposit_required?: boolean | null;
    deposit_invoice_sent?: boolean | null;
    customer: {
      first_name?: string | null;
      last_name?: string | null;
      company_name?: string | null;
    } | null;
  };
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-destructive/10 text-destructive" },
  deels_betaald: { label: "Deels", color: "bg-yellow-100 text-yellow-800" },
  betaald: { label: "Betaald", color: "bg-green-100 text-green-800" },
};

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getCustomerName(customer: OrderKanbanCardProps["order"]["customer"]): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

interface GateIndicator {
  label: string;
  ok: boolean;
}

function getGateIndicators(order: OrderKanbanCardProps["order"]): GateIndicator[] {
  const indicators: GateIndicator[] = [];
  const depositRequired = order.deposit_required !== false; // default true
  const paymentStatus = order.payment_status || "open";

  // Deposit invoice sent indicator
  if (depositRequired) {
    indicators.push({
      label: order.deposit_invoice_sent
        ? "Aanbetalingsfactuur verstuurd"
        : "Aanbetalingsfactuur niet verstuurd",
      ok: !!order.deposit_invoice_sent,
    });
  }

  // Payment indicator
  indicators.push({
    label: depositRequired
      ? paymentStatus === "betaald"
        ? "Aanbetaling ontvangen"
        : paymentStatus === "deels_betaald"
          ? "Aanbetaling deels ontvangen"
          : "Aanbetaling niet ontvangen"
      : "Geen aanbetaling vereist",
    ok: !depositRequired || paymentStatus === "betaald" || paymentStatus === "deels_betaald",
  });

  return indicators;
}

export function OrderKanbanCard({ order }: OrderKanbanCardProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const paymentStatus = order.payment_status || "open";
  const paymentCfg = paymentStatusConfig[paymentStatus] || paymentStatusConfig.open;
  const gates = getGateIndicators(order);

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      navigate(`/orders/${order.id}`);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-foreground">
          #{order.order_number}
        </span>
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", paymentCfg.color)}>
          {paymentCfg.label}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{getCustomerName(order.customer)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Euro className="h-3 w-3 shrink-0" />
          <span className="font-medium text-foreground">
            {formatCurrency(order.total_incl_vat)}
          </span>
        </div>

        {order.expected_delivery_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>
              {format(new Date(order.expected_delivery_date), "d MMM", { locale: nl })}
            </span>
          </div>
        )}
      </div>

      {gates.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
            {gates.map((gate, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      gate.ok ? "bg-green-500" : "bg-destructive"
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {gate.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
