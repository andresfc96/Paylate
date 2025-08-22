import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase, paymentProofs } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Account, AccountParticipant, User } from '../../lib/supabase';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/Colors';

// Función para formatear números con separadores de miles
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

interface AccountWithParticipants extends Account {
  participants: (AccountParticipant & { user: User })[];
  creator: User;
  status?: 'pending' | 'paid' | 'cancelled';
}

// Componente del botón de cancelar para el header
const CancelButton = ({ route, navigation }: any) => {
  const { accountId } = route.params;
  const { user } = useAuthStore();

  const handleCancelAccount = async () => {
    Alert.alert(
      'Cancelar cuenta',
      '¿Estás seguro de que quieres cancelar esta cuenta? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('accounts')
                .update({ status: 'cancelled' })
                .eq('id', accountId);
              
              if (error) throw error;
              
              Alert.alert('Éxito', 'Cuenta cancelada correctamente');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', `No se pudo cancelar: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.headerCancelButton}
      onPress={handleCancelAccount}
    >
      <Ionicons name="close-circle" size={24} color={Colors.background} />
    </TouchableOpacity>
  );
};

function AccountDetailScreen({ route, navigation }: any) {
  const { accountId } = route.params;
  const { user } = useAuthStore();
  const [account, setAccount] = useState<AccountWithParticipants | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState<{ url: string; userName: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAccountDetails();
  }, [accountId]);

  const fetchAccountDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          participants:account_participants(
            *,
            user:users(*)
          ),
          creator:users(*)
        `)
        .eq('id', accountId)
        .single();

      if (error) throw error;
      setAccount(data);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar el detalle de la cuenta');
      console.error('Error fetching account details:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAccountDetails();
    } catch (error) {
      console.error('Error refreshing account details:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const isCreator = account?.created_by === user?.id;
  const userParticipant = account?.participants.find(p => p.user_id === user?.id);
  
  // Calcular estado de la cuenta automáticamente
  const accountStatus = account ? (() => {
    if (account.status === 'cancelled') return 'cancelled';
    const totalParticipants = account.participants.length;
    const paidParticipants = account.participants.filter(p => p.has_paid).length;
    return paidParticipants === totalParticipants ? 'paid' : 'pending';
  })() : 'pending';
  
  // Contador de pagos
  const paidCount = account?.participants.filter(p => p.has_paid).length || 0;
  const totalCount = account?.participants.length || 0;

  const handleCancelAccount = async () => {
    Alert.alert(
      'Cancelar cuenta',
      '¿Estás seguro de que quieres cancelar esta cuenta? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('accounts')
                .update({ status: 'cancelled' })
                .eq('id', accountId);
              
              if (error) throw error;
              
              // Refrescar la cuenta
              await fetchAccountDetails();
              Alert.alert('Éxito', 'Cuenta cancelada correctamente');
            } catch (error: any) {
              Alert.alert('Error', `No se pudo cancelar: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handlePaymentToggle = async (participantId: string, hasPaid: boolean) => {
    if (!isCreator) return;

    setUpdatingPayment(true);
    try {
      const { error } = await supabase
        .from('account_participants')
        .update({ has_paid: hasPaid })
        .eq('id', participantId);

      if (error) throw error;

      // Actualizar el estado local
      if (account) {
        const updatedParticipants = account.participants.map(p =>
          p.id === participantId ? { ...p, has_paid: hasPaid } : p
        );
        setAccount({ ...account, participants: updatedParticipants });
      }

      // Aquí se enviaría la notificación push al creador
      // Por ahora solo mostramos un mensaje
      if (hasPaid) {
        Alert.alert('Pago marcado', 'El participante ha marcado su pago como completado');
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo actualizar el estado del pago');
      console.error('Error updating payment:', error);
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!userParticipant) return;

    setUpdatingPayment(true);
    try {
      const { error } = await supabase
        .from('account_participants')
        .update({ has_paid: true })
        .eq('id', userParticipant.id);

      if (error) throw error;

      // Actualizar el estado local
      if (account) {
        const updatedParticipants = account.participants.map(p =>
          p.id === userParticipant.id ? { ...p, has_paid: true } : p
        );
        setAccount({ ...account, participants: updatedParticipants });
      }

      Alert.alert('Pago marcado', 'Has marcado tu pago como completado');
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo marcar el pago');
      console.error('Error marking payment:', error);
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleViewProof = (proofUrl: string, userName: string) => {
    setSelectedProof({ url: proofUrl, userName });
    setShowProofModal(true);
  };

  const handleDeleteProof = async () => {
    if (!userParticipant?.payment_proof_url) return;

    Alert.alert(
      'Eliminar comprobante',
      '¿Estás seguro de que quieres eliminar este comprobante?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingPayment(true);
              
              // Extraer el filePath de la URL para eliminarlo del storage
              const urlParts = userParticipant.payment_proof_url!.split('/');
              const fileName = urlParts[urlParts.length - 1];
              const filePath = `${userParticipant.id}/${fileName}`;
              
              // Eliminar el comprobante usando la función de supabase
              await paymentProofs.deleteProof(userParticipant.id, filePath);
              
                              // Actualizar el estado local
                if (account) {
                  const updatedParticipants = account.participants.map(p =>
                    p.id === userParticipant.id 
                      ? { ...p, payment_proof_url: undefined } 
                      : p
                  );
                  setAccount({ ...account, participants: updatedParticipants });
                }
              
              Alert.alert('Comprobante eliminado', 'El comprobante ha sido eliminado exitosamente');
            } catch (error: any) {
              console.error('Error deleting proof:', error);
              Alert.alert('Error', `No se pudo eliminar el comprobante: ${error.message}`);
            } finally {
              setUpdatingPayment(false);
            }
          }
        }
      ]
    );
  };

  const handleUploadProof = async () => {
    if (!userParticipant) {
      Alert.alert('Error', 'No se encontró tu participación en esta cuenta');
      return;
    }

    try {
      setUpdatingPayment(true);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 2], // Formato extremadamente rectangular tipo screenshot (1:2)
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Subir el comprobante usando la nueva función
        const uploadResult = await paymentProofs.uploadProof({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `proof_${Date.now()}.jpg`
        }, userParticipant.id);

        // Actualizar el estado local con la nueva URL del comprobante
        if (account) {
          const updatedParticipants = account.participants.map(p =>
            p.id === userParticipant.id 
              ? { ...p, payment_proof_url: uploadResult.publicUrl } 
              : p
          );
          setAccount({ ...account, participants: updatedParticipants });
        }

        Alert.alert(
          'Comprobante subido', 
          'El comprobante se ha subido exitosamente. El creador de la cuenta podrá verlo.'
        );
      }
    } catch (error: any) {
      console.error('Error uploading proof:', error);
      Alert.alert('Error', `No se pudo subir el comprobante: ${error.message}`);
    } finally {
      setUpdatingPayment(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando detalles...</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.errorContainer}>
        <Text>No se pudo cargar la cuenta</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.accountName}>{account.name}</Text>
        <Text style={styles.accountAmount}>${formatCurrency(account.total_amount)}</Text>
        
        {account.description && (
          <Text style={styles.accountDescription}>{account.description}</Text>
        )}
        
        <Text style={styles.accountDate}>
          Creada el {new Date(account.created_at).toLocaleDateString()}
        </Text>
        
        {/* Estado de la cuenta */}
        <View style={[
          styles.statusBadge,
          accountStatus === 'paid' && styles.statusBadgePaid,
          accountStatus === 'cancelled' && styles.statusBadgeCancelled,
          accountStatus === 'pending' && styles.statusBadgePending
        ]}>
          <Text style={[
            styles.statusBadgeText,
            accountStatus === 'paid' && styles.statusBadgeTextPaid,
            accountStatus === 'cancelled' && styles.statusBadgeTextCancelled,
            accountStatus === 'pending' && styles.statusBadgeTextPending
          ]}>
            {accountStatus === 'paid' ? 'Pagada' : 
             accountStatus === 'cancelled' ? 'Cancelada' : 'Pendiente'}
          </Text>
        </View>


      </View>

      {isCreator ? (
        // Vista del creador
        <View style={styles.creatorView}>
          <Text style={styles.sectionTitle}>Participantes</Text>
          
          {/* Creador */}
          <View style={styles.participantItem}>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>
                {account.creator.reference} (Tú)
              </Text>
              <Text style={styles.participantAmount}>
                ${formatCurrency(account.participants.find(p => p.user_id === account.created_by)?.amount_owed || 0)}
              </Text>
            </View>
            <View style={styles.paymentStatus}>
              <Text style={styles.statusText}>Creador</Text>
            </View>
          </View>

          {/* Participantes */}
          {account.participants
            .filter(p => p.user_id !== account.created_by)
            .map(participant => (
              <View key={participant.id} style={styles.participantItem}>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {participant.user.full_name || participant.user.reference}
                  </Text>
                  <Text style={styles.participantAmount}>
                    ${formatCurrency(participant.amount_owed)}
                  </Text>
                </View>
                <View style={styles.paymentStatus}>
                  <View style={styles.switchContainer}>
                    <Switch
                      value={participant.has_paid}
                      onValueChange={(value) => handlePaymentToggle(participant.id, value)}
                      disabled={updatingPayment || accountStatus === 'cancelled'}
                    />
                    <Text style={[
                      styles.statusText,
                      participant.has_paid ? styles.paidText : styles.unpaidText
                    ]}>
                      {participant.has_paid ? 'Pagado' : 'Pendiente'}
                    </Text>
                  </View>
                  
                  {/* Icono de comprobante a la derecha */}
                  <TouchableOpacity
                    style={[
                      styles.proofIconButton,
                      (!participant.payment_proof_url || accountStatus === 'cancelled') && styles.proofIconButtonDisabled
                    ]}
                    onPress={() => participant.payment_proof_url && handleViewProof(participant.payment_proof_url, participant.user.full_name || participant.user.reference)}
                    disabled={!participant.payment_proof_url || accountStatus === 'cancelled'}
                  >
                    <Ionicons 
                      name="document-attach" 
                      size={20} 
                      color={participant.payment_proof_url ? Colors.primary : Colors.textLight} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </View>
      ) : (
        // Vista del participante
        <View style={styles.participantView}>
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Tu pago</Text>
            <Text style={styles.yourAmount}>
              ${formatCurrency(userParticipant?.amount_owed || 0)}
            </Text>
            
            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={[
                  styles.markPaidButton,
                  (userParticipant?.has_paid || accountStatus === 'cancelled') && styles.markPaidButtonDisabled
                ]}
                onPress={handleMarkAsPaid}
                disabled={userParticipant?.has_paid || updatingPayment || accountStatus === 'cancelled'}
              >
                <Ionicons 
                  name={userParticipant?.has_paid ? "checkmark-circle" : "checkmark-circle-outline"} 
                  size={20} 
                  color={userParticipant?.has_paid ? "white" : "#007AFF"} 
                />
                <Text style={[
                  styles.markPaidButtonText,
                  userParticipant?.has_paid && styles.markPaidButtonTextDisabled
                ]}>
                  {userParticipant?.has_paid ? 'Ya pagaste' : 'Marcar como pagado'}
                </Text>
              </TouchableOpacity>

              {!userParticipant?.payment_proof_url ? (
                <TouchableOpacity
                  style={[
                    styles.uploadProofButton,
                    accountStatus === 'cancelled' && styles.uploadProofButtonDisabled
                  ]}
                  onPress={handleUploadProof}
                  disabled={accountStatus === 'cancelled'}
                >
                  <Ionicons name="camera-outline" size={20} color="#007AFF" />
                  <Text style={styles.uploadProofButtonText}>Subir comprobante</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.proofActionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.viewOwnProofButton,
                      accountStatus === 'cancelled' && styles.viewOwnProofButtonDisabled
                    ]}
                    onPress={() => handleViewProof(userParticipant.payment_proof_url!, 'Tu comprobante')}
                    disabled={accountStatus === 'cancelled'}
                  >
                    <Ionicons name="document-attach" size={20} color={Colors.primary} />
                    <Text style={styles.viewOwnProofButtonText}>Ver comprobante</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.deleteProofButton,
                      accountStatus === 'cancelled' && styles.deleteProofButtonDisabled
                    ]}
                    onPress={handleDeleteProof}
                    disabled={accountStatus === 'cancelled'}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    <Text style={styles.deleteProofButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {userParticipant?.payment_proof_url && (
              <View style={styles.proofSection}>
                <Text style={styles.proofLabel}>Comprobante subido:</Text>
                <Image
                  source={{ uri: userParticipant.payment_proof_url }}
                  style={styles.proofImage}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total de la cuenta:</Text>
          <Text style={styles.summaryValue}>${formatCurrency(account.total_amount)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>División:</Text>
          <Text style={styles.summaryValue}>
                          {account.split_method === 'equal' ? 'Partes iguales' : 'Personalizada'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total de participantes:</Text>
          <Text style={styles.summaryValue}>{account.participants.length}</Text>
        </View>

        {/* Botón Cancelar cuenta al final del resumen */}
        {isCreator && accountStatus !== 'cancelled' && (
          <View style={styles.cancelButtonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelAccount}
            >
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.cancelButtonText}>Cancelar cuenta</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modal para mostrar el comprobante */}
      {showProofModal && selectedProof && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>
              Comprobante
            </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowProofModal(false);
                  setSelectedProof(null);
                }}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <Image
              source={{ uri: selectedProof.url }}
              style={styles.proofModalImage}
              resizeMode="contain"
            />
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setShowProofModal(false);
                setSelectedProof(null);
              }}
            >
              <Text style={styles.closeModalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    ...Shadows.light,
  },
  accountName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  accountAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  accountDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  accountDate: {
    fontSize: 14,
    color: Colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    ...Shadows.light,
  },
  statusBadgePaid: {
    backgroundColor: Colors.statusPaid,
  },
  statusBadgeCancelled: {
    backgroundColor: Colors.statusCancelled,
  },
  statusBadgePending: {
    backgroundColor: Colors.statusPending,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusBadgeTextPaid: {
    color: Colors.background,
  },
  statusBadgeTextCancelled: {
    color: Colors.background,
  },
  statusBadgeTextPending: {
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  creatorView: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.light,
  },
  participantView: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.light,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  participantAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  switchContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  paidText: {
    color: Colors.success,
  },
  unpaidText: {
    color: Colors.error,
  },

  viewProofText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  viewProofTextDisabled: {
    color: Colors.textLight,
  },

  viewProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: Spacing.sm,
    ...Shadows.light,
  },
  viewProofButtonDisabled: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  proofIconButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    ...Shadows.light,
  },
  proofIconButtonDisabled: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  // Estilos para la modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    margin: Spacing.lg,
    maxWidth: '90%',
    maxHeight: '80%',
    ...Shadows.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  proofModalImage: {
    width: 280,
    height: 350,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignSelf: 'center',
  },
  closeModalButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.medium,
  },
  closeModalButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  paymentSection: {
    alignItems: 'center',
  },
  yourAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  paymentActions: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.lg,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  markPaidButtonDisabled: {
    backgroundColor: Colors.success,
  },
  markPaidButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  markPaidButtonTextDisabled: {
    color: Colors.background,
  },
  uploadProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
    justifyContent: 'center',
    ...Shadows.light,
  },
  uploadProofButtonDisabled: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.textLight,
    opacity: 0.6,
  },
  uploadProofButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  proofActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.sm,
  },
  viewOwnProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    flex: 1,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    ...Shadows.light,
  },
  viewOwnProofButtonDisabled: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.textLight,
    opacity: 0.6,
  },
  viewOwnProofButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  deleteProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    flex: 1,
    marginLeft: Spacing.sm,
    justifyContent: 'center',
    ...Shadows.light,
  },
  deleteProofButtonDisabled: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.textLight,
    opacity: 0.6,
  },
  deleteProofButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  proofSection: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  proofLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  proofImage: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
  },
  summarySection: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.light,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    ...Shadows.medium,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  cancelButtonContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  headerCancelButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

// Hacer CancelButton una propiedad estática del componente
AccountDetailScreen.CancelButton = CancelButton;

export default AccountDetailScreen;
