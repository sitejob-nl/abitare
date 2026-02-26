import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Installer {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
}

// Fetch all users who can be assigned as installers
export function useInstallers() {
  return useQuery({
    queryKey: ["installers"],
    queryFn: async () => {
      // Fetch only users with the 'monteur' role
      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "monteur");

      if (roleError) throw roleError;

      const installerIds = (roleRows || []).map((r) => r.user_id);
      if (installerIds.length === 0) return [] as Installer[];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("is_active", true)
        .in("id", installerIds)
        .order("full_name");

      if (error) throw error;
      return data as Installer[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
