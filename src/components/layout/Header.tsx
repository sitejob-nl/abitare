import { Search, Bell, HelpCircle, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  breadcrumb?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ title, breadcrumb, onMenuClick, showMenuButton }: HeaderProps) {
  return (
    <header className="flex h-14 md:h-16 items-center gap-3 md:gap-6 border-b border-border bg-card px-4 md:px-8">
      {/* Mobile menu button */}
      {showMenuButton && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      
      <h1 className="font-display text-lg md:text-[22px] text-foreground truncate">{title}</h1>
      
      {breadcrumb && (
        <div className="hidden lg:flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="text-foreground/60">Abitare</span>
          <span>/</span>
          <span>{breadcrumb}</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {/* Search Box - hidden on mobile */}
        <div className="relative hidden md:block w-[200px] lg:w-[280px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Zoeken..."
            className="h-10 border-border bg-background pl-10 text-sm"
          />
        </div>

        {/* Mobile search button */}
        <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
          <Search className="h-[18px] w-[18px]" />
        </Button>

        {/* Notification Button */}
        <Button variant="outline" size="icon" className="relative h-9 w-9 md:h-10 md:w-10">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
            5
          </span>
        </Button>

        {/* Help Button - hidden on mobile */}
        <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 hidden md:flex">
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
}
