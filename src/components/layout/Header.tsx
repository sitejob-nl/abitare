import { Search, Bell, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  breadcrumb?: string;
}

export function Header({ title, breadcrumb }: HeaderProps) {
  return (
    <header className="flex h-16 items-center gap-6 border-b border-border bg-card px-8">
      <h1 className="font-display text-[22px] text-foreground">{title}</h1>
      
      {breadcrumb && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="text-foreground/60">Abitare</span>
          <span>/</span>
          <span>{breadcrumb}</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {/* Search Box */}
        <div className="relative w-[280px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Zoeken op klant, order, offerte..."
            className="h-10 border-border bg-background pl-10 text-sm"
          />
        </div>

        {/* Notification Button */}
        <Button variant="outline" size="icon" className="relative h-10 w-10">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
            5
          </span>
        </Button>

        {/* Help Button */}
        <Button variant="outline" size="icon" className="h-10 w-10">
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
}
