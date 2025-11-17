# Comandos curl para probar search-professionals

## 1. Buscar todos los profesionales activos

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/search-professionals' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI"
  }'
```

## 2. Buscar por especialidad

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/search-professionals' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "specialty": "Cardiología"
  }'
```

## 3. Buscar por nombre

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/search-professionals' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "professional_name": "García"
  }'
```

## 4. Buscar profesionales que ofrecen un servicio específico

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/search-professionals' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "service_id": "TU_SERVICE_ID_AQUI",
    "include_services": true
  }'
```

## 5. Con horarios laborales incluidos

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/search-professionals' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "tenant_id": "TU_TENANT_ID_AQUI",
    "include_schedule": true
  }'
```

## 6. Para producción (reemplazar URL y token)

```bash
curl -i --location --request POST 'https://TU_PROJECT_REF.supabase.co/functions/v1/search-professionals' \
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
- **service_id:** Reemplaza con un UUID válido de un servicio activo

## Ejemplo de respuesta esperada:

```json
{
  "tenant": {
    "id": "uuid",
    "business_name": "Clínica Ejemplo"
  },
  "professionals": [
    {
      "id": "uuid",
      "name": "Dr. García",
      "specialty": "Cardiología",
      "bio": "Especialista en cardiología con 15 años de experiencia",
      "services": [
        {
          "id": "uuid",
          "name": "Consulta General",
          "duration_minutes": 30,
          "price": "50.00"
        }
      ],
      "summary": "Dr. García - especialista en Cardiología - ofrece: Consulta General"
    }
  ],
  "count": 1,
  "message": "Se encontró 1 profesional"
}
```

