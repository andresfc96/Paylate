-- Script para deshabilitar RLS en todas las tablas temporalmente
-- Ejecutar en Supabase SQL Editor

-- 1. Deshabilitar RLS en todas las tablas
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_participants DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS esté deshabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'ENABLED' 
        ELSE 'DISABLED' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'contacts', 'accounts', 'account_participants')
ORDER BY tablename;

-- 3. Eliminar todas las políticas existentes para evitar conflictos
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

-- 4. Mostrar el estado final
SELECT 
    'Final Status' as info,
    'RLS DISABLED - Ready to use app' as message;
