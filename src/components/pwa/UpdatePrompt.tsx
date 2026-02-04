import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every hour
      r && setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {needRefresh ? 'Update beschikbaar' : 'App klaar voor offline gebruik'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {needRefresh
                ? 'Er is een nieuwe versie beschikbaar. Klik op bijwerken voor de nieuwste versie.'
                : 'De app kan nu ook zonder internetverbinding worden gebruikt.'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleDismiss}>
                Later
              </Button>
              {needRefresh && (
                <Button size="sm" onClick={handleUpdate}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Nu bijwerken
                </Button>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
