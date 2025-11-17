# Tool Description: get-available-slots

## Nombre
`get-available-slots`

## Descripción
Obtiene horarios disponibles (slots) para agendar una cita. Busca en un rango de fechas, considera horarios laborales, excluye citas existentes y ausencias de profesionales, y retorna slots formateados de manera conversacional. Útil para mostrar al usuario opciones de horarios disponibles antes de crear una cita.

## Cuándo usar esta tool
- Cuando el usuario pregunta "¿Qué horarios tienen disponibles?", "¿Cuándo puedo agendar?"
- Cuando el usuario quiere ver opciones de horarios para un servicio específico
- Cuando necesitas mostrar horarios disponibles después de que el usuario seleccionó un servicio
- Cuando el usuario pregunta "¿Tienen horario mañana/tarde/noche?"
- Cuando necesitas verificar disponibilidad antes de crear una cita

## Parámetros

### Requeridos
- **tenant_id** (string, UUID): Identificador único del tenant/clínica. Siempre requerido.
- **service_id** (string, UUID): Identificador del servicio. Siempre requerido.

### Opcionales
- **professional_id** (string, UUID): Identificador del profesional. Si no se especifica, busca en todos los profesionales que ofrecen el servicio.
- **date_from** (string, YYYY-MM-DD): Fecha de inicio del rango. Default: hoy.
- **date_to** (string, YYYY-MM-DD): Fecha de fin del rango. Default: +30 días desde hoy.
- **preferred_time** (string, default: 'any'): Filtro por período del día. Valores: 'morning', 'afternoon', 'evening', 'any'.
- **max_results** (number, default: 20): Límite de slots a retornar.
- **prioritize** (string, default: 'earliest'): Ordenar por fecha más cercana ('earliest') o lejana ('latest').

## Ejemplo de uso

### Caso 1: Obtener slots disponibles básico
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "service_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

### Caso 2: Para un profesional específico
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "service_id": "660e8400-e29b-41d4-a716-446655440001",
  "professional_id": "770e8400-e29b-41d4-a716-446655440002"
}
```

### Caso 3: Solo horarios de mañana
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "service_id": "660e8400-e29b-41d4-a716-446655440001",
  "preferred_time": "morning"
}
```

## Respuesta

La respuesta incluye:
- **tenant**: Información del tenant
- **service**: Información del servicio
- **available_slots**: Array de slots disponibles, cada uno con:
  - `datetime`: Fecha/hora en formato ISO8601
  - `date`: Fecha formateada (ej: "sábado 25 de enero")
  - `time`: Hora formateada (ej: "10:00")
  - `formatted`: Fecha y hora completa (ej: "sábado 25 de enero a las 10:00")
  - `professional_id`: ID del profesional
  - `professional_name`: Nombre del profesional
  - `service_name`: Nombre del servicio
  - `duration_minutes`: Duración en minutos
  - `price`: Precio formateado
  - `end_time`: Hora de fin
  - `day_of_week`: Día de la semana
  - `time_period`: Período del día (morning, afternoon, evening)
- **count**: Número total de slots encontrados
- **search_criteria**: Criterios de búsqueda utilizados

## Ejemplo de respuesta

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
      "professional_name": "Dr. García",
      "duration_minutes": 30,
      "price": "50.00",
      "day_of_week": "sábado",
      "time_period": "morning"
    }
  ],
  "count": 1
}
```

## Notas para el LLM

1. **Siempre incluye tenant_id y service_id**: Ambos parámetros son obligatorios.

2. **Búsqueda inteligente**: La función busca slots disponibles considerando:
   - Horarios laborales del profesional o tenant
   - Citas existentes (excluidas)
   - Ausencias de profesionales
   - Buffer entre citas
   - Mínimo 1 hora de anticipación

3. **Filtros útiles**:
   - `preferred_time`: Para filtrar por mañana/tarde/noche
   - `date_from/date_to`: Para especificar un rango de fechas
   - `max_results`: Para limitar la cantidad de resultados

4. **Formato conversacional**: Los slots vienen formateados de manera conversacional, listos para mostrar al usuario. Usa el campo `formatted` para mostrar directamente.

5. **Múltiples profesionales**: Si no se especifica `professional_id`, puede retornar slots de diferentes profesionales que ofrecen el servicio.

6. **Sin resultados**: Si `count` es 0, informa al usuario amablemente y sugiere otro rango de fechas o servicio.

7. **Ordenamiento**: Por defecto ordena por fecha más cercana (`prioritize: 'earliest'`), mostrando primero los horarios más próximos.

8. **Flujo típico**: 
   - Usuario selecciona servicio → `get-available-slots`
   - Usuario elige un slot → `create-appointment`

## Flujo típico de uso

1. Usuario pregunta: "¿Qué horarios tienen disponibles?"
   → Llamar con `tenant_id` y `service_id`
   → Mostrar los slots usando el campo `formatted`

2. Usuario quiere horarios de mañana
   → Llamar con `preferred_time: "morning"`

3. Usuario quiere ver horarios de un profesional específico
   → Llamar con `professional_id` específico

4. Usuario quiere ver horarios de la próxima semana
   → Llamar con `date_from` y `date_to` del rango deseado

