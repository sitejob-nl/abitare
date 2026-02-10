import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate, Database } from "@/integrations/supabase/types";

export type Quote = Tables<"quotes">;
export type QuoteInsert = TablesInsert<"quotes">;
export type QuoteUpdate = TablesUpdate<"quotes">;
export type QuoteStatus = Database["public"]["Enums"]["quote_status"];

interface UseQuotesOptions {
  divisionId?: string | null;
  status?: QuoteStatus | "all" | null;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

export function useQuotes(options: UseQuotesOptions = {}) {
  const { divisionId, status, search, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ["quotes", { divisionId, status, search, limit }],
    queryFn: async () => {
      let query = supabase
        .from("quotes")
        .select(`
          *,
          customer:customers(id, first_name, last_name, company_name),
          division:divisions(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (divisionId && divisionId !== "all") {
        query = query.eq("division_id", divisionId);
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (search) {
        const trimmed = search.trim();
        const quoteNum = parseInt(trimmed);
        if (!isNaN(quoteNum) && String(quoteNum) === trimmed) {
          // Pure number: search on quote_number
          query = query.eq("quote_number", quoteNum);
        } else {
          // Text search: search on reference (ilike) and filter client-side for customer name
          query = query.or(`reference.ilike.%${trimmed}%`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Client-side filter for customer name (can't filter joined tables in Supabase)
      if (search && data) {
        const trimmed = search.trim().toLowerCase();
        const quoteNum = parseInt(trimmed);
        if (isNaN(quoteNum) || String(quoteNum) !== trimmed) {
          return data.filter(q => {
            // Already matched by reference via ilike, check if it's in results
            // Also match on customer name
            const customer = q.customer as { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null;
            if (!customer) return true; // keep reference-matched results
            const name = [customer.company_name, customer.first_name, customer.last_name]
              .filter(Boolean).join(" ").toLowerCase();
            const refMatch = q.reference?.toLowerCase().includes(trimmed);
            return refMatch || name.includes(trimmed);
          });
        }
      }
      
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          customer:customers(*),
          division:divisions(*),
          quote_sections(*),
          quote_lines(*),
          orders(id, order_number)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quote: QuoteInsert) => {
      const { data, error } = await supabase
        .from("quotes")
        .insert(quote)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: QuoteUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("quotes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote", data.id] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

// Hook for expired quotes (action items)
export function useExpiredQuotes() {
  return useQuery({
    queryKey: ["quotes", "expired"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          customer:customers(id, first_name, last_name, company_name)
        `)
        .eq("status", "verstuurd")
        .lt("valid_until", today)
        .order("valid_until", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}

// Hook for open quotes count (sidebar badge)
export function useOpenQuotesCount() {
  return useQuery({
    queryKey: ["quotes", "open-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .in("status", ["concept", "verstuurd", "bekeken"]);

      if (error) throw error;
      return count || 0;
    },
  });
}
