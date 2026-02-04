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
      // For now, fetch all active users - in future could filter by role
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data as Installer[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
