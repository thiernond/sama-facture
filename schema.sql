-- ==============================================================================
-- SCHÉMA DE BASE DE DONNÉES - SAMA FACTURE (SUPABASE)
-- ==============================================================================

-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES
-- ==========================================

-- Table: Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    ninea TEXT,
    rccm TEXT,
    default_vat_rate NUMERIC DEFAULT 18,
    currency TEXT DEFAULT 'XOF',
    quote_prefix TEXT DEFAULT 'DEV',
    invoice_prefix TEXT DEFAULT 'FAC',
    purchase_order_prefix TEXT DEFAULT 'BC',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: Profiles (Lié à auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: Clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    ninea TEXT,
    rccm TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: Documents (Devis, Factures, Bons de commande)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('invoice', 'quote', 'purchase_order')),
    number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    issue_date DATE,
    due_date DATE,
    apply_vat BOOLEAN DEFAULT false,
    vat_rate NUMERIC DEFAULT 0,
    subtotal NUMERIC DEFAULT 0 CHECK (subtotal >= 0),
    vat_amount NUMERIC DEFAULT 0 CHECK (vat_amount >= 0),
    total NUMERIC DEFAULT 0 CHECK (total >= 0),
    amount_paid NUMERIC DEFAULT 0 CHECK (amount_paid >= 0),
    notes TEXT,
    converted_from_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: Document Items (Lignes de facturation)
CREATE TABLE IF NOT EXISTS public.document_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    reference TEXT,
    designation TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    position INTEGER DEFAULT 0
);

-- Table: Payments (Règlements)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Helper Function pour récupérer l'organization_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.user_org_id() 
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies pour Organizations
CREATE POLICY "Users can view their own organization" 
    ON public.organizations FOR SELECT 
    USING (id = public.user_org_id());

CREATE POLICY "Users can update their own organization" 
    ON public.organizations FOR UPDATE 
    USING (id = public.user_org_id());

-- Policies pour Profiles
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (id = auth.uid());

-- Triggers pour empêcher la modification de colonnes sensibles par l'utilisateur
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger AS $$
BEGIN
    -- L'utilisateur ne peut pas modifier son entreprise ni s'attribuer de nouveaux rôles
    NEW.organization_id = OLD.organization_id;
    NEW.role = OLD.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_profile_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- Policies pour Clients
CREATE POLICY "Users can manage their org clients" 
    ON public.clients FOR ALL 
    USING (organization_id = public.user_org_id());

-- Policies pour Documents
CREATE POLICY "Users can manage their org documents" 
    ON public.documents FOR ALL 
    USING (organization_id = public.user_org_id());

-- Policies pour Document Items
CREATE POLICY "Users can manage their org document items" 
    ON public.document_items FOR ALL 
    USING (document_id IN (
        SELECT id FROM public.documents WHERE organization_id = public.user_org_id()
    ));

-- Policies pour Payments
CREATE POLICY "Users can manage their org payments" 
    ON public.payments FOR ALL 
    USING (organization_id = public.user_org_id());

-- ==========================================
-- 3. TRIGGER D'INSCRIPTION AUTOMATIQUE
-- ==========================================
-- Ce trigger se déclenche quand un utilisateur s'inscrit via Supabase Auth
-- Il crée automatiquement l'Organisation et le Profil

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- 1. Créer la nouvelle organisation (nom tiré des métadonnées)
    INSERT INTO public.organizations (name, email)
    VALUES (
        COALESCE(new.raw_user_meta_data->>'orgName', 'Nouvelle Entreprise'),
        new.email
    )
    RETURNING id INTO new_org_id;

    -- 2. Créer le profil de l'utilisateur
    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (
        new.id,
        new_org_id,
        COALESCE(new.raw_user_meta_data->>'fullName', 'Utilisateur'),
        'owner'
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Attacher le trigger à auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 4. FONCTION NUMÉROTATION DOCUMENTS (RPC)
-- ==========================================
CREATE OR REPLACE FUNCTION public.generate_document_number(p_org_id UUID, p_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_year TEXT;
    v_count INTEGER;
    v_next_num TEXT;
BEGIN
    -- Obtenir le préfixe selon le type
    SELECT 
        CASE p_type
            WHEN 'invoice' THEN invoice_prefix
            WHEN 'quote' THEN quote_prefix
            WHEN 'purchase_order' THEN purchase_order_prefix
            ELSE 'DOC'
        END
    INTO v_prefix
    FROM public.organizations
    WHERE id = p_org_id;

    v_year := to_char(CURRENT_DATE, 'YYYY');

    -- Compter le nombre de documents de ce type cette année
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.documents
    WHERE organization_id = p_org_id 
      AND type = p_type 
      AND to_char(created_at, 'YYYY') = v_year;

    -- Format final : PRE-YYYY-0001
    v_next_num := v_prefix || '-' || v_year || '-' || lpad(v_count::TEXT, 4, '0');
    
    RETURN v_next_num;
END;
$$ LANGUAGE plpgsql;
