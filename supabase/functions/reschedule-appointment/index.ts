import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  tenant_id: string
  appointment_id: string
  new_start_time: string
  reason?: string
  notify_client?: boolean
  notify_professional?: boolean
  rescheduled_by?: 'client' | 'professional' | 'admin' | 'system'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenant_id,
      appointment_id,
      new_start_time,
      reason,
      notify_client = true,
      notify_professional = true,
      rescheduled_by = 'client'
    }: RequestBody = await req.json()

    // ============================================
    // 1. VALIDACIONES
    // ============================================
    if (!tenant_id || !appointment_id || !new_start_time) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['tenant_id', 'appointment_id', 'new_start_time'],
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
      .select('id, business_name, is_active, timezone, buffer_minutes')
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
    // 3. OBTENER INFORMACIÓN DE LA CITA ORIGINAL
    // ============================================
    const { data: originalAppointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .select(`
        id,
        tenant_id,
        client_id,
        professional_id,
        service_id,
        start_time,
        end_time,
        status,
        notes,
        original_appointment_id,
        clients:client_id (
          id,
          full_name,
          phone,
          email
        ),
        professionals:professional_id (
          id,
          full_name,
          email,
          phone,
          professional_services!inner (
            service_id,
            custom_duration_minutes
          )
        ),
        services:service_id (
          id,
          name,
          duration_minutes
        )
      `)
      .eq('id', appointment_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (appointmentError || !originalAppointment) {
      return new Response(
        JSON.stringify({ 
          error: 'Appointment not found',
          code: 'APPOINTMENT_NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 4. VERIFICAR QUE LA CITA PUEDE SER REPROGRAMADA
    // ============================================
    if (originalAppointment.status === 'cancelled') {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot reschedule a cancelled appointment',
          code: 'CANNOT_RESCHEDULE_CANCELLED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (originalAppointment.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot reschedule a completed appointment',
          code: 'CANNOT_RESCHEDULE_COMPLETED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 5. CALCULAR DURACIÓN Y NUEVO FIN DE LA CITA
    // ============================================
    const originalStartDate = new Date(originalAppointment.start_time)
    const originalEndDate = new Date(originalAppointment.end_time)
    const originalDuration = Math.round((originalEndDate.getTime() - originalStartDate.getTime()) / 60000)

    // Usar duración personalizada del profesional si existe, sino la del servicio, sino la original
    const customDuration = originalAppointment.professionals?.professional_services?.[0]?.custom_duration_minutes
    const serviceDuration = originalAppointment.services?.duration_minutes
    const duration = customDuration || serviceDuration || originalDuration

    const newStartDate = new Date(new_start_time)
    const newEndDate = new Date(newStartDate.getTime() + duration * 60000)

    // Validar que la nueva fecha no sea en el pasado
    const now = new Date()
    if (newStartDate < now) {
      return new Response(
        JSON.stringify({ 
          error: 'New appointment time cannot be in the past',
          code: 'INVALID_FUTURE_TIME'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 6. VERIFICAR DISPONIBILIDAD DEL NUEVO HORARIO
    // ============================================
    
    // 6.1: Verificar ausencias del profesional
    const { data: unavailabilities } = await supabaseClient
      .from('professional_unavailability')
      .select('id, reason_type')
      .eq('professional_id', originalAppointment.professional_id)
      .eq('is_active', true)
      .lte('start_datetime', newEndDate.toISOString())
      .gte('end_datetime', newStartDate.toISOString())

    if (unavailabilities && unavailabilities.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Professional is not available at the new time',
          reason: unavailabilities[0].reason_type,
          code: 'PROFESSIONAL_UNAVAILABLE'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6.2: Verificar citas conflictivas (excluyendo la cita original)
    const { data: conflictingAppointments } = await supabaseClient
      .from('appointments')
      .select('id')
      .eq('professional_id', originalAppointment.professional_id)
      .in('status', ['confirmed', 'pending'])
      .neq('id', appointment_id) // Excluir la cita original
      .or(`and(start_time.lte.${newEndDate.toISOString()},end_time.gt.${newStartDate.toISOString()})`)

    if (conflictingAppointments && conflictingAppointments.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Time slot is not available',
          suggestion: 'Please choose another time',
          code: 'SLOT_NOT_AVAILABLE'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6.3: Verificar horario laboral
    const dayOfWeek = newStartDate.getDay()
    
    const { data: businessHours } = await supabaseClient
      .from('business_hours')
      .select('start_time, end_time')
      .eq('professional_id', originalAppointment.professional_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single()

    if (!businessHours) {
      const { data: tenantHours } = await supabaseClient
        .from('business_hours')
        .select('start_time, end_time')
        .eq('tenant_id', tenant_id)
        .is('professional_id', null)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single()

      if (!tenantHours) {
        return new Response(
          JSON.stringify({ 
            error: 'Professional does not work on this day',
            code: 'OUTSIDE_BUSINESS_HOURS'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============================================
    // 7. CREAR NUEVA CITA
    // ============================================
    const { data: newAppointment, error: newAppointmentError } = await supabaseClient
      .from('appointments')
      .insert({
        tenant_id,
        client_id: originalAppointment.client_id,
        service_id: originalAppointment.service_id,
        professional_id: originalAppointment.professional_id,
        start_time: newStartDate.toISOString(),
        end_time: newEndDate.toISOString(),
        status: 'confirmed',
        notes: originalAppointment.notes,
        original_appointment_id: originalAppointment.original_appointment_id || originalAppointment.id,
        rescheduled_from_id: originalAppointment.id,
        rescheduled_at: now.toISOString(),
        rescheduled_by: rescheduled_by,
        created_by: 'ai_agent'
      })
      .select()
      .single()

    if (newAppointmentError) {
      console.error('Error creating new appointment:', newAppointmentError)
      throw newAppointmentError
    }

    // ============================================
    // 8. ACTUALIZAR CITA ORIGINAL
    // ============================================
    const { error: updateOriginalError } = await supabaseClient
      .from('appointments')
      .update({
        status: 'cancelled',
        rescheduled_to_id: newAppointment.id,
        cancelled_at: now.toISOString(),
        cancellation_reason: reason || `Reprogramada a ${newStartDate.toISOString()}`
      })
      .eq('id', appointment_id)

    if (updateOriginalError) {
      console.error('Error updating original appointment:', updateOriginalError)
      // Intentar eliminar la nueva cita si falla la actualización
      await supabaseClient
        .from('appointments')
        .delete()
        .eq('id', newAppointment.id)
      throw updateOriginalError
    }

    // ============================================
    // 9. CANCELAR NOTIFICACIONES PENDIENTES DE LA CITA ORIGINAL
    // ============================================
    await supabaseClient
      .from('notification_queue')
      .update({ 
        status: 'cancelled',
        error_message: 'Appointment rescheduled'
      })
      .eq('appointment_id', appointment_id)
      .eq('status', 'pending')
      .in('notification_type', ['appointment_reminder', 'appointment_confirmation'])

    // ============================================
    // 10. CREAR NOTIFICACIONES DE REPROGRAMACIÓN
    // ============================================
    const formattedNewDate = formatDateConversational(newStartDate)
    const formattedNewTime = formatTime(newStartDate)
    const formattedOriginalDate = formatDateConversational(originalStartDate)
    const formattedOriginalTime = formatTime(originalStartDate)

    // Notificar al cliente
    if (notify_client && originalAppointment.clients) {
      const clientMessage = buildRescheduleMessageForClient({
        clientName: originalAppointment.clients.full_name,
        serviceName: originalAppointment.services?.name || 'servicio',
        professionalName: originalAppointment.professionals?.full_name || 'profesional',
        originalDate: formattedOriginalDate,
        originalTime: formattedOriginalTime,
        newDate: formattedNewDate,
        newTime: formattedNewTime,
        reason: reason
      })

      await supabaseClient
        .from('notification_queue')
        .insert({
          tenant_id,
          client_id: originalAppointment.client_id,
          recipient_phone: originalAppointment.clients.phone,
          recipient_email: originalAppointment.clients.email,
          notification_type: 'appointment_rescheduled',
          channel: 'whatsapp',
          subject: 'Cita Reprogramada',
          message: clientMessage,
          appointment_id: newAppointment.id,
          scheduled_for: now.toISOString(),
          priority: 3,
          status: 'pending'
        })
        .catch(error => {
          console.warn('Failed to create client notification:', error)
        })
    }

    // Notificar al profesional
    if (notify_professional && originalAppointment.professionals) {
      const professionalMessage = buildRescheduleMessageForProfessional({
        professionalName: originalAppointment.professionals.full_name,
        clientName: originalAppointment.clients?.full_name || 'Cliente',
        serviceName: originalAppointment.services?.name || 'servicio',
        originalDate: formattedOriginalDate,
        originalTime: formattedOriginalTime,
        newDate: formattedNewDate,
        newTime: formattedNewTime,
        rescheduledBy: rescheduled_by
      })

      await supabaseClient
        .from('notification_queue')
        .insert({
          tenant_id,
          recipient_phone: originalAppointment.professionals.phone,
          recipient_email: originalAppointment.professionals.email,
          notification_type: 'appointment_rescheduled',
          channel: 'whatsapp',
          subject: 'Cita Reprogramada',
          message: professionalMessage,
          appointment_id: newAppointment.id,
          scheduled_for: now.toISOString(),
          priority: 3,
          status: 'pending'
        })
        .catch(error => {
          console.warn('Failed to create professional notification:', error)
        })
    }

    // ============================================
    // 11. CREAR RECORDATORIO PARA LA NUEVA CITA (24h antes)
    // ============================================
    const reminderTime = new Date(newStartDate.getTime() - 24 * 60 * 60 * 1000)
    
    if (reminderTime > now && originalAppointment.clients) {
      await supabaseClient
        .from('notification_queue')
        .insert({
          tenant_id,
          client_id: originalAppointment.client_id,
          recipient_phone: originalAppointment.clients.phone,
          recipient_email: originalAppointment.clients.email,
          notification_type: 'appointment_reminder',
          channel: 'whatsapp',
          subject: 'Recordatorio de Cita',
          message: `Hola ${originalAppointment.clients.full_name}! Te recordamos tu cita reprogramada mañana a las ${formattedNewTime} con ${originalAppointment.professionals?.full_name || 'tu profesional'}. ¡Te esperamos!`,
          appointment_id: newAppointment.id,
          scheduled_for: reminderTime.toISOString(),
          priority: 2,
          status: 'pending'
        })
        .catch(error => {
          console.warn('Failed to create reminder notification:', error)
        })
    }

    // ============================================
    // 12. FORMATEAR RESPUESTA PARA EL LLM
    // ============================================
    const response = {
      success: true,
      original_appointment: {
        id: originalAppointment.id,
        status: 'cancelled',
        original_date: formattedOriginalDate,
        original_time: formattedOriginalTime
      },
      new_appointment: {
        id: newAppointment.id,
        status: newAppointment.status,
        start_time: newAppointment.start_time,
        end_time: newAppointment.end_time,
        formatted_date: formattedNewDate,
        formatted_time: formattedNewTime,
        service: originalAppointment.services?.name,
        professional: originalAppointment.professionals?.full_name,
        client: originalAppointment.clients?.full_name
      },
      notifications: {
        client_notified: notify_client && !!originalAppointment.clients,
        professional_notified: notify_professional && !!originalAppointment.professionals,
        reminder_scheduled: reminderTime > now
      },
      message: buildRescheduleConfirmationMessage({
        serviceName: originalAppointment.services?.name || 'servicio',
        originalDate: formattedOriginalDate,
        originalTime: formattedOriginalTime,
        newDate: formattedNewDate,
        newTime: formattedNewTime,
        rescheduledBy: rescheduled_by
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
    console.error('Error in reschedule-appointment:', error)
    
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
 * Construye mensaje de reprogramación para el cliente
 */
function buildRescheduleMessageForClient(params: {
  clientName: string
  serviceName: string
  professionalName: string
  originalDate: string
  originalTime: string
  newDate: string
  newTime: string
  reason?: string
}): string {
  const { clientName, serviceName, professionalName, originalDate, originalTime, newDate, newTime, reason } = params
  
  let message = `Hola ${clientName}!\n\n`
  message += `Tu cita para ${serviceName} con ${professionalName} ha sido reprogramada.\n\n`
  message += `📅 **Cambio de fecha:**\n`
  message += `- Fecha anterior: ${originalDate} a las ${originalTime}\n`
  message += `- Nueva fecha: ${newDate} a las ${newTime}\n\n`
  
  if (reason) {
    message += `Motivo: ${reason}\n\n`
  }
  
  message += `Recibirás un recordatorio 24 horas antes de tu nueva cita.\n\n`
  message += `¡Te esperamos!`
  
  return message
}

/**
 * Construye mensaje de reprogramación para el profesional
 */
function buildRescheduleMessageForProfessional(params: {
  professionalName: string
  clientName: string
  serviceName: string
  originalDate: string
  originalTime: string
  newDate: string
  newTime: string
  rescheduledBy: string
}): string {
  const { professionalName, clientName, serviceName, originalDate, originalTime, newDate, newTime, rescheduledBy } = params
  
  let message = `Hola ${professionalName}!\n\n`
  message += `La cita con ${clientName} para ${serviceName} ha sido reprogramada.\n\n`
  message += `📅 **Cambio de fecha:**\n`
  message += `- Fecha anterior: ${originalDate} a las ${originalTime}\n`
  message += `- Nueva fecha: ${newDate} a las ${newTime}\n\n`
  
  if (rescheduledBy === 'client') {
    message += `Reprogramada por solicitud del cliente.`
  } else if (rescheduledBy === 'admin') {
    message += `Reprogramada por administración.`
  } else if (rescheduledBy === 'system') {
    message += `Reprogramada automáticamente por el sistema.`
  }
  
  message += `\n\nEl slot anterior ha quedado disponible.`
  
  return message
}

/**
 * Construye mensaje de confirmación de reprogramación para el LLM
 */
function buildRescheduleConfirmationMessage(params: {
  serviceName: string
  originalDate: string
  originalTime: string
  newDate: string
  newTime: string
  rescheduledBy: string
}): string {
  const { serviceName, originalDate, originalTime, newDate, newTime, rescheduledBy } = params
  
  let message = `Cita reprogramada exitosamente.\n\n`
  message += `La cita para ${serviceName} ha sido cambiada:\n`
  message += `- De: ${originalDate} a las ${originalTime}\n`
  message += `- A: ${newDate} a las ${newTime}\n\n`
  
  if (rescheduledBy === 'client') {
    message += `Reprogramada por solicitud del cliente.`
  } else if (rescheduledBy === 'professional') {
    message += `Reprogramada por el profesional.`
  } else if (rescheduledBy === 'admin') {
    message += `Reprogramada por administración.`
  }
  
  message += `\n\nLa cita original ha sido cancelada y el nuevo horario está confirmado.`
  message += ` Se enviará un recordatorio 24 horas antes de la nueva fecha.`
  
  return message
}

