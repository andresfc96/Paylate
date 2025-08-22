import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/Colors';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const validateReference = (ref: string) => {
    // La referencia debe empezar con @ y contener solo letras, números y guiones bajos
    const referenceRegex = /^@[a-zA-Z0-9]+$/;
    return referenceRegex.test(ref);
  };

  const formatReference = (input: string) => {
    // Remover todos los @ del input
    let cleanInput = input.replace(/@/g, '');
    
    // Remover caracteres no alfanuméricos
    cleanInput = cleanInput.replace(/[^a-zA-Z0-9]/g, '');
    
    // Limitar a 20 caracteres
    cleanInput = cleanInput.substring(0, 20);
    
    // Agregar @ al inicio
    return cleanInput ? `@${cleanInput}` : '';
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !reference) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!validateReference(reference)) {
      Alert.alert('Error', 'La referencia debe contener solo letras y números (máximo 20 caracteres)');
      return;
    }

    setLoading(true);
    try {
      // Crear el usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Crear el registro en la tabla users
        const { error: userError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: email,
              reference: reference,
            },
          ]);

        if (userError) throw userError;

        Alert.alert(
          'Registro exitoso',
          'Se ha enviado un email de verificación. Por favor verifica tu cuenta antes de iniciar sesión.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error de registro', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header con logo elegante */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="person-add" size={32} color={Colors.background} />
            </View>
          </View>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete a Paylate y comienza a gestionar tus gastos</Text>
        </View>

        {/* Formulario mejorado */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor={Colors.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Ionicons name="at-outline" size={20} color={Colors.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Referencia única (ej: juanperez)"
              placeholderTextColor={Colors.inputPlaceholder}
              value={reference}
              onChangeText={(text) => setReference(formatReference(text))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={21} // @ + 20 caracteres
            />
          </View>
          
          {/* Información de la referencia */}
          {reference && (
            <View style={styles.referenceInfo}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
              <Text style={styles.referenceInfoText}>
                Tu referencia será: {reference}
              </Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={Colors.inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor={Colors.inputPlaceholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Información de validación */}
          <View style={styles.validationInfo}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
            <Text style={styles.validationText}>
              La contraseña debe tener al menos 6 caracteres
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.buttonLoading}>
                <Ionicons name="refresh" size={20} color={Colors.background} style={styles.loadingIcon} />
                <Text style={styles.buttonText}>Creando cuenta...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color={Colors.background} />
                <Text style={styles.buttonText}>Crear Cuenta</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>
              ¿Ya tienes cuenta? <Text style={styles.linkTextBold}>Inicia sesión aquí</Text>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  form: {
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  validationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  referenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.accentLight,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  referenceInfoText: {
    fontSize: 14,
    color: Colors.success,
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  validationText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: Spacing.sm,
    lineHeight: 16,
  },
  button: {
    backgroundColor: Colors.buttonPrimary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.light,
  },
  buttonDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIcon: {
    marginRight: Spacing.sm,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  linkTextBold: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
