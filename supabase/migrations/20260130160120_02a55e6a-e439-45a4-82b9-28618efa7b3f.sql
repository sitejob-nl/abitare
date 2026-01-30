-- ============================================
-- RLS POLICIES - SALES & ORDERS
-- ============================================

-- CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR division_id = public.get_user_division_id(auth.uid())
    OR salesperson_id = auth.uid()
    OR assistant_id = auth.uid()
  );

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid())
    OR division_id = public.get_user_division_id(auth.uid())
  );

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated USING (
    public.is_admin(auth.uid())
    OR division_id = public.get_user_division_id(auth.uid())
    OR salesperson_id = auth.uid()
  );

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- QUOTES
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select" ON public.quotes
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR division_id = public.get_user_division_id(auth.uid())
    OR salesperson_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "quotes_insert" ON public.quotes
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid())
    OR division_id = public.get_user_division_id(auth.uid())
  );

CREATE POLICY "quotes_update" ON public.quotes
  FOR UPDATE TO authenticated USING (
    public.is_admin(auth.uid())
    OR division_id = public.get_user_division_id(auth.uid())
    OR salesperson_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "quotes_delete" ON public.quotes
  FOR DELETE TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR (created_by = auth.uid() AND status = 'concept')
  );

-- QUOTE_SECTIONS (inherit from quote)
ALTER TABLE public.quote_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_sections_all" ON public.quote_sections
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_id 
      AND (
        public.is_admin(auth.uid())
        OR q.division_id = public.get_user_division_id(auth.uid())
        OR q.salesperson_id = auth.uid()
      )
    )
  );

-- QUOTE_LINES (inherit from quote)
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_lines_all" ON public.quote_lines
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_id 
      AND (
        public.is_admin(auth.uid())
        OR q.division_id = public.get_user_division_id(auth.uid())
        OR q.salesperson_id = auth.uid()
      )
    )
  );

-- ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select" ON public.orders
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR division_id = public.get_user_division_id(auth.uid())
    OR salesperson_id = auth.uid()
    OR assistant_id = auth.uid()
    OR installer_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid())
    OR division_id = public.get_user_division_id(auth.uid())
  );

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE TO authenticated USING (
    public.is_admin(auth.uid())
    OR division_id = public.get_user_division_id(auth.uid())
    OR salesperson_id = auth.uid()
    OR assistant_id = auth.uid()
  );

CREATE POLICY "orders_delete" ON public.orders
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ORDER_LINES (inherit from order)
ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_lines_select" ON public.order_lines
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.is_admin(auth.uid())
        OR o.division_id = public.get_user_division_id(auth.uid())
        OR o.salesperson_id = auth.uid()
        OR o.assistant_id = auth.uid()
        OR o.installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_lines_modify" ON public.order_lines
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.is_admin(auth.uid())
        OR o.division_id = public.get_user_division_id(auth.uid())
        OR o.salesperson_id = auth.uid()
        OR o.assistant_id = auth.uid()
      )
    )
  );

-- ORDER_DOCUMENTS (inherit from order)
ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_documents_select" ON public.order_documents
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.is_admin(auth.uid())
        OR o.division_id = public.get_user_division_id(auth.uid())
        OR o.salesperson_id = auth.uid()
        OR o.assistant_id = auth.uid()
        OR o.installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_documents_insert" ON public.order_documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.is_admin(auth.uid())
        OR o.division_id = public.get_user_division_id(auth.uid())
        OR o.salesperson_id = auth.uid()
        OR o.assistant_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_documents_delete" ON public.order_documents
  FOR DELETE TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR uploaded_by = auth.uid()
  );

-- ORDER_NOTES
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_notes_select" ON public.order_notes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.is_admin(auth.uid())
        OR o.division_id = public.get_user_division_id(auth.uid())
        OR o.salesperson_id = auth.uid()
        OR o.assistant_id = auth.uid()
        OR (o.installer_id = auth.uid() AND note_type IN ('internal', 'installer'))
      )
    )
  );

CREATE POLICY "order_notes_insert" ON public.order_notes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.is_admin(auth.uid())
        OR o.division_id = public.get_user_division_id(auth.uid())
        OR o.salesperson_id = auth.uid()
        OR o.assistant_id = auth.uid()
        OR o.installer_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_notes_delete" ON public.order_notes
  FOR DELETE TO authenticated USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
  );

-- ORDER_STATUS_HISTORY
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_status_history_select" ON public.order_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.is_admin(auth.uid())
        OR o.division_id = public.get_user_division_id(auth.uid())
        OR o.salesperson_id = auth.uid()
        OR o.assistant_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_status_history_insert" ON public.order_status_history
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (
        public.is_admin(auth.uid())
        OR o.division_id = public.get_user_division_id(auth.uid())
        OR o.salesperson_id = auth.uid()
        OR o.assistant_id = auth.uid()
      )
    )
  );