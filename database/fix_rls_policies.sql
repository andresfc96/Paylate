-- Script para corregir las políticas RLS de Supabase
-- Ejecutar en Supabase SQL Editor después del schema.sql

-- 1. Habilitar inserción de usuarios durante el registro
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Permitir que los usuarios vean su propio perfil
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- 3. Permitir que los usuarios actualicen su propio perfil
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 4. Permitir inserción de contactos
DROP POLICY IF EXISTS "Users can add contacts" ON contacts;
CREATE POLICY "Users can add contacts" ON contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Permitir inserción de cuentas
DROP POLICY IF EXISTS "Users can create accounts" ON accounts;
CREATE POLICY "Users can create accounts" ON accounts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 6. Permitir inserción de participantes de cuentas
DROP POLICY IF EXISTS "Users can insert participants for accounts they created" ON account_participants;
CREATE POLICY "Users can insert participants for accounts they created" ON account_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM accounts 
            WHERE id = account_participants.account_id AND created_by = auth.uid()
        )
    );

-- 7. Verificar que RLS esté habilitado en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_participants ENABLE ROW LEVEL SECURITY;

-- 8. Mostrar las políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
