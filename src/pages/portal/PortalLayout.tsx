import { useState } from "react";
import { Outlet, useParams, Link, useLocation, Navigate } from "react-router-dom";
import { Package, FileText, Files, Calendar, Home, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalData } from "@/hooks/usePortalToken";
import logoSvg from "@/assets/logo.svg";
const navItems = [{
  path: "",
  label: "Overzicht",
  icon: Home
}, {
  path: "orders",
  label: "Orders",
  icon: Package
}, {
  path: "quotes",
  label: "Offertes",
  icon: FileText
}, {
  path: "documents",
  label: "Documenten",
  icon: Files
}, {
  path: "planning",
  label: "Planning",
  icon: Calendar
}];
export default function PortalLayout() {
  const {
    token
  } = useParams<{
    token: string;
  }>();
  const location = useLocation();
  const {
    data: portalData,
    isLoading,
    error
  } = usePortalData(token);

  // Check if token is valid
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>;
  }
  if (!portalData || error) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="rounded-full bg-destructive/10 p-4 w-fit mx-auto mb-4">
            <Package className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Ongeldige of verlopen link
          </h1>
          <p className="text-muted-foreground">
            Deze link is niet meer geldig. Neem contact op met uw verkoper voor een nieuwe toegangslink.
          </p>
        </div>
      </div>;
  }
  const customer = portalData.customer;
  const customerName = customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ");

  // Get current path segment for active tab
  const pathSegments = location.pathname.split("/");
  const currentPath = pathSegments[3] || "";
  return <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto px-4 bg-secondary-foreground">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoSvg} alt="Logo" className="h-8" />
              <div className="hidden sm:block">
                <span className="text-primary-foreground">/</span>
                <span className="ml-2 font-medium text-primary-foreground">{customerName}</span>
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-background">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto">
            {navItems.map(item => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return <Link key={item.path} to={`/portal/${token}/${item.path}`} className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border")}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>;
          })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet context={{
        portalData,
        token
      }} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Abitare. Alle rechten voorbehouden.
          </p>
        </div>
      </footer>
    </div>;
}