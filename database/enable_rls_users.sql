-- Script para re-habilitar RLS en la tabla users
-- Ejecutar DESPUÉS de registrar tu cuenta exitosamente

-- 1. Re-habilitar RLS en la tabla users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Crear las políticas correctas
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 3. Verificar que RLS esté habilitado y las políticas estén activas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'users';

-- 4. Mostrar las políticas activas
SELECT 
    tablename, 
    policyname, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
