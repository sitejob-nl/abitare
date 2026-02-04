import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InstallerRouteProps {
  children: React.ReactNode;
}

export function InstallerRoute({ children }: InstallerRouteProps) {
  const { user, isLoading, roles, authInitError, retryAuthInit, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authInitError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-foreground">Kan niet laden</h1>
            <p className="text-sm text-muted-foreground">{authInitError}</p>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button onClick={retryAuthInit} className="w-full">Opnieuw proberen</Button>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                window.location.href = "/login";
              }}
              className="w-full"
            >
              Uitloggen
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow installers, admins, and managers
  const hasAccess = roles.includes("monteur") || roles.includes("admin") || roles.includes("manager");

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
