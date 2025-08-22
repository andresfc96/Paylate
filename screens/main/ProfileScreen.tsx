import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Clipboard,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { User } from '../../lib/supabase';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/Colors';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, updateUser } = useAuthStore();
  const [copyingReference, setCopyingReference] = useState(false);
  
  // Estados para edición inline
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    full_name: '',
    birth_date: '',
    gender: 'prefer_not_to_say',
    gender_other: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const copyReference = async () => {
    if (!user?.reference) return;
    
    setCopyingReference(true);
    try {
      await Clipboard.setString(user.reference);
      Alert.alert('Copiado', 'Referencia copiada al portapapeles');
    } catch (error) {
      Alert.alert('Error', 'No se pudo copiar la referencia');
    } finally {
      setCopyingReference(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              logout();
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };



  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'Masculino';
      case 'female': return 'Femenino';
      case 'non_binary': return 'No binario';
      case 'other': return 'Otro';
      default: return 'No especificado';
    }
  };

  const getDisplayName = () => {
    if (user?.full_name) {
      return user.full_name;
    }
    return user?.reference || 'Usuario';
  };

  // Funciones para edición inline
  const startEditing = (field: string) => {
    setEditingField(field);
    setEditValues({
      full_name: user?.full_name || '',
      birth_date: user?.birth_date || '',
      gender: user?.gender || 'prefer_not_to_say',
      gender_other: user?.gender_other || '',
    });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValues({
      full_name: '',
      birth_date: '',
      gender: 'prefer_not_to_say',
      gender_other: '',
    });
  };

  const saveField = async (field: string) => {
    if (!user) return;

    setLoading(true);
    try {
      let updateData: any = {};
      
      switch (field) {
        case 'full_name':
          updateData.full_name = editValues.full_name.trim() || null;
          break;
        case 'birth_date':
          updateData.birth_date = editValues.birth_date || null;
          break;
        case 'gender':
          updateData.gender = editValues.gender === 'prefer_not_to_say' ? null : editValues.gender;
          updateData.gender_other = editValues.gender === 'other' ? editValues.gender_other.trim() || null : null;
          break;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const updatedUser: User = {
          ...user,
          ...data,
        };
        
        updateUser(updatedUser);
        setEditingField(null);
        Alert.alert('Éxito', 'Campo actualizado correctamente');
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo actualizar el campo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setEditValues(prev => ({
        ...prev,
        birth_date: selectedDate.toISOString().split('T')[0]
      }));
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const renderEditableField = (field: string, label: string, icon: string, currentValue: string, type: 'text' | 'date' | 'gender') => {
    const isEditing = editingField === field;
    
    if (isEditing) {
      return (
        <View style={styles.editingCard}>
          <View style={styles.editingHeader}>
            <View style={styles.infoIcon}>
              <Ionicons name={icon as any} size={20} color="#1E3A8A" />
            </View>
            <Text style={styles.editingLabel}>{label}</Text>
          </View>
          
          {type === 'text' && (
            <TextInput
              style={styles.editInput}
              value={editValues[field as keyof typeof editValues] as string}
              onChangeText={(text) => setEditValues(prev => ({ ...prev, [field]: text }))}
              placeholder={`Ingresa tu ${label.toLowerCase()}`}
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
          )}
          
          {type === 'date' && (
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {editValues.birth_date ? formatDate(editValues.birth_date) : 'Seleccionar fecha'}
              </Text>
              <Ionicons name="calendar" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
          
          {type === 'gender' && (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={editValues.gender}
                onValueChange={(value) => setEditValues(prev => ({ ...prev, gender: value }))}
                style={styles.picker}
                mode="dropdown"
                dropdownIconColor="#6B7280"
                dropdownIconRippleColor="#F3F4F6"
              >
                <Picker.Item label="Prefiero no decir" value="prefer_not_to_say" color="#111827" />
                <Picker.Item label="Masculino" value="male" color="#111827" />
                <Picker.Item label="Femenino" value="female" color="#111827" />
                <Picker.Item label="No binario" value="non_binary" color="#111827" />
                <Picker.Item label="Otro" value="other" color="#111827" />
              </Picker>
            </View>
          )}
          
          {type === 'gender' && editValues.gender === 'other' && (
            <TextInput
              style={styles.editInput}
              value={editValues.gender_other}
              onChangeText={(text) => setEditValues(prev => ({ ...prev, gender_other: text }))}
              placeholder="Especifica tu género"
              placeholderTextColor="#9CA3AF"
            />
          )}
          
          <View style={styles.editingActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={cancelEditing}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={() => saveField(field)}
              disabled={loading}
            >
              <Text style={[styles.saveButtonText, loading && styles.saveButtonTextDisabled]}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name={icon as any} size={20} color="#1E3A8A" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>
              {currentValue || 'No configurado'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => startEditing(field)}
          >
            <Ionicons name="pencil" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header del perfil */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#1E3A8A" />
            </View>
          </View>
          <Text style={styles.userName}>{getDisplayName()}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Información del perfil */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="at" size={20} color="#1E3A8A" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Referencia</Text>
                <Text style={styles.infoValue}>{user?.reference}</Text>
              </View>
              <TouchableOpacity
                style={[styles.copyButton, copyingReference && styles.copyButtonDisabled]}
                onPress={copyReference}
                disabled={copyingReference}
              >
                <Ionicons 
                  name={copyingReference ? "checkmark" : "copy-outline"} 
                  size={20} 
                  color={copyingReference ? "white" : "#1E3A8A"} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail" size={20} color="#1E3A8A" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Correo electrónico</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar" size={20} color="#1E3A8A" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Fecha de registro</Text>
                <Text style={styles.infoValue}>
                  {user?.created_at ? formatDate(user.created_at) : 'No disponible'}
                </Text>
              </View>
            </View>
          </View>

          {/* Campos editables */}
          {renderEditableField(
            'full_name',
            'Nombre completo',
            'person',
            user?.full_name || '',
            'text'
          )}

          {renderEditableField(
            'birth_date',
            'Fecha de nacimiento',
            'calendar',
            user?.birth_date 
              ? formatDate(user.birth_date)
              : '',
            'date'
          )}

          {renderEditableField(
            'gender',
            'Género',
            'male-female',
            user?.gender 
              ? user.gender === 'other' && user.gender_other
                ? user.gender_other
                : getGenderLabel(user.gender)
              : '',
            'gender'
          )}
        </View>



        {/* Botón de cerrar sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Espacio al final */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerButton}
                >
                  <Text style={[styles.datePickerButtonText, styles.datePickerButtonDone]}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={editValues.birth_date ? new Date(editValues.birth_date) : new Date()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                style={styles.datePicker}
              />
            </View>
          </View>
        ) : (
          <DateTimePicker
            value={editValues.birth_date ? new Date(editValues.birth_date) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.light,
  },
  avatarContainer: {
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    ...Shadows.medium,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  profileSection: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  infoCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.light,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  copyButtonDisabled: {
    backgroundColor: Colors.success,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  // Estilos para edición inline
  editingCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.medium,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  editingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  editInput: {
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  dateButton: {
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  pickerContainer: {
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    paddingHorizontal: Platform.OS === 'ios' ? Spacing.md : 0,
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
    color: Colors.text,
    backgroundColor: 'transparent',
  },
  editingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  cancelButton: {
    backgroundColor: Colors.buttonSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  cancelButtonText: {
    color: Colors.buttonSecondaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.buttonPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: Colors.buttonDisabledText,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.light,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '600',
    marginLeft: Spacing.md,
  },
  bottomSpacing: {
    height: Spacing.xxl,
  },
  // Estilos para DatePicker mejorado
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xxl,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  datePickerButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  datePickerButtonDone: {
    color: Colors.primary,
    fontWeight: '600',
  },
  datePicker: {
    backgroundColor: Colors.background,
    height: 200,
  },
});
