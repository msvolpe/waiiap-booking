# Comandos curl para probar list-professional-appointments

## 1. Listar todas las citas del profesional (próximos 30 días - default)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-professional-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "professional_id": "TU_PROFESSIONAL_ID_AQUI"
  }'
```

## 2. Listar citas de un día específico

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-professional-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "professional_id": "TU_PROFESSIONAL_ID_AQUI",
    "date_from": "2025-01-20T00:00:00Z",
    "date_to": "2025-01-20T23:59:59Z"
  }'
```

## 3. Listar solo citas confirmadas en un rango

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-professional-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "professional_id": "TU_PROFESSIONAL_ID_AQUI",
    "date_from": "2025-01-20T00:00:00Z",
    "date_to": "2025-01-27T23:59:59Z",
    "status": "confirmed"
  }'
```

## 4. Agenda de la semana (sin canceladas)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-professional-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "professional_id": "TU_PROFESSIONAL_ID_AQUI",
    "date_from": "2025-01-20T00:00:00Z",
    "date_to": "2025-01-26T23:59:59Z",
    "include_cancelled": false,
    "order_by": "start_time_asc"
  }'
```

## 5. Citas del mes

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-professional-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "professional_id": "TU_PROFESSIONAL_ID_AQUI",
    "date_from": "2025-01-01T00:00:00Z",
    "date_to": "2025-01-31T23:59:59Z",
    "limit": 200
  }'
```

## 6. Citas de hoy

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-professional-appointments' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "professional_id": "TU_PROFESSIONAL_ID_AQUI",
    "date_from": "2025-01-20T00:00:00Z",
    "date_to": "2025-01-20T23:59:59Z",
    "status": "confirmed"
  }'
```

## 7. Para producción (reemplazar URL y token)

```bash
curl -i --location --request POST 'https://TU_PROJECT_REF.supabase.co/functions/v1/list-professional-appointments' \
  --header 'Authorization: Bearer TU_ANON_KEY_AQUI' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "professional_id": "TU_PROFESSIONAL_ID_AQUI"
  }'
```

## Notas:

- **Para desarrollo local:** Usa `http://127.0.0.1:54321` (después de ejecutar `supabase start`)
- **Para producción:** Usa `https://TU_PROJECT_REF.supabase.co`
- **Token de desarrollo:** El token mostrado es el token anon por defecto de Supabase local
- **Token de producción:** Necesitas usar tu `SUPABASE_ANON_KEY` real
- **tenant_id:** Reemplaza con un UUID válido de tu tabla `tenants`
- **professional_id:** Reemplaza con un UUID válido de un profesional existente
- **date_from/date_to:** Si no se especifican, por defecto usa desde hoy hasta 30 días en el futuro

## Ejemplo de respuesta esperada:

```json
{
  "tenant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "business_name": "Clínica Ejemplo"
  },
  "professional": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "Dr. García",
    "specialty": "Cardiología",
    "email": "drgarcia@example.com",
    "phone": "+5491198765432"
  },
  "date_range": {
    "from": "2025-01-20T00:00:00.000Z",
    "to": "2025-01-27T23:59:59.999Z",
    "formatted": {
      "from": "lunes 20 de enero de 2025",
      "to": "lunes 27 de enero de 2025"
    }
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
      "client": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Juan Pérez",
        "phone": "+5491123456789",
        "email": "juan@example.com"
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
      "summary": "Cita confirmada - para Consulta General - con Juan Pérez - el lunes 20 de enero de 2025 a las 14:00 - (En 2 días)",
      "metadata": {
        "created_at": "2025-01-18T10:00:00Z",
        "updated_at": "2025-01-18T10:00:00Z"
      }
    }
  ],
  "grouped_by_day": {
    "2025-01-20": [
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
          }
        },
        "client": {
          "name": "Juan Pérez"
        },
        "service": {
          "name": "Consulta General"
        }
      }
    ]
  },
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
    "include_cancelled": true,
    "order_by": "start_time_asc",
    "date_from": "2025-01-20T00:00:00.000Z",
    "date_to": "2025-01-27T23:59:59.999Z"
  },
  "message": "Dr. García tiene 1 cita registrada, 1 futura, entre lunes 20 de enero de 2025 y lunes 27 de enero de 2025"
}
```

