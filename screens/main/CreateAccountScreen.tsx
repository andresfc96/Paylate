import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Contact, User } from '../../lib/supabase';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/Colors';

interface ContactWithUser extends Contact {
  user: User;
}

export default function CreateAccountScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [selectedContacts, setSelectedContacts] = useState<ContactWithUser[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: string }>({});
  const [participantAmounts, setParticipantAmounts] = useState<number[]>([]);
  const [contacts, setContacts] = useState<ContactWithUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper function to calculate participant amounts
  const calculateParticipantAmounts = (total: number, participantCount: number, splitMethod: string) => {
    if (splitMethod === 'equal') {
      const amountPerPerson = total / (participantCount + 1); // +1 por el creador
      return Array(participantCount).fill(amountPerPerson);
    }
    return []; // Para custom, se llenan desde el estado
  };

  // Update amounts when split method or total changes
  useEffect(() => {
    if (splitMethod === 'equal' && totalAmount && selectedContacts.length > 0) {
      const amounts = calculateParticipantAmounts(parseFloat(totalAmount), selectedContacts.length, splitMethod);
      setParticipantAmounts(amounts);
    } else if (splitMethod === 'equal') {
      setParticipantAmounts([]);
    }
  }, [splitMethod, totalAmount, selectedContacts.length]);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          user:users!contact_user_id(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
    }
  };

  const toggleContactSelection = (contact: ContactWithUser) => {
    const isSelected = selectedContacts.some(c => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
      // Remover el monto personalizado si existe
      const newCustomAmounts = { ...customAmounts };
      delete newCustomAmounts[contact.id];
      setCustomAmounts(newCustomAmounts);
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const updateCustomAmount = (contactId: string, amount: string) => {
    setCustomAmounts({
      ...customAmounts,
      [contactId]: amount,
    });
  };

  const calculateEqualSplit = () => {
    const total = parseFloat(totalAmount) || 0;
    const participantCount = selectedContacts.length + 1; // +1 por el creador
    return total / participantCount;
  };

  const validateCustomAmounts = () => {
    if (splitMethod !== 'custom') return true;
    
    const total = parseFloat(totalAmount) || 0;
    const sum = Object.values(customAmounts).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    
    // Agregar el monto del creador
    const creatorAmount = total - sum;
    
    return Math.abs(sum + creatorAmount - total) < 0.01; // Tolerancia para errores de punto flotante
  };

  const handleCreateAccount = async () => {
    if (!name || !totalAmount || selectedContacts.length === 0) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Usuario no autenticado');

      // Crear la cuenta principal
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name,
          total_amount: parseFloat(totalAmount),
          split_method: splitMethod,
          created_by: user.id,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Cuenta creada exitosamente

      // Crear el participante creador
      const creatorAmount = splitMethod === 'equal' 
        ? parseFloat(totalAmount) / (selectedContacts.length + 1)
        : parseFloat(totalAmount);

      const { data: creatorData, error: creatorError } = await supabase
        .from('account_participants')
        .insert({
          account_id: accountData.id,
          user_id: user.id,
          amount_owed: creatorAmount,
          has_paid: true, // El creador ya pagó al crear la cuenta
        })
        .select()
        .single();

      if (creatorError) throw creatorError;
      // Creador agregado como participante

      // Crear participantes de contactos
      const participants = selectedContacts.map((contact, index) => ({
        account_id: accountData.id,
        user_id: contact.contact_user_id,
        amount_owed: splitMethod === 'equal' 
          ? participantAmounts[index] || 0
          : parseFloat(customAmounts[contact.id] || '0'),
        has_paid: false,
      }));

      // Creando participantes

      // Insertar participantes uno por uno
      for (const participant of participants) {
        const { data: participantData, error: participantError } = await supabase
          .from('account_participants')
          .insert(participant)
          .select()
          .single();

        if (participantError) {
          console.error('Error creando participante:', participant, participantError);
          throw participantError;
        }
        // Participante creado exitosamente
      }

      Alert.alert(
        'Éxito',
        `Cuenta "${name}" creada exitosamente con ${selectedContacts.length + 1} participantes`
      );

      // Limpiar formulario
      setName('');
      setDescription('');
      setTotalAmount('');
      setSelectedContacts([]);
      setParticipantAmounts([]);
      setCustomAmounts({});
      setSplitMethod('equal');

      // Navegar de vuelta
      navigation.goBack();

    } catch (error: any) {
      console.error('Error completo creando cuenta:', error);
      Alert.alert('Error', `No se pudo crear la cuenta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Información de la cuenta</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Nombre de la cuenta *"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Descripción (opcional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <TextInput
            style={styles.input}
            placeholder="Total de la cuenta *"
            value={totalAmount}
            onChangeText={setTotalAmount}
            keyboardType="numeric"
          />

          <View style={styles.splitMethodContainer}>
            <Text style={styles.splitMethodLabel}>División:</Text>
            <View style={styles.splitMethodToggle}>
              <Text style={styles.toggleLabel}>Partes iguales</Text>
              <Switch
                value={splitMethod === 'equal'}
                onValueChange={(value) => setSplitMethod(value ? 'equal' : 'custom')}
              />
            </View>
          </View>

          {splitMethod === 'equal' && selectedContacts.length > 0 && (
            <View style={styles.equalSplitInfo}>
              <Text style={styles.equalSplitText}>
                Monto por persona: ${calculateEqualSplit().toFixed(2)}
              </Text>
              <Text style={styles.equalSplitSubtext}>
                Total: ${totalAmount} ÷ {selectedContacts.length + 1} personas
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Seleccionar contactos</Text>
          
          {contacts.length === 0 ? (
            <View style={styles.emptyContacts}>
              <Ionicons name="people-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyContactsText}>
                No tienes contactos agregados
              </Text>
              <TouchableOpacity
                style={styles.addContactsButton}
                onPress={() => navigation.navigate('Contacts')}
              >
                <Text style={styles.addContactsButtonText}>Agregar contactos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            contacts.map(contact => (
              <TouchableOpacity
                key={contact.id}
                style={[
                  styles.contactItem,
                  selectedContacts.some(c => c.id === contact.id) && styles.contactItemSelected
                ]}
                onPress={() => toggleContactSelection(contact)}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.user.reference}</Text>
                  <Text style={styles.contactEmail}>{contact.user.email}</Text>
                  {selectedContacts.some(c => c.id === contact.id) && splitMethod === 'equal' && totalAmount && (
                    <Text style={styles.contactAmount}>
                      Debe: ${(parseFloat(totalAmount) / (selectedContacts.length + 1)).toFixed(2)}
                    </Text>
                  )}
                </View>
                
                {selectedContacts.some(c => c.id === contact.id) && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))
          )}

          {splitMethod === 'custom' && selectedContacts.length > 0 && (
            <View style={styles.customAmountsSection}>
              <Text style={styles.sectionTitle}>Personalizada</Text>
              {selectedContacts.map(contact => (
                <View key={contact.id} style={styles.customAmountItem}>
                  <Text style={styles.contactName}>{contact.user.reference}</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Monto"
                    value={customAmounts[contact.id] || ''}
                    onChangeText={(text) => updateCustomAmount(contact.id, text)}
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateAccount}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: 16,
    backgroundColor: Colors.inputBackground,
    color: Colors.text,
    ...Shadows.light,
  },
  splitMethodContainer: {
    marginBottom: Spacing.lg,
  },
  splitMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  splitMethodToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  equalSplitInfo: {
    backgroundColor: Colors.accentLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    ...Shadows.light,
  },
  equalSplitText: {
    fontSize: 16,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '700',
  },
  equalSplitSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  contactItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.accentLight,
    ...Shadows.medium,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  contactEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  contactAmount: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  emptyContacts: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    marginVertical: Spacing.lg,
    ...Shadows.light,
  },
  emptyContactsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  addContactsButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.medium,
  },
  addContactsButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  customAmountsSection: {
    marginTop: Spacing.lg,
  },
  customAmountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    width: 100,
    textAlign: 'center',
    backgroundColor: Colors.inputBackground,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
    ...Shadows.medium,
  },
  createButtonDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  createButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
