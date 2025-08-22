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
import { useAuthStore } from '../../store/authStore';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/Colors';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, setSession } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Obtener información adicional del usuario
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) throw userError;

        setUser(userData);
        setSession(data.session);
      }
    } catch (error: any) {
      Alert.alert('Error de inicio de sesión', error.message);
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
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="wallet" size={32} color={Colors.background} />
            </View>
          </View>
          <Text style={styles.title}>Paylate</Text>
          <Text style={styles.subtitle}>Gestiona tus cuentas compartidas con elegancia</Text>
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.buttonLoading}>
                <Ionicons name="refresh" size={20} color={Colors.background} style={styles.loadingIcon} />
                <Text style={styles.buttonText}>Iniciando sesión...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={Colors.background} />
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              ¿No tienes cuenta? <Text style={styles.linkTextBold}>Regístrate aquí</Text>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
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
    fontSize: 36,
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
    maxWidth: 280,
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
  button: {
    backgroundColor: Colors.buttonPrimary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
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
