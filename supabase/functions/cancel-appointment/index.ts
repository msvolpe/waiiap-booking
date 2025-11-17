import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  tenant_id: string
  appointment_id: string
  cancellation_reason?: string
  cancelled_by?: 'client' | 'professional' | 'admin' | 'system'
  notify_client?: boolean
  notify_professional?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenant_id,
      appointment_id,
      cancellation_reason,
      cancelled_by = 'client',
      notify_client = true,
      notify_professional = true
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
      .select('id, business_name, is_active')
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
    // 3. OBTENER INFORMACIÓN DE LA CITA
    // ============================================
    const { data: appointment, error: appointmentError } = await supabaseClient
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
          phone
        ),
        services:service_id (
          id,
          name
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
    // 4. VERIFICAR QUE LA CITA PUEDE SER CANCELADA
    // ============================================
    if (appointment.status === 'cancelled') {
      return new Response(
        JSON.stringify({ 
          error: 'Appointment is already cancelled',
          code: 'ALREADY_CANCELLED',
          appointment: {
            id: appointment.id,
            status: appointment.status,
            cancelled_at: appointment.cancelled_at
          }
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (appointment.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot cancel a completed appointment',
          code: 'CANNOT_CANCEL_COMPLETED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 5. CANCELAR NOTIFICACIONES PENDIENTES
    // ============================================
    const now = new Date().toISOString()
    
    // Cancelar recordatorios pendientes
    await supabaseClient
      .from('notification_queue')
      .update({ 
        status: 'cancelled',
        error_message: 'Appointment cancelled'
      })
      .eq('appointment_id', appointment_id)
      .eq('status', 'pending')
      .in('notification_type', ['appointment_reminder', 'appointment_confirmation'])

    // ============================================
    // 6. ACTUALIZAR ESTADO DE LA CITA
    // ============================================
    const { data: updatedAppointment, error: updateError } = await supabaseClient
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellation_reason || getDefaultCancellationReason(cancelled_by),
        cancelled_at: now
      })
      .eq('id', appointment_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating appointment:', updateError)
      throw updateError
    }

    // ============================================
    // 7. ACTUALIZAR ESTADÍSTICAS DEL CLIENTE
    // ============================================
    if (appointment.client_id) {
      await supabaseClient.rpc('increment_client_cancellations', {
        client_uuid: appointment.client_id
      }).catch(async () => {
        // Si la función RPC no existe, hacer update manual
        const { data: client } = await supabaseClient
          .from('clients')
          .select('total_cancellations')
          .eq('id', appointment.client_id)
          .single()

        if (client) {
          await supabaseClient
            .from('clients')
            .update({
              total_cancellations: (client.total_cancellations || 0) + 1
            })
            .eq('id', appointment.client_id)
        }
      })
    }

    // ============================================
    // 8. CREAR NOTIFICACIONES
    // ============================================
    const appointmentDate = new Date(appointment.start_time)
    const formattedDate = formatDateConversational(appointmentDate)
    const formattedTime = formatTime(appointmentDate)

    // Notificar al cliente
    if (notify_client && appointment.clients) {
      const clientMessage = buildCancellationMessageForClient({
        clientName: appointment.clients.full_name,
        serviceName: appointment.services?.name || 'servicio',
        professionalName: appointment.professionals?.full_name || 'profesional',
        date: formattedDate,
        time: formattedTime,
        reason: cancellation_reason
      })

      await supabaseClient
        .from('notification_queue')
        .insert({
          tenant_id,
          client_id: appointment.client_id,
          recipient_phone: appointment.clients.phone,
          recipient_email: appointment.clients.email,
          notification_type: 'appointment_cancellation',
          channel: 'whatsapp',
          subject: 'Cita Cancelada',
          message: clientMessage,
          appointment_id: appointment.id,
          scheduled_for: now,
          priority: 4,
          status: 'pending'
        })
        .catch(error => {
          console.warn('Failed to create client notification:', error)
        })
    }

    // Notificar al profesional
    if (notify_professional && appointment.professionals) {
      const professionalMessage = buildCancellationMessageForProfessional({
        professionalName: appointment.professionals.full_name,
        clientName: appointment.clients?.full_name || 'Cliente',
        serviceName: appointment.services?.name || 'servicio',
        date: formattedDate,
        time: formattedTime,
        cancelledBy: cancelled_by
      })

      await supabaseClient
        .from('notification_queue')
        .insert({
          tenant_id,
          recipient_phone: appointment.professionals.phone,
          recipient_email: appointment.professionals.email,
          notification_type: 'appointment_cancellation',
          channel: 'whatsapp',
          subject: 'Cita Cancelada',
          message: professionalMessage,
          appointment_id: appointment.id,
          scheduled_for: now,
          priority: 4,
          status: 'pending'
        })
        .catch(error => {
          console.warn('Failed to create professional notification:', error)
        })
    }

    // ============================================
    // 9. FORMATEAR RESPUESTA PARA EL LLM
    // ============================================
    const response = {
      success: true,
      appointment: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
        cancelled_at: updatedAppointment.cancelled_at,
        cancellation_reason: updatedAppointment.cancellation_reason,
        cancelled_by: cancelled_by,
        original_appointment: {
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          formatted_date: formattedDate,
          formatted_time: formattedTime,
          service: appointment.services?.name,
          professional: appointment.professionals?.full_name,
          client: appointment.clients?.full_name
        }
      },
      notifications: {
        client_notified: notify_client && !!appointment.clients,
        professional_notified: notify_professional && !!appointment.professionals
      },
      message: buildCancellationConfirmationMessage({
        serviceName: appointment.services?.name || 'servicio',
        date: formattedDate,
        time: formattedTime,
        cancelledBy: cancelled_by
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
    console.error('Error in cancel-appointment:', error)
    
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
 * Obtiene razón de cancelación por defecto según quién cancela
 */
function getDefaultCancellationReason(cancelledBy: string): string {
  const reasons: Record<string, string> = {
    'client': 'Cancelada por el cliente',
    'professional': 'Cancelada por el profesional',
    'admin': 'Cancelada por administración',
    'system': 'Cancelada automáticamente por el sistema'
  }
  return reasons[cancelledBy] || 'Cancelada'
}

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
 * Construye mensaje de cancelación para el cliente
 */
function buildCancellationMessageForClient(params: {
  clientName: string
  serviceName: string
  professionalName: string
  date: string
  time: string
  reason?: string
}): string {
  const { clientName, serviceName, professionalName, date, time, reason } = params
  
  let message = `Hola ${clientName}!\n\n`
  message += `Te informamos que tu cita para ${serviceName} con ${professionalName} `
  message += `programada para el ${date} a las ${time} ha sido cancelada.\n\n`
  
  if (reason) {
    message += `Motivo: ${reason}\n\n`
  }
  
  message += `Si deseas reagendar, puedes contactarnos nuevamente.`
  message += `\n\nGracias por tu comprensión.`
  
  return message
}

/**
 * Construye mensaje de cancelación para el profesional
 */
function buildCancellationMessageForProfessional(params: {
  professionalName: string
  clientName: string
  serviceName: string
  date: string
  time: string
  cancelledBy: string
}): string {
  const { professionalName, clientName, serviceName, date, time, cancelledBy } = params
  
  let message = `Hola ${professionalName}!\n\n`
  message += `La cita con ${clientName} para ${serviceName} `
  message += `programada para el ${date} a las ${time} ha sido cancelada.\n\n`
  
  if (cancelledBy === 'client') {
    message += `Cancelada por el cliente.`
  } else if (cancelledBy === 'admin') {
    message += `Cancelada por administración.`
  } else if (cancelledBy === 'system') {
    message += `Cancelada automáticamente por el sistema.`
  }
  
  message += `\n\nEl slot ha quedado disponible.`
  
  return message
}

/**
 * Construye mensaje de confirmación de cancelación para el LLM
 */
function buildCancellationConfirmationMessage(params: {
  serviceName: string
  date: string
  time: string
  cancelledBy: string
}): string {
  const { serviceName, date, time, cancelledBy } = params
  
  let message = `Cita cancelada exitosamente.\n\n`
  message += `La cita para ${serviceName} programada para el ${date} a las ${time} `
  message += `ha sido cancelada`
  
  if (cancelledBy === 'client') {
    message += ` por el cliente.`
  } else if (cancelledBy === 'professional') {
    message += ` por el profesional.`
  } else if (cancelledBy === 'admin') {
    message += ` por administración.`
  }
  
  message += `\n\nEl slot ha quedado disponible para nuevas reservas.`
  
  if (cancelledBy === 'client') {
    message += ` Si el cliente desea reagendar, puede contactarnos nuevamente.`
  }
  
  return message
}

