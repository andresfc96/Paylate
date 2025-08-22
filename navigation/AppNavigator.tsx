import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors, Shadows, BorderRadius } from '../constants/Colors';

// Pantallas de autenticación
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Pantallas principales
import AccountsScreen from '../screens/main/AccountsScreen';
import CreateAccountScreen from '../screens/main/CreateAccountScreen';
import AccountDetailScreen from '../screens/main/AccountDetailScreen';
import ContactsScreen from '../screens/main/ContactsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';


// Iconos
import { Ionicons } from '@expo/vector-icons';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navegador principal con tabs
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'wallet-outline';

          if (route.name === 'Accounts') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Contacts') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTintColor: Colors.background,
        headerTitleStyle: styles.headerTitle,
      })}
    >
      <Tab.Screen 
        name="Accounts" 
        component={AccountsScreen}
        options={{ title: 'Cuentas' }}
      />
      <Tab.Screen 
        name="Contacts" 
        component={ContactsScreen}
        options={{ title: 'Contactos' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

// Navegador principal de la aplicación
export default function AppNavigator() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Usuario autenticado
          <>
            <Stack.Screen name="Cuentas" component={MainTabNavigator} />
            <Stack.Screen 
              name="CreateAccount" 
              component={CreateAccountScreen}
              options={{ 
                headerShown: true, 
                title: 'Crear Nueva Cuenta',
                presentation: 'modal',
                headerStyle: styles.modalHeader,
                headerTintColor: Colors.background,
                headerTitleStyle: styles.headerTitle,
              }}
            />
            <Stack.Screen 
              name="AccountDetail" 
              component={AccountDetailScreen}
              options={{ 
                headerShown: true, 
                title: 'Detalle de Cuenta',
                headerStyle: styles.header,
                headerTintColor: Colors.background,
                headerTitleStyle: styles.headerTitle,
              }}
            />

          </>
        ) : (
          // Usuario no autenticado
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  tabBar: {
    backgroundColor: Colors.tabBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 84,
    paddingBottom: 20,
    paddingTop: 8,
    ...Shadows.light,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  header: {
    backgroundColor: Colors.primary,
    borderBottomWidth: 0,
    ...Shadows.medium,
  },
  modalHeader: {
    backgroundColor: Colors.primary,
    borderBottomWidth: 0,
    ...Shadows.medium,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
  },
});
