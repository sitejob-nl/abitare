import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Customer = Tables<"customers">;
export type CustomerInsert = TablesInsert<"customers">;
export type CustomerUpdate = TablesUpdate<"customers">;

interface UseCustomersOptions {
  divisionId?: string | null;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

export function useCustomers(options: UseCustomersOptions = {}) {
  const { divisionId, search, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ["customers", { divisionId, search, limit }],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select(`
          *,
          division:divisions(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (divisionId && divisionId !== "all") {
        query = query.eq("division_id", divisionId);
      }

      if (search) {
        query = query.or(
          `last_name.ilike.%${search}%,first_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,mobile.ilike.%${search}%,company_name.ilike.%${search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          division:divisions(id, name),
          referred_by:customers!customers_referred_by_customer_id_fkey(id, first_name, last_name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: CustomerInsert) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CustomerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", data.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
