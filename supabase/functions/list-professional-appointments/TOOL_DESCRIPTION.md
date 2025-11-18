# Tool Description: list-professional-appointments

## Nombre
`list-professional-appointments`

## Descripción
Lista las citas de un profesional en un rango de fechas específico. Permite filtrar por estado y ordenar los resultados. Incluye información completa de cada cita: fechas formateadas, cliente, servicio, estado, y tiempo hasta la cita. Agrupa las citas por día para facilitar la visualización de calendario. Útil para que profesionales consulten su agenda, verificar disponibilidad antes de reprogramar, o generar vistas de calendario.

## Cuándo usar esta tool
- Cuando el profesional pregunta "¿Qué citas tengo?", "Muéstrame mi agenda"
- Cuando el profesional pregunta "¿Tengo citas hoy?", "¿Qué citas tengo esta semana?"
- Cuando necesitas verificar la disponibilidad del profesional antes de reprogramar una cita
- Cuando necesitas generar una vista de calendario para el profesional
- Cuando el profesional pregunta "¿Cuántas citas tengo en [período]?"
- Cuando necesitas verificar conflictos de horario para un profesional

## Parámetros

### Requeridos
- **tenant_id** (string, UUID): Identificador único del tenant/clínica. Siempre requerido.
- **professional_id** (string, UUID): Identificador único del profesional. Siempre requerido.

### Opcionales
- **date_from** (string, ISO date): Fecha de inicio del rango. Si no se especifica, usa la fecha de hoy. Formato: ISO 8601 (ej: "2025-01-20T00:00:00Z").
- **date_to** (string, ISO date): Fecha de fin del rango. Si no se especifica, usa 30 días desde hoy. Formato: ISO 8601 (ej: "2025-01-20T23:59:59Z").
- **status** (string): Filtrar por estado específico. Valores: 'all', 'confirmed', 'pending', 'cancelled', 'completed'. Si no se especifica o es 'all', retorna todos los estados (a menos que include_cancelled sea false).
- **include_cancelled** (boolean, default: true): Si es false, excluye las citas canceladas del resultado.
- **limit** (number, default: 100): Límite máximo de resultados a retornar.
- **order_by** (string, default: 'start_time_asc'): Orden de los resultados. Valores: 'start_time_asc' (más antiguas primero, útil para calendario), 'start_time_desc' (más recientes primero).

## Ejemplo de uso

### Caso 1: Listar todas las citas del profesional (próximos 30 días)
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "professional_id": "880e8400-e29b-41d4-a716-446655440003"
}
```

### Caso 2: Listar citas de un día específico
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "professional_id": "880e8400-e29b-41d4-a716-446655440003",
  "date_from": "2025-01-20T00:00:00Z",
  "date_to": "2025-01-20T23:59:59Z"
}
```

### Caso 3: Listar solo citas confirmadas en un rango
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "professional_id": "880e8400-e29b-41d4-a716-446655440003",
  "date_from": "2025-01-20T00:00:00Z",
  "date_to": "2025-01-27T23:59:59Z",
  "status": "confirmed"
}
```

### Caso 4: Agenda de la semana (sin canceladas)
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "professional_id": "880e8400-e29b-41d4-a716-446655440003",
  "date_from": "2025-01-20T00:00:00Z",
  "date_to": "2025-01-26T23:59:59Z",
  "include_cancelled": false,
  "order_by": "start_time_asc"
}
```

### Caso 5: Citas del mes
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "professional_id": "880e8400-e29b-41d4-a716-446655440003",
  "date_from": "2025-01-01T00:00:00Z",
  "date_to": "2025-01-31T23:59:59Z",
  "limit": 200
}
```

## Respuesta

La respuesta incluye:
- **tenant**: Información del tenant (id, business_name)
- **professional**: Información del profesional (id, name, specialty, email, phone)
- **date_range**: Rango de fechas consultado (from, to en ISO y formatted)
- **appointments**: Array de citas con información completa:
  - `id`, `status`: Identificador y estado de la cita
  - `datetime`: Fechas en formato ISO y formateadas conversacionalmente
  - `time_until`: Información sobre cuánto tiempo falta (horas, días, minutos, mensaje, is_past, is_today, is_future)
  - `client`: Información del cliente (nombre, teléfono, email)
  - `professional`: Información del profesional
  - `service`: Información del servicio (nombre, descripción, duración, precio)
  - `notes`: Notas de la cita
  - `cancellation_reason`: Razón de cancelación (si está cancelada)
  - `metadata`: Información de creación, actualización, cancelación, finalización
  - `summary`: Resumen conversacional de la cita
- **grouped_by_day**: Objeto que agrupa las citas por día (clave: YYYY-MM-DD, valor: array de citas ordenadas por hora). Útil para visualización de calendario.
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

## Notas para el LLM

1. **Rango de fechas**: Por defecto, si no se especifican `date_from` y `date_to`, la función retorna las citas desde hoy hasta 30 días en el futuro. Esto es útil para ver la agenda próxima del profesional.

2. **Agrupación por día**: El campo `grouped_by_day` es especialmente útil para generar vistas de calendario. Las citas dentro de cada día están ordenadas por hora (ascendente).

3. **Filtros útiles**:
   - Para "citas de hoy": `date_from` y `date_to` del día actual
   - Para "citas de esta semana": `date_from` = inicio de semana, `date_to` = fin de semana
   - Para "citas confirmadas": `status: 'confirmed'`
   - Para "agenda sin canceladas": `include_cancelled: false`

4. **Información completa**: Cada cita incluye toda la información necesaria (fechas formateadas, cliente, servicio, estado). Usa los campos `formatted` para mostrar fechas de manera conversacional.

5. **Tiempo hasta la cita**: El campo `time_until.message` es especialmente útil para decir "En 2 días", "Mañana", "Hoy", "Ya pasó", etc.

6. **Resumen estadístico**: El campo `summary` te permite responder preguntas como "¿Cuántas citas tiene el profesional?" o "¿Cuántas citas confirmadas tiene?"

7. **Mensaje resumen**: El campo `message` está diseñado para ser usado directamente en respuestas al usuario.

8. **Ordenamiento**: Por defecto, las citas se ordenan por fecha ascendente (más antiguas primero), lo cual es útil para visualización de calendario. Para ver las más próximas primero, usa `order_by: 'start_time_asc'` (que es el default).

9. **Errores comunes**:
   - Si el profesional no existe, retorna error 404 con código 'PROFESSIONAL_NOT_FOUND'
   - Si el profesional está inactivo, retorna error 403 con código 'PROFESSIONAL_INACTIVE'
   - Si `date_from > date_to`, retorna error 400 con código 'INVALID_DATE_RANGE'

## Flujo típico de uso

1. Profesional pregunta: "¿Qué citas tengo?"
   → Llamar con `tenant_id` y `professional_id` (usa defaults: hoy a +30 días)
   → Usar `appointments` para listar todas las citas
   → Usar `summary` para dar un resumen rápido

2. Profesional pregunta: "¿Tengo citas hoy?"
   → Llamar con `date_from` y `date_to` del día actual
   → Usar `summary.today` para verificar
   → O filtrar por `time_until.is_today === true`

3. Profesional pregunta: "Muéstrame mi agenda de esta semana"
   → Llamar con `date_from` = inicio de semana, `date_to` = fin de semana
   → Usar `grouped_by_day` para mostrar citas agrupadas por día
   → Ordenar por día y hora

4. Antes de reprogramar una cita
   → Llamar para verificar disponibilidad del profesional en el nuevo horario
   → Verificar que no haya conflictos en `appointments`

5. Generar vista de calendario
   → Llamar con el rango de fechas deseado
   → Usar `grouped_by_day` para estructurar la vista por día
   → Cada día tiene un array de citas ordenadas por hora

