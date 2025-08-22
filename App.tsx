import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  const { setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Configurar el listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          try {
            // Obtener información adicional del usuario
            const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error) throw error;

            setUser(userData);
            setSession(session);
          } catch (error) {
            console.error('Error fetching user data:', error);
            // Si no se puede obtener la información del usuario, usar solo la sesión
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              reference: '',
              created_at: session.user.created_at || new Date().toISOString(),
            });
            setSession(session);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
        
        setLoading(false);
      }
    );

    // Verificar si ya hay una sesión activa
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;

          setUser(userData);
          setSession(session);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
