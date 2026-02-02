import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, Users, Shield, Link2 } from "lucide-react";
import { ExactOnlineSettings } from "@/components/settings/ExactOnlineSettings";
import { useDivisions } from "@/hooks/useDivisions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      // Get profiles with division
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          *,
          division:divisions(id, name)
        `)
        .order("full_name", { ascending: true });

      if (error) throw error;

      // Get roles separately for each profile
      const profilesWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);
          return { ...profile, roles: roles || [] };
        })
      );

      return profilesWithRoles;
    },
  });
}

const Settings = () => {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const { data: divisions, isLoading: divisionsLoading } = useDivisions();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();

  const isLoading = divisionsLoading || profilesLoading;

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
              <Button size="sm">Nieuwe vestiging</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {divisions?.map((division) => (
                <Card key={division.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
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
              <Button size="sm">Nieuwe gebruiker</Button>
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
                  </tr>
                </thead>
                <tbody>
                  {profiles?.map((profile) => {
                    const division = profile.division as { name?: string } | null;
                    const roles = (profile.roles as { role: string }[] | null) || [];
                    const roleNames = roles.map(r => r.role).join(", ");

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
                          {division?.name || "-"}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-4">
            <ExactOnlineSettings />
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

export default Settings;
