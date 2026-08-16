-- Missing RLS Policies for INSERT on Organizations and Profiles
-- Exécuter ceci dans SQL Editor pour autoriser l'inscription depuis le Frontend

CREATE POLICY "Users can insert their own organization"
    ON public.organizations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
