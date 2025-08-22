// Paleta de colores consistente para Paylate
// Basada en blanco, azul oscuro y negro con variaciones elegantes

export const Colors = {
  // Colores principales
  primary: '#1E3A8A',        // Azul oscuro principal
  primaryLight: '#3B82F6',   // Azul más claro para hover/active
  primaryDark: '#1E293B',    // Azul más oscuro para headers
  
  // Colores de fondo
  background: '#FFFFFF',     // Blanco puro
  backgroundSecondary: '#F8FAFC', // Gris muy claro
  backgroundTertiary: '#F1F5F9',  // Gris ligeramente más oscuro
  
  // Colores de texto
  text: '#0F172A',          // Negro/gris muy oscuro
  textSecondary: '#475569', // Gris medio
  textTertiary: '#64748B',  // Gris claro
  textLight: '#94A3B8',     // Gris muy claro
  
  // Colores de acento
  accent: '#1E3A8A',        // Mismo que primary para consistencia
  accentLight: '#EFF6FF',   // Azul muy claro para fondos
  
  // Estados
  success: '#059669',       // Verde
  warning: '#D97706',       // Naranja
  error: '#DC2626',         // Rojo
  info: '#0284C7',          // Azul información
  
  // Estados de cuenta
  statusPaid: '#4CAF50',    // Verde para cuentas pagadas
  statusPending: '#E5E7EB', // Gris claro para cuentas pendientes
  statusCancelled: '#F44336', // Rojo para cuentas canceladas
  
  // Borders y divisores
  border: '#E2E8F0',        // Gris muy claro
  borderLight: '#F1F5F9',   // Casi blanco
  borderDark: '#CBD5E1',    // Gris medio
  
  // Sombras
  shadowLight: 'rgba(15, 23, 42, 0.04)',
  shadowMedium: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.12)',
  
  // Overlays
  overlay: 'rgba(15, 23, 42, 0.5)',
  overlayLight: 'rgba(15, 23, 42, 0.3)',
  
  // Tabs específicos
  tabActive: '#1E3A8A',
  tabInactive: '#94A3B8',
  tabBackground: '#FFFFFF',
  
  // Estados de input
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',
  inputBorderFocus: '#1E3A8A',
  inputPlaceholder: '#94A3B8',
  
  // Estados de botones
  buttonPrimary: '#1E3A8A',
  buttonPrimaryHover: '#1E293B',
  buttonSecondary: '#F1F5F9',
  buttonSecondaryText: '#475569',
  buttonDisabled: '#E2E8F0',
  buttonDisabledText: '#94A3B8',
};

// Gradientes elegantes
export const Gradients = {
  primary: ['#1E3A8A', '#3B82F6'],
  primaryDark: ['#1E293B', '#1E3A8A'],
  subtle: ['#F8FAFC', '#F1F5F9'],
  overlay: ['rgba(15, 23, 42, 0.0)', 'rgba(15, 23, 42, 0.5)'],
};

// Espaciado consistente
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Bordes redondeados
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Sombras
export const Shadows = {
  light: {
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  strong: {
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
