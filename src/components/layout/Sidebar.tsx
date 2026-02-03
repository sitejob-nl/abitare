import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDivisions } from "@/hooks/useDivisions";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.svg";
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Receipt,
  Calendar,
  Wrench,
  MessageSquare,
  FolderOpen,
  BarChart3,
  Settings,
  ChevronDown,
  X,
  Check,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Overzicht",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    ],
  },
  {
    title: "Verkoop",
    items: [
      { icon: Users, label: "Klanten", href: "/customers", badge: 3 },
      { icon: FileText, label: "Offertes", href: "/quotes", badge: 8 },
      { icon: Package, label: "Orders", href: "/orders" },
      { icon: Receipt, label: "Facturen", href: "/invoices" },
    ],
  },
  {
    title: "Planning",
    items: [
      { icon: Calendar, label: "Agenda", href: "/calendar" },
      { icon: Wrench, label: "Montage", href: "/installation" },
      { icon: Ticket, label: "Service", href: "/service" },
    ],
  },
  {
    title: "Communicatie",
    items: [
      { icon: MessageSquare, label: "Inbox", href: "/inbox", badge: 12 },
    ],
  },
  {
    title: "Beheer",
    items: [
      { icon: FolderOpen, label: "Producten", href: "/products" },
      { icon: BarChart3, label: "Rapportages", href: "/reports" },
      { icon: Settings, label: "Instellingen", href: "/settings" },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const location = useLocation();
  const { profile, roles, signOut, isAdmin, activeDivisionId, setActiveDivisionId } = useAuth();
  const { data: divisions } = useDivisions();

  const displayName = profile?.full_name || profile?.email || "Gebruiker";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleDisplay = roles.length > 0 
    ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1) 
    : "Gebruiker";

  // Get active division name - show "Alle vestigingen" when no specific division is selected
  const divisionName = activeDivisionId 
    ? divisions?.find(d => d.id === activeDivisionId)?.name || "Onbekend"
    : "Alle vestigingen";

  // Admins can switch divisions, others see only their own
  const canSwitchDivision = isAdmin && divisions && divisions.length > 1;

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleDivisionChange = (divisionId: string | null) => {
    setActiveDivisionId(divisionId);
  };

  return (
    <aside 
      className={cn(
        "flex h-screen flex-shrink-0 flex-col bg-sidebar transition-transform duration-300 ease-in-out",
        isMobile 
          ? cn(
              "fixed inset-y-0 left-0 z-50 w-[280px]",
              isOpen ? "translate-x-0" : "-translate-x-full"
            )
          : "relative w-[260px]"
      )}
    >
      {/* Logo & Close button */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
        <img src={logo} alt="Abitare" className="h-6" />
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Division Selector */}
      <div className="mx-4 mt-4 mb-2">
        {canSwitchDivision ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg bg-white/[0.06] px-3.5 py-2.5 transition-colors hover:bg-white/[0.1]">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="flex-1 text-left text-[13px] font-medium text-white">
                  {divisionName}
                </span>
                <ChevronDown className="h-4 w-4 text-sidebar-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="w-[228px] bg-sidebar border-white/[0.08]"
              sideOffset={4}
            >
              <DropdownMenuItem
                onClick={() => handleDivisionChange(null)}
                className="text-white hover:bg-white/[0.1] focus:bg-white/[0.1] cursor-pointer"
              >
                <span className="flex-1">Alle vestigingen</span>
                {!activeDivisionId && <Check className="h-4 w-4 text-success" />}
              </DropdownMenuItem>
              {divisions?.map((division) => (
                <DropdownMenuItem
                  key={division.id}
                  onClick={() => handleDivisionChange(division.id)}
                  className="text-white hover:bg-white/[0.1] focus:bg-white/[0.1] cursor-pointer"
                >
                  <span className="flex-1">{division.name}</span>
                  {activeDivisionId === division.id && <Check className="h-4 w-4 text-success" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex w-full items-center gap-2.5 rounded-lg bg-white/[0.06] px-3.5 py-2.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="flex-1 text-left text-[13px] font-medium text-white">
              {divisionName}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title} className="mb-2 px-3">
            <div className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[1.2px] text-sidebar-muted">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== "/" && location.pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-white"
                      : "text-white/65 hover:bg-white/[0.06] hover:text-white/90"
                  )}
                >
                  {isActive && (
                    <span className="absolute -left-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-sm bg-accent" />
                  )}
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="min-w-[20px] rounded-full bg-danger px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Card */}
      <div className="border-t border-white/[0.08] p-4">
        <div 
          className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/[0.06]"
          onClick={signOut}
          title="Klik om uit te loggen"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-white">{displayName}</div>
            <div className="text-[11px] text-sidebar-muted">{roleDisplay}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
