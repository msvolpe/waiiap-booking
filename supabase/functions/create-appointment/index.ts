import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  tenant_id: string
  client_name: string
  client_phone: string
  client_email?: string
  service_id: string
  professional_id?: string
  start_time: string
  notes?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenant_id,
      client_name,
      client_phone,
      client_email,
      service_id,
      professional_id,
      start_time,
      notes
    }: RequestBody = await req.json()

    // ============================================
    // 1. VALIDACIONES
    // ============================================
    if (!tenant_id || !client_name || !client_phone || !service_id || !start_time) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['tenant_id', 'client_name', 'client_phone', 'service_id', 'start_time']
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
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenant.is_active) {
      return new Response(
        JSON.stringify({ error: 'Tenant is not active' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 3. OBTENER O CREAR CLIENTE
    // ============================================
    let client
    const { data: existingClient } = await supabaseClient
      .from('clients')
      .select('id, full_name, phone, email')
      .eq('tenant_id', tenant_id)
      .eq('phone', client_phone)
      .single()

    if (existingClient) {
      client = existingClient
      await supabaseClient
        .from('clients')
        .update({ 
          full_name: client_name,
          email: client_email || existingClient.email
        })
        .eq('id', client.id)
    } else {
      const { data: newClient, error: clientError } = await supabaseClient
        .from('clients')
        .insert({
          tenant_id,
          full_name: client_name,
          phone: client_phone,
          email: client_email,
          preferred_communication: 'whatsapp'
        })
        .select()
        .single()

      if (clientError) throw clientError
      client = newClient
    }

    // ============================================
    // 4. OBTENER INFORMACIÓN DEL SERVICIO
    // ============================================
    const { data: service, error: serviceError } = await supabaseClient
      .from('services')
      .select('id, name, duration_minutes, price')
      .eq('id', service_id)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .single()

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ error: 'Service not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 5. DETERMINAR PROFESIONAL
    // ============================================
    let professional

    if (professional_id) {
      const { data: prof, error: profError } = await supabaseClient
        .from('professionals')
        .select(`
          id,
          full_name,
          specialty,
          google_calendar_id,
          professional_services!inner(service_id, custom_duration_minutes, custom_price)
        `)
        .eq('id', professional_id)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .eq('professional_services.service_id', service_id)
        .eq('professional_services.is_active', true)
        .single()

      if (profError || !prof) {
        return new Response(
          JSON.stringify({ 
            error: 'Professional not found or does not offer this service' 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      professional = prof
    } else {
      const { data: profs, error: profsError } = await supabaseClient
        .from('professionals')
        .select(`
          id,
          full_name,
          specialty,
          google_calendar_id,
          professional_services!inner(service_id, custom_duration_minutes, custom_price)
        `)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .eq('professional_services.service_id', service_id)
        .eq('professional_services.is_active', true)
        .limit(1)

      if (profsError || !profs || profs.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No professionals available for this service' 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      professional = profs[0]
    }

    // ============================================
    // 6. CALCULAR DURACIÓN Y FIN DE LA CITA
    // ============================================
    const customDuration = professional.professional_services?.[0]?.custom_duration_minutes
    const customPrice = professional.professional_services?.[0]?.custom_price
    const duration = customDuration || service.duration_minutes
    const effectivePrice = customPrice || service.price
    const buffer = tenant.buffer_minutes || 0

    const startDate = new Date(start_time)
    const endDate = new Date(startDate.getTime() + duration * 60000)

    // ============================================
    // 7. VERIFICAR DISPONIBILIDAD
    // ============================================
    
    // 7.1: Verificar ausencias del profesional
    const { data: unavailabilities } = await supabaseClient
      .from('professional_unavailability')
      .select('id, reason_type')
      .eq('professional_id', professional.id)
      .eq('is_active', true)
      .lte('start_datetime', endDate.toISOString())
      .gte('end_datetime', startDate.toISOString())

    if (unavailabilities && unavailabilities.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Professional is not available at this time',
          reason: unavailabilities[0].reason_type
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7.2: Verificar citas conflictivas
    const { data: conflictingAppointments } = await supabaseClient
      .from('appointments')
      .select('id')
      .eq('professional_id', professional.id)
      .in('status', ['confirmed', 'pending'])
      .or(`and(start_time.lte.${endDate.toISOString()},end_time.gt.${startDate.toISOString()})`)

    if (conflictingAppointments && conflictingAppointments.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Time slot is not available',
          suggestion: 'Please choose another time'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7.3: Verificar horario laboral
    const dayOfWeek = startDate.getDay()
    
    const { data: businessHours } = await supabaseClient
      .from('business_hours')
      .select('start_time, end_time')
      .eq('professional_id', professional.id)
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
            error: 'Professional does not work on this day' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============================================
    // 8. CREAR CITA EN LA BASE DE DATOS
    // ============================================
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .insert({
        tenant_id,
        client_id: client.id,
        service_id: service.id,
        professional_id: professional.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        notes,
        created_by: 'ai_agent'
      })
      .select()
      .single()

    if (appointmentError) throw appointmentError

    // ============================================
    // 9. CREAR NOTIFICACIÓN DE CONFIRMACIÓN
    // ============================================
    await supabaseClient
      .from('notification_queue')
      .insert({
        tenant_id,
        client_id: client.id,
        recipient_phone: client.phone,
        recipient_email: client.email,
        notification_type: 'appointment_confirmation',
        channel: 'whatsapp',
        subject: 'Cita Confirmada',
        message: `Hola ${client.full_name}! Tu cita ha sido confirmada para el ${
          startDate.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        } a las ${startDate.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })} con ${professional.full_name}. ¡Te esperamos!`,
        appointment_id: appointment.id,
        scheduled_for: new Date().toISOString(),
        priority: 3
      })

    // ============================================
    // 10. CREAR RECORDATORIO AUTOMÁTICO (24h antes)
    // ============================================
    const reminderTime = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)
    
    if (reminderTime > new Date()) {
      await supabaseClient
        .from('notification_queue')
        .insert({
          tenant_id,
          client_id: client.id,
          recipient_phone: client.phone,
          recipient_email: client.email,
          notification_type: 'appointment_reminder',
          channel: 'whatsapp',
          subject: 'Recordatorio de Cita',
          message: `Hola ${client.full_name}! Te recordamos tu cita mañana a las ${
            startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          } con ${professional.full_name}. ¡Te esperamos!`,
          appointment_id: appointment.id,
          scheduled_for: reminderTime.toISOString(),
          priority: 2
        })
    }

    // ============================================
    // 11. GENERAR CÓDIGO DE CONFIRMACIÓN
    // ============================================
    const confirmationCode = generateConfirmationCode(appointment.id)

    await supabaseClient
      .from('appointments')
      .update({ 
        notes: notes 
          ? `${notes}\n[Código: ${confirmationCode}]`
          : `[Código: ${confirmationCode}]`
      })
      .eq('id', appointment.id)

    // ============================================
    // 12. OBTENER INFORMACIÓN ADICIONAL
    // ============================================
    const appointmentDate = new Date(appointment.start_time)
    const appointmentEndDate = new Date(appointment.end_time)

    const formattedDate = formatDateConversational(appointmentDate)
    const formattedTime = formatTime(appointmentDate)
    const formattedEndTime = formatTime(appointmentEndDate)
    const dayOfWeekName = getDayName(appointmentDate)
    const timePeriod = getTimePeriod(appointmentDate)

    const now = new Date()
    const hoursUntil = Math.floor((appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const daysUntil = Math.floor(hoursUntil / 24)

    let timeUntilMessage = ''
    if (daysUntil === 0) {
      timeUntilMessage = 'Hoy'
    } else if (daysUntil === 1) {
      timeUntilMessage = 'Mañana'
    } else if (daysUntil <= 7) {
      timeUntilMessage = `En ${daysUntil} días`
    } else {
      timeUntilMessage = `En ${Math.ceil(daysUntil / 7)} semana${Math.ceil(daysUntil / 7) > 1 ? 's' : ''}`
    }

    const { data: clinicInfo } = await supabaseClient
      .from('tenants')
      .select('business_name, phone, email, address, city')
      .eq('id', tenant_id)
      .single()

    // ============================================
    // 13. CONSTRUIR RESPUESTA CONVERSACIONAL
    // ============================================
    const conversationalMessage = buildConfirmationMessage({
      clientName: client.full_name,
      professionalName: professional.full_name,
      specialty: professional.specialty,
      serviceName: service.name,
      date: formattedDate,
      time: formattedTime,
      endTime: formattedEndTime,
      duration: duration,
      timeUntil: timeUntilMessage,
      dayOfWeek: dayOfWeek,
      confirmationCode: confirmationCode,
      clinicName: clinicInfo?.business_name || tenant.business_name,
      clinicAddress: clinicInfo?.address,
      clinicCity: clinicInfo?.city,
      clinicPhone: clinicInfo?.phone,
      price: effectivePrice
    })

    // ============================================
    // 14. RESPUESTA EXITOSA
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        
        appointment: {
          id: appointment.id,
          confirmation_code: confirmationCode,
          status: appointment.status,
          
          datetime: {
            iso: appointment.start_time,
            formatted: `${formattedDate} a las ${formattedTime}`,
            date: formattedDate,
            time: formattedTime,
            end_time: formattedEndTime,
            day_of_week: dayOfWeekName,
            time_period: timePeriod,
            time_until: timeUntilMessage
          },
          
          client: {
            id: client.id,
            name: client.full_name,
            phone: client.phone,
            email: client.email
          },
          
          professional: {
            id: professional.id,
            name: professional.full_name,
            specialty: professional.specialty
          },
          
          service: {
            id: service.id,
            name: service.name,
            duration_minutes: duration,
            price: effectivePrice
          },
          
          clinic: {
            name: clinicInfo?.business_name,
            address: clinicInfo?.address,
            city: clinicInfo?.city,
            phone: clinicInfo?.phone,
            email: clinicInfo?.email
          }
        },
        
        message: conversationalMessage,
        
        next_steps: [
          'Recibirás un recordatorio 24 horas antes de tu cita',
          'Si necesitas cancelar o reprogramar, contacta con anticipación',
          'Lleva tu DNI y cualquier documentación médica relevante'
        ],
        
        presentation: {
          format: 'confirmation',
          emoji_suggestions: {
            calendar: '📅',
            doctor: '👨‍⚕️',
            hospital: '🏥',
            clock: '⏰',
            checkmark: '✅'
          },
          tone: 'friendly_professional'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    )

  } catch (error) {
    console.error('Error in create-appointment:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateConfirmationCode(appointmentId: string): string {
  const shortId = appointmentId.replace(/-/g, '').substring(0, 8).toUpperCase()
  return `APT-${shortId}`
}

function formatDateConversational(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  }
  return date.toLocaleDateString('es-ES', options)
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}

function getDayName(date: Date): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  return days[date.getDay()]
}

function getTimePeriod(date: Date): string {
  const hour = date.getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

function buildConfirmationMessage(params: {
  clientName: string
  professionalName: string
  specialty?: string
  serviceName: string
  date: string
  time: string
  endTime: string
  duration: number
  timeUntil: string
  dayOfWeek: string
  confirmationCode: string
  clinicName: string
  clinicAddress?: string
  clinicCity?: string
  clinicPhone?: string
  price?: string
}): string {
  const {
    clientName,
    professionalName,
    specialty,
    serviceName,
    date,
    time,
    endTime,
    duration,
    timeUntil,
    confirmationCode,
    clinicName,
    clinicAddress,
    clinicCity,
    clinicPhone,
    price
  } = params

  let message = '¡Cita confirmada exitosamente!\n\n'
  
  message += '📅 **Detalles de tu cita:**\n'
  message += `- Paciente: ${clientName}\n`
  message += `- Fecha: ${date}\n`
  message += `- Hora: ${time} - ${endTime} (${duration} minutos)\n`
  message += `- ${timeUntil}\n\n`
  
  message += '👨‍⚕️ **Profesional:**\n'
  message += `- ${professionalName}`
  if (specialty) {
    message += ` - ${specialty}`
  }
  message += '\n'
  message += `- Servicio: ${serviceName}\n`
  if (price && parseFloat(price) > 0) {
    message += `- Precio: €${price}\n`
  }
  message += '\n'
  
  message += '🏥 **Centro:**\n'
  message += `- ${clinicName}\n`
  if (clinicAddress) {
    message += `- ${clinicAddress}`
    if (clinicCity) {
      message += `, ${clinicCity}`
    }
    message += '\n'
  }
  if (clinicPhone) {
    message += `- Tel: ${clinicPhone}\n`
  }
  message += '\n'
  
  message += `🔖 **Código de confirmación:** ${confirmationCode}\n\n`
  
  message += '✅ **¿Qué sigue?**\n'
  message += '- Recibirás un recordatorio 24h antes\n'
  message += '- Guarda este código para cualquier consulta\n'
  message += '- Si necesitas cancelar, avisa con anticipación\n'

  return message
}