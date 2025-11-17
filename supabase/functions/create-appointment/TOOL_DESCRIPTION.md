# Tool Description: create-appointment

## Nombre
`create-appointment`

## Descripción
Crea una nueva cita en el sistema. Valida el tenant, crea o actualiza el cliente, verifica el servicio y profesional, valida disponibilidad del horario (ausencias, conflictos, horarios laborales), crea la cita, genera código de confirmación, y crea notificaciones de confirmación y recordatorio automático. Retorna información completa y formateada de la cita creada.

## Cuándo usar esta tool
- Cuando el usuario quiere agendar una cita: "Quiero agendar una cita", "Necesito una cita", "Quiero reservar"
- Cuando el usuario ha seleccionado un servicio, profesional y horario disponible
- Cuando necesitas crear una cita después de que el usuario eligió un slot de `get-available-slots`
- Cuando el usuario confirma que quiere agendar en un horario específico

## Parámetros

### Requeridos
- **tenant_id** (string, UUID): Identificador único del tenant/clínica. Siempre requerido.
- **client_name** (string): Nombre completo del cliente.
- **client_phone** (string): Teléfono del cliente. Se usa para buscar si el cliente ya existe.
- **service_id** (string, UUID): Identificador del servicio a agendar.
- **start_time** (string, ISO8601): Fecha y hora de inicio de la cita. Formato: "2025-01-25T14:00:00Z"

### Opcionales
- **client_email** (string): Email del cliente.
- **professional_id** (string, UUID): Identificador del profesional. Si no se especifica, se asigna automáticamente el primer profesional disponible que ofrezca el servicio.
- **notes** (string): Notas adicionales sobre la cita.

## Ejemplo de uso

### Caso 1: Crear cita básica
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_name": "Juan Pérez",
  "client_phone": "+5491123456789",
  "service_id": "660e8400-e29b-41d4-a716-446655440001",
  "start_time": "2025-01-25T14:00:00Z"
}
```

### Caso 2: Con profesional específico
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_name": "María García",
  "client_phone": "+5491198765432",
  "client_email": "maria@example.com",
  "service_id": "660e8400-e29b-41d4-a716-446655440001",
  "professional_id": "770e8400-e29b-41d4-a716-446655440002",
  "start_time": "2025-01-25T15:00:00Z",
  "notes": "Primera consulta"
}
```

## Respuesta

La respuesta incluye:
- **success**: Indica si la creación fue exitosa
- **appointment**: Información completa de la cita creada:
  - `id`: UUID de la cita
  - `confirmation_code`: Código de confirmación único
  - `status`: Estado de la cita ('confirmed')
  - `datetime`: Fechas formateadas conversacionalmente
  - `client`: Información del cliente
  - `professional`: Información del profesional
  - `service`: Información del servicio
  - `clinic`: Información de la clínica
- **message**: Mensaje conversacional completo de confirmación
- **next_steps**: Lista de próximos pasos para el usuario

## Ejemplo de respuesta

```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "confirmation_code": "APT-XXXXXXXX",
    "status": "confirmed",
    "datetime": {
      "formatted": "sábado 25 de enero de 2025 a las 14:00",
      "date": "sábado 25 de enero de 2025",
      "time": "14:00",
      "end_time": "14:30",
      "time_until": "En 2 días"
    },
    "client": {
      "name": "Juan Pérez",
      "phone": "+5491123456789"
    },
    "professional": {
      "name": "Dr. García",
      "specialty": "Cardiología"
    },
    "service": {
      "name": "Consulta General",
      "duration_minutes": 30,
      "price": "50.00"
    }
  },
  "message": "¡Cita confirmada exitosamente!...",
  "next_steps": [
    "Recibirás un recordatorio 24 horas antes de tu cita",
    "Si necesitas cancelar o reprogramar, contacta con anticipación"
  ]
}
```

## Notas para el LLM

1. **Siempre incluye tenant_id, client_name, client_phone, service_id y start_time**: Estos campos son obligatorios.

2. **Gestión automática de clientes**: Si el cliente ya existe (por teléfono), se actualiza su información. Si no existe, se crea automáticamente.

3. **Asignación automática de profesional**: Si no se especifica `professional_id`, se asigna automáticamente el primer profesional disponible que ofrezca el servicio.

4. **Validaciones automáticas**: La función valida:
   - Que el tenant esté activo
   - Que el servicio exista y esté activo
   - Que el profesional exista, esté activo y ofrezca el servicio
   - Que el horario esté disponible (sin conflictos, dentro de horarios laborales, sin ausencias)

5. **Notificaciones automáticas**: Se crean automáticamente:
   - Notificación de confirmación inmediata
   - Recordatorio programado 24 horas antes (si aplica)

6. **Código de confirmación**: Se genera automáticamente un código único (ej: "APT-XXXXXXXX") que se incluye en las notas de la cita.

7. **Mensaje conversacional**: El campo `message` contiene un mensaje completo y formateado listo para mostrar al usuario.

8. **Errores comunes**:
   - Si falta algún campo requerido, retorna error 400
   - Si el servicio no existe, retorna error 404
   - Si no hay profesionales disponibles, retorna error 404
   - Si el horario no está disponible, retorna error 409

## Flujo típico de uso

1. Usuario quiere agendar una cita
   → Primero usar `list-services` para mostrar servicios disponibles
   → Luego usar `search-professionals` para mostrar profesionales
   → Luego usar `get-available-slots` para mostrar horarios disponibles
   → Finalmente usar `create-appointment` con los datos seleccionados

2. Usuario confirma un horario específico
   → Llamar con todos los datos requeridos
   → Mostrar el mensaje de confirmación al usuario
   → Informar sobre el código de confirmación

