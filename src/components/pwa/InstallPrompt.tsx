import { useState, useEffect } from "react";
import { X, Share, PlusSquare, MoreVertical, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      return;
    }

    // Check if already dismissed
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isMobile = isIOSDevice || isAndroidDevice;

    if (isMobile) {
      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);
      // Small delay before showing
      setTimeout(() => setShowPrompt(true), 2000);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-t-2xl bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img 
              src="/pwa-192x192.png" 
              alt="Abitare" 
              className="h-12 w-12 rounded-xl"
            />
            <div>
              <h3 className="font-semibold text-foreground">Abitare Keukens</h3>
              <p className="text-sm text-muted-foreground">Installeer de app</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 -mr-2 -mt-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Voeg Abitare Keukens toe aan je startscherm voor snelle toegang en een betere ervaring.
        </p>

        {isIOS && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Share className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Stap 1</p>
                <p className="text-xs text-muted-foreground">
                  Tik op het <strong>Delen</strong> icoon in Safari
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <PlusSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Stap 2</p>
                <p className="text-xs text-muted-foreground">
                  Scroll en tik op <strong>"Zet op beginscherm"</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {isAndroid && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MoreVertical className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Stap 1</p>
                <p className="text-xs text-muted-foreground">
                  Tik op het <strong>menu icoon</strong> (drie puntjes) in Chrome
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Stap 2</p>
                <p className="text-xs text-muted-foreground">
                  Tik op <strong>"App installeren"</strong> of <strong>"Toevoegen aan startscherm"</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={handleDismiss}
        >
          Begrepen
        </Button>
      </div>
    </div>
  );
}
