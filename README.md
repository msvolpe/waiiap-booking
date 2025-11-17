# Appointment Edge Functions

Sistema completo de gestión de citas implementado con Supabase Edge Functions. Este proyecto proporciona un conjunto de funciones serverless para manejar todo el ciclo de vida de las citas médicas/profesionales.

## 🚀 Funciones Implementadas

### Funciones Disponibles

1. **create-appointment** - Crear una nueva cita
2. **search-professionals** - Buscar profesionales disponibles
3. **get-available-slots** - Obtener horarios disponibles para agendar
4. **list-services** - Listar servicios disponibles de un tenant
5. **cancel-appointment** - Cancelar una cita existente

### Funciones Pendientes

Ver [FUNCIONALIDADES_PENDIENTES.md](./FUNCIONALIDADES_PENDIENTES.md) para la lista completa de funciones planificadas.

## 📋 Requisitos

- Supabase CLI
- Deno runtime
- Cuenta de Supabase

## 🛠️ Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/msvolpe/waiiap-booking.git
cd waiiap-booking
```

2. Inicializar Supabase localmente (opcional):
```bash
supabase start
```

3. Desplegar funciones a Supabase:
```bash
supabase functions deploy create-appointment
supabase functions deploy search-professionals
supabase functions deploy get-available-slots
supabase functions deploy list-services
supabase functions deploy cancel-appointment
```

## 📚 Documentación

- [Esquema de Base de Datos](./DATABASE_SCHEMA.md) - Descripción completa de todas las tablas
- [Funcionalidades Pendientes](./FUNCIONALIDADES_PENDIENTES.md) - Roadmap de funciones a implementar

## 🧪 Testing

Cada función incluye ejemplos de curl en su directorio `TEST_CURL.md`:

- [create-appointment](./supabase/functions/create-appointment/TEST_CURL.md)
- [search-professionals](./supabase/functions/search-professionals/)
- [get-available-slots](./supabase/functions/get-available-slots/)
- [list-services](./supabase/functions/list-services/TEST_CURL.md)
- [cancel-appointment](./supabase/functions/cancel-appointment/TEST_CURL.md)

## 📖 Uso con MCP Server

Todas las funciones están diseñadas para ser usadas como tools en un MCP server. Cada función incluye:

- `TOOL_DESCRIPTION.md` - Descripción detallada para LLMs
- `MCP_TOOL_SCHEMA.json` - Esquema JSON para configuración de MCP

## 🗄️ Estructura de Base de Datos

El sistema utiliza 14 tablas principales:

- `tenants` - Clínicas/negocios
- `clients` - Pacientes/clientes
- `professionals` - Profesionales
- `services` - Servicios ofrecidos
- `appointments` - Citas
- `business_hours` - Horarios laborales
- `professional_unavailability` - Ausencias
- `notification_queue` - Cola de notificaciones
- Y más...

Ver [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) para detalles completos.

## 🔄 Flujo Típico de Uso

1. **Buscar servicios disponibles** → `list-services`
2. **Buscar profesionales** → `search-professionals`
3. **Ver horarios disponibles** → `get-available-slots`
4. **Crear cita** → `create-appointment`
5. **Cancelar cita** (si es necesario) → `cancel-appointment`

## 📝 Licencia

Este proyecto es privado y pertenece a msvolpe.

## 👤 Autor

Mauro Volpe

## 🔗 Enlaces

- Repositorio: https://github.com/msvolpe/waiiap-booking.git
- Supabase: https://supabase.com

