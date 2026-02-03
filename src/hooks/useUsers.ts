import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type UserRole = Tables<"user_roles">;

export interface ProfileWithRoles extends Profile {
  roles: Pick<UserRole, "role">[];
  division?: { id: string; name: string } | null;
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          *,
          division:divisions(id, name)
        `)
        .order("full_name", { ascending: true });

      if (error) throw error;

      const profilesWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);
          return { ...profile, roles: roles || [] } as ProfileWithRoles;
        })
      );

      return profilesWithRoles;
    },
  });
}

interface InviteUserParams {
  email: string;
  full_name: string;
  phone?: string;
  division_id?: string;
  roles: string[];
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: InviteUserParams) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

interface UpdateUserParams {
  userId: string;
  full_name: string;
  phone: string | null;
  division_id: string | null;
  roles: string[];
  is_active: boolean;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, full_name, phone, division_id, roles, is_active }: UpdateUserParams) => {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name,
          phone,
          division_id,
          is_active,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Delete existing roles
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Insert new roles
      if (roles.length > 0) {
        const roleInserts = roles.map((role) => ({
          user_id: userId,
          role: role as any,
        }));

        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(roleInserts);

        if (insertError) throw insertError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}
