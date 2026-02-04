import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, authInitError, retryAuthInit, signOut, roles } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Laden...</p>
        </div>
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect monteurs naar hun eigen omgeving
  const isOnlyInstaller = roles.includes("monteur") && 
                          !roles.includes("admin") && 
                          !roles.includes("manager");
  
  // Monteurs mogen ALLEEN de /monteur/* routes gebruiken
  if (isOnlyInstaller && !location.pathname.startsWith("/monteur")) {
    return <Navigate to="/monteur" replace />;
  }

  return <>{children}</>;
}
