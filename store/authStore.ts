import { create } from 'zustand';
import { User, Contact } from '../lib/supabase';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: any;
  isLoading: boolean;
  contacts: Contact[];
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  updateUser: (updatedUser: User) => void;
  setContacts: (contacts: Contact[]) => void;
  refreshContacts: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  contacts: [],
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  updateUser: (updatedUser) => set({ user: updatedUser }),
  setContacts: (contacts) => set({ contacts }),
  refreshContacts: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_user:contact_user_id(id, email, reference, full_name)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (contacts) {
        set({ contacts });
      }
    } catch (error) {
      console.error('Error refreshing contacts:', error);
    }
  },
  logout: () => set({ user: null, session: null, contacts: [] }),
}));
