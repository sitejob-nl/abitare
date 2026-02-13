import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Project {
  id: string;
  project_number: number;
  customer_id: string;
  division_id: string | null;
  name: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomerProjects(customerId: string | undefined) {
  return useQuery({
    queryKey: ["projects", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!customerId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ customer_id, name }: { customer_id: string; name: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          customer_id,
          name,
          division_id: profile?.division_id || null,
          created_by: user?.id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (_, { customer_id }) => {
      queryClient.invalidateQueries({ queryKey: ["projects", customer_id] });
      toast.success("Project aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij aanmaken project");
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Project, "name" | "status">> }) => {
      const { error } = await supabase
        .from("projects")
        .update(data as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project bijgewerkt");
    },
  });
}
