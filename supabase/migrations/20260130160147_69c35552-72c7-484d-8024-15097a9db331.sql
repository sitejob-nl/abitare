-- ============================================
-- FASE 4: EXTRA FUNCTIONALITEIT
-- ============================================

-- SUBCONTRACTORS (Onderaannemers)
CREATE TABLE public.subcontractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(20),
    specialty VARCHAR(100),
    default_commission_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUBCONTRACTOR_ORDERS
CREATE TABLE public.subcontractor_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subcontractor_id UUID REFERENCES public.subcontractors(id),
    order_id UUID REFERENCES public.orders(id),
    customer_id UUID REFERENCES public.customers(id),
    description TEXT,
    work_type VARCHAR(100),
    order_amount DECIMAL(12,2),
    cost_amount DECIMAL(12,2),
    commission_percentage DECIMAL(5,2),
    commission_amount DECIMAL(12,2),
    commission_status VARCHAR(20) DEFAULT 'pending',
    commission_paid_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REFERRAL_REWARDS (Klant-stuurt-klant)
CREATE TABLE public.referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referring_customer_id UUID REFERENCES public.customers(id),
    referred_customer_id UUID REFERENCES public.customers(id),
    order_id UUID REFERENCES public.orders(id),
    reward_type VARCHAR(50),
    reward_value DECIMAL(10,2),
    reward_description VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SERVICE_BUDGETS (Jaarlijks service potje)
CREATE TABLE public.service_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL UNIQUE,
    total_budget DECIMAL(12,2) NOT NULL,
    used_amount DECIMAL(12,2) DEFAULT 0,
    remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_budget - used_amount) STORED,
    bonus_percentage DECIMAL(5,2) DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SERVICE_TRANSACTIONS
CREATE TABLE public.service_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES public.service_budgets(id),
    order_id UUID REFERENCES public.orders(id),
    customer_id UUID REFERENCES public.customers(id),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGER
CREATE TRIGGER subcontractor_orders_updated_at 
    BEFORE UPDATE ON public.subcontractor_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- RLS POLICIES - EXTRA FUNCTIONALITEIT
-- ============================================

-- SUBCONTRACTORS (Admin/Manager only)
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcontractors_select" ON public.subcontractors
  FOR SELECT TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "subcontractors_insert" ON public.subcontractors
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "subcontractors_update" ON public.subcontractors
  FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "subcontractors_delete" ON public.subcontractors
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- SUBCONTRACTOR_ORDERS
ALTER TABLE public.subcontractor_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcontractor_orders_select" ON public.subcontractor_orders
  FOR SELECT TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_id 
      AND (o.salesperson_id = auth.uid() OR o.assistant_id = auth.uid())
    )
  );

CREATE POLICY "subcontractor_orders_modify" ON public.subcontractor_orders
  FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- REFERRAL_REWARDS
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_rewards_select" ON public.referral_rewards
  FOR SELECT TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = referring_customer_id 
      AND c.salesperson_id = auth.uid()
    )
  );

CREATE POLICY "referral_rewards_modify" ON public.referral_rewards
  FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- SERVICE_BUDGETS (Admin/Manager only)
ALTER TABLE public.service_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_budgets_select" ON public.service_budgets
  FOR SELECT TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "service_budgets_modify" ON public.service_budgets
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- SERVICE_TRANSACTIONS
ALTER TABLE public.service_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_transactions_select" ON public.service_transactions
  FOR SELECT TO authenticated USING (
    public.is_admin_or_manager(auth.uid())
    OR approved_by = auth.uid()
  );

CREATE POLICY "service_transactions_insert" ON public.service_transactions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "service_transactions_delete" ON public.service_transactions
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));