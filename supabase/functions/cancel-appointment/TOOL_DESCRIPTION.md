# Tool Description: cancel-appointment

## Nombre
`cancel-appointment`

## Descripción
Cancela una cita existente. Actualiza el estado de la cita a 'cancelled', registra la razón de cancelación, actualiza las estadísticas del cliente, cancela notificaciones pendientes (recordatorios), y envía notificaciones de cancelación al cliente y/o profesional según corresponda. El slot queda disponible para nuevas reservas.

## Cuándo usar esta tool
- Cuando el usuario solicita cancelar su cita: "Quiero cancelar mi cita", "Necesito cancelar", "No puedo asistir"
- Cuando el profesional necesita cancelar por emergencia
- Cuando la administración necesita cancelar una cita
- Cuando el sistema detecta conflictos y necesita cancelar automáticamente
- Cuando se necesita liberar un slot para otra cita

## Parámetros

### Requeridos
- **tenant_id** (string, UUID): Identificador único del tenant/clínica. Siempre requerido.
- **appointment_id** (string, UUID): Identificador único de la cita a cancelar. Siempre requerido.

### Opcionales
- **cancellation_reason** (string): Razón específica de la cancelación. Si no se proporciona, se usa una razón por defecto según `cancelled_by`.
- **cancelled_by** (string, default: 'client'): Quién cancela la cita. Valores posibles:
  - `client` - Cancelada por el cliente (default)
  - `professional` - Cancelada por el profesional
  - `admin` - Cancelada por administración
  - `system` - Cancelada automáticamente por el sistema
- **notify_client** (boolean, default: true): Si se debe notificar al cliente sobre la cancelación.
- **notify_professional** (boolean, default: true): Si se debe notificar al profesional sobre la cancelación.

## Ejemplo de uso

### Caso 1: Cliente cancela su cita
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

### Caso 2: Cliente cancela con razón específica
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "660e8400-e29b-41d4-a716-446655440001",
  "cancellation_reason": "Emergencia familiar",
  "cancelled_by": "client"
}
```

### Caso 3: Profesional cancela por emergencia
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "660e8400-e29b-41d4-a716-446655440001",
  "cancellation_reason": "Emergencia médica",
  "cancelled_by": "professional",
  "notify_client": true,
  "notify_professional": false
}
```

## Respuesta

La respuesta incluye:
- **success**: Indica si la cancelación fue exitosa
- **appointment**: Información de la cita cancelada:
  - `id`: UUID de la cita
  - `status`: Estado actual ('cancelled')
  - `cancelled_at`: Fecha y hora de cancelación
  - `cancellation_reason`: Razón de la cancelación
  - `cancelled_by`: Quién canceló la cita
  - `original_appointment`: Información de la cita original (fecha, hora, servicio, profesional, cliente)
- **notifications**: Estado de las notificaciones enviadas:
  - `client_notified`: Si se notificó al cliente
  - `professional_notified`: Si se notificó al profesional
- **message**: Mensaje contextual para el LLM sobre la cancelación

## Ejemplo de respuesta

```json
{
  "success": true,
  "appointment": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "cancelled",
    "cancelled_at": "2025-01-15T10:30:00Z",
    "cancellation_reason": "Cancelada por el cliente",
    "cancelled_by": "client",
    "original_appointment": {
      "start_time": "2025-01-20T14:00:00Z",
      "end_time": "2025-01-20T14:30:00Z",
      "formatted_date": "lunes 20 de enero de 2025",
      "formatted_time": "14:00",
      "service": "Consulta General",
      "professional": "Dr. García",
      "client": "Juan Pérez"
    }
  },
  "notifications": {
    "client_notified": true,
    "professional_notified": true
  },
  "message": "Cita cancelada exitosamente.\n\nLa cita para Consulta General programada para el lunes 20 de enero de 2025 a las 14:00 ha sido cancelada por el cliente.\n\nEl slot ha quedado disponible para nuevas reservas. Si el cliente desea reagendar, puede contactarnos nuevamente."
}
```

## Notas para el LLM

1. **Siempre incluye tenant_id y appointment_id**: Ambos parámetros son obligatorios.

2. **Verificación automática**: La función verifica que:
   - La cita existe y pertenece al tenant
   - La cita no esté ya cancelada
   - La cita no esté completada (no se pueden cancelar citas completadas)

3. **Actualizaciones automáticas**:
   - El estado se actualiza a 'cancelled'
   - Se registra `cancelled_at` con la fecha/hora actual
   - Se actualizan las estadísticas del cliente (`total_cancellations`)
   - Se cancelan automáticamente los recordatorios pendientes

4. **Notificaciones**: Por defecto se notifica tanto al cliente como al profesional. Puedes controlar esto con `notify_client` y `notify_professional`.

5. **Razón de cancelación**: Si no se proporciona `cancellation_reason`, se usa una razón por defecto según `cancelled_by`.

6. **Slot liberado**: Una vez cancelada, el slot queda disponible y puede ser reservado nuevamente usando `get-available-slots` y `create-appointment`.

7. **Mensaje al usuario**: Usa el campo `message` de la respuesta para informar al usuario sobre la cancelación de manera conversacional.

8. **Errores comunes**:
   - Si la cita ya está cancelada, retorna error 409 con código 'ALREADY_CANCELLED'
   - Si la cita está completada, retorna error 400 con código 'CANNOT_CANCEL_COMPLETED'
   - Si la cita no existe, retorna error 404 con código 'APPOINTMENT_NOT_FOUND'

## Flujo típico de uso

1. Usuario solicita cancelar: "Quiero cancelar mi cita"
   → Primero usar `list-client-appointments` o `get-appointment-details` para obtener el appointment_id
   → Luego llamar con `tenant_id` y `appointment_id`

2. Usuario cancela con razón: "Necesito cancelar porque tengo una emergencia"
   → Llamar con `cancellation_reason: "Emergencia"`

3. Profesional cancela por emergencia
   → Llamar con `cancelled_by: "professional"` y `cancellation_reason` apropiado

4. Sistema cancela automáticamente
   → Llamar con `cancelled_by: "system"` y razón apropiada

