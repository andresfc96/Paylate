import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Account, AccountParticipant, User } from '../../lib/supabase';
import { Colors, Spacing } from '../../constants/Colors';

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
  status?: 'pending' | 'paid' | 'cancelled' | 'deleted';
}

export default function AccountsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [createdAccounts, setCreatedAccounts] = useState<AccountWithParticipants[]>([]);
  const [participatedAccounts, setParticipatedAccounts] = useState<AccountWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Referencias para controlar los Swipeables
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  
  // Función para cerrar todos los swipeables
  const closeAllSwipeables = () => {
    Object.values(swipeableRefs.current).forEach(ref => {
      if (ref) {
        ref.close();
      }
    });
  };

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      // Obtener cuentas creadas por el usuario (excluir eliminadas)
      const { data: createdData, error: createdError } = await supabase
        .from('accounts')
        .select(`
          *,
          participants:account_participants(
            *,
            user:users(*)
          ),
          creator:users(*)
        `)
        .eq('created_by', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      // Obtener cuentas donde el usuario participa (excluir eliminadas)
      const { data: participatedData, error: participatedError } = await supabase
        .from('account_participants')
        .select(`
          *,
          account:accounts(
            *,
            participants:account_participants(
              *,
              user:users(*)
            ),
            creator:users(*)
          )
        `)
        .eq('user_id', user.id)
        .neq('account.status', 'deleted')
        .order('created_at', { ascending: false });

      // Solo mostrar errores en consola para desarrollo, no al usuario
      if (createdError) {
        console.error('Error fetching created accounts:', createdError);
      }
      if (participatedError) {
        console.error('Error fetching participated accounts:', participatedError);
      }

      setCreatedAccounts(createdData || []);
      setParticipatedAccounts(
        (participatedData || [])
          .map((p) => p.account)
          .filter(Boolean)
          .filter(account => account.created_by !== user.id) // Filtrar cuentas donde el usuario es creador
      );
    } catch (error: any) {
      // Solo log en consola, no mostrar alerta al usuario
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  // Sincronización automática de cuentas
  useEffect(() => {
    if (!user) return;

    // Refrescar cuentas cada 10 segundos
    const accountsInterval = setInterval(() => {
      fetchAccounts();
    }, 10000);

    return () => {
      clearInterval(accountsInterval);
    };
  }, [user]);

  // Cerrar swipeables y refrescar cuentas cuando cambie de pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      closeAllSwipeables();
      fetchAccounts(); // Refrescar cuentas al volver a la pantalla
    });
    
    const unsubscribeBlur = navigation.addListener('blur', () => {
      closeAllSwipeables();
    });

    return () => {
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  const onRefresh = async () => {
    closeAllSwipeables(); // Cerrar swipeables al refrescar
    setRefreshing(true);
    await fetchAccounts();
    setRefreshing(false);
  };

  const handleDeleteAccount = async (accountId: string) => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro de que quieres eliminar esta cuenta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('accounts')
                .update({ status: 'deleted' })
                .eq('id', accountId);
              
              if (error) throw error;
              
              // Refrescar la lista
              await fetchAccounts();
              Alert.alert('Éxito', 'Cuenta eliminada correctamente');
            } catch (error: any) {
              Alert.alert('Error', `No se pudo eliminar: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const renderAccountItem = ({ item }: { item: AccountWithParticipants }) => {
    // Calcular estado de la cuenta automáticamente
    const accountStatus = item.status === 'cancelled' ? 'cancelled' : 
      item.participants.filter(p => p.has_paid).length === item.participants.length ? 'paid' : 'pending';
    
    // Contador de pagos
    const paidCount = item.participants.filter(p => p.has_paid).length;
    const totalCount = item.participants.length;
    
    const renderRightActions = () => (
      <View style={styles.deleteContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteAccount(item.id)}
        >
          <Ionicons name="trash" size={20} color="white" />
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current[item.id] = ref;
          }
        }}
        renderRightActions={renderRightActions}
        rightThreshold={20}
        overshootRight={false}
        friction={2}
        onSwipeableOpen={() => {
          // Cerrar otros swipeables cuando este se abra
          Object.entries(swipeableRefs.current).forEach(([id, ref]) => {
            if (id !== item.id && ref) {
              ref.close();
            }
          });
        }}
      >
        <TouchableOpacity
          style={styles.accountItem}
          onPress={() => {
            closeAllSwipeables();
            navigation.navigate('AccountDetail', { accountId: item.id });
          }}
        >
        <View style={styles.accountHeader}>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{item.name}</Text>
            
            <View style={styles.accountMeta}>
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
              
              <Text style={styles.accountDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.accountSummary}>
            <Text style={styles.accountAmount}>${formatCurrency(item.total_amount)}</Text>
            <Text style={styles.participantsCount}>
              {totalCount} participantes
            </Text>
            <Text style={styles.paymentStatus}>
              {paidCount}/{totalCount} han pagado
            </Text>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.accountDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderSection = (
    title: string, 
    accounts: AccountWithParticipants[], 
    emptyMessage: string,
    iconName: keyof typeof Ionicons.glyphMap,
    subtitle: string
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {accounts.length > 0 ? (
        <FlatList
          data={accounts}
          renderItem={renderAccountItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name={iconName} size={56} color="#E5E7EB" />
          </View>
          <Text style={styles.emptyTitle}>{emptyMessage}</Text>
          <Text style={styles.emptySubtitle}>{subtitle}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando cuentas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={styles.content}>
            {renderSection(
              'Mis Cuentas',
              createdAccounts,
              'No hay cuentas creadas',
              'wallet-outline',
              'Crea tu primera cuenta compartida'
            )}
            {renderSection(
              'Cuentas por pagar',
              participatedAccounts,
              'No participas en ninguna cuenta',
              'people-outline',
              'Te invitarán a cuentas cuando las creen'
            )}
          </View>
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1E3A8A']}
            tintColor="#1E3A8A"
          />
        }
        onScrollBeginDrag={closeAllSwipeables}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {/* Botón flotante moderno */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          closeAllSwipeables();
          navigation.navigate('CreateAccount');
        }}
        activeOpacity={0.8}
      >
        <View style={styles.fabContent}>
          <Ionicons name="add" size={28} color="white" />
        </View>
        <View style={styles.fabShadow} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  content: {
    paddingTop: 20,
  },
  listContainer: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  accountItem: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
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
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  accountInfo: {
    flex: 1,
    marginRight: 16,
  },
  accountMeta: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  accountSummary: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
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
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusBadgeTextPaid: {
    color: 'white',
  },
  statusBadgeTextCancelled: {
    color: 'white',
  },
  statusBadgeTextPending: {
    color: 'black',
  },
  paymentStatus: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
    marginTop: 4,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  accountAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  accountDescription: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  accountFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountDate: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  participantsCount: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    marginHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabContent: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabShadow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(30, 58, 138, 0.1)',
  },
  deleteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    paddingRight: 16,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
