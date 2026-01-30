-- ============================================
-- FASE 3: SALES & ORDERS
-- ============================================

-- CUSTOMERS (Klanten)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_number SERIAL UNIQUE,
    customer_type public.customer_type NOT NULL DEFAULT 'particulier',
    salutation VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(20),
    phone_2 VARCHAR(20),
    mobile VARCHAR(20),
    street_address VARCHAR(255),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nederland',
    vat_number VARCHAR(50),
    coc_number VARCHAR(20),
    delivery_street_address VARCHAR(255),
    delivery_postal_code VARCHAR(10),
    delivery_city VARCHAR(100),
    delivery_floor VARCHAR(20),
    delivery_has_elevator BOOLEAN,
    division_id UUID REFERENCES public.divisions(id),
    salesperson_id UUID REFERENCES auth.users(id),
    assistant_id UUID REFERENCES auth.users(id),
    referred_by_customer_id UUID REFERENCES public.customers(id),
    referral_reward_type VARCHAR(50),
    referral_reward_value DECIMAL(10,2),
    referral_reward_given BOOLEAN DEFAULT false,
    accepts_marketing BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUOTES (Offertes)
CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number SERIAL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    division_id UUID REFERENCES public.divisions(id),
    status public.quote_status DEFAULT 'concept',
    quote_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    salesperson_id UUID REFERENCES auth.users(id),
    default_range_id UUID REFERENCES public.product_ranges(id),
    default_color_id UUID REFERENCES public.product_colors(id),
    payment_condition VARCHAR(50),
    payment_terms_description TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_description VARCHAR(255),
    subtotal_products DECIMAL(12,2) DEFAULT 0,
    subtotal_montage DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_excl_vat DECIMAL(12,2) DEFAULT 0,
    total_vat DECIMAL(12,2) DEFAULT 0,
    total_incl_vat DECIMAL(12,2) DEFAULT 0,
    introduction_text TEXT,
    closing_text TEXT,
    internal_notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUOTE_SECTIONS (Offerte secties)
CREATE TABLE public.quote_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    range_id UUID REFERENCES public.product_ranges(id),
    color_id UUID REFERENCES public.product_colors(id),
    subtotal DECIMAL(12,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUOTE_LINES (Offerte regels)
CREATE TABLE public.quote_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.quote_sections(id),
    product_id UUID REFERENCES public.products(id),
    article_code VARCHAR(50),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'stuk',
    unit_price DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(12,2),
    vat_rate DECIMAL(5,2) DEFAULT 21,
    is_group_header BOOLEAN DEFAULT false,
    group_title VARCHAR(255),
    configuration JSONB,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    quote_id UUID REFERENCES public.quotes(id),
    division_id UUID REFERENCES public.divisions(id),
    status public.order_status DEFAULT 'nieuw',
    order_date DATE DEFAULT CURRENT_DATE,
    order_confirmation_sent_at TIMESTAMPTZ,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    expected_installation_date DATE,
    actual_installation_date DATE,
    delivery_method VARCHAR(50),
    requires_elevator BOOLEAN DEFAULT false,
    delivery_notes TEXT,
    salesperson_id UUID REFERENCES auth.users(id),
    assistant_id UUID REFERENCES auth.users(id),
    installer_id UUID REFERENCES auth.users(id),
    payment_condition VARCHAR(50),
    payment_status public.payment_status DEFAULT 'open',
    amount_paid DECIMAL(12,2) DEFAULT 0,
    subtotal_products DECIMAL(12,2) DEFAULT 0,
    subtotal_montage DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_excl_vat DECIMAL(12,2) DEFAULT 0,
    total_vat DECIMAL(12,2) DEFAULT 0,
    total_incl_vat DECIMAL(12,2) DEFAULT 0,
    total_cost_price DECIMAL(12,2) DEFAULT 0,
    margin_amount DECIMAL(12,2) DEFAULT 0,
    margin_percentage DECIMAL(5,2) DEFAULT 0,
    exact_invoice_id VARCHAR(50),
    exact_customer_id VARCHAR(50),
    internal_notes TEXT,
    customer_notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER_LINES
CREATE TABLE public.order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    quote_line_id UUID REFERENCES public.quote_lines(id),
    product_id UUID REFERENCES public.products(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    article_code VARCHAR(50),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'stuk',
    unit_price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(12,2),
    vat_rate DECIMAL(5,2) DEFAULT 21,
    is_ordered BOOLEAN DEFAULT false,
    ordered_at TIMESTAMPTZ,
    expected_delivery DATE,
    is_delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMPTZ,
    configuration JSONB,
    section_type VARCHAR(50),
    is_group_header BOOLEAN DEFAULT false,
    group_title VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER_DOCUMENTS
CREATE TABLE public.order_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    visible_to_customer BOOLEAN DEFAULT false,
    visible_to_installer BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER_NOTES
CREATE TABLE public.order_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    note_type VARCHAR(20) DEFAULT 'internal',
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER_STATUS_HISTORY
CREATE TABLE public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status public.order_status,
    to_status public.order_status NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGERS
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- INDEXES
CREATE INDEX idx_customers_name ON public.customers(last_name, first_name);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_division ON public.customers(division_id);
CREATE INDEX idx_quotes_customer ON public.quotes(customer_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_number ON public.quotes(quote_number);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_quote ON public.orders(quote_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_order_lines_order ON public.order_lines(order_id);
CREATE INDEX idx_quote_lines_quote ON public.quote_lines(quote_id);