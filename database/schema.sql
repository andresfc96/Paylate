-- Script de configuración de la base de datos para Paylate
-- Ejecutar en Supabase SQL Editor

-- Habilitar la extensión uuid-ossp para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    reference TEXT UNIQUE NOT NULL CHECK (reference ~ '^@[a-zA-Z0-9_]+$'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de contactos
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, contact_user_id)
);

-- Tabla de cuentas
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'custom'))
);

-- Tabla de participantes de cuentas
CREATE TABLE IF NOT EXISTS account_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_owed DECIMAL(10,2) NOT NULL CHECK (amount_owed >= 0),
    has_paid BOOLEAN DEFAULT FALSE,
    payment_proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, user_id)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_reference ON users(reference);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_created_by ON accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_account_participants_account_id ON account_participants(account_id);
CREATE INDEX IF NOT EXISTS idx_account_participants_user_id ON account_participants(user_id);

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_participants ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para contactos
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add contacts" ON contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON contacts
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para cuentas
CREATE POLICY "Users can view accounts they created or participate in" ON accounts
    FOR SELECT USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM account_participants 
            WHERE account_id = accounts.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create accounts" ON accounts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update accounts they created" ON accounts
    FOR UPDATE USING (auth.uid() = created_by);

-- Políticas para participantes de cuentas
CREATE POLICY "Users can view participants of accounts they created or participate in" ON account_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM accounts 
            WHERE id = account_participants.account_id AND created_by = auth.uid()
        ) OR
        user_id = auth.uid()
    );

CREATE POLICY "Users can insert participants for accounts they created" ON account_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM accounts 
            WHERE id = account_participants.account_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own payment status" ON account_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Account creators can update participant payment status" ON account_participants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM accounts 
            WHERE id = account_participants.account_id AND created_by = auth.uid()
        )
    );

-- Función para verificar que la suma de montos personalizados sea igual al total
CREATE OR REPLACE FUNCTION validate_custom_amounts()
RETURNS TRIGGER AS $$
DECLARE
    account_total DECIMAL(10,2);
    participants_sum DECIMAL(10,2);
    split_method TEXT;
BEGIN
    -- Obtener el total de la cuenta y el método de división
    SELECT total_amount, split_method INTO account_total, split_method
    FROM accounts
    WHERE id = NEW.account_id;
    
    -- Solo validar si es división personalizada
    IF split_method = 'custom' THEN
        -- Obtener la suma de los montos de los participantes
        SELECT COALESCE(SUM(amount_owed), 0) INTO participants_sum
        FROM account_participants
        WHERE account_id = NEW.account_id;
        
        -- Verificar que la suma sea igual al total
        IF participants_sum != account_total THEN
            RAISE EXCEPTION 'La suma de los montos de los participantes debe ser igual al total de la cuenta';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar montos personalizados (solo para cuentas con split_method = 'custom')
CREATE TRIGGER validate_custom_amounts_trigger
    AFTER INSERT OR UPDATE ON account_participants
    FOR EACH ROW
    EXECUTE FUNCTION validate_custom_amounts();
