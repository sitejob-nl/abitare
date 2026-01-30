export function ServiceBudget() {
  const spent = 3450;
  const total = 10000;
  const percentage = (spent / total) * 100;
  const potentialBonus = Math.round((total - spent) * 0.1);

  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold text-foreground">Service Budget 2025</h2>
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">Besteed</span>
          <span className="text-[13px] font-semibold text-foreground">
            € {spent.toLocaleString("nl-NL")} / € {total.toLocaleString("nl-NL")}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border-light pt-4">
          <span className="text-[13px] text-muted-foreground">Potentiële bonus (10%)</span>
          <span className="text-sm font-semibold text-success">
            € {potentialBonus.toLocaleString("nl-NL")}
          </span>
        </div>
      </div>
    </div>
  );
}
