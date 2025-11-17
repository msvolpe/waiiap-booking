# Comandos curl para probar list-services

## 1. Listar todos los servicios activos (básico)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-services' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI"
  }'
```

## 2. Buscar servicios por nombre (parcial)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-services' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "service_name": "Consulta"
  }'
```

## 3. Listar servicios con profesionales incluidos

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-services' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "include_professionals": true,
    "include_pricing": true
  }'
```

## 4. Buscar servicios inactivos

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-services' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "is_active": false
  }'
```

## 5. Búsqueda completa con todos los parámetros

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-services' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "service_name": "Limpieza",
    "is_active": true,
    "include_professionals": true,
    "include_pricing": true
  }'
```

## 6. Para producción (reemplazar URL y token)

```bash
curl -i --location --request POST 'https://TU_PROJECT_REF.supabase.co/functions/v1/list-services' \
  --header 'Authorization: Bearer TU_ANON_KEY_AQUI' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI"
  }'
```

## Notas:

- **Para desarrollo local:** Usa `http://127.0.0.1:54321` (después de ejecutar `supabase start`)
- **Para producción:** Usa `https://TU_PROJECT_REF.supabase.co`
- **Token de desarrollo:** El token mostrado es el token anon por defecto de Supabase local
- **Token de producción:** Necesitas usar tu `SUPABASE_ANON_KEY` real
- **tenant_id:** Reemplaza con un UUID válido de tu tabla `tenants`

## Ejemplo de respuesta esperada:

```json
{
  "tenant": {
    "id": "uuid",
    "business_name": "Clínica Ejemplo"
  },
  "services": [
    {
      "id": "uuid",
      "name": "Consulta General",
      "description": "Consulta médica general",
      "duration_minutes": 30,
      "price": "50.00",
      "formatted_price": "€50,00",
      "summary": "Consulta General - 30 min - €50,00",
      "requires_approval": false
    }
  ],
  "count": 1,
  "message": "Se encontró 1 servicio",
  "search_criteria": {
    "service_name": null,
    "is_active": true
  }
}
```

