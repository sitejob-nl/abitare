import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, Users, Shield, Link2, Pencil } from "lucide-react";
import { ExactOnlineSettings } from "@/components/settings/ExactOnlineSettings";
import { TradeplaceSettings } from "@/components/settings/TradeplaceSettings";
import { DivisionFormDialog } from "@/components/settings/DivisionFormDialog";
import { UserFormDialog } from "@/components/settings/UserFormDialog";
import { useAllDivisions, type Division } from "@/hooks/useDivisions";
import { useProfiles, type ProfileWithRoles } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [divisionDialogOpen, setDivisionDialogOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProfileWithRoles | null>(null);

  const { data: divisions, isLoading: divisionsLoading } = useAllDivisions();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();

  const isLoading = divisionsLoading || profilesLoading;

  const handleNewDivision = () => {
    setEditingDivision(null);
    setDivisionDialogOpen(true);
  };

  const handleEditDivision = (division: Division) => {
    setEditingDivision(division);
    setDivisionDialogOpen(true);
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: ProfileWithRoles) => {
    setEditingUser(user);
    setUserDialogOpen(true);
  };

  if (!isAdmin) {
    return (
      <AppLayout title="Instellingen" breadcrumb="Instellingen">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">Geen toegang</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Je hebt geen toegang tot deze pagina. Alleen administrators kunnen de instellingen beheren.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Instellingen" breadcrumb="Instellingen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-foreground">
          Instellingen
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Beheer vestigingen, gebruikers en systeeminstellingen
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Laden...</span>
        </div>
      ) : (
        <Tabs defaultValue="divisions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="divisions" className="gap-2">
              <Building2 className="h-4 w-4" />
              Vestigingen
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Gebruikers
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Link2 className="h-4 w-4" />
              Koppelingen
            </TabsTrigger>
          </TabsList>

          {/* Divisions Tab */}
          <TabsContent value="divisions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Vestigingen</h2>
              <Button size="sm" onClick={handleNewDivision}>Nieuwe vestiging</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {divisions?.map((division) => (
                <Card key={division.id} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8"
                    onClick={() => handleEditDivision(division)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <CardHeader className="pb-3 pr-12">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{division.name}</CardTitle>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        division.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {division.is_active ? "Actief" : "Inactief"}
                      </span>
                    </div>
                    {division.code && (
                      <CardDescription>Code: {division.code}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {division.address && (
                      <div className="text-muted-foreground">{division.address}</div>
                    )}
                    {(division.postal_code || division.city) && (
                      <div className="text-muted-foreground">
                        {[division.postal_code, division.city].filter(Boolean).join(" ")}
                      </div>
                    )}
                    {division.phone && (
                      <div className="text-muted-foreground">📞 {division.phone}</div>
                    )}
                    {division.email && (
                      <div className="text-muted-foreground">✉️ {division.email}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Gebruikers</h2>
              <Button size="sm" onClick={handleNewUser}>Nieuwe gebruiker</Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Gebruiker
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Email
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Vestiging
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Rol(len)
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profiles?.map((profile) => {
                    const roleNames = profile.roles?.map(r => r.role).join(", ") || "";

                    return (
                      <tr
                        key={profile.id}
                        className="border-b border-border-light last:border-b-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-5 py-4 text-sm font-medium text-foreground">
                          {profile.full_name || "-"}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {profile.email}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {profile.division?.name || "-"}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {roleNames || "-"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            profile.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {profile.is_active ? "Actief" : "Inactief"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditUser(profile)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <TradeplaceSettings />
            <ExactOnlineSettings />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <DivisionFormDialog
        open={divisionDialogOpen}
        onOpenChange={setDivisionDialogOpen}
        division={editingDivision}
      />
      <UserFormDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={editingUser}
      />
    </AppLayout>
  );
};

export default Settings;
