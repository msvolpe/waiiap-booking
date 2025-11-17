import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  tenant_id: string
  appointment_id: string
  include_client_history?: boolean
  include_professional_schedule?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenant_id,
      appointment_id,
      include_client_history = false,
      include_professional_schedule = false
    }: RequestBody = await req.json()

    // ============================================
    // 1. VALIDACIONES
    // ============================================
    if (!tenant_id || !appointment_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['tenant_id', 'appointment_id'],
          code: 'MISSING_REQUIRED_FIELDS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // ============================================
    // 2. VERIFICAR TENANT ACTIVO
    // ============================================
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, business_name, is_active, timezone')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ 
          error: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenant.is_active) {
      return new Response(
        JSON.stringify({ 
          error: 'Tenant is not active',
          code: 'TENANT_INACTIVE'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 3. OBTENER INFORMACIÓN COMPLETA DE LA CITA
    // ============================================
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .select(`
        id,
        tenant_id,
        client_id,
        service_id,
        professional_id,
        start_time,
        end_time,
        status,
        notes,
        internal_notes,
        cancellation_reason,
        original_appointment_id,
        rescheduled_from_id,
        rescheduled_to_id,
        rescheduled_at,
        rescheduled_by,
        reminder_sent_at,
        confirmation_sent_at,
        created_by,
        created_at,
        updated_at,
        cancelled_at,
        completed_at,
        clients:client_id (
          id,
          full_name,
          phone,
          email,
          preferred_communication
        ),
        professionals:professional_id (
          id,
          full_name,
          specialty,
          email,
          phone,
          google_calendar_id
        ),
        services:service_id (
          id,
          name,
          description,
          duration_minutes,
          price
        )
      `)
      .eq('id', appointment_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ 
          error: 'Appointment not found',
          code: 'APPOINTMENT_NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 4. OBTENER HISTORIAL DE REPROGRAMACIONES
    // ============================================
    let rescheduleHistory = null

    if (appointment.rescheduled_from_id || appointment.rescheduled_to_id || appointment.original_appointment_id) {
      const appointmentIds = [
        appointment.id,
        appointment.rescheduled_from_id,
        appointment.rescheduled_to_id,
        appointment.original_appointment_id
      ].filter(Boolean) as string[]

      const { data: relatedAppointments } = await supabaseClient
        .from('appointments')
        .select('id, start_time, end_time, status, rescheduled_at, rescheduled_by')
        .in('id', appointmentIds)
        .order('start_time', { ascending: true })

      if (relatedAppointments && relatedAppointments.length > 1) {
        rescheduleHistory = relatedAppointments.map(apt => ({
          id: apt.id,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status,
          rescheduled_at: apt.rescheduled_at,
          rescheduled_by: apt.rescheduled_by,
          formatted_date: formatDateConversational(new Date(apt.start_time)),
          formatted_time: formatTime(new Date(apt.start_time))
        }))
      }
    }

    // ============================================
    // 5. OBTENER ESTADO DE NOTIFICACIONES
    // ============================================
    const { data: notifications } = await supabaseClient
      .from('notification_queue')
      .select('id, notification_type, status, sent_at, delivered_at, scheduled_for')
      .eq('appointment_id', appointment_id)
      .order('created_at', { ascending: false })

    const notificationStatus = {
      confirmation: notifications?.find(n => n.notification_type === 'appointment_confirmation'),
      reminder: notifications?.find(n => n.notification_type === 'appointment_reminder'),
      cancellation: notifications?.find(n => n.notification_type === 'appointment_cancellation'),
      rescheduled: notifications?.find(n => n.notification_type === 'appointment_rescheduled'),
      total: notifications?.length || 0
    }

    // ============================================
    // 6. OBTENER SEGUIMIENTOS RELACIONADOS
    // ============================================
    const { data: followups } = await supabaseClient
      .from('appointment_followups')
      .select('id, followup_type, status, scheduled_for, sent_at, client_rating, client_review_text')
      .eq('appointment_id', appointment_id)
      .order('created_at', { ascending: false })

    // ============================================
    // 7. OBTENER HISTORIAL DEL CLIENTE (opcional)
    // ============================================
    let clientHistory = null

    if (include_client_history && appointment.client_id) {
      const { data: clientAppointments } = await supabaseClient
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          services:service_id (name),
          professionals:professional_id (full_name)
        `)
        .eq('client_id', appointment.client_id)
        .eq('tenant_id', tenant_id)
        .order('start_time', { ascending: false })
        .limit(10)

      if (clientAppointments) {
        clientHistory = clientAppointments.map(apt => ({
          id: apt.id,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status,
          service: apt.services?.name,
          professional: apt.professionals?.full_name,
          formatted_date: formatDateConversational(new Date(apt.start_time)),
          formatted_time: formatTime(new Date(apt.start_time))
        }))
      }
    }

    // ============================================
    // 8. OBTENER HORARIO DEL PROFESIONAL (opcional)
    // ============================================
    let professionalSchedule = null

    if (include_professional_schedule && appointment.professional_id) {
      const { data: schedule } = await supabaseClient
        .from('business_hours')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('professional_id', appointment.professional_id)
        .eq('is_active', true)
        .order('day_of_week')

      if (schedule && schedule.length > 0) {
        professionalSchedule = formatScheduleForLLM(schedule)
      } else {
        // Intentar horario del tenant
        const { data: tenantSchedule } = await supabaseClient
          .from('business_hours')
          .select('day_of_week, start_time, end_time, is_active')
          .eq('tenant_id', tenant_id)
          .is('professional_id', null)
          .eq('is_active', true)
          .order('day_of_week')

        if (tenantSchedule && tenantSchedule.length > 0) {
          professionalSchedule = formatScheduleForLLM(tenantSchedule)
        }
      }
    }

    // ============================================
    // 9. FORMATEAR FECHAS Y CALCULAR INFORMACIÓN ADICIONAL
    // ============================================
    const appointmentDate = new Date(appointment.start_time)
    const appointmentEndDate = new Date(appointment.end_time)
    const now = new Date()

    const formattedDate = formatDateConversational(appointmentDate)
    const formattedTime = formatTime(appointmentDate)
    const formattedEndTime = formatTime(appointmentEndDate)
    const dayOfWeek = getDayName(appointmentDate)
    const timePeriod = getTimePeriod(appointmentDate)

    const hoursUntil = Math.floor((appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const daysUntil = Math.floor(hoursUntil / 24)
    const minutesUntil = Math.floor((appointmentDate.getTime() - now.getTime()) / (1000 * 60))

    let timeUntilMessage = ''
    if (minutesUntil < 0) {
      timeUntilMessage = 'Ya pasó'
    } else if (daysUntil === 0) {
      if (hoursUntil === 0) {
        timeUntilMessage = `En ${minutesUntil} minutos`
      } else {
        timeUntilMessage = `En ${hoursUntil} hora${hoursUntil > 1 ? 's' : ''}`
      }
    } else if (daysUntil === 1) {
      timeUntilMessage = 'Mañana'
    } else if (daysUntil <= 7) {
      timeUntilMessage = `En ${daysUntil} días`
    } else {
      timeUntilMessage = `En ${Math.ceil(daysUntil / 7)} semana${Math.ceil(daysUntil / 7) > 1 ? 's' : ''}`
    }

    const duration = Math.round((appointmentEndDate.getTime() - appointmentDate.getTime()) / 60000)

    // ============================================
    // 10. FORMATEAR RESPUESTA PARA EL LLM
    // ============================================
    const response = {
      appointment: {
        id: appointment.id,
        status: appointment.status,
        
        datetime: {
          iso: {
            start: appointment.start_time,
            end: appointment.end_time
          },
          formatted: {
            date: formattedDate,
            time: formattedTime,
            end_time: formattedEndTime,
            full: `${formattedDate} a las ${formattedTime}`
          },
          day_of_week: dayOfWeek,
          time_period: timePeriod,
          duration_minutes: duration
        },
        
        time_until: {
          hours: hoursUntil,
          days: daysUntil,
          minutes: minutesUntil,
          message: timeUntilMessage,
          is_past: minutesUntil < 0,
          is_today: daysUntil === 0 && hoursUntil >= 0
        },
        
        client: appointment.clients ? {
          id: appointment.clients.id,
          name: appointment.clients.full_name,
          phone: appointment.clients.phone,
          email: appointment.clients.email,
          preferred_communication: appointment.clients.preferred_communication
        } : null,
        
        professional: appointment.professionals ? {
          id: appointment.professionals.id,
          name: appointment.professionals.full_name,
          specialty: appointment.professionals.specialty,
          email: appointment.professionals.email,
          phone: appointment.professionals.phone
        } : null,
        
        service: appointment.services ? {
          id: appointment.services.id,
          name: appointment.services.name,
          description: appointment.services.description,
          duration_minutes: appointment.services.duration_minutes,
          price: appointment.services.price
        } : null,
        
        notes: {
          public: appointment.notes,
          internal: appointment.internal_notes
        },
        
        cancellation: appointment.status === 'cancelled' ? {
          reason: appointment.cancellation_reason,
          cancelled_at: appointment.cancelled_at
        } : null,
        
        rescheduling: {
          is_rescheduled: !!(appointment.rescheduled_from_id || appointment.rescheduled_to_id),
          original_appointment_id: appointment.original_appointment_id,
          rescheduled_from_id: appointment.rescheduled_from_id,
          rescheduled_to_id: appointment.rescheduled_to_id,
          rescheduled_at: appointment.rescheduled_at,
          rescheduled_by: appointment.rescheduled_by,
          history: rescheduleHistory
        },
        
        notifications: notificationStatus,
        
        followups: followups ? followups.map(f => ({
          type: f.followup_type,
          status: f.status,
          scheduled_for: f.scheduled_for,
          sent_at: f.sent_at,
          rating: f.client_rating,
          review: f.client_review_text
        })) : [],
        
        metadata: {
          created_by: appointment.created_by,
          created_at: appointment.created_at,
          updated_at: appointment.updated_at,
          confirmation_sent_at: appointment.confirmation_sent_at,
          reminder_sent_at: appointment.reminder_sent_at,
          completed_at: appointment.completed_at
        }
      },
      
      client_history: include_client_history ? clientHistory : undefined,
      professional_schedule: include_professional_schedule ? professionalSchedule : undefined,
      
      summary: buildAppointmentSummary(appointment, {
        formattedDate,
        formattedTime,
        timeUntilMessage,
        dayOfWeek,
        serviceName: appointment.services?.name,
        professionalName: appointment.professionals?.full_name
      })
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in get-appointment-details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Formatea fecha de manera conversacional
 */
function formatDateConversational(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  }
  return date.toLocaleDateString('es-ES', options)
}

/**
 * Formatea hora
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Obtiene el nombre del día
 */
function getDayName(date: Date): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  return days[date.getDay()]
}

/**
 * Obtiene el período del día
 */
function getTimePeriod(date: Date): string {
  const hour = date.getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

/**
 * Formatea horarios para que el LLM los entienda fácilmente
 */
function formatScheduleForLLM(schedule: any[]): string {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  
  const formatted = schedule.map(slot => {
    const day = dayNames[slot.day_of_week]
    return `${day}: ${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`
  })

  return formatted.join(', ')
}

/**
 * Construye un resumen conversacional de la cita
 */
function buildAppointmentSummary(appointment: any, params: any): string {
  const { formattedDate, formattedTime, timeUntilMessage, dayOfWeek, serviceName, professionalName } = params
  
  const parts = []
  
  if (appointment.status === 'confirmed') {
    parts.push('Cita confirmada')
  } else if (appointment.status === 'pending') {
    parts.push('Cita pendiente')
  } else if (appointment.status === 'cancelled') {
    parts.push('Cita cancelada')
  } else if (appointment.status === 'completed') {
    parts.push('Cita completada')
  }
  
  parts.push(`para ${serviceName || 'servicio'}`)
  
  if (professionalName) {
    parts.push(`con ${professionalName}`)
  }
  
  parts.push(`el ${formattedDate} a las ${formattedTime}`)
  
  if (timeUntilMessage && appointment.status === 'confirmed') {
    parts.push(`(${timeUntilMessage})`)
  }
  
  return parts.join(' - ')
}

