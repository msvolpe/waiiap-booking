# Tool Description: get-appointment-details

## Nombre
`get-appointment-details`

## Descripción
Obtiene información detallada y completa de una cita específica. Incluye datos del cliente, profesional, servicio, fechas formateadas, estado de notificaciones, historial de reprogramaciones, seguimientos relacionados, y opcionalmente el historial del cliente y el horario del profesional. Útil para responder preguntas del usuario sobre su cita o verificar detalles antes de realizar operaciones como cancelar o reprogramar.

## Cuándo usar esta tool
- Cuando el usuario pregunta "¿Cuándo es mi cita?", "¿Qué día tengo cita?", "¿A qué hora es mi cita?"
- Cuando el usuario pregunta "¿Quién es mi doctor?", "¿Con quién tengo cita?"
- Cuando el usuario pregunta "¿Qué servicio tengo agendado?"
- Cuando necesitas verificar detalles antes de cancelar o reprogramar una cita
- Cuando el usuario pregunta "¿Me confirmaron la cita?", "¿Enviaron el recordatorio?"
- Cuando necesitas mostrar información completa de una cita al usuario
- Cuando el usuario pregunta sobre el historial de sus citas (con include_client_history)

## Parámetros

### Requeridos
- **tenant_id** (string, UUID): Identificador único del tenant/clínica. Siempre requerido.
- **appointment_id** (string, UUID): Identificador único de la cita. Siempre requerido.

### Opcionales
- **include_client_history** (boolean, default: false): Si es true, incluye el historial de las últimas 10 citas del cliente. Útil cuando el usuario pregunta sobre su historial.
- **include_professional_schedule** (boolean, default: false): Si es true, incluye el horario laboral del profesional. Útil para mostrar disponibilidad.

## Ejemplo de uso

### Caso 1: Obtener detalles básicos
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

### Caso 2: Con historial del cliente
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "660e8400-e29b-41d4-a716-446655440001",
  "include_client_history": true
}
```

### Caso 3: Con horario del profesional
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "660e8400-e29b-41d4-a716-446655440001",
  "include_professional_schedule": true
}
```

## Respuesta

La respuesta incluye:
- **appointment**: Información completa de la cita:
  - `id`, `status`: Identificador y estado de la cita
  - `datetime`: Fechas en formato ISO y formateadas conversacionalmente
  - `time_until`: Información sobre cuánto tiempo falta (horas, días, minutos, mensaje)
  - `client`: Información del cliente (nombre, teléfono, email, preferencias)
  - `professional`: Información del profesional (nombre, especialidad, contacto)
  - `service`: Información del servicio (nombre, descripción, duración, precio)
  - `notes`: Notas públicas e internas
  - `cancellation`: Información de cancelación (si está cancelada)
  - `rescheduling`: Información de reprogramaciones (historial completo)
  - `notifications`: Estado de todas las notificaciones relacionadas
  - `followups`: Seguimientos post-cita (encuestas, reseñas)
  - `metadata`: Información de creación, actualización, envío de notificaciones
- **client_history**: (Opcional) Historial de las últimas 10 citas del cliente
- **professional_schedule**: (Opcional) Horario laboral del profesional
- **summary**: Resumen conversacional de la cita listo para mostrar al usuario

## Ejemplo de respuesta

```json
{
  "appointment": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "confirmed",
    "datetime": {
      "formatted": {
        "date": "lunes 20 de enero de 2025",
        "time": "14:00",
        "full": "lunes 20 de enero de 2025 a las 14:00"
      },
      "day_of_week": "lunes",
      "time_period": "afternoon",
      "duration_minutes": 30
    },
    "time_until": {
      "days": 2,
      "message": "En 2 días",
      "is_past": false,
      "is_today": false
    },
    "client": {
      "name": "Juan Pérez",
      "phone": "+5491123456789"
    },
    "professional": {
      "name": "Dr. García",
      "specialty": "Cardiología"
    },
    "service": {
      "name": "Consulta General",
      "duration_minutes": 30,
      "price": "50.00"
    }
  },
  "summary": "Cita confirmada - para Consulta General - con Dr. García - el lunes 20 de enero de 2025 a las 14:00 - (En 2 días)"
}
```

## Notas para el LLM

1. **Siempre incluye tenant_id y appointment_id**: Ambos parámetros son obligatorios.

2. **Información completa**: La respuesta incluye toda la información necesaria para responder preguntas del usuario sobre su cita.

3. **Fechas formateadas**: Usa los campos `formatted` para mostrar fechas de manera conversacional al usuario. El campo `time_until.message` es especialmente útil para decir "En 2 días", "Mañana", "Hoy", etc.

4. **Historial de reprogramaciones**: Si la cita fue reprogramada, el campo `rescheduling.history` contiene todas las citas relacionadas en orden cronológico.

5. **Estado de notificaciones**: El campo `notifications` te permite verificar si se enviaron confirmaciones, recordatorios, etc., y responder preguntas como "¿Me confirmaron la cita?"

6. **Seguimientos**: El campo `followups` muestra si hay encuestas de satisfacción o solicitudes de reseñas relacionadas con esta cita.

7. **Historial del cliente**: Usa `include_client_history: true` cuando el usuario pregunte sobre su historial de citas o quieras mostrar todas sus citas anteriores.

8. **Horario del profesional**: Usa `include_professional_schedule: true` cuando necesites mostrar el horario de atención del profesional.

9. **Resumen conversacional**: El campo `summary` está diseñado para ser usado directamente en respuestas al usuario.

10. **Errores comunes**:
    - Si la cita no existe, retorna error 404 con código 'APPOINTMENT_NOT_FOUND'
    - Si el tenant no existe o está inactivo, retorna error 404 o 403

## Flujo típico de uso

1. Usuario pregunta: "¿Cuándo es mi cita?"
   → Primero necesitas obtener el appointment_id (usando list-client-appointments o buscando por teléfono)
   → Luego llamar con `tenant_id` y `appointment_id`
   → Usar `datetime.formatted.full` y `time_until.message` para responder

2. Usuario pregunta: "¿Con quién tengo cita?"
   → Llamar con `tenant_id` y `appointment_id`
   → Usar `professional.name` y `professional.specialty` para responder

3. Usuario pregunta: "¿Qué servicio tengo agendado?"
   → Llamar con `tenant_id` y `appointment_id`
   → Usar `service.name` y `service.description` para responder

4. Usuario pregunta: "Muéstrame mi historial de citas"
   → Llamar con `include_client_history: true`
   → Usar `client_history` para mostrar todas las citas

5. Antes de cancelar o reprogramar
   → Llamar para verificar detalles y estado actual
   → Confirmar con el usuario antes de proceder

