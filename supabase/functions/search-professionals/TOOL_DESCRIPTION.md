# Tool Description: search-professionals

## Nombre
`search-professionals`

## Descripción
Busca y filtra profesionales disponibles en un tenant. Permite buscar por especialidad, nombre, o servicio específico. Opcionalmente incluye la lista de servicios que ofrece cada profesional y sus horarios laborales. Útil para mostrar al usuario qué profesionales están disponibles antes de agendar una cita.

## Cuándo usar esta tool
- Cuando el usuario pregunta "¿Qué profesionales tienen?", "¿Qué doctores hay?", "¿Quién atiende?"
- Cuando el usuario busca un profesional por especialidad: "¿Tienen cardiólogo?", "¿Hay pediatra?"
- Cuando el usuario busca un profesional por nombre: "¿Está el Dr. García?", "Busco a Carlos"
- Cuando el usuario pregunta "¿Quién ofrece [servicio]?"
- Cuando necesitas mostrar opciones de profesionales antes de crear una cita

## Parámetros

### Requeridos
- **tenant_id** (string, UUID): Identificador único del tenant/clínica. Siempre requerido.

### Opcionales
- **specialty** (string): Búsqueda parcial por especialidad (case-insensitive). Ejemplo: "Cardiología", "Pediatría".
- **professional_name** (string): Búsqueda parcial por nombre (case-insensitive). Ejemplo: "Carlos", "Dr. Martinez".
- **service_id** (string, UUID): Buscar solo profesionales que ofrecen un servicio específico.
- **include_services** (boolean, default: true): Si es true, incluye la lista de servicios que ofrece cada profesional.
- **include_schedule** (boolean, default: false): Si es true, incluye los horarios laborales de cada profesional.
- **only_available** (boolean, default: true): Si es true, solo muestra profesionales activos y disponibles.

## Ejemplo de uso

### Caso 1: Listar todos los profesionales
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Caso 2: Buscar por especialidad
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "specialty": "Cardiología"
}
```

### Caso 3: Buscar por nombre
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "professional_name": "García"
}
```

### Caso 4: Profesionales que ofrecen un servicio
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "service_id": "660e8400-e29b-41d4-a716-446655440001",
  "include_services": true
}
```

## Respuesta

La respuesta incluye:
- **tenant**: Información del tenant (id, business_name)
- **professionals**: Array de profesionales, cada uno con:
  - `id`: UUID del profesional
  - `name`: Nombre completo
  - `specialty`: Especialidad
  - `bio`: Biografía/descripción
  - `services`: (Opcional) Lista de servicios que ofrece con precios y duraciones
  - `schedule`: (Opcional) Horarios laborales formateados
  - `currently_unavailable`: Si está temporalmente no disponible
  - `availability_note`: Nota sobre disponibilidad
  - `summary`: Resumen conversacional del profesional
- **count**: Número total de profesionales encontrados
- **search_criteria**: Criterios de búsqueda utilizados
- **message**: Mensaje contextual sobre los resultados

## Ejemplo de respuesta

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
      "bio": "Especialista en cardiología",
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
  "message": "Se encontró 1 profesional en Cardiología"
}
```

## Notas para el LLM

1. **Siempre incluye tenant_id**: Este parámetro es obligatorio.

2. **Búsqueda flexible**: Los parámetros `specialty` y `professional_name` hacen búsqueda parcial y case-insensitive, así que "cardio" encontrará "Cardiología", "garcía" encontrará "Dr. García", etc.

3. **Filtro por servicio**: Usa `service_id` cuando el usuario pregunta "¿Quién ofrece [servicio]?" o necesitas mostrar solo profesionales que ofrecen un servicio específico.

4. **Información de servicios**: Por defecto incluye los servicios que ofrece cada profesional (`include_services: true`). Esto es útil para mostrar opciones completas.

5. **Horarios laborales**: Usa `include_schedule: true` cuando el usuario pregunta sobre horarios de atención o necesitas mostrar cuándo atiende cada profesional.

6. **Disponibilidad**: Por defecto solo muestra profesionales activos (`only_available: true`). Si un profesional tiene ausencias activas, se marca como `currently_unavailable` pero no se excluye (para que el LLM pueda informar al usuario).

7. **Resumen conversacional**: El campo `summary` está diseñado para ser usado directamente en respuestas al usuario.

8. **Sin resultados**: Si `count` es 0, informa al usuario amablemente y sugiere verificar la búsqueda o contactar directamente.

## Flujo típico de uso

1. Usuario pregunta: "¿Qué profesionales tienen?"
   → Llamar con `tenant_id` solamente
   → Mostrar lista de profesionales con sus especialidades

2. Usuario pregunta: "¿Tienen cardiólogo?"
   → Llamar con `specialty: "Cardiología"`
   → Mostrar profesionales de esa especialidad

3. Usuario pregunta: "¿Quién ofrece limpieza dental?"
   → Llamar con `service_id` del servicio "Limpieza dental"
   → Mostrar profesionales que ofrecen ese servicio

4. Usuario quiere ver horarios de atención
   → Llamar con `include_schedule: true`
   → Mostrar horarios de cada profesional

