import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface MenuPermission {
  id: string;
  role: AppRole;
  menu_key: string;
  visible: boolean;
}

export function useMenuPermissions() {
  return useQuery({
    queryKey: ["menu-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_menu_permissions")
        .select("*")
        .order("role")
        .order("menu_key");
      if (error) throw error;
      return data as MenuPermission[];
    },
  });
}

export function useVisibleMenuKeys() {
  const { roles } = useAuth();
  const { data: permissions, isLoading } = useMenuPermissions();

  if (isLoading || !permissions || permissions.length === 0) {
    // Fallback: show everything while loading
    return { visibleKeys: null, isLoading };
  }

  const visibleKeys = new Set<string>();

  for (const perm of permissions) {
    if (roles.includes(perm.role) && perm.visible) {
      visibleKeys.add(perm.menu_key);
    }
  }

  return { visibleKeys, isLoading };
}

export function useUpsertMenuPermission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role,
      menu_key,
      visible,
    }: {
      role: AppRole;
      menu_key: string;
      visible: boolean;
    }) => {
      // Try update first, then insert
      const { data: existing } = await supabase
        .from("role_menu_permissions")
        .select("id")
        .eq("role", role)
        .eq("menu_key", menu_key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("role_menu_permissions")
          .update({ visible })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_menu_permissions")
          .insert({ role, menu_key, visible });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-permissions"] });
    },
  });
}
