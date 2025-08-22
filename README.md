# Paylate - Gestor de Cuentas Compartidas

Una aplicación móvil desarrollada con React Native y Expo para gestionar gastos grupales y dividir costos entre amigos.

## 🚀 Características Principales

- **Autenticación segura** con Supabase Auth
- **Gestión de cuentas compartidas** con división automática de costos
- **Sistema de contactos** para agregar amigos por referencia única
- **División de gastos** en partes iguales o montos personalizados
- **Seguimiento de pagos** con comprobantes
- **Notificaciones en tiempo real** para actualizaciones de pagos
- **Interfaz moderna y intuitiva** con navegación por tabs

## 🛠️ Stack Tecnológico

- **Frontend**: React Native con Expo SDK
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Estado Global**: Zustand
- **Navegación**: React Navigation
- **Notificaciones**: Expo Notifications
- **Manejo de Imágenes**: Expo Image Picker

## 📱 Funcionalidades

### Autenticación y Onboarding
- Registro con email, contraseña y referencia única (@usuario)
- Verificación de email antes del primer login
- Inicio de sesión seguro

### Gestión de Cuentas
- Crear cuentas compartidas con nombre, descripción y monto total
- Seleccionar contactos para incluir en la cuenta
- División automática en partes iguales o montos personalizados
- Vista diferenciada para creadores y participantes

### Sistema de Contactos
- Buscar usuarios por su referencia única
- Agregar y eliminar contactos
- Lista de contactos disponibles para crear cuentas

### Seguimiento de Pagos
- Marcar pagos como completados
- Subir comprobantes de pago
- Vista en tiempo real del estado de pagos

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm o yarn
- Expo CLI (`npm install -g @expo/cli`)
- Cuenta en Supabase

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd PaylateApp
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Supabase

#### Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Anota la URL y la anon key

#### Configurar la base de datos
1. Ve al SQL Editor en tu proyecto de Supabase
2. Ejecuta el script `database/schema.sql`
3. Esto creará todas las tablas y políticas de seguridad necesarias

#### Configurar autenticación
1. En Supabase Dashboard, ve a Authentication > Settings
2. Habilita "Enable email confirmations"
3. Configura las plantillas de email según tus preferencias

### 4. Configurar variables de entorno
Edita el archivo `lib/supabase.ts` y reemplaza:
```typescript
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseAnonKey = 'TU_SUPABASE_ANON_KEY';
```

### 5. Ejecutar la aplicación
```bash
# Para desarrollo
npm start

# Para iOS
npm run ios

# Para Android
npm run android
```

## 🗄️ Estructura de la Base de Datos

### Tablas Principales

#### `users`
- `id`: UUID único del usuario
- `email`: Email del usuario (único)
- `reference`: Referencia única (@usuario)
- `created_at`: Fecha de creación

#### `contacts`
- `id`: UUID único del contacto
- `user_id`: ID del usuario que posee el contacto
- `contact_user_id`: ID del usuario que es el contacto
- `added_at`: Fecha de agregado

#### `accounts`
- `id`: UUID único de la cuenta
- `name`: Nombre de la cuenta
- `description`: Descripción opcional
- `total_amount`: Monto total de la cuenta
- `created_by`: ID del usuario creador
- `split_method`: Método de división ('equal' o 'custom')

#### `account_participants`
- `id`: UUID único del participante
- `account_id`: ID de la cuenta
- `user_id`: ID del participante
- `amount_owed`: Monto que debe pagar
- `has_paid`: Estado del pago
- `payment_proof_url`: URL del comprobante

## 📱 Estructura de la Aplicación

```
PaylateApp/
├── lib/
│   └── supabase.ts          # Configuración de Supabase
├── store/
│   └── authStore.ts         # Store de autenticación con Zustand
├── navigation/
│   └── AppNavigator.tsx     # Navegación principal
├── screens/
│   ├── auth/                # Pantallas de autenticación
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   └── main/                # Pantallas principales
│       ├── AccountsScreen.tsx
│       ├── CreateAccountScreen.tsx
│       ├── AccountDetailScreen.tsx
│       └── ContactsScreen.tsx
├── database/
│   └── schema.sql           # Esquema de la base de datos
└── App.tsx                  # Componente principal
```

## 🔐 Seguridad

La aplicación implementa múltiples capas de seguridad:

- **Row Level Security (RLS)** en Supabase
- **Políticas de acceso** basadas en el usuario autenticado
- **Validación de datos** en el frontend y backend
- **Autenticación JWT** con Supabase Auth

## 🚧 Funcionalidades Futuras

- [ ] Notificaciones push con Expo Notifications
- [ ] Subida de comprobantes a Supabase Storage
- [ ] Historial de transacciones
- [ ] Exportación de reportes
- [ ] Integración con métodos de pago
- [ ] Modo offline con sincronización

## 🐛 Solución de Problemas

### Error de conexión a Supabase
- Verifica que las credenciales en `lib/supabase.ts` sean correctas
- Asegúrate de que el proyecto de Supabase esté activo

### Error de permisos en la base de datos
- Ejecuta el script `schema.sql` completo
- Verifica que las políticas RLS estén habilitadas

### Error de navegación
- Asegúrate de que todas las dependencias estén instaladas
- Verifica que la estructura de navegación sea correcta

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si tienes preguntas o problemas:

1. Revisa la documentación de [Expo](https://docs.expo.dev/)
2. Consulta la documentación de [Supabase](https://supabase.com/docs)
3. Abre un issue en este repositorio

---

**Desarrollado con ❤️ usando React Native y Expo**
