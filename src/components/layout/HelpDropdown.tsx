import { HelpCircle, Book, MessageCircle, Keyboard, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

const shortcuts = [
  { keys: "⌘ K", description: "Globaal zoeken" },
  { keys: "Esc", description: "Dialoog sluiten" },
];

export function HelpDropdown() {
  const navigate = useNavigate();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const helpItems = [
    {
      icon: FileText,
      label: "Handleiding",
      description: "In-app documentatie",
      action: () => navigate("/guide"),
      external: false,
    },
    {
      icon: MessageCircle,
      label: "Support",
      description: "Neem contact op met support",
      action: () => window.open("mailto:info@sitejob.nl", "_blank"),
      external: true,
    },
    {
      icon: Keyboard,
      label: "Sneltoetsen",
      description: "Bekijk alle sneltoetsen",
      action: () => setShortcutsOpen(true),
      external: false,
    },
  ];

  return (
    <>
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
              {item.external && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-3 py-2 text-xs text-muted-foreground">Versie 1.0.0</div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sneltoetsen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {shortcuts.map((s) => (
              <div key={s.keys} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{s.description}</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
