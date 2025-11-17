# Comandos curl para probar create-appointment

## 1. Crear cita básica

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_name": "Juan Pérez",
    "client_phone": "+5491123456789",
    "client_email": "juan@example.com",
    "service_id": "TU_SERVICE_ID_AQUI",
    "start_time": "2025-01-25T14:00:00Z"
  }'
```

## 2. Crear cita con profesional específico

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_name": "María García",
    "client_phone": "+5491198765432",
    "service_id": "TU_SERVICE_ID_AQUI",
    "professional_id": "TU_PROFESSIONAL_ID_AQUI",
    "start_time": "2025-01-25T15:00:00Z",
    "notes": "Primera consulta"
  }'
```

## 3. Crear cita sin especificar profesional (asigna automáticamente)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-appointment' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_name": "Carlos López",
    "client_phone": "+5491155555555",
    "service_id": "TU_SERVICE_ID_AQUI",
    "start_time": "2025-01-26T10:00:00Z"
  }'
```

## 4. Para producción (reemplazar URL y token)

```bash
curl -i --location --request POST 'https://TU_PROJECT_REF.supabase.co/functions/v1/create-appointment' \
  --header 'Authorization: Bearer TU_ANON_KEY_AQUI' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_name": "Juan Pérez",
    "client_phone": "+5491123456789",
    "service_id": "TU_SERVICE_ID_AQUI",
    "start_time": "2025-01-25T14:00:00Z"
  }'
```

## Notas:

- **Para desarrollo local:** Usa `http://127.0.0.1:54321` (después de ejecutar `supabase start`)
- **Para producción:** Usa `https://TU_PROJECT_REF.supabase.co`
- **Token de desarrollo:** El token mostrado es el token anon por defecto de Supabase local
- **Token de producción:** Necesitas usar tu `SUPABASE_ANON_KEY` real
- **tenant_id:** Reemplaza con un UUID válido de tu tabla `tenants`
- **service_id:** Reemplaza con un UUID válido de un servicio activo
- **professional_id:** Opcional. Si no se especifica, se asigna automáticamente el primer profesional disponible
- **start_time:** Debe ser una fecha/hora futura en formato ISO8601 (ej: "2025-01-25T14:00:00Z")

## Campos requeridos:

- `tenant_id` - Identificador del tenant/clínica
- `client_name` - Nombre completo del cliente
- `client_phone` - Teléfono del cliente
- `service_id` - Identificador del servicio
- `start_time` - Fecha y hora de inicio (ISO8601)

## Campos opcionales:

- `client_email` - Email del cliente
- `professional_id` - Identificador del profesional (si no se especifica, se asigna automáticamente)
- `notes` - Notas adicionales sobre la cita

## Ejemplo de respuesta esperada:

```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "confirmation_code": "APT-XXXXXXXX",
    "status": "confirmed",
    "datetime": {
      "iso": "2025-01-25T14:00:00Z",
      "formatted": "sábado 25 de enero de 2025 a las 14:00",
      "date": "sábado 25 de enero de 2025",
      "time": "14:00",
      "end_time": "14:30",
      "day_of_week": "sábado",
      "time_period": "afternoon",
      "time_until": "En 2 días"
    },
    "client": {
      "id": "uuid",
      "name": "Juan Pérez",
      "phone": "+5491123456789",
      "email": "juan@example.com"
    },
    "professional": {
      "id": "uuid",
      "name": "Dr. García",
      "specialty": "Cardiología"
    },
    "service": {
      "id": "uuid",
      "name": "Consulta General",
      "duration_minutes": 30,
      "price": "50.00"
    }
  },
  "message": "¡Cita confirmada exitosamente!...",
  "next_steps": [
    "Recibirás un recordatorio 24 horas antes de tu cita",
    "Si necesitas cancelar o reprogramar, contacta con anticipación",
    "Lleva tu DNI y cualquier documentación médica relevante"
  ]
}
```

