# Comandos curl para probar list-client-appointments

## 1. Listar todas las citas de un cliente (por ID)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-client-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_id": "TU_CLIENT_ID_AQUI"
  }'
```

## 2. Listar citas futuras de un cliente (por teléfono)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-client-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_phone": "+5491123456789",
    "only_future": true
  }'
```

## 3. Listar solo citas confirmadas y futuras

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-client-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_email": "cliente@example.com",
    "status": "confirmed",
    "only_future": true
  }'
```

## 4. Historial de citas pasadas (sin canceladas)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-client-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_id": "TU_CLIENT_ID_AQUI",
    "only_past": true,
    "include_cancelled": false,
    "order_by": "start_time_desc"
  }'
```

## 5. Próximas 10 citas (ordenadas por fecha ascendente)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-client-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_id": "TU_CLIENT_ID_AQUI",
    "only_future": true,
    "limit": 10,
    "order_by": "start_time_asc"
  }'
```

## 6. Próxima cita (solo la más próxima)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-client-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_phone": "+5491123456789",
    "only_future": true,
    "status": "confirmed",
    "limit": 1,
    "order_by": "start_time_asc"
  }'
```

## 7. Para producción (reemplazar URL y token)

```bash
curl -i --location --request POST 'https://TU_PROJECT_REF.supabase.co/functions/v1/list-client-appointments' \
  --header 'Authorization: Bearer TU_ANON_KEY_AQUI' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "client_id": "TU_CLIENT_ID_AQUI"
  }'
```

## Notas:

- **Para desarrollo local:** Usa `http://127.0.0.1:54321` (después de ejecutar `supabase start`)
- **Para producción:** Usa `https://TU_PROJECT_REF.supabase.co`
- **Token de desarrollo:** El token mostrado es el token anon por defecto de Supabase local
- **Token de producción:** Necesitas usar tu `SUPABASE_ANON_KEY` real
- **tenant_id:** Reemplaza con un UUID válido de tu tabla `tenants`
- **client_id:** Reemplaza con un UUID válido de un cliente existente
- **client_phone/client_email:** Alternativas a client_id para identificar al cliente

## Ejemplo de respuesta esperada:

```json
{
  "tenant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "business_name": "Clínica Ejemplo"
  },
  "client": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Juan Pérez",
    "phone": "+5491123456789",
    "email": "juan@example.com"
  },
  "appointments": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
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
        "is_today": false,
        "is_future": true
      },
      "professional": {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "name": "Dr. García",
        "specialty": "Cardiología",
        "email": "drgarcia@example.com",
        "phone": "+5491198765432"
      },
      "service": {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "name": "Consulta General",
        "description": "Consulta médica general",
        "duration_minutes": 30,
        "price": "50.00"
      },
      "notes": "Primera consulta",
      "summary": "Cita confirmada - para Consulta General - con Dr. García - el lunes 20 de enero de 2025 a las 14:00 - (En 2 días)",
      "metadata": {
        "created_at": "2025-01-18T10:00:00Z",
        "updated_at": "2025-01-18T10:00:00Z"
      }
    }
  ],
  "count": 1,
  "summary": {
    "total": 1,
    "future": 1,
    "past": 0,
    "today": 0,
    "by_status": {
      "confirmed": 1,
      "pending": 0,
      "cancelled": 0,
      "completed": 0
    }
  },
  "filters_applied": {
    "status": "all",
    "only_future": false,
    "only_past": false,
    "include_cancelled": true,
    "order_by": "start_time_desc"
  },
  "message": "Juan Pérez tiene 1 cita registrada, 1 futura"
}
```

