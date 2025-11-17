# Funcionalidades Pendientes y Casos de Uso

## Funciones Implementadas Actualmente

1. ✅ **create-appointment** - Crear una nueva cita
2. ✅ **search-professionals** - Buscar profesionales disponibles
3. ✅ **get-available-slots** - Obtener horarios disponibles
4. ✅ **list-services** - Listar servicios disponibles

---

## Funciones Necesarias (Pendientes de Implementar)

### 🔴 CRÍTICAS - Operaciones Básicas de Citas

#### 1. **cancel-appointment**
**Descripción:** Cancela una cita existente
**Parámetros:**
- `appointment_id` (requerido)
- `tenant_id` (requerido)
- `cancellation_reason` (opcional)
- `cancelled_by` (opcional: 'client', 'professional', 'admin')
- `notify_client` (opcional, default: true)
- `notify_professional` (opcional, default: true)

**Funcionalidades:**
- Actualizar estado a 'cancelled'
- Registrar `cancelled_at` y `cancellation_reason`
- Crear notificación de cancelación
- Liberar el slot para otras citas
- Actualizar estadísticas del cliente (`total_cancellations`)
- Si hay recordatorio pendiente, cancelarlo

**Casos de uso:**
- Cliente cancela su cita
- Profesional cancela por emergencia
- Admin cancela por razones administrativas

---

#### 2. **reschedule-appointment**
**Descripción:** Reprograma una cita existente a un nuevo horario
**Parámetros:**
- `appointment_id` (requerido)
- `tenant_id` (requerido)
- `new_start_time` (requerido)
- `reason` (opcional)
- `notify_client` (opcional, default: true)
- `notify_professional` (opcional, default: true)

**Funcionalidades:**
- Validar disponibilidad del nuevo horario
- Crear nueva cita con estado 'confirmed'
- Actualizar cita original con `rescheduled_to_id`
- Registrar `rescheduled_from_id`, `rescheduled_at`, `rescheduled_by`
- Actualizar `original_appointment_id` si es necesario
- Crear notificaciones de reprogramación
- Actualizar recordatorios

**Casos de uso:**
- Cliente solicita cambiar fecha/hora
- Profesional necesita reprogramar
- Sistema automático por conflicto

---

#### 3. **get-appointment-details**
**Descripción:** Obtiene información detallada de una cita específica
**Parámetros:**
- `appointment_id` (requerido)
- `tenant_id` (requerido)
- `include_client_history` (opcional, default: false)
- `include_professional_schedule` (opcional, default: false)

**Funcionalidades:**
- Retornar información completa de la cita
- Incluir datos del cliente, profesional, servicio
- Incluir historial de reprogramaciones si existe
- Incluir estado de notificaciones
- Incluir seguimientos relacionados

**Casos de uso:**
- Usuario pregunta "¿Cuándo es mi cita?"
- Verificar detalles antes de cancelar/reprogramar
- Mostrar información completa al cliente

---

#### 4. **list-client-appointments**
**Descripción:** Lista todas las citas de un cliente
**Parámetros:**
- `tenant_id` (requerido)
- `client_phone` o `client_id` (requerido)
- `status` (opcional: 'all', 'upcoming', 'past', 'cancelled')
- `date_from` (opcional)
- `date_to` (opcional)
- `include_cancelled` (opcional, default: false)

**Funcionalidades:**
- Buscar cliente por teléfono o ID
- Filtrar por estado y rango de fechas
- Ordenar por fecha (más recientes primero)
- Incluir información de profesional y servicio
- Formatear fechas de manera conversacional

**Casos de uso:**
- Cliente pregunta "¿Cuándo tengo mi próxima cita?"
- Ver historial de citas
- Cliente olvidó cuándo es su cita

---

#### 5. **list-professional-appointments**
**Descripción:** Lista las citas de un profesional en un rango de fechas
**Parámetros:**
- `tenant_id` (requerido)
- `professional_id` (requerido)
- `date_from` (opcional, default: hoy)
- `date_to` (opcional, default: +30 días)
- `status` (opcional: 'all', 'confirmed', 'pending', 'cancelled')

**Funcionalidades:**
- Obtener agenda del profesional
- Filtrar por estado y rango de fechas
- Incluir información de clientes
- Formatear para visualización de calendario
- Agrupar por día

**Casos de uso:**
- Profesional consulta su agenda
- Sistema genera vista de calendario
- Verificar disponibilidad antes de reprogramar

---

### 🟡 IMPORTANTES - Gestión de Clientes

#### 6. **search-clients**
**Descripción:** Busca clientes por nombre, teléfono o email
**Parámetros:**
- `tenant_id` (requerido)
- `query` (opcional: nombre, teléfono o email)
- `include_appointment_stats` (opcional, default: false)
- `include_last_appointment` (opcional, default: false)

**Funcionalidades:**
- Búsqueda flexible por múltiples campos
- Incluir estadísticas (total citas, cancelaciones, no-shows)
- Incluir última cita
- Retornar información formateada para LLM

**Casos de uso:**
- Buscar cliente antes de crear cita
- Verificar si cliente existe
- Obtener historial de cliente

---

#### 7. **update-client**
**Descripción:** Actualiza información de un cliente existente
**Parámetros:**
- `tenant_id` (requerido)
- `client_id` (requerido)
- `full_name` (opcional)
- `email` (opcional)
- `phone` (opcional)
- `date_of_birth` (opcional)
- `gender` (opcional)
- `preferred_communication` (opcional)
- `notes` (opcional)
- `tags` (opcional)

**Funcionalidades:**
- Actualizar campos específicos
- Validar datos
- Mantener historial

**Casos de uso:**
- Cliente actualiza su información
- Corregir datos erróneos
- Agregar notas sobre el cliente

---

### 🟡 IMPORTANTES - Gestión de Disponibilidad

#### 8. **create-unavailability**
**Descripción:** Crea un período de ausencia para un profesional
**Parámetros:**
- `tenant_id` (requerido)
- `professional_id` (requerido)
- `start_datetime` (requerido)
- `end_datetime` (requerido)
- `reason_type` (opcional: 'vacation', 'sick', 'training', 'other')
- `reason_description` (opcional)
- `notify_patients` (opcional, default: true)
- `auto_reschedule` (opcional, default: false)

**Funcionalidades:**
- Crear ausencia
- Si `notify_patients`: notificar a clientes con citas afectadas
- Si `auto_reschedule`: intentar reprogramar automáticamente
- Bloquear slots durante el período

**Casos de uso:**
- Profesional toma vacaciones
- Profesional está enfermo
- Profesional tiene capacitación

---

#### 9. **list-unavailabilities**
**Descripción:** Lista las ausencias de un profesional
**Parámetros:**
- `tenant_id` (requerido)
- `professional_id` (requerido)
- `date_from` (opcional)
- `date_to` (opcional)
- `is_active` (opcional, default: true)

**Funcionalidades:**
- Listar ausencias en rango de fechas
- Filtrar por estado activo
- Incluir información de citas afectadas

**Casos de uso:**
- Ver calendario de ausencias
- Verificar disponibilidad futura
- Planificar vacaciones

---

#### 10. **update-business-hours**
**Descripción:** Actualiza horarios laborales de un profesional o tenant
**Parámetros:**
- `tenant_id` (requerido)
- `professional_id` (opcional, null = horario del tenant)
- `business_hours` (array de objetos con day_of_week, start_time, end_time)
- `is_active` (opcional, default: true)

**Funcionalidades:**
- Actualizar o crear horarios por día de semana
- Validar que no haya conflictos con citas existentes
- Aplicar a profesional específico o tenant general

**Casos de uso:**
- Cambiar horario de atención
- Establecer horario especial para un profesional
- Actualizar horarios estacionales

---

### 🟢 ÚTILES - Notificaciones y Seguimientos

#### 11. **send-notification**
**Descripción:** Envía una notificación manual (fuera de la cola automática)
**Parámetros:**
- `tenant_id` (requerido)
- `client_id` (requerido)
- `notification_type` (requerido)
- `channel` (requerido: 'whatsapp', 'email', 'sms')
- `message` (requerido)
- `subject` (opcional)
- `appointment_id` (opcional)
- `priority` (opcional, default: 5)

**Funcionalidades:**
- Crear notificación en cola
- Enviar inmediatamente o programar
- Retornar estado de envío

**Casos de uso:**
- Enviar recordatorio manual
- Notificar cambio de horario
- Comunicación personalizada

---

#### 12. **create-followup**
**Descripción:** Crea un seguimiento post-cita programado
**Parámetros:**
- `tenant_id` (requerido)
- `appointment_id` (requerido)
- `client_id` (requerido)
- `followup_type` (requerido: 'satisfaction_survey', 'review_request', 'inactive_recovery')
- `scheduled_for` (requerido)
- `channel` (opcional, default: 'whatsapp')
- `message_template` (opcional)

**Funcionalidades:**
- Crear seguimiento programado
- Usar template del tenant si no se especifica
- Validar que la cita esté completada

**Casos de uso:**
- Enviar encuesta de satisfacción
- Solicitar reseña en Google
- Recuperar pacientes inactivos

---

### 🟢 ÚTILES - Reportes y Estadísticas

#### 13. **get-appointment-stats**
**Descripción:** Obtiene estadísticas de citas para un período
**Parámetros:**
- `tenant_id` (requerido)
- `date_from` (opcional)
- `date_to` (opcional)
- `professional_id` (opcional)
- `group_by` (opcional: 'day', 'week', 'month')

**Funcionalidades:**
- Contar citas por estado
- Calcular tasa de cancelación
- Calcular tasa de no-shows
- Ingresos por período
- Citas por profesional
- Citas por servicio

**Casos de uso:**
- Dashboard de estadísticas
- Reportes mensuales
- Análisis de rendimiento

---

#### 14. **get-client-stats**
**Descripción:** Obtiene estadísticas de un cliente específico
**Parámetros:**
- `tenant_id` (requerido)
- `client_id` (requerido)

**Funcionalidades:**
- Total de citas
- Total de cancelaciones
- Total de no-shows
- Última cita
- Próxima cita
- Días desde última cita
- Servicios más utilizados

**Casos de uso:**
- Perfil del cliente
- Identificar clientes VIP
- Identificar clientes en riesgo de abandono

---

### 🔵 OPCIONALES - Campañas de Marketing

#### 15. **create-marketing-campaign**
**Descripción:** Crea una campaña de marketing
**Parámetros:**
- `tenant_id` (requerido)
- `name` (requerido)
- `campaign_type` (requerido)
- `target_audience` (requerido)
- `message_template` (requerido)
- `scheduled_at` (opcional)
- `inactive_days_threshold` (opcional)

**Funcionalidades:**
- Crear campaña
- Identificar destinatarios según criterios
- Programar envío
- Validar template

**Casos de uso:**
- Campaña de recuperación de inactivos
- Promoción especial
- Recordatorio de servicios

---

#### 16. **get-campaign-stats**
**Descripción:** Obtiene estadísticas de una campaña
**Parámetros:**
- `tenant_id` (requerido)
- `campaign_id` (requerido)

**Funcionalidades:**
- Total de destinatarios
- Total enviados
- Total entregados
- Total abiertos
- Total de clics
- Total de conversiones (citas creadas)
- Tasa de conversión

**Casos de uso:**
- Analizar efectividad de campaña
- Optimizar mensajes
- ROI de marketing

---

## Casos de Uso Completos que se Podrán Cubrir

### 📅 Gestión Completa de Citas

1. **Flujo completo de reserva:**
   - ✅ Usuario pregunta qué servicios hay → `list-services`
   - ✅ Usuario pregunta qué profesionales hay → `search-professionals`
   - ✅ Usuario pregunta horarios disponibles → `get-available-slots`
   - ✅ Usuario reserva cita → `create-appointment`
   - ⏳ Usuario consulta su cita → `get-appointment-details`
   - ⏳ Usuario cancela cita → `cancel-appointment`
   - ⏳ Usuario reprograma cita → `reschedule-appointment`

2. **Consulta de citas:**
   - ⏳ "¿Cuándo tengo mi próxima cita?" → `list-client-appointments`
   - ⏳ "¿Cuándo es mi cita del [día]?" → `get-appointment-details`
   - ⏳ "¿Tengo alguna cita pendiente?" → `list-client-appointments` con status='upcoming'
   - ⏳ "Muéstrame mi historial de citas" → `list-client-appointments` con status='all'

3. **Gestión de agenda profesional:**
   - ⏳ Profesional consulta su agenda → `list-professional-appointments`
   - ⏳ Ver citas del día → `list-professional-appointments` con date_from/date_to del día
   - ⏳ Ver próximas citas → `list-professional-appointments` con date_from=hoy

### 🔄 Reprogramación y Cancelación

4. **Cancelación de citas:**
   - ⏳ Cliente cancela: "Quiero cancelar mi cita" → `cancel-appointment`
   - ⏳ Profesional cancela por emergencia → `cancel-appointment` + `create-unavailability`
   - ⏳ Sistema notifica automáticamente → Notificación en `notification_queue`
   - ⏳ Slot se libera automáticamente → Disponible en `get-available-slots`

5. **Reprogramación de citas:**
   - ⏳ Cliente solicita cambio: "¿Puedo cambiar mi cita?" → `reschedule-appointment`
   - ⏳ Verificar disponibilidad nueva → `get-available-slots`
   - ⏳ Reprogramar automáticamente → `reschedule-appointment`
   - ⏳ Notificar cambios → Notificaciones automáticas

### 👥 Gestión de Clientes

6. **Búsqueda y gestión de clientes:**
   - ⏳ Buscar cliente por teléfono → `search-clients`
   - ⏳ Ver historial del cliente → `get-client-stats` + `list-client-appointments`
   - ⏳ Actualizar información del cliente → `update-client`
   - ⏳ Ver estadísticas del cliente → `get-client-stats`

7. **Identificación de clientes:**
   - ⏳ Cliente llama y se identifica → `search-clients` por teléfono
   - ⏳ Verificar si es cliente nuevo → Si no existe, crear en `create-appointment`
   - ⏳ Mostrar historial → `list-client-appointments`

### 🏥 Gestión de Disponibilidad

8. **Ausencias de profesionales:**
   - ⏳ Profesional toma vacaciones → `create-unavailability`
   - ⏳ Notificar a pacientes afectados → Notificaciones automáticas
   - ⏳ Reprogramar citas automáticamente → Si `auto_reschedule=true`
   - ⏳ Ver calendario de ausencias → `list-unavailabilities`

9. **Horarios laborales:**
   - ⏳ Actualizar horario de atención → `update-business-hours`
   - ⏳ Establecer horario especial → `update-business-hours` con professional_id
   - ⏳ Cambio de horario estacional → `update-business-hours`

### 📊 Reportes y Análisis

10. **Estadísticas y reportes:**
    - ⏳ Dashboard de citas del mes → `get-appointment-stats`
    - ⏳ Tasa de cancelación → `get-appointment-stats`
    - ⏳ Rendimiento por profesional → `get-appointment-stats` con professional_id
    - ⏳ Ingresos del período → `get-appointment-stats`
    - ⏳ Clientes más frecuentes → `get-client-stats` para múltiples clientes

### 📧 Notificaciones y Seguimientos

11. **Seguimientos post-cita:**
    - ⏳ Enviar encuesta de satisfacción → `create-followup` con type='satisfaction_survey'
    - ⏳ Solicitar reseña en Google → `create-followup` con type='review_request'
    - ⏳ Recuperar pacientes inactivos → `create-followup` con type='inactive_recovery'
    - ⏳ Enviar notificación manual → `send-notification`

12. **Campañas de marketing:**
    - ⏳ Campaña de recuperación → `create-marketing-campaign`
    - ⏳ Promoción especial → `create-marketing-campaign`
    - ⏳ Analizar efectividad → `get-campaign-stats`

### 🤖 Experiencia Conversacional Completa

13. **Chatbot completo:**
    - ✅ "¿Qué servicios tienen?" → `list-services`
    - ✅ "¿Qué profesionales hay?" → `search-professionals`
    - ✅ "¿Tienen horario disponible mañana?" → `get-available-slots`
    - ✅ "Quiero agendar una cita" → `create-appointment`
    - ⏳ "¿Cuándo es mi cita?" → `get-appointment-details` o `list-client-appointments`
    - ⏳ "Quiero cancelar mi cita" → `cancel-appointment`
    - ⏳ "¿Puedo cambiar mi cita?" → `reschedule-appointment`
    - ⏳ "¿Quién es mi doctor?" → `get-appointment-details`
    - ⏳ "¿Cuánto cuesta [servicio]?" → `list-services` con include_pricing
    - ⏳ "¿Tengo más citas?" → `list-client-appointments`

---

## Priorización Sugerida

### Fase 1 - Críticas (Implementar primero)
1. `cancel-appointment`
2. `reschedule-appointment`
3. `get-appointment-details`
4. `list-client-appointments`

### Fase 2 - Importantes
5. `search-clients`
6. `create-unavailability`
7. `list-professional-appointments`

### Fase 3 - Útiles
8. `update-client`
9. `update-business-hours`
10. `send-notification`
11. `create-followup`

### Fase 4 - Reportes
12. `get-appointment-stats`
13. `get-client-stats`

### Fase 5 - Marketing (Opcional)
14. `create-marketing-campaign`
15. `get-campaign-stats`

---

## Resumen

**Funciones implementadas:** 4
**Funciones pendientes:** 15
**Total funciones necesarias:** 19

**Casos de uso cubiertos actualmente:** ~30%
**Casos de uso cubiertos con todas las funciones:** ~95%

Con las 4 funciones actuales + las 15 pendientes, tendrás un sistema completo de gestión de citas que cubre:
- ✅ Reserva de citas
- ⏳ Cancelación y reprogramación
- ⏳ Consulta de citas
- ⏳ Gestión de clientes
- ⏳ Gestión de disponibilidad
- ⏳ Notificaciones y seguimientos
- ⏳ Reportes y estadísticas
- ⏳ Campañas de marketing

