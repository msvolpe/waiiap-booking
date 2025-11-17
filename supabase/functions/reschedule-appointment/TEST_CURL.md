# Comandos curl para probar reschedule-appointment

## 1. Reprogramar cita básica (por cliente)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reschedule-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "new_start_time": "2025-01-25T15:00:00Z"
  }'
```

## 2. Reprogramar con razón específica

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reschedule-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "new_start_time": "2025-01-25T15:00:00Z",
    "reason": "Conflicto de horario",
    "rescheduled_by": "client"
  }'
```

## 3. Reprogramar por profesional (sin notificar al cliente)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reschedule-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "new_start_time": "2025-01-25T16:00:00Z",
    "reason": "Emergencia médica del profesional",
    "rescheduled_by": "professional",
    "notify_client": true,
    "notify_professional": false
  }'
```

## 4. Reprogramar por administración

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reschedule-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "new_start_time": "2025-01-26T10:00:00Z",
    "reason": "Cierre por mantenimiento",
    "rescheduled_by": "admin"
  }'
```

## 5. Para producción (reemplazar URL y token)

```bash
curl -i --location --request POST 'https://TU_PROJECT_REF.supabase.co/functions/v1/reschedule-appointment' \
  --header 'Authorization: Bearer TU_ANON_KEY_AQUI' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "new_start_time": "2025-01-25T15:00:00Z"
  }'
```

## Notas:

- **Para desarrollo local:** Usa `http://127.0.0.1:54321` (después de ejecutar `supabase start`)
- **Para producción:** Usa `https://TU_PROJECT_REF.supabase.co`
- **Token de desarrollo:** El token mostrado es el token anon por defecto de Supabase local
- **Token de producción:** Necesitas usar tu `SUPABASE_ANON_KEY` real
- **tenant_id:** Reemplaza con un UUID válido de tu tabla `tenants`
- **appointment_id:** Reemplaza con un UUID válido de una cita existente
- **new_start_time:** Debe ser una fecha/hora futura en formato ISO8601 (ej: "2025-01-25T15:00:00Z")

## Valores de rescheduled_by:

- `client` - Reprogramada por el cliente (default)
- `professional` - Reprogramada por el profesional
- `admin` - Reprogramada por administración
- `system` - Reprogramada automáticamente por el sistema

## Ejemplo de respuesta esperada:

```json
{
  "success": true,
  "original_appointment": {
    "id": "uuid-original",
    "status": "cancelled",
    "original_date": "lunes 20 de enero de 2025",
    "original_time": "14:00"
  },
  "new_appointment": {
    "id": "uuid-nuevo",
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

