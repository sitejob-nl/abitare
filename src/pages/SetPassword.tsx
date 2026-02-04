import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import logo from "@/assets/logo.svg";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user has a valid recovery or invite session
  useEffect(() => {
    const checkSession = async () => {
      // Check if this is a recovery/invite session by looking at the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      
      // Handle recovery OR invite tokens
      if ((type === "recovery" || type === "invite") && accessToken) {
        // Set the session from the token
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get("refresh_token") || "",
        });
        
        if (error) {
          console.error("Session error:", error);
          setIsValidSession(false);
        } else {
          setIsValidSession(true);
        }
      } else {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidSession(true);
        } else {
          setIsValidSession(false);
        }
      }
    };

    checkSession();
  }, []);

  const validatePassword = () => {
    if (password.length < 8) {
      return "Wachtwoord moet minimaal 8 tekens bevatten";
    }
    if (password !== confirmPassword) {
      return "Wachtwoorden komen niet overeen";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validatePassword();
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Ongeldig wachtwoord",
        description: validationError,
      });
      return;
    }

    setIsLoading(true);

    const { data: userData, error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Fout bij instellen wachtwoord",
        description: error.message,
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Wachtwoord ingesteld",
        description: "Je wachtwoord is succesvol gewijzigd. Je wordt nu doorgestuurd.",
      });
      
      // Fetch user roles to determine redirect
      let redirectPath = "/";
      
      if (userData.user) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id);
        
        const roles = rolesData?.map(r => r.role) || [];
        
        // Monteurs (without admin/manager role) go to /monteur
        if (roles.includes("monteur") && !roles.includes("admin") && !roles.includes("manager")) {
          redirectPath = "/monteur";
        }
      }
      
      // Small delay to show success message
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 1500);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
        <Card className="w-full max-w-[400px] border-border/50 bg-card shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto">
              <img src={logo} alt="Abitare" className="h-8" />
            </div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">Link ongeldig of verlopen</CardTitle>
              <CardDescription>
                Deze link is niet meer geldig. Vraag een nieuwe reset link aan of neem contact op met een administrator.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate("/reset-password")} 
              className="w-full"
            >
              Nieuwe link aanvragen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-[400px] border-border/50 bg-card shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <img src={logo} alt="Abitare" className="h-8" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">Nieuw wachtwoord instellen</CardTitle>
            <CardDescription>
              Kies een sterk wachtwoord van minimaal 8 tekens.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nieuw wachtwoord</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            
            {/* Password requirements */}
            <div className="space-y-1 text-sm">
              <div className={`flex items-center gap-2 ${password.length >= 8 ? "text-green-500" : "text-muted-foreground"}`}>
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Minimaal 8 tekens</span>
              </div>
              <div className={`flex items-center gap-2 ${password && password === confirmPassword ? "text-green-500" : "text-muted-foreground"}`}>
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Wachtwoorden komen overeen</span>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || password.length < 8 || password !== confirmPassword}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Opslaan...
                </>
              ) : (
                "Wachtwoord instellen"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
