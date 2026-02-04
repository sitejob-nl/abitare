import { HelpCircle, Book, MessageCircle, Keyboard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HelpDropdown() {
  const helpItems = [
    {
      icon: Book,
      label: "Handleiding",
      description: "Bekijk de documentatie",
      action: () => window.open("https://docs.abitare.nl", "_blank"),
    },
    {
      icon: MessageCircle,
      label: "Support",
      description: "Neem contact op met support",
      action: () => window.open("mailto:info@sitejob.nl", "_blank"),
    },
    {
      icon: Keyboard,
      label: "Sneltoetsen",
      description: "Bekijk alle sneltoetsen",
      action: () => {
        // Could open a modal with shortcuts in the future
        alert("Sneltoetsen:\n\n⌘K - Globaal zoeken\n⌘/ - Help openen\nEsc - Dialoog sluiten");
      },
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 hidden md:flex">
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
        <DropdownMenuLabel>Hulp nodig?</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {helpItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            className="flex items-start gap-3 p-3 cursor-pointer focus:bg-accent"
            onClick={item.action}
          >
            <item.icon className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-xs text-muted-foreground">Versie 1.0.0</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
