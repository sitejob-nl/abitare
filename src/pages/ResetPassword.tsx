import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import logo from "@/assets/logo.svg";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Fout bij verzenden",
        description: error.message,
      });
      setIsLoading(false);
    } else {
      setIsSubmitted(true);
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
        <Card className="w-full max-w-[400px] border-border/50 bg-card shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto">
              <img src={logo} alt="Abitare" className="h-8" />
            </div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">Email verzonden</CardTitle>
              <CardDescription>
                We hebben een email gestuurd naar <strong>{email}</strong> met instructies om je wachtwoord te resetten.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Controleer ook je spam folder als je de email niet kunt vinden.</span>
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar inloggen
              </Link>
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
            <CardTitle className="text-xl font-semibold">Wachtwoord vergeten?</CardTitle>
            <CardDescription>
              Voer je email in en we sturen je instructies om je wachtwoord te resetten.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="naam@abitare.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Verzenden...
                </>
              ) : (
                "Verstuur reset link"
              )}
            </Button>
          </form>
          <div className="text-center">
            <Link 
              to="/login" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-1 inline h-3 w-3" />
              Terug naar inloggen
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
