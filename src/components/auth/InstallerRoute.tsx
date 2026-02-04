import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface InstallerRouteProps {
  children: React.ReactNode;
}

export function InstallerRoute({ children }: InstallerRouteProps) {
  const { user, isLoading, roles } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
