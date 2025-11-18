# Tool Description: list-client-appointments

## Nombre
`list-client-appointments`

## Descripción
Lista todas las citas de un cliente específico. Permite filtrar por estado, fechas (pasadas/futuras), y ordenar los resultados. Incluye información completa de cada cita: fechas formateadas, profesional, servicio, estado, y tiempo hasta la cita. Útil para responder preguntas del usuario sobre sus citas, mostrar su historial, o encontrar una cita específica antes de realizar operaciones como cancelar o reprogramar.

## Cuándo usar esta tool
- Cuando el usuario pregunta "¿Qué citas tengo?", "¿Cuándo tengo mi próxima cita?", "Muéstrame mis citas"
- Cuando el usuario pregunta "¿Tengo alguna cita hoy?", "¿Tengo citas esta semana?"
- Cuando necesitas encontrar una cita específica del cliente antes de cancelar o reprogramar
- Cuando el usuario pregunta sobre su historial de citas
- Cuando necesitas verificar si un cliente tiene citas futuras o pasadas
- Cuando el usuario pregunta "¿Cuántas citas tengo?"

## Parámetros

### Requeridos
- **tenant_id** (string, UUID): Identificador único del tenant/clínica. Siempre requerido.

### Identificadores de Cliente (al menos uno requerido)
- **client_id** (string, UUID): Identificador único del cliente. Preferido si está disponible.
- **client_phone** (string): Teléfono del cliente. Alternativa a client_id.
- **client_email** (string): Email del cliente. Alternativa a client_id.

### Opcionales
- **status** (string): Filtrar por estado específico. Valores: 'confirmed', 'pending', 'cancelled', 'completed'. Si no se especifica, retorna todos los estados (a menos que include_cancelled sea false).
- **only_future** (boolean, default: false): Si es true, solo retorna citas futuras (start_time >= ahora).
- **only_past** (boolean, default: false): Si es true, solo retorna citas pasadas (start_time < ahora). No puede ser true al mismo tiempo que only_future.
- **include_cancelled** (boolean, default: true): Si es false, excluye las citas canceladas del resultado.
- **limit** (number, default: 50): Límite máximo de resultados a retornar.
- **order_by** (string, default: 'start_time_desc'): Orden de los resultados. Valores: 'start_time_asc' (más antiguas primero), 'start_time_desc' (más recientes primero).

## Ejemplo de uso

### Caso 1: Listar todas las citas de un cliente (por ID)
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

### Caso 2: Listar citas futuras de un cliente (por teléfono)
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_phone": "+5491123456789",
  "only_future": true
}
```

### Caso 3: Listar solo citas confirmadas y futuras
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_email": "cliente@example.com",
  "status": "confirmed",
  "only_future": true
}
```

### Caso 4: Historial de citas pasadas (sin canceladas)
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "660e8400-e29b-41d4-a716-446655440001",
  "only_past": true,
  "include_cancelled": false,
  "order_by": "start_time_desc"
}
```

### Caso 5: Próximas 10 citas
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "660e8400-e29b-41d4-a716-446655440001",
  "only_future": true,
  "limit": 10,
  "order_by": "start_time_asc"
}
```

## Respuesta

La respuesta incluye:
- **tenant**: Información del tenant (id, business_name)
- **client**: Información del cliente (id, name, phone, email)
- **appointments**: Array de citas con información completa:
  - `id`, `status`: Identificador y estado de la cita
  - `datetime`: Fechas en formato ISO y formateadas conversacionalmente
  - `time_until`: Información sobre cuánto tiempo falta (horas, días, minutos, mensaje, is_past, is_today, is_future)
  - `client`: Información del cliente
  - `professional`: Información del profesional (nombre, especialidad, contacto)
  - `service`: Información del servicio (nombre, descripción, duración, precio)
  - `notes`: Notas de la cita
  - `cancellation_reason`: Razón de cancelación (si está cancelada)
  - `metadata`: Información de creación, actualización, cancelación, finalización
  - `summary`: Resumen conversacional de la cita
- **count**: Número total de citas retornadas
- **summary**: Resumen estadístico:
  - `total`: Total de citas
  - `future`: Citas futuras
  - `past`: Citas pasadas
  - `today`: Citas de hoy
  - `by_status`: Conteo por estado (confirmed, pending, cancelled, completed)
- **filters_applied**: Filtros que se aplicaron en la consulta
- **message**: Mensaje resumen listo para mostrar al usuario

## Ejemplo de respuesta

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
      "summary": "Cita confirmada - para Consulta General - con Dr. García - el lunes 20 de enero de 2025 a las 14:00 - (En 2 días)"
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

## Notas para el LLM

1. **Identificación del cliente**: Puedes usar `client_id`, `client_phone`, o `client_email`. Si tienes el ID del cliente, úsalo directamente. Si solo tienes el teléfono o email, úsalos para buscar al cliente.

2. **Filtros útiles**:
   - Para "próxima cita": `only_future: true, limit: 1, order_by: 'start_time_asc'`
   - Para "citas de hoy": `only_future: true` y luego filtrar por `is_today: true` en los resultados
   - Para "historial": `only_past: true, include_cancelled: false`
   - Para "citas confirmadas": `status: 'confirmed'`

3. **Información completa**: Cada cita incluye toda la información necesaria (fechas formateadas, profesional, servicio, estado). Usa los campos `formatted` para mostrar fechas de manera conversacional.

4. **Tiempo hasta la cita**: El campo `time_until.message` es especialmente útil para decir "En 2 días", "Mañana", "Hoy", "Ya pasó", etc.

5. **Resumen estadístico**: El campo `summary` te permite responder preguntas como "¿Cuántas citas tengo?" o "¿Cuántas citas futuras tengo?"

6. **Mensaje resumen**: El campo `message` está diseñado para ser usado directamente en respuestas al usuario.

7. **Ordenamiento**: Por defecto, las citas se ordenan por fecha descendente (más recientes primero). Para la próxima cita, usa `order_by: 'start_time_asc'` con `limit: 1`.

8. **Errores comunes**:
   - Si el cliente no existe, retorna error 404 con código 'CLIENT_NOT_FOUND'
   - Si no se proporciona ningún identificador de cliente, retorna error 400 con código 'MISSING_CLIENT_IDENTIFIER'
   - Si `only_future` y `only_past` son ambos true, retorna error 400

## Flujo típico de uso

1. Usuario pregunta: "¿Qué citas tengo?"
   → Llamar con `tenant_id` y `client_phone` (o `client_id` si está disponible)
   → Usar `appointments` para listar todas las citas
   → Usar `summary` para dar un resumen rápido

2. Usuario pregunta: "¿Cuándo es mi próxima cita?"
   → Llamar con `only_future: true, limit: 1, order_by: 'start_time_asc'`
   → Usar `appointments[0]` para obtener la próxima cita
   → Usar `datetime.formatted.full` y `time_until.message` para responder

3. Usuario pregunta: "¿Tengo citas hoy?"
   → Llamar con `only_future: true`
   → Filtrar resultados donde `time_until.is_today === true`
   → O usar `summary.today` para verificar

4. Usuario pregunta: "Muéstrame mi historial"
   → Llamar con `only_past: true, include_cancelled: false, order_by: 'start_time_desc'`
   → Usar `appointments` para mostrar todas las citas pasadas

5. Antes de cancelar o reprogramar
   → Llamar para encontrar la cita específica
   → Usar el `id` de la cita encontrada para cancelar o reprogramar

