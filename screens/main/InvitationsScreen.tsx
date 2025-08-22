import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useInvitationsStore } from '../../store/invitationsStore';
import { ContactInvitation, supabase } from '../../lib/supabase';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/Colors';

export default function InvitationsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { 
    sentInvitations, 
    receivedInvitations, 
    isLoading,
    refreshInvitations,
    acceptInvitation,
    rejectInvitation,
    cancelInvitation
  } = useInvitationsStore();
  
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      refreshInvitations(user.id);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await refreshInvitations(user.id);
    }
    setRefreshing(false);
  };

  const handleAcceptInvitation = async (invitation: ContactInvitation) => {
    Alert.alert(
      'Aceptar Invitación',
      `¿Quieres agregar a ${invitation.from_user?.full_name || invitation.from_user?.reference} como contacto?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          style: 'default',
          onPress: async () => {
            try {
              await acceptInvitation(invitation.id);
              
              // Crear el contacto en la tabla contacts
              const { data, error } = await supabase
                .from('contacts')
                .insert({
                  user_id: user!.id,
                  contact_user_id: invitation.from_user_id
                })
                .select()
                .single();

              if (error) throw error;

              // Refrescar contactos
              await useAuthStore.getState().refreshContacts();
              
              Alert.alert('Éxito', 'Contacto agregado correctamente');
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo aceptar la invitación: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleRejectInvitation = async (invitation: ContactInvitation) => {
    Alert.alert(
      'Rechazar Invitación',
      `¿Estás seguro de que quieres rechazar la invitación de ${invitation.from_user?.full_name || invitation.from_user?.reference}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectInvitation(invitation.id);
              Alert.alert('Invitación rechazada');
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo rechazar la invitación');
            }
          }
        }
      ]
    );
  };

  const handleCancelInvitation = async (invitation: ContactInvitation) => {
    Alert.alert(
      'Cancelar Invitación',
      `¿Estás seguro de que quieres cancelar la invitación a ${invitation.to_user?.full_name || invitation.to_user?.reference}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelInvitation(invitation.id);
              Alert.alert('Invitación cancelada');
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo cancelar la invitación');
            }
          }
        }
      ]
    );
  };

  const renderInvitationItem = ({ item }: { item: ContactInvitation }) => {
    const isReceived = activeTab === 'received';
    const otherUser = isReceived ? item.from_user : item.to_user;
    const displayName = otherUser?.full_name || otherUser?.reference || 'Usuario';

    return (
      <View style={styles.invitationCard}>
        <View style={styles.invitationHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={Colors.primary} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{otherUser?.email}</Text>
            </View>
          </View>
          <Text style={styles.invitationDate}>
            {new Date(item.created_at).toLocaleDateString('es-ES')}
          </Text>
        </View>

        <View style={styles.invitationActions}>
          {isReceived ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptInvitation(item)}
              >
                <Ionicons name="checkmark" size={20} color={Colors.background} />
                <Text style={styles.acceptButtonText}>Aceptar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectInvitation(item)}
              >
                <Ionicons name="close" size={20} color={Colors.background} />
                <Text style={styles.rejectButtonText}>Rechazar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelInvitation(item)}
            >
              <Ionicons name="close-circle" size={20} color={Colors.background} />
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'received' ? 'mail-open' : 'send'} 
        size={64} 
        color={Colors.textLight} 
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'received' ? 'No tienes invitaciones' : 'No has enviado invitaciones'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {activeTab === 'received' 
          ? 'Las invitaciones de otros usuarios aparecerán aquí'
          : 'Las invitaciones que envíes aparecerán aquí'
        }
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header con tabs */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invitaciones</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Recibidas ({receivedInvitations.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Enviadas ({sentInvitations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de invitaciones */}
      <FlatList
        data={activeTab === 'received' ? receivedInvitations : sentInvitations}
        renderItem={renderInvitationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
    ...Shadows.light,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  placeholder: {
    width: 44,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    ...Shadows.light,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.background,
  },
  listContainer: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  invitationCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.light,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  invitationDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: Colors.primary, // AZUL para aceptar
  },
  rejectButton: {
    backgroundColor: Colors.background, // BLANCO para rechazar
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButton: {
    backgroundColor: Colors.warning, // NARANJA para cancelar
  },
  acceptButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  rejectButtonText: {
    color: Colors.text, // TEXTO OSCURO para botón blanco
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  cancelButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 250,
  },
});
