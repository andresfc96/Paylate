-- Script para deshabilitar temporalmente RLS en la tabla users
-- Ejecutar en Supabase SQL Editor

-- 1. Deshabilitar RLS en la tabla users temporalmente
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS esté deshabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'users';

-- 3. Mostrar el estado actual
SELECT 
    'RLS Status' as info,
    CASE 
        WHEN rowsecurity THEN 'ENABLED' 
        ELSE 'DISABLED' 
    END as status
FROM pg_tables 
WHERE tablename = 'users';

-- 4. Comentario: Después de registrar tu cuenta, ejecuta el script de re-habilitación
