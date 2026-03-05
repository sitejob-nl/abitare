import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useMenuPermissions, useUpsertMenuPermission } from "@/hooks/useMenuPermissions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "customers", label: "Klanten" },
  { key: "quotes", label: "Offertes" },
  { key: "orders", label: "Orders" },
  { key: "invoices", label: "Facturen" },
  { key: "calendar", label: "Agenda" },
  { key: "leave", label: "Verlof" },
  { key: "installation", label: "Montage" },
  { key: "service", label: "Service" },
  { key: "inbox", label: "Inbox" },
  { key: "products", label: "Producten" },
  { key: "reports", label: "Rapportages" },
  { key: "settings", label: "Instellingen" },
] as const;

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "verkoper", label: "Verkoper" },
  { value: "monteur", label: "Monteur" },
];

export function MenuPermissionsSettings() {
  const { data: permissions, isLoading } = useMenuPermissions();
  const upsert = useUpsertMenuPermission();

  const isVisible = (role: AppRole, menuKey: string): boolean => {
    const perm = permissions?.find((p) => p.role === role && p.menu_key === menuKey);
    return perm?.visible ?? true;
  };

  const handleToggle = (role: AppRole, menuKey: string, current: boolean) => {
    upsert.mutate({ role, menu_key: menuKey, visible: !current });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu-rechten per rol</CardTitle>
        <CardDescription>
          Bepaal welke menu-items zichtbaar zijn voor elke rol. Monteurs hebben een eigen portaal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Menu-item</th>
                {ROLES.map((role) => (
                  <th key={role.value} className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MENU_ITEMS.map((item) => (
                <tr key={item.key} className="border-b border-border/50 last:border-b-0">
                  <td className="py-3 pr-4 font-medium">{item.label}</td>
                  {ROLES.map((role) => {
                    const visible = isVisible(role.value, item.key);
                    return (
                      <td key={role.value} className="px-4 py-3 text-center">
                        <Checkbox
                          checked={visible}
                          onCheckedChange={() => handleToggle(role.value, item.key, visible)}
                          disabled={upsert.isPending}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
