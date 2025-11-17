# Comandos curl para probar cancel-appointment

## 1. Cancelar cita básica (por cliente)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/cancel-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI"
  }'
```

## 2. Cancelar con razón específica

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/cancel-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "cancellation_reason": "Emergencia familiar",
    "cancelled_by": "client"
  }'
```

## 3. Cancelar por profesional (sin notificar al cliente)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/cancel-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "cancellation_reason": "Emergencia médica del profesional",
    "cancelled_by": "professional",
    "notify_client": true,
    "notify_professional": false
  }'
```

## 4. Cancelar por administración

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/cancel-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "cancellation_reason": "Cierre por mantenimiento",
    "cancelled_by": "admin"
  }'
```

## 5. Para producción (reemplazar URL y token)

```bash
curl -i --location --request POST 'https://TU_PROJECT_REF.supabase.co/functions/v1/cancel-appointment' \
  --header 'Authorization: Bearer TU_ANON_KEY_AQUI' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI"
  }'
```

## Notas:

- **Para desarrollo local:** Usa `http://127.0.0.1:54321` (después de ejecutar `supabase start`)
- **Para producción:** Usa `https://TU_PROJECT_REF.supabase.co`
- **Token de desarrollo:** El token mostrado es el token anon por defecto de Supabase local
- **Token de producción:** Necesitas usar tu `SUPABASE_ANON_KEY` real
- **tenant_id:** Reemplaza con un UUID válido de tu tabla `tenants`
- **appointment_id:** Reemplaza con un UUID válido de una cita existente

## Valores de cancelled_by:

- `client` - Cancelada por el cliente (default)
- `professional` - Cancelada por el profesional
- `admin` - Cancelada por administración
- `system` - Cancelada automáticamente por el sistema

## Ejemplo de respuesta esperada:

```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
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

