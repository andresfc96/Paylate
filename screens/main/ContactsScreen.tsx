import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useInvitationsStore } from '../../store/invitationsStore';
import { Contact, User, ContactInvitation } from '../../lib/supabase';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/Colors';

interface ContactWithUser extends Contact {
  user: User;
}

export default function ContactsScreen({ navigation }: any) {
  const { user, contacts, refreshContacts } = useAuthStore();
  const { 
    sentInvitations, 
    receivedInvitations, 
    refreshInvitations,
    cancelInvitation,
    acceptInvitation,
    rejectInvitation
  } = useInvitationsStore();
  
  const [searchReference, setSearchReference] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Función para formatear la referencia de búsqueda (misma lógica que RegisterScreen)
  const formatSearchReference = (input: string) => {
    // Remover todos los @ del input
    let cleanInput = input.replace(/@/g, '');
    
    // Remover caracteres no alfanuméricos
    cleanInput = cleanInput.replace(/[^a-zA-Z0-9]/g, '');
    
    // Limitar a 20 caracteres
    cleanInput = cleanInput.substring(0, 20);
    
    // Agregar @ al inicio
    return cleanInput ? `@${cleanInput}` : '';
  };

  useEffect(() => {
    if (user) {
      fetchContacts();
      refreshInvitations(user.id);
    }
  }, [user]);

  // Sincronizar invitaciones cuando cambien
  useEffect(() => {
    if (user && (sentInvitations.length > 0 || receivedInvitations.length > 0)) {
      // Refrescar invitaciones cada 5 segundos si hay alguna
      const interval = setInterval(() => {
        refreshInvitations(user.id);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [user, sentInvitations.length, receivedInvitations.length]);

  // Sincronización automática de contactos
  useEffect(() => {
    if (user) {
      // Refrescar contactos cada 10 segundos para mantener sincronización
      const interval = setInterval(() => {
        refreshContacts();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchContacts = async () => {
    if (!user) return;
    await refreshContacts();
  };

  const searchUserByReference = async () => {
    if (!searchReference.trim()) {
      setSearchResults([]);
      return;
    }

    // Formatear la referencia de búsqueda automáticamente
    const formattedReference = formatSearchReference(searchReference);
    
    if (!formattedReference) {
      Alert.alert('Error', 'La referencia debe contener solo letras y números');
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('reference', formattedReference)
        .neq('id', user!.id); // No buscar el usuario actual

      if (error) throw error;

      // Filtrar usuarios que ya son contactos
      const filteredResults = (data || []).filter(
        result => !contacts.some(contact => contact.contact_user_id === result.id)
      );

      setSearchResults(filteredResults);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo buscar el usuario');
      console.error('Error searching user:', error);
    } finally {
      setSearching(false);
    }
  };

  const addContact = async (contactUser: User) => {
    try {
      // Crear una invitación pendiente en lugar de agregar directamente
      const { error } = await supabase
        .from('contact_invitations')
        .insert([
          {
            from_user_id: user!.id,
            to_user_id: contactUser.id,
            status: 'pending',
          },
        ]);

      if (error) throw error;

      // Refrescar invitaciones inmediatamente para mostrar la solicitud enviada
      await refreshInvitations(user!.id);

      // Limpiar resultados de búsqueda
      setSearchResults([]);
      setSearchReference('');

      Alert.alert(
        'Invitación enviada', 
        `Se ha enviado una invitación a ${contactUser.reference}. El contacto aparecerá en tu lista cuando acepte la invitación.`
      );
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo enviar la invitación');
      console.error('Error sending invitation:', error);
    }
  };

  const removeContact = async (contactId: string) => {
    Alert.alert(
      'Eliminar contacto',
      '¿Estás seguro de que quieres eliminar este contacto?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Obtener la información del contacto antes de eliminarlo
              const { data: contactToDelete, error: fetchError } = await supabase
                .from('contacts')
                .select('*')
                .eq('id', contactId)
                .single();

              if (fetchError) throw fetchError;

              // 2. Eliminar el contacto actual
              const { error: deleteError } = await supabase
                .from('contacts')
                .delete()
                .eq('id', contactId);

              if (deleteError) throw deleteError;

              // 3. Eliminar el contacto recíproco (el otro usuario)
              const { error: reciprocalError } = await supabase
                .from('contacts')
                .delete()
                .eq('user_id', contactToDelete.contact_user_id)
                .eq('contact_user_id', user!.id);

              if (reciprocalError) {
                console.warn('Warning: Could not delete reciprocal contact:', reciprocalError);
                // No lanzamos error aquí porque el contacto principal sí se eliminó
              }

              // 4. Refrescar la lista de contactos
              await refreshContacts();
              
              Alert.alert('Contacto eliminado', 'El contacto ha sido eliminado de ambas cuentas');
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo eliminar el contacto');
              console.error('Error removing contact:', error);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await Promise.all([
        fetchContacts(),
        refreshInvitations(user.id)
      ]);
    }
    setRefreshing(false);
  };

  const renderContactItem = ({ item }: { item: any }) => {
    // El store trae la información del contacto en contact_user
    const contactUser = item.contact_user;
    
    return (
      <View style={styles.contactItem}>
        <View style={styles.contactInfo}>
          <Text style={styles.contactReference}>
            {contactUser?.reference || 'Usuario'}
          </Text>
          <Text style={styles.contactEmail}>
            {contactUser?.email || 'No disponible'}
          </Text>
          <Text style={styles.contactDate}>
            Agregado el {new Date(item.added_at).toLocaleDateString()}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeContact(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchResult = ({ item }: { item: User }) => (
    <View style={styles.searchResultItem}>
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultReference}>{item.reference}</Text>
        <Text style={styles.searchResultEmail}>{item.email}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addContact(item)}
      >
        <Ionicons name="add-circle-outline" size={24} color="#1E3A8A" />
      </TouchableOpacity>
    </View>
  );

  const renderInvitationItem = ({ item }: { item: ContactInvitation }) => {
    if (!item.from_user) return null;
    
    return (
      <View style={styles.invitationItem}>
        <View style={styles.invitationInfo}>
          <Text style={styles.invitationReference}>
            {item.from_user.reference}
          </Text>
          <Text style={styles.invitationEmail}>
            {item.from_user.email}
          </Text>
          <Text style={styles.invitationStatus}>
            Invitación recibida
          </Text>
        </View>
        
        <View style={styles.invitationActions}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptInvitation(item)}
          >
            <Ionicons name="checkmark" size={20} color={Colors.background} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleRejectInvitation(item)}
          >
            <Ionicons name="close" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
        

      </View>
    );
  };

  const renderSentInvitationItem = ({ item }: { item: ContactInvitation }) => {
    if (!item.to_user) return null;
    
    return (
      <View style={styles.sentInvitationItem}>
        <View style={styles.invitationInfo}>
          <Text style={styles.invitationReference}>
            {item.to_user.reference}
          </Text>
          <Text style={styles.invitationEmail}>
            {item.to_user.email}
          </Text>
          <Text style={styles.invitationStatus}>
            Esperando respuesta
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.cancelInvitationButton}
          onPress={() => {
            Alert.alert(
              'Cancelar Solicitud',
              `¿Estás seguro de que quieres cancelar la solicitud a ${item.to_user?.reference}?`,
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Sí, cancelar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Cancelando invitación
                      await cancelInvitation(item.id);
                      
                      // Refrescar invitaciones después de cancelar
                      await refreshInvitations(user!.id);
                      
                      Alert.alert('Solicitud cancelada');
                    } catch (error: any) {
                      console.error('Error cancelando invitación:', error);
                      Alert.alert('Error', `No se pudo cancelar la solicitud: ${error.message}`);
                    }
                  }
                }
              ]
            );
          }}
        >
          <Ionicons name="close-circle" size={20} color={Colors.background} />
          <Text style={styles.cancelInvitationText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
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
              // 1. Aceptar la invitación
              await acceptInvitation(invitation.id);
              
              // 2. Crear el contacto en la tabla contacts para el usuario actual
              const { error: contactError } = await supabase
                .from('contacts')
                .insert({
                  user_id: user!.id,
                  contact_user_id: invitation.from_user_id
                });

              if (contactError) throw contactError;

              // 3. Crear el contacto recíproco para el otro usuario
              const { error: reciprocalError } = await supabase
                .from('contacts')
                .insert({
                  user_id: invitation.from_user_id,
                  contact_user_id: user!.id
                });

              if (reciprocalError) throw reciprocalError;

              // 4. Refrescar contactos e invitaciones
              await Promise.all([
                refreshContacts(),
                refreshInvitations(user!.id)
              ]);
              
              Alert.alert('Éxito', 'Contacto agregado correctamente');
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo aceptar la invitación: ' + error.message);
              console.error('Error accepting invitation:', error);
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
              
              // Refrescar invitaciones
              await refreshInvitations(user!.id);
              
              Alert.alert('Invitación rechazada');
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo rechazar la invitación');
              console.error('Error rejecting invitation:', error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando contactos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {/* Búsqueda de usuarios */}
        <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Agregar nuevo contacto</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por referencia (ej: juanperez)"
            value={searchReference}
            onChangeText={(text) => setSearchReference(formatSearchReference(text))}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={21} // @ + 20 caracteres
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchUserByReference}
            disabled={searching}
          >
            <Ionicons 
              name="search" 
              size={20} 
              color={searching ? "#ccc" : "white"} 
            />
          </TouchableOpacity>
        </View>

        {/* Información de búsqueda */}
        {searchReference && (
          <View style={styles.searchInfo}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
            <Text style={styles.searchInfoText}>
              Buscando: {searchReference}
            </Text>
          </View>
        )}

        {/* Resultados de búsqueda */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <Text style={styles.searchResultsTitle}>Resultados de búsqueda:</Text>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>
        )}

        {searching && (
          <View style={styles.searchingContainer}>
            <Text style={styles.searchingText}>Buscando...</Text>
          </View>
        )}
      </View>

      {/* Invitaciones recibidas - Solo cuando hay invitaciones */}
      {receivedInvitations.length > 0 && (
        <View style={styles.invitationsSection}>
          <Text style={styles.sectionTitle}>
            Invitaciones recibidas ({receivedInvitations.length})
          </Text>
          <FlatList
            data={receivedInvitations}
            renderItem={renderInvitationItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Solicitudes enviadas - Solo cuando hay solicitudes */}
      {sentInvitations.length > 0 && (
        <View style={styles.invitationsSection}>
          <Text style={styles.sectionTitle}>
            Solicitudes pendientes ({sentInvitations.length})
          </Text>
          <FlatList
            data={sentInvitations}
            renderItem={renderSentInvitationItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Lista de contactos */}
      <View style={styles.contactsSection}>
        <Text style={styles.sectionTitle}>
          Mis contactos ({contacts.length})
        </Text>
        
        {contacts.length > 0 ? (
          <FlatList
            data={contacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyContacts}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={56} color="#E5E7EB" />
            </View>
            <Text style={styles.emptyContactsTitle}>
              No tienes contactos agregados
            </Text>
            <Text style={styles.emptyContactsSubtext}>
              Busca usuarios por su referencia para enviarles invitaciones
            </Text>
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  searchSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginRight: 12,
    backgroundColor: '#F9FAFB',
  },
  searchButton: {
    backgroundColor: '#1E3A8A',
    padding: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  searchResults: {
    marginTop: 15,
  },
  searchResultsTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '600',
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultReference: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  searchResultEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  addButton: {
    padding: 8,
  },
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  searchingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  searchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.sm,
  },
  searchInfoText: {
    fontSize: 14,
    color: Colors.info,
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  invitationsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  invitationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  invitationInfo: {
    flex: 1,
  },
  invitationReference: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  invitationEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  invitationStatus: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '600',
    marginTop: 4,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: Colors.primary, // AZUL para aceptar
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: Colors.background, // BLANCO para rechazar
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pendingStatus: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
  contactsSection: {
    flex: 1,
    marginHorizontal: 20,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    ...Shadows.light,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactInfo: {
    flex: 1,
  },
  contactReference: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  contactEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  contactDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontWeight: '500',
  },
  removeButton: {
    padding: 10,
  },
  emptyContacts: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 20,
    ...Shadows.light,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyContactsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyContactsSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  sentInvitationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.light,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelInvitationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary, // Cambiado a azul
    borderWidth: 1,
    borderColor: Colors.primary, // Cambiado a azul
  },
  cancelInvitationText: {
    color: Colors.background, // Cambiado a blanco para contraste
    fontSize: 14,
    fontWeight: '600',
  },

});
