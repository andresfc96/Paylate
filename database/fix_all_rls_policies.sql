-- Script para corregir todas las políticas RLS problemáticas
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar todas las políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can add contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;

DROP POLICY IF EXISTS "Users can view accounts they created or participate in" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update accounts they created" ON accounts;

DROP POLICY IF EXISTS "Users can view participants of accounts they created or participate in" ON account_participants;
DROP POLICY IF EXISTS "Users can insert participants for accounts they created" ON account_participants;
DROP POLICY IF EXISTS "Users can update their own payment status" ON account_participants;
DROP POLICY IF EXISTS "Account creators can update participant payment status" ON account_participants;

-- 2. Crear políticas simples y sin recursión
-- Políticas para users
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para contacts
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add contacts" ON contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON contacts
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para accounts
CREATE POLICY "Users can view accounts they created or participate in" ON accounts
    FOR SELECT USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM account_participants ap
            WHERE ap.account_id = accounts.id AND ap.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create accounts" ON accounts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update accounts they created" ON accounts
    FOR UPDATE USING (auth.uid() = created_by);

-- Políticas para account_participants (simplificadas)
CREATE POLICY "Users can view participants of accounts they created or participate in" ON account_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM accounts a
            WHERE a.id = account_participants.account_id 
            AND (a.created_by = auth.uid() OR account_participants.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert participants for accounts they created" ON account_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM accounts a
            WHERE a.id = account_participants.account_id AND a.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own payment status" ON account_participants
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Account creators can update participant payment status" ON account_participants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM accounts a
            WHERE a.id = account_participants.account_id AND a.created_by = auth.uid()
        )
    );

-- 3. Verificar que RLS esté habilitado en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_participants ENABLE ROW LEVEL SECURITY;

-- 4. Mostrar todas las políticas activas
SELECT 
    tablename, 
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
