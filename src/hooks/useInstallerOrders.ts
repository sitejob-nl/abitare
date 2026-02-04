import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useInstallerOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["installer-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("orders")
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
        .eq("installer_id", user.id)
        .in("status", ["montage_gepland", "geleverd"])
        .order("expected_installation_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useInstallerOrderDetail(orderId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["installer-order", orderId],
    queryFn: async () => {
      if (!orderId || !user?.id) return null;

      const { data, error } = await supabase
        .from("orders")
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
          division:divisions(id, name),
          order_lines(
            id,
            description,
            quantity,
            article_code,
            section_type
          ),
          order_documents(
            id,
            title,
            file_name,
            file_path,
            document_type,
            visible_to_installer
          ),
          order_notes(
            id,
            content,
            note_type,
            created_at
          )
        `)
        .eq("id", orderId)
        .eq("installer_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user?.id,
  });
}
