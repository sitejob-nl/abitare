import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types for installer views (views exclude financial data at database level)
export interface InstallerOrder {
  id: string;
  order_number: number;
  order_date: string | null;
  status: string | null;
  expected_delivery_date: string | null;
  expected_installation_date: string | null;
  actual_installation_date: string | null;
  delivery_notes: string | null;
  delivery_method: string | null;
  requires_elevator: boolean | null;
  customer: {
    id: string;
    first_name: string | null;
    last_name: string;
    company_name: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    delivery_street_address: string | null;
    delivery_postal_code: string | null;
    delivery_city: string | null;
    delivery_floor: string | null;
    delivery_has_elevator: boolean | null;
    street_address: string | null;
    postal_code: string | null;
    city: string | null;
  } | null;
  division: {
    id: string;
    name: string;
  } | null;
}

export interface InstallerOrderLine {
  id: string;
  description: string;
  quantity: number | null;
  article_code: string | null;
  section_type: string | null;
  is_delivered: boolean | null;
  expected_delivery: string | null;
}

export interface InstallerOrderDetail extends InstallerOrder {
  order_lines: InstallerOrderLine[];
  order_documents: {
    id: string;
    title: string | null;
    file_name: string | null;
    file_path: string | null;
    document_type: string;
    visible_to_installer: boolean | null;
  }[];
  order_notes: {
    id: string;
    content: string;
    note_type: string | null;
    created_at: string | null;
  }[];
}

export function useInstallerOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["installer-orders", user?.id],
    queryFn: async (): Promise<InstallerOrder[]> => {
      if (!user?.id) return [];

      // Use installer_orders view - excludes all financial data at database level
      const { data, error } = await supabase
        .from("installer_orders" as any)
        .select(`
          id,
          order_number,
          order_date,
          status,
          expected_delivery_date,
          expected_installation_date,
          actual_installation_date,
          delivery_notes,
          requires_elevator,
          customer:customers(
            id,
            first_name,
            last_name,
            company_name,
            phone,
            mobile,
            email,
            delivery_street_address,
            delivery_postal_code,
            delivery_city,
            delivery_floor,
            delivery_has_elevator,
            street_address,
            postal_code,
            city
          ),
          division:divisions(id, name)
        `)
        .order("expected_installation_date", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as InstallerOrder[];
    },
    enabled: !!user?.id,
  });
}

export function useInstallerOrderDetail(orderId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["installer-order", orderId],
    queryFn: async (): Promise<InstallerOrderDetail | null> => {
      if (!orderId || !user?.id) return null;

      // Use installer_orders view for main order data
      const { data, error } = await supabase
        .from("installer_orders" as any)
        .select(`
          id,
          order_number,
          order_date,
          status,
          expected_delivery_date,
          expected_installation_date,
          actual_installation_date,
          delivery_notes,
          delivery_method,
          requires_elevator,
          customer:customers(
            id,
            first_name,
            last_name,
            company_name,
            phone,
            mobile,
            email,
            delivery_street_address,
            delivery_postal_code,
            delivery_city,
            delivery_floor,
            delivery_has_elevator,
            street_address,
            postal_code,
            city
          ),
          division:divisions(id, name)
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch order lines from installer_order_lines view (no pricing data)
      const { data: linesData, error: linesError } = await supabase
        .from("installer_order_lines" as any)
        .select(`
          id,
          description,
          quantity,
          article_code,
          section_type,
          is_delivered,
          expected_delivery
        `)
        .eq("order_id", orderId);

      if (linesError) throw linesError;

      // Fetch documents visible to installer
      const { data: docsData, error: docsError } = await supabase
        .from("order_documents")
        .select(`
          id,
          title,
          file_name,
          file_path,
          document_type,
          visible_to_installer
        `)
        .eq("order_id", orderId)
        .eq("visible_to_installer", true);

      if (docsError) throw docsError;

      // Fetch notes (internal and installer type only - RLS handles this)
      const { data: notesData, error: notesError } = await supabase
        .from("order_notes")
        .select(`
          id,
          content,
          note_type,
          created_at
        `)
        .eq("order_id", orderId);

      if (notesError) throw notesError;

      return {
        ...(data as unknown as InstallerOrder),
        order_lines: (linesData || []) as unknown as InstallerOrderLine[],
        order_documents: docsData || [],
        order_notes: notesData || [],
      };
    },
    enabled: !!orderId && !!user?.id,
  });
}
