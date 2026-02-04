import { useState, useEffect } from "react";
import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { HelpDropdown } from "./HelpDropdown";

interface HeaderProps {
  title: string;
  breadcrumb?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ title, breadcrumb, onMenuClick, showMenuButton }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
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
          {/* Search Box - hidden on mobile, clickable to open dialog */}
          <div 
            className="relative hidden md:block w-[200px] lg:w-[280px] cursor-pointer"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Zoeken... ⌘K"
              className="h-10 border-border bg-background pl-10 text-sm cursor-pointer"
              readOnly
            />
          </div>

          {/* Mobile search button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 md:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-[18px] w-[18px]" />
          </Button>

          {/* Notification Button */}
          <NotificationsDropdown />

          {/* Help Button */}
          <HelpDropdown />
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
