# Tool Description: reschedule-appointment

## Nombre
`reschedule-appointment`

## Descripción
Reprograma una cita existente a un nuevo horario. Valida la disponibilidad del nuevo horario, crea una nueva cita confirmada, actualiza la cita original marcándola como cancelada, cancela los recordatorios pendientes de la cita original, crea nuevos recordatorios para la nueva cita, y envía notificaciones de reprogramación al cliente y/o profesional según corresponda.

## Cuándo usar esta tool
- Cuando el usuario solicita cambiar la fecha/hora de su cita: "Quiero cambiar mi cita", "¿Puedo reprogramar?", "Necesito otro horario"
- Cuando el profesional necesita reprogramar por emergencia
- Cuando la administración necesita reprogramar una cita
- Cuando el sistema detecta conflictos y necesita reprogramar automáticamente
- Cuando se necesita mover una cita a un horario más conveniente

## Parámetros

### Requeridos
- **tenant_id** (string, UUID): Identificador único del tenant/clínica. Siempre requerido.
- **appointment_id** (string, UUID): Identificador único de la cita a reprogramar. Siempre requerido.
- **new_start_time** (string, ISO8601): Nueva fecha y hora de inicio de la cita. Debe ser una fecha futura. Formato: "2025-01-25T15:00:00Z"

### Opcionales
- **reason** (string): Razón de la reprogramación. Si no se proporciona, se usa una razón por defecto.
- **rescheduled_by** (string, default: 'client'): Quién reprograma la cita. Valores posibles:
  - `client` - Reprogramada por el cliente (default)
  - `professional` - Reprogramada por el profesional
  - `admin` - Reprogramada por administración
  - `system` - Reprogramada automáticamente por el sistema
- **notify_client** (boolean, default: true): Si se debe notificar al cliente sobre la reprogramación.
- **notify_professional** (boolean, default: true): Si se debe notificar al profesional sobre la reprogramación.

## Ejemplo de uso

### Caso 1: Cliente reprograma su cita
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "660e8400-e29b-41d4-a716-446655440001",
  "new_start_time": "2025-01-25T15:00:00Z"
}
```

### Caso 2: Cliente reprograma con razón específica
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "660e8400-e29b-41d4-a716-446655440001",
  "new_start_time": "2025-01-25T15:00:00Z",
  "reason": "Conflicto de horario",
  "rescheduled_by": "client"
}
```

### Caso 3: Profesional reprograma por emergencia
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "660e8400-e29b-41d4-a716-446655440001",
  "new_start_time": "2025-01-26T10:00:00Z",
  "reason": "Emergencia médica",
  "rescheduled_by": "professional",
  "notify_client": true,
  "notify_professional": false
}
```

## Respuesta

La respuesta incluye:
- **success**: Indica si la reprogramación fue exitosa
- **original_appointment**: Información de la cita original:
  - `id`: UUID de la cita original
  - `status`: Estado actual ('cancelled')
  - `original_date`: Fecha original formateada
  - `original_time`: Hora original formateada
- **new_appointment**: Información de la nueva cita:
  - `id`: UUID de la nueva cita
  - `status`: Estado ('confirmed')
  - `start_time`: Fecha/hora de inicio (ISO8601)
  - `end_time`: Fecha/hora de fin (ISO8601)
  - `formatted_date`: Fecha formateada conversacionalmente
  - `formatted_time`: Hora formateada
  - `service`: Nombre del servicio
  - `professional`: Nombre del profesional
  - `client`: Nombre del cliente
- **notifications**: Estado de las notificaciones:
  - `client_notified`: Si se notificó al cliente
  - `professional_notified`: Si se notificó al profesional
  - `reminder_scheduled`: Si se programó un recordatorio para la nueva cita
- **message**: Mensaje contextual para el LLM sobre la reprogramación

## Ejemplo de respuesta

```json
{
  "success": true,
  "original_appointment": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "cancelled",
    "original_date": "lunes 20 de enero de 2025",
    "original_time": "14:00"
  },
  "new_appointment": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "confirmed",
    "start_time": "2025-01-25T15:00:00Z",
    "end_time": "2025-01-25T15:30:00Z",
    "formatted_date": "sábado 25 de enero de 2025",
    "formatted_time": "15:00",
    "service": "Consulta General",
    "professional": "Dr. García",
    "client": "Juan Pérez"
  },
  "notifications": {
    "client_notified": true,
    "professional_notified": true,
    "reminder_scheduled": true
  },
  "message": "Cita reprogramada exitosamente.\n\nLa cita para Consulta General ha sido cambiada:\n- De: lunes 20 de enero de 2025 a las 14:00\n- A: sábado 25 de enero de 2025 a las 15:00\n\nReprogramada por solicitud del cliente.\n\nLa cita original ha sido cancelada y el nuevo horario está confirmado. Se enviará un recordatorio 24 horas antes de la nueva fecha."
}
```

## Notas para el LLM

1. **Siempre incluye tenant_id, appointment_id y new_start_time**: Los tres parámetros son obligatorios.

2. **Validación automática**: La función verifica que:
   - La cita existe y pertenece al tenant
   - La cita no esté cancelada o completada
   - El nuevo horario no sea en el pasado
   - El nuevo horario esté disponible (sin conflictos, dentro de horarios laborales, sin ausencias)

3. **Duración preservada**: La duración de la nueva cita se calcula automáticamente:
   - Primero intenta usar la duración personalizada del profesional para ese servicio
   - Si no existe, usa la duración del servicio
   - Si no está disponible, usa la duración de la cita original

4. **Gestión de citas**:
   - Se crea una nueva cita con estado 'confirmed'
   - La cita original se marca como 'cancelled' con `rescheduled_to_id` apuntando a la nueva cita
   - La nueva cita tiene `rescheduled_from_id` apuntando a la original
   - Se preserva el `original_appointment_id` si la cita original ya era una reprogramación

5. **Notificaciones automáticas**:
   - Se cancelan los recordatorios pendientes de la cita original
   - Se crean notificaciones de reprogramación para cliente y profesional
   - Se programa un nuevo recordatorio 24h antes de la nueva cita

6. **Mensaje al usuario**: Usa el campo `message` de la respuesta para informar al usuario sobre la reprogramación de manera conversacional, incluyendo ambas fechas (original y nueva).

7. **Errores comunes**:
   - Si la cita está cancelada, retorna error 400 con código 'CANNOT_RESCHEDULE_CANCELLED'
   - Si la cita está completada, retorna error 400 con código 'CANNOT_RESCHEDULE_COMPLETED'
   - Si el nuevo horario no está disponible, retorna error 409 con código 'SLOT_NOT_AVAILABLE' o 'PROFESSIONAL_UNAVAILABLE'
   - Si el nuevo horario es en el pasado, retorna error 400 con código 'INVALID_FUTURE_TIME'

8. **Antes de reprogramar**: Puedes usar `get-appointment-details` para obtener información de la cita actual y `get-available-slots` para ver horarios disponibles antes de reprogramar.

## Flujo típico de uso

1. Usuario solicita reprogramar: "Quiero cambiar mi cita"
   → Primero usar `list-client-appointments` o `get-appointment-details` para obtener el appointment_id
   → Usar `get-available-slots` para mostrar opciones disponibles
   → Luego llamar con `tenant_id`, `appointment_id` y `new_start_time`

2. Usuario reprograma con nueva fecha específica: "Quiero cambiar mi cita al 25 de enero a las 3pm"
   → Llamar con `new_start_time` en formato ISO8601

3. Profesional reprograma por emergencia
   → Llamar con `rescheduled_by: "professional"` y `reason` apropiado

4. Sistema reprograma automáticamente
   → Llamar con `rescheduled_by: "system"` y razón apropiada

