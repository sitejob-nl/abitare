import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.svg";
import { ClipboardList, FileCheck, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface InstallerLayoutProps {
  children: React.ReactNode;
}

export function InstallerLayout({ children }: InstallerLayoutProps) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  
  useRealtimeSync();

  const displayName = profile?.full_name || profile?.email || "Monteur";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navItems = [
    { icon: ClipboardList, label: "Opdrachten", href: "/monteur" },
    { icon: FileCheck, label: "Werkbonnen", href: "/monteur/werkbonnen" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-sidebar px-4 lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <img src={logo} alt="Abitare" className="h-5" />
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-sidebar lg:hidden">
          <nav className="flex flex-col p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-4 text-base font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <div className="my-4 border-t border-white/10" />
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className="flex items-center gap-3 rounded-lg px-4 py-4 text-base font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              Uitloggen
            </button>
          </nav>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 flex-col bg-sidebar lg:flex">
          <div className="flex h-16 items-center border-b border-white/10 px-6">
            <img src={logo} alt="Abitare" className="h-5" />
          </div>

          <nav className="flex-1 p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-lg p-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-sm font-semibold text-white">
                {initials}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{displayName}</div>
                <div className="text-xs text-white/50">Monteur</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/50 hover:bg-white/10 hover:text-white"
                onClick={signOut}
                title="Uitloggen"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>{children}</main>
      </div>
    </div>
  );
}
