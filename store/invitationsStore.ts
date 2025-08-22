import { create } from 'zustand';
import { ContactInvitation } from '../lib/supabase';
import { contactInvitations } from '../lib/supabase';

interface InvitationsState {
  sentInvitations: ContactInvitation[];
  receivedInvitations: ContactInvitation[];
  isLoading: boolean;
  setSentInvitations: (invitations: ContactInvitation[]) => void;
  setReceivedInvitations: (invitations: ContactInvitation[]) => void;
  setLoading: (loading: boolean) => void;
  refreshInvitations: (userId: string) => Promise<void>;
  sendInvitation: (fromUserId: string, toUserId: string) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
}

export const useInvitationsStore = create<InvitationsState>((set, get) => ({
  sentInvitations: [],
  receivedInvitations: [],
  isLoading: false,
  
  setSentInvitations: (invitations) => set({ sentInvitations: invitations }),
  setReceivedInvitations: (invitations) => set({ receivedInvitations: invitations }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  refreshInvitations: async (userId: string) => {
    try {
      set({ isLoading: true });
      
      const [sentData, receivedData] = await Promise.all([
        contactInvitations.getSentInvitations(userId),
        contactInvitations.getReceivedInvitations(userId)
      ]);
      
      set({ 
        sentInvitations: sentData || [],
        receivedInvitations: receivedData || []
      });
    } catch (error) {
      console.error('Error refreshing invitations:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  sendInvitation: async (fromUserId: string, toUserId: string) => {
    try {
      set({ isLoading: true });
      await contactInvitations.sendInvitation(fromUserId, toUserId);
      // Refrescar las invitaciones enviadas
      await get().refreshInvitations(fromUserId);
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  acceptInvitation: async (invitationId: string) => {
    try {
      set({ isLoading: true });
      await contactInvitations.acceptInvitation(invitationId);
      // Refrescar las invitaciones recibidas
      const { receivedInvitations } = get();
      const updatedInvitations = receivedInvitations.filter(inv => inv.id !== invitationId);
      set({ receivedInvitations: updatedInvitations });
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  rejectInvitation: async (invitationId: string) => {
    try {
      set({ isLoading: true });
      await contactInvitations.rejectInvitation(invitationId);
      // Refrescar las invitaciones recibidas
      const { receivedInvitations } = get();
      const updatedInvitations = receivedInvitations.filter(inv => inv.id !== invitationId);
      set({ receivedInvitations: updatedInvitations });
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  cancelInvitation: async (invitationId: string) => {
    try {
      set({ isLoading: true });
      await contactInvitations.cancelInvitation(invitationId);
      // Refrescar las invitaciones enviadas
      const { sentInvitations } = get();
      const updatedInvitations = sentInvitations.filter(inv => inv.id !== invitationId);
      set({ sentInvitations: updatedInvitations });
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));
