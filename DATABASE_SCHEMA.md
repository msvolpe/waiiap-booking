# Esquema de Base de Datos - Sistema de Gestión de Citas

## Tablas del Sistema

---

### 1. **tenants**
**Descripción:** Almacena la información de las clínicas, consultorios o negocios que utilizan el sistema. Cada tenant representa una organización independiente con su propia configuración.

**Campos:**
- `id` (uuid, PK) - Identificador único del tenant
- `slug` (varchar, unique) - Identificador legible único para URLs
- `business_name` (varchar) - Nombre del negocio/clínica
- `business_type` (varchar, nullable) - Tipo de negocio
- `email` (varchar) - Email de contacto
- `phone` (varchar, nullable) - Teléfono de contacto
- `website` (varchar, nullable) - Sitio web
- `address` (text, nullable) - Dirección física
- `city` (varchar, nullable) - Ciudad
- `country` (varchar, nullable) - País
- `timezone` (varchar, nullable, default: 'America/Argentina/Buenos_Aires') - Zona horaria
- `default_appointment_duration` (integer, nullable, default: 30) - Duración predeterminada de citas en minutos
- `buffer_minutes` (integer, nullable, default: 0) - Tiempo de buffer entre citas
- `google_calendar_id` (varchar, nullable) - ID del calendario de Google Calendar
- `google_place_id` (varchar, nullable) - ID de Google Places
- `google_review_link` (text, nullable) - Enlace para reseñas de Google
- `plan` (varchar, nullable, default: 'free') - Plan de suscripción
- `max_appointments_per_month` (integer, nullable, default: 100) - Límite de citas por mes
- `followup_enabled` (boolean, nullable, default: true) - Si está habilitado el seguimiento post-cita
- `followup_hours_after` (integer, nullable, default: 24) - Horas después de la cita para seguimiento
- `followup_message_template` (text, nullable) - Plantilla de mensaje de seguimiento
- `inactive_patient_days` (integer, nullable, default: 90) - Días para considerar paciente inactivo
- `inactive_recovery_enabled` (boolean, nullable, default: false) - Si está habilitada la recuperación de pacientes inactivos
- `inactive_recovery_message_template` (text, nullable) - Plantilla para recuperación de pacientes inactivos
- `is_active` (boolean, nullable, default: true) - Si el tenant está activo
- `suspended_at` (timestamptz, nullable) - Fecha de suspensión
- `suspended_reason` (text, nullable) - Razón de suspensión
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 2. **professionals**
**Descripción:** Almacena la información de los profesionales (médicos, terapeutas, etc.) que trabajan en cada tenant. Cada profesional puede tener múltiples servicios y horarios.

**Campos:**
- `id` (uuid, PK) - Identificador único del profesional
- `tenant_id` (uuid, FK → tenants.id) - Tenant al que pertenece
- `full_name` (varchar) - Nombre completo
- `email` (varchar, nullable) - Email de contacto
- `phone` (varchar, nullable) - Teléfono de contacto
- `specialty` (varchar, nullable) - Especialidad
- `bio` (text, nullable) - Biografía/descripción
- `license_number` (varchar, nullable) - Número de licencia profesional
- `google_calendar_id` (varchar, nullable) - ID del calendario de Google Calendar
- `color` (varchar, nullable, default: '#3B82F6') - Color para visualización
- `avatar_url` (text, nullable) - URL de la foto de perfil
- `is_active` (boolean, nullable, default: true) - Si el profesional está activo
- `display_order` (integer, nullable, default: 0) - Orden de visualización
- `metadata` (jsonb, nullable) - Datos adicionales en formato JSON
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 3. **services**
**Descripción:** Almacena los servicios que ofrece cada tenant. Los servicios pueden ser ofrecidos por múltiples profesionales con precios y duraciones personalizadas.

**Campos:**
- `id` (uuid, PK) - Identificador único del servicio
- `tenant_id` (uuid, FK → tenants.id) - Tenant al que pertenece
- `name` (varchar) - Nombre del servicio
- `description` (text, nullable) - Descripción del servicio
- `duration_minutes` (integer) - Duración en minutos
- `price` (numeric, nullable) - Precio del servicio
- `color` (varchar, nullable, default: '#3B82F6') - Color para visualización
- `is_active` (boolean, nullable, default: true) - Si el servicio está activo
- `requires_approval` (boolean, nullable, default: false) - Si requiere aprobación antes de confirmar
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 4. **professional_services**
**Descripción:** Tabla de relación muchos-a-muchos entre profesionales y servicios. Permite que cada profesional tenga precios y duraciones personalizadas para cada servicio.

**Campos:**
- `id` (uuid, PK) - Identificador único de la relación
- `professional_id` (uuid, FK → professionals.id) - Profesional
- `service_id` (uuid, FK → services.id) - Servicio
- `custom_duration_minutes` (integer, nullable) - Duración personalizada en minutos
- `custom_price` (numeric, nullable) - Precio personalizado
- `is_active` (boolean, nullable, default: true) - Si la relación está activa
- `notes` (text, nullable) - Notas adicionales
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 5. **clients**
**Descripción:** Almacena la información de los pacientes/clientes que reservan citas. Incluye estadísticas de citas, cancelaciones y no-shows.

**Campos:**
- `id` (uuid, PK) - Identificador único del cliente
- `tenant_id` (uuid, FK → tenants.id) - Tenant al que pertenece
- `full_name` (varchar) - Nombre completo
- `phone` (varchar) - Teléfono
- `email` (varchar, nullable) - Email
- `date_of_birth` (date, nullable) - Fecha de nacimiento
- `gender` (varchar, nullable) - Género
- `notes` (text, nullable) - Notas sobre el cliente
- `tags` (text[], nullable) - Etiquetas para categorización
- `preferred_communication` (varchar, nullable) - Canal de comunicación preferido
- `last_appointment_at` (timestamptz, nullable) - Fecha de última cita
- `total_appointments` (integer, nullable, default: 0) - Total de citas realizadas
- `total_cancellations` (integer, nullable, default: 0) - Total de cancelaciones
- `total_no_shows` (integer, nullable, default: 0) - Total de no-shows
- `is_active` (boolean, nullable, default: true) - Si el cliente está activo
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 6. **appointments**
**Descripción:** Almacena todas las citas del sistema. Incluye información de estado, reprogramaciones, integración con Google Calendar y seguimiento de notificaciones.

**Campos:**
- `id` (uuid, PK) - Identificador único de la cita
- `tenant_id` (uuid, FK → tenants.id) - Tenant
- `client_id` (uuid, FK → clients.id, nullable) - Cliente
- `service_id` (uuid, FK → services.id, nullable) - Servicio
- `professional_id` (uuid, FK → professionals.id, nullable) - Profesional
- `google_event_id` (varchar, nullable) - ID del evento en Google Calendar
- `google_calendar_id` (varchar, nullable) - ID del calendario de Google
- `start_time` (timestamptz) - Hora de inicio
- `end_time` (timestamptz) - Hora de fin
- `status` (varchar, default: 'confirmed') - Estado de la cita (confirmed, pending, cancelled, completed)
- `notes` (text, nullable) - Notas visibles para el cliente
- `internal_notes` (text, nullable) - Notas internas
- `cancellation_reason` (text, nullable) - Razón de cancelación
- `original_appointment_id` (uuid, FK → appointments.id, nullable) - ID de la cita original (para reprogramaciones)
- `rescheduled_from_id` (uuid, FK → appointments.id, nullable) - ID de la cita de la que se reprogramó
- `rescheduled_to_id` (uuid, FK → appointments.id, nullable) - ID de la cita a la que se reprogramó
- `rescheduled_at` (timestamptz, nullable) - Fecha de reprogramación
- `rescheduled_by` (varchar, nullable) - Quién reprogramó
- `reminder_sent_at` (timestamptz, nullable) - Fecha en que se envió el recordatorio
- `confirmation_sent_at` (timestamptz, nullable) - Fecha en que se envió la confirmación
- `created_by` (varchar, nullable) - Quién creó la cita
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización
- `cancelled_at` (timestamptz, nullable) - Fecha de cancelación
- `completed_at` (timestamptz, nullable) - Fecha de finalización

---

### 7. **business_hours**
**Descripción:** Define los horarios laborales por día de la semana. Puede ser a nivel de tenant (horario general) o por profesional (horario específico).

**Campos:**
- `id` (uuid, PK) - Identificador único
- `tenant_id` (uuid, FK → tenants.id) - Tenant
- `professional_id` (uuid, FK → professionals.id, nullable) - Profesional (null = horario del tenant)
- `day_of_week` (integer) - Día de la semana (0=domingo, 1=lunes, ..., 6=sábado)
- `start_time` (time) - Hora de inicio
- `end_time` (time) - Hora de fin
- `is_active` (boolean, nullable, default: true) - Si el horario está activo
- `notes` (text, nullable) - Notas adicionales
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 8. **professional_unavailability**
**Descripción:** Registra períodos de ausencia de profesionales (vacaciones, licencias, etc.). Se usa para bloquear citas durante estos períodos.

**Campos:**
- `id` (uuid, PK) - Identificador único
- `tenant_id` (uuid, FK → tenants.id) - Tenant
- `professional_id` (uuid, FK → professionals.id) - Profesional
- `start_datetime` (timestamptz) - Fecha y hora de inicio de la ausencia
- `end_datetime` (timestamptz) - Fecha y hora de fin de la ausencia
- `reason_type` (varchar, nullable) - Tipo de razón (vacation, sick, training, etc.)
- `reason_description` (text, nullable) - Descripción de la razón
- `notify_patients` (boolean, nullable, default: true) - Si se deben notificar a los pacientes
- `auto_reschedule` (boolean, nullable, default: false) - Si se deben reprogramar automáticamente las citas afectadas
- `is_active` (boolean, nullable, default: true) - Si la ausencia está activa
- `created_by` (varchar, nullable) - Quién creó el registro
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 9. **blocked_slots**
**Descripción:** Define franjas horarias bloqueadas específicas (no disponibles para citas). Diferente de unavailability porque son bloqueos puntuales, no períodos largos.

**Campos:**
- `id` (uuid, PK) - Identificador único
- `tenant_id` (uuid, FK → tenants.id) - Tenant
- `professional_id` (uuid, FK → professionals.id, nullable) - Profesional (null = bloqueo a nivel tenant)
- `start_time` (timestamptz) - Fecha y hora de inicio del bloqueo
- `end_time` (timestamptz) - Fecha y hora de fin del bloqueo
- `reason` (varchar, nullable) - Razón del bloqueo
- `description` (text, nullable) - Descripción adicional
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación

---

### 10. **notification_queue**
**Descripción:** Cola de notificaciones a enviar. Maneja confirmaciones, recordatorios, seguimientos y campañas de marketing. Incluye sistema de reintentos y prioridades.

**Campos:**
- `id` (uuid, PK) - Identificador único
- `tenant_id` (uuid, FK → tenants.id) - Tenant
- `client_id` (uuid, FK → clients.id, nullable) - Cliente destinatario
- `recipient_phone` (varchar, nullable) - Teléfono del destinatario
- `recipient_email` (varchar, nullable) - Email del destinatario
- `notification_type` (varchar) - Tipo de notificación (appointment_confirmation, appointment_reminder, followup, etc.)
- `channel` (varchar) - Canal de envío (whatsapp, email, sms)
- `subject` (varchar, nullable) - Asunto (para email)
- `message` (text) - Contenido del mensaje
- `appointment_id` (uuid, FK → appointments.id, nullable) - Cita relacionada
- `followup_id` (uuid, FK → appointment_followups.id, nullable) - Seguimiento relacionado
- `campaign_id` (uuid, FK → marketing_campaigns.id, nullable) - Campaña relacionada
- `status` (varchar, nullable, default: 'pending') - Estado (pending, sent, delivered, failed)
- `scheduled_for` (timestamptz) - Fecha programada para envío
- `sent_at` (timestamptz, nullable) - Fecha de envío
- `delivered_at` (timestamptz, nullable) - Fecha de entrega
- `error_message` (text, nullable) - Mensaje de error si falla
- `retry_count` (integer, nullable, default: 0) - Número de reintentos
- `max_retries` (integer, nullable, default: 3) - Máximo de reintentos
- `priority` (integer, nullable, default: 5) - Prioridad (1=más alta, 10=más baja)
- `metadata` (jsonb, nullable) - Datos adicionales en formato JSON
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 11. **appointment_followups**
**Descripción:** Gestiona los seguimientos post-cita, incluyendo encuestas de satisfacción, solicitudes de reseñas y recuperación de pacientes inactivos.

**Campos:**
- `id` (uuid, PK) - Identificador único
- `tenant_id` (uuid, FK → tenants.id) - Tenant
- `appointment_id` (uuid, FK → appointments.id) - Cita relacionada
- `client_id` (uuid, FK → clients.id) - Cliente
- `followup_type` (varchar) - Tipo de seguimiento (satisfaction_survey, review_request, inactive_recovery)
- `status` (varchar, default: 'pending') - Estado (pending, sent, delivered, responded, completed)
- `channel` (varchar, nullable) - Canal de envío
- `message_sent` (text, nullable) - Mensaje enviado
- `client_response` (text, nullable) - Respuesta del cliente
- `client_rating` (integer, nullable) - Calificación del cliente (1-5)
- `client_review_text` (text, nullable) - Texto de la reseña del cliente
- `google_review_left` (boolean, nullable, default: false) - Si dejó reseña en Google
- `scheduled_for` (timestamptz) - Fecha programada para envío
- `sent_at` (timestamptz, nullable) - Fecha de envío
- `delivered_at` (timestamptz, nullable) - Fecha de entrega
- `opened_at` (timestamptz, nullable) - Fecha de apertura
- `responded_at` (timestamptz, nullable) - Fecha de respuesta
- `metadata` (jsonb, nullable) - Datos adicionales en formato JSON
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 12. **marketing_campaigns**
**Descripción:** Define campañas de marketing dirigidas a segmentos específicos de clientes (recuperación de inactivos, promociones, etc.).

**Campos:**
- `id` (uuid, PK) - Identificador único
- `tenant_id` (uuid, FK → tenants.id) - Tenant
- `name` (varchar) - Nombre de la campaña
- `description` (text, nullable) - Descripción
- `campaign_type` (varchar) - Tipo de campaña (inactive_recovery, promotion, seasonal, etc.)
- `target_audience` (varchar, nullable) - Audiencia objetivo
- `inactive_days_threshold` (integer, nullable) - Días de inactividad para segmentar
- `message_template` (text) - Plantilla del mensaje
- `channel` (varchar, nullable) - Canal de envío
- `cta_text` (varchar, nullable) - Texto del call-to-action
- `cta_url` (text, nullable) - URL del call-to-action
- `status` (varchar, nullable, default: 'draft') - Estado (draft, scheduled, active, completed, cancelled)
- `scheduled_at` (timestamptz, nullable) - Fecha programada
- `started_at` (timestamptz, nullable) - Fecha de inicio
- `completed_at` (timestamptz, nullable) - Fecha de finalización
- `total_recipients` (integer, nullable, default: 0) - Total de destinatarios
- `total_sent` (integer, nullable, default: 0) - Total enviados
- `total_delivered` (integer, nullable, default: 0) - Total entregados
- `total_opened` (integer, nullable, default: 0) - Total abiertos
- `total_clicked` (integer, nullable, default: 0) - Total de clics
- `total_converted` (integer, nullable, default: 0) - Total de conversiones (citas creadas)
- `created_by` (varchar, nullable) - Quién creó la campaña
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 13. **campaign_recipients**
**Descripción:** Registra los destinatarios individuales de cada campaña de marketing y su estado de interacción.

**Campos:**
- `id` (uuid, PK) - Identificador único
- `campaign_id` (uuid, FK → marketing_campaigns.id) - Campaña
- `client_id` (uuid, FK → clients.id) - Cliente destinatario
- `tenant_id` (uuid, FK → tenants.id) - Tenant
- `status` (varchar, nullable, default: 'pending') - Estado (pending, sent, delivered, opened, clicked, converted, failed)
- `message_sent` (text, nullable) - Mensaje enviado (personalizado)
- `sent_at` (timestamptz, nullable) - Fecha de envío
- `delivered_at` (timestamptz, nullable) - Fecha de entrega
- `opened_at` (timestamptz, nullable) - Fecha de apertura
- `clicked_at` (timestamptz, nullable) - Fecha de clic
- `converted_at` (timestamptz, nullable) - Fecha de conversión (cita creada)
- `converted_appointment_id` (uuid, FK → appointments.id, nullable) - Cita creada por la conversión
- `error_message` (text, nullable) - Mensaje de error si falla
- `retry_count` (integer, nullable, default: 0) - Número de reintentos
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación
- `updated_at` (timestamptz, nullable, default: now()) - Fecha de última actualización

---

### 14. **conversation_logs**
**Descripción:** Registra las conversaciones con el asistente de IA, incluyendo mensajes, llamadas a herramientas y tokens utilizados. Útil para análisis y mejora del sistema.

**Campos:**
- `id` (uuid, PK) - Identificador único
- `tenant_id` (uuid, FK → tenants.id) - Tenant
- `session_id` (varchar) - ID de sesión de conversación
- `user_id` (varchar, nullable) - ID del usuario
- `client_id` (uuid, FK → clients.id, nullable) - Cliente relacionado
- `message_type` (varchar, nullable) - Tipo de mensaje (user, assistant, system)
- `content` (text) - Contenido del mensaje
- `tokens_used` (integer, nullable) - Tokens utilizados
- `model` (varchar, nullable) - Modelo de IA utilizado
- `tool_calls` (jsonb, nullable) - Llamadas a herramientas realizadas
- `appointment_id` (uuid, FK → appointments.id, nullable) - Cita relacionada
- `created_at` (timestamptz, nullable, default: now()) - Fecha de creación

---

## Relaciones Principales

- **Tenants** → Es la entidad central, todas las demás tablas tienen relación con ella
- **Professionals** ↔ **Services** → Relación muchos-a-muchos a través de `professional_services`
- **Clients** → Tiene múltiples citas (`appointments`)
- **Appointments** → Conecta clientes, profesionales, servicios y genera notificaciones y seguimientos
- **Notification Queue** → Puede estar relacionada con citas, seguimientos o campañas
- **Marketing Campaigns** → Tiene múltiples destinatarios (`campaign_recipients`)

