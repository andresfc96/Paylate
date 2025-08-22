import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de Supabase
const supabaseUrl = 'https://xthzcypqvduuiuebhqrr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aHpjeXBxdmR1dWl1ZWJocXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODEyMjIsImV4cCI6MjA3MTQ1NzIyMn0.FSgOujbeCxtUMYPMP6yiULbA3KwbZljM6CEqmZs_YL0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tipos para la base de datos
export interface User {
  id: string;
  email: string;
  reference: string;
  created_at: string;
  full_name?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'other';
  gender_other?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  added_at: string;
}

export interface Account {
  id: string;
  name: string;
  description?: string;
  total_amount: number;
  created_by: string;
  created_at: string;
  split_method: 'equal' | 'custom';
}

export interface AccountParticipant {
  id: string;
  account_id: string;
  user_id: string;
  amount_owed: number;
  has_paid: boolean;
  payment_proof_url?: string;
}

export interface ContactInvitation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
  from_user?: User;
  to_user?: User;
}

// Funciones para manejar invitaciones de contacto
export const contactInvitations = {
  // Enviar invitación
  async sendInvitation(fromUserId: string, toUserId: string) {
    const { data, error } = await supabase
      .from('contact_invitations')
      .upsert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: 'pending'
      }, {
        onConflict: 'from_user_id,to_user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Obtener invitaciones enviadas
  async getSentInvitations(userId: string) {
    const { data, error } = await supabase
      .from('contact_invitations')
      .select(`
        *,
        to_user:to_user_id(id, email, reference, full_name)
      `)
      .eq('from_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Obtener invitaciones recibidas
  async getReceivedInvitations(userId: string) {
    const { data, error } = await supabase
      .from('contact_invitations')
      .select(`
        *,
        from_user:from_user_id(id, email, reference, full_name)
      `)
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Aceptar invitación
  async acceptInvitation(invitationId: string) {
    const { data, error } = await supabase
      .from('contact_invitations')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Rechazar invitación
  async rejectInvitation(invitationId: string) {
    // En lugar de cambiar el estado, eliminamos la invitación completamente
    // para permitir que se pueda enviar una nueva invitación en el futuro
    const { error } = await supabase
      .from('contact_invitations')
      .delete()
      .eq('id', invitationId);
    
    if (error) throw error;
    return { id: invitationId, status: 'rejected' };
  },

  // Cancelar invitación
  async cancelInvitation(invitationId: string) {
    // En lugar de cambiar el estado, eliminamos la invitación completamente
    // para permitir que se pueda enviar una nueva invitación en el futuro
    const { error } = await supabase
      .from('contact_invitations')
      .delete()
      .eq('id', invitationId);
    
    if (error) throw error;
    return { id: invitationId, status: 'cancelled' };
  }
};

// Función mejorada para agregar contacto
export const addContact = async (userId: string, contactUserId: string) => {
  // Primero verificar si ya existe
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('contact_user_id', contactUserId)
    .single();

  if (existingContact) {
    throw new Error('Ya tienes este contacto agregado');
  }

  // Verificar si hay una invitación pendiente
  const { data: invitation } = await supabase
    .from('contact_invitations')
    .select('*')
    .eq('from_user_id', userId)
    .eq('to_user_id', contactUserId)
    .eq('status', 'pending')
    .single();

  if (invitation) {
    throw new Error('Ya has enviado una invitación a este usuario');
  }

  // Crear el contacto
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      contact_user_id: contactUserId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Funciones para manejar comprobantes de pago
export const paymentProofs = {
  // Subir comprobante a Supabase Storage
  async uploadProof(file: { uri: string; type?: string; name?: string }, participantId: string) {
    try {
      // Crear nombre único para el archivo
      const fileExt = file.name?.split('.').pop() || 'jpg';
      const fileName = `${participantId}_${Date.now()}.${fileExt}`;
      const filePath = `${participantId}/${fileName}`;

      // Convertir URI a FormData para la subida
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: fileName,
      } as any);

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, formData, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública del archivo
      const { data: publicUrlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Actualizar el registro del participante con la URL del comprobante
      const { data: updateData, error: updateError } = await supabase
        .from('account_participants')
        .update({ payment_proof_url: publicUrl })
        .eq('id', participantId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        filePath,
        publicUrl,
        participant: updateData
      };
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      throw error;
    }
  },

  // Eliminar comprobante
  async deleteProof(participantId: string, filePath: string) {
    try {
      // Eliminar archivo del storage
      const { error: deleteError } = await supabase.storage
        .from('payment-proofs')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Actualizar el registro para remover la URL
      const { data, error: updateError } = await supabase
        .from('account_participants')
        .update({ payment_proof_url: null })
        .eq('id', participantId)
        .select()
        .single();

      if (updateError) throw updateError;

      return data;
    } catch (error) {
      console.error('Error deleting payment proof:', error);
      throw error;
    }
  }
};
