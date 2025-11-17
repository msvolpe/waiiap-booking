# Comandos curl para probar get-available-slots

## 1. Obtener slots disponibles básico

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-available-slots' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "service_id": "TU_SERVICE_ID_AQUI"
  }'
```

## 2. Obtener slots para un profesional específico

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-available-slots' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "service_id": "TU_SERVICE_ID_AQUI",
    "professional_id": "TU_PROFESSIONAL_ID_AQUI"
  }'
```

## 3. Filtrar por período del día (mañana)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-available-slots' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "service_id": "TU_SERVICE_ID_AQUI",
    "preferred_time": "morning"
  }'
```

## 4. Especificar rango de fechas

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-available-slots' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "service_id": "TU_SERVICE_ID_AQUI",
    "date_from": "2025-01-20",
    "date_to": "2025-01-27",
    "max_results": 10,
    "prioritize": "earliest"
  }'
```

## 5. Para producción (reemplazar URL y token)

```bash
curl -i --location --request POST 'https://TU_PROJECT_REF.supabase.co/functions/v1/get-available-slots' \
  --header 'Authorization: Bearer TU_ANON_KEY_AQUI' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "service_id": "TU_SERVICE_ID_AQUI"
  }'
```

## Notas:

- **Para desarrollo local:** Usa `http://127.0.0.1:54321` (después de ejecutar `supabase start`)
- **Para producción:** Usa `https://TU_PROJECT_REF.supabase.co`
- **Token de desarrollo:** El token mostrado es el token anon por defecto de Supabase local
- **Token de producción:** Necesitas usar tu `SUPABASE_ANON_KEY` real
- **tenant_id:** Reemplaza con un UUID válido de tu tabla `tenants`
- **service_id:** Reemplaza con un UUID válido de un servicio activo
- **date_from/date_to:** Formato YYYY-MM-DD (ej: "2025-01-20")

## Valores de preferred_time:

- `morning` - Solo horarios de mañana (6:00 - 12:00)
- `afternoon` - Solo horarios de tarde (12:00 - 18:00)
- `evening` - Solo horarios de noche (18:00 - 24:00)
- `any` - Cualquier horario (default)

## Valores de prioritize:

- `earliest` - Ordenar por fecha más cercana primero (default)
- `latest` - Ordenar por fecha más lejana primero

## Ejemplo de respuesta esperada:

```json
{
  "tenant": {
    "id": "uuid",
    "business_name": "Clínica Ejemplo"
  },
  "service": {
    "id": "uuid",
    "name": "Consulta General",
    "duration_minutes": 30
  },
  "available_slots": [
    {
      "datetime": "2025-01-25T10:00:00Z",
      "date": "sábado 25 de enero",
      "time": "10:00",
      "formatted": "sábado 25 de enero a las 10:00",
      "professional_id": "uuid",
      "professional_name": "Dr. García",
      "service_name": "Consulta General",
      "duration_minutes": 30,
      "price": "50.00",
      "end_time": "2025-01-25T10:30:00Z",
      "day_of_week": "sábado",
      "time_period": "morning"
    }
  ],
  "count": 1,
  "search_criteria": {
    "date_from": "2025-01-20",
    "date_to": "2025-02-19",
    "preferred_time": "any"
  }
}
```

