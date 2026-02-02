import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Bell, Clock } from "lucide-react";

const Inbox = () => {
  return (
    <AppLayout title="Inbox" breadcrumb="Inbox">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Berichten en notificaties
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              <Bell className="h-7 w-7 text-blue-600" />
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-foreground">
            Komt binnenkort
          </h2>
          <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
            De inbox module is momenteel in ontwikkeling. Hier kun je straks al je berichten, 
            notificaties en herinneringen op één plek beheren.
          </p>

          <div className="mt-8 grid gap-4 text-center sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-4">
              <MessageSquare className="mx-auto h-5 w-5 text-muted-foreground" />
              <div className="mt-2 text-sm font-medium">Berichten</div>
              <div className="text-xs text-muted-foreground">Communicatie met klanten</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <Bell className="mx-auto h-5 w-5 text-muted-foreground" />
              <div className="mt-2 text-sm font-medium">Notificaties</div>
              <div className="text-xs text-muted-foreground">Updates en meldingen</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <Clock className="mx-auto h-5 w-5 text-muted-foreground" />
              <div className="mt-2 text-sm font-medium">Herinneringen</div>
              <div className="text-xs text-muted-foreground">Taken en follow-ups</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Inbox;
