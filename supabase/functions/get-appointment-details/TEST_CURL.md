# Comandos curl para probar get-appointment-details

## 1. Obtener detalles básicos de una cita

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-appointment-details' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI"
  }'
```

## 2. Obtener detalles con historial del cliente

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-appointment-details' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "include_client_history": true
  }'
```

## 3. Obtener detalles con horario del profesional

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-appointment-details' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "include_professional_schedule": true
  }'
```

## 4. Obtener todos los detalles (historial + horario)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-appointment-details' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "appointment_id": "TU_APPOINTMENT_ID_AQUI",
    "include_client_history": true,
    "include_professional_schedule": true
  }'
```

## 5. Para producción (reemplazar URL y token)

```bash
curl -i --location --request POST 'https://TU_PROJECT_REF.supabase.co/functions/v1/get-appointment-details' \
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

## Ejemplo de respuesta esperada:

```json
{
  "appointment": {
    "id": "uuid",
    "status": "confirmed",
    "datetime": {
      "iso": {
        "start": "2025-01-20T14:00:00Z",
        "end": "2025-01-20T14:30:00Z"
      },
      "formatted": {
        "date": "lunes 20 de enero de 2025",
        "time": "14:00",
        "end_time": "14:30",
        "full": "lunes 20 de enero de 2025 a las 14:00"
      },
      "day_of_week": "lunes",
      "time_period": "afternoon",
      "duration_minutes": 30
    },
    "time_until": {
      "hours": 48,
      "days": 2,
      "minutes": 2880,
      "message": "En 2 días",
      "is_past": false,
      "is_today": false
    },
    "client": {
      "id": "uuid",
      "name": "Juan Pérez",
      "phone": "+5491123456789",
      "email": "juan@example.com",
      "preferred_communication": "whatsapp"
    },
    "professional": {
      "id": "uuid",
      "name": "Dr. García",
      "specialty": "Cardiología",
      "email": "drgarcia@example.com",
      "phone": "+5491198765432"
    },
    "service": {
      "id": "uuid",
      "name": "Consulta General",
      "description": "Consulta médica general",
      "duration_minutes": 30,
      "price": "50.00"
    },
    "notes": {
      "public": "Primera consulta",
      "internal": null
    },
    "rescheduling": {
      "is_rescheduled": false,
      "original_appointment_id": null,
      "rescheduled_from_id": null,
      "rescheduled_to_id": null,
      "rescheduled_at": null,
      "rescheduled_by": null,
      "history": null
    },
    "notifications": {
      "confirmation": {
        "id": "uuid",
        "notification_type": "appointment_confirmation",
        "status": "sent",
        "sent_at": "2025-01-18T10:00:00Z"
      },
      "reminder": null,
      "cancellation": null,
      "rescheduled": null,
      "total": 1
    },
    "followups": [],
    "metadata": {
      "created_by": "ai_agent",
      "created_at": "2025-01-18T10:00:00Z",
      "updated_at": "2025-01-18T10:00:00Z",
      "confirmation_sent_at": "2025-01-18T10:00:00Z",
      "reminder_sent_at": null,
      "completed_at": null
    }
  },
  "summary": "Cita confirmada - para Consulta General - con Dr. García - el lunes 20 de enero de 2025 a las 14:00 - (En 2 días)"
}
```

