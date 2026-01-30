-- ============================================
-- FASE 1: BASIS INFRASTRUCTUUR
-- ============================================

-- ENUMS
CREATE TYPE public.customer_type AS ENUM ('particulier', 'zakelijk');
CREATE TYPE public.quote_status AS ENUM ('concept', 'verstuurd', 'bekeken', 'vervallen', 'geaccepteerd', 'afgewezen');
CREATE TYPE public.order_status AS ENUM ('nieuw', 'bestel_klaar', 'controle', 'besteld', 'in_productie', 'levering_gepland', 'geleverd', 'montage_gepland', 'gemonteerd', 'nazorg', 'afgerond');
CREATE TYPE public.payment_status AS ENUM ('open', 'deels_betaald', 'betaald');
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'verkoper', 'assistent', 'monteur', 'werkvoorbereiding', 'administratie');

-- ============================================
-- DIVISIONS (Vestigingen)
-- ============================================
CREATE TABLE public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE,
    address VARCHAR(255),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILES (Gebruikersprofielen)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200),
    phone VARCHAR(20),
    division_id UUID REFERENCES public.divisions(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER_ROLES (Gebruikersrollen - aparte tabel voor veiligheid)
-- ============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- ============================================
-- SECURITY DEFINER FUNCTIES
-- ============================================

-- Veilige functie om rol te checken (voorkomt RLS recursie)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check of gebruiker admin is
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Check of gebruiker admin of manager is
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'manager')
$$;

-- Huidige gebruiker's vestiging ophalen
CREATE OR REPLACE FUNCTION public.get_user_division_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT division_id FROM public.profiles WHERE id = _user_id
$$;

-- ============================================
-- TRIGGER FUNCTIE: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES - DIVISIONS
-- ============================================
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "divisions_select" ON public.divisions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "divisions_insert" ON public.divisions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "divisions_update" ON public.divisions
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "divisions_delete" ON public.divisions
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================
-- RLS POLICIES - PROFILES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR public.get_user_division_id(auth.uid()) = division_id
    OR id = auth.uid()
  );

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (
    id = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (
    id = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================
-- RLS POLICIES - USER_ROLES
-- ============================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));