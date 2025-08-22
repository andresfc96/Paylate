-- Script específico para corregir la política de inserción de usuarios
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar la política problemática
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- 2. Crear la política correcta con la condición apropiada
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Verificar que se creó correctamente
SELECT 
    tablename, 
    policyname, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND policyname = 'Users can insert their own profile';

-- 4. Mostrar todas las políticas de la tabla users
SELECT 
    tablename, 
    policyname, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
