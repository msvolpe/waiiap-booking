import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  tenant_id: string
  service_id: string
  professional_id?: string // Opcional: si no se especifica, busca en todos los que ofrecen el servicio
  date_from?: string // YYYY-MM-DD (default: hoy)
  date_to?: string // YYYY-MM-DD (default: +30 días)
  preferred_time?: 'morning' | 'afternoon' | 'evening' | 'any' // Filtro de horario
  max_results?: number // Límite de slots a retornar (default: 20)
  prioritize?: 'earliest' | 'latest' // Ordenar por fecha más cercana o lejana
}

interface TimeSlot {
  datetime: string // ISO8601
  date: string // Formato legible: "Viernes 25 de Octubre"
  time: string // "10:00"
  formatted: string // "Viernes 25 de Octubre a las 10:00"
  professional_id: string
  professional_name: string
  service_name: string
  duration_minutes: number
  price: string
  end_time: string
  day_of_week: string // "Viernes"
  time_period: string // "morning", "afternoon", "evening"
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenant_id,
      service_id,
      professional_id,
      date_from,
      date_to,
      preferred_time = 'any',
      max_results = 20,
      prioritize = 'earliest'
    }: RequestBody = await req.json()

    // ============================================
    // 1. VALIDACIONES
    // ============================================
    if (!tenant_id || !service_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['tenant_id', 'service_id']
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
    // 2. CALCULAR RANGO DE FECHAS
    // ============================================
    const now = new Date()
    const startDate = date_from ? new Date(date_from) : now
    const endDate = date_to 
      ? new Date(date_to) 
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 días por defecto

    // Validar que startDate no sea en el pasado
    if (startDate < now) {
      startDate.setTime(now.getTime())
    }

    // ============================================
    // 3. OBTENER INFORMACIÓN DEL TENANT
    // ============================================
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, business_name, timezone, buffer_minutes')
      .eq('id', tenant_id)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
    // 5. DETERMINAR PROFESIONALES A CONSULTAR
    // ============================================
    let professionalsToCheck = []

    if (professional_id) {
      // Verificar que el profesional existe y ofrece el servicio
      const { data: prof, error: profError } = await supabaseClient
        .from('professionals')
        .select(`
          id,
          full_name,
          professional_services!inner (
            service_id,
            custom_duration_minutes,
            custom_price
          )
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

      professionalsToCheck = [prof]
    } else {
      // Buscar todos los profesionales que ofrecen el servicio
      const { data: profs, error: profsError } = await supabaseClient
        .from('professionals')
        .select(`
          id,
          full_name,
          professional_services!inner (
            service_id,
            custom_duration_minutes,
            custom_price
          )
        `)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .eq('professional_services.service_id', service_id)
        .eq('professional_services.is_active', true)

      if (profsError || !profs || profs.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No professionals available for this service',
            slots: [],
            count: 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      professionalsToCheck = profs
    }

    // ============================================
    // 6. GENERAR SLOTS PARA CADA PROFESIONAL
    // ============================================
    const allSlots: TimeSlot[] = []

    for (const prof of professionalsToCheck) {
      // Obtener duración y precio efectivos
      const customDuration = prof.professional_services?.[0]?.custom_duration_minutes
      const customPrice = prof.professional_services?.[0]?.custom_price
      const effectiveDuration = customDuration || service.duration_minutes
      const effectivePrice = customPrice || service.price

      // Verificar si el profesional está ausente en este período
      const { data: unavailabilities } = await supabaseClient
        .from('professional_unavailability')
        .select('start_datetime, end_datetime, reason_type')
        .eq('professional_id', prof.id)
        .eq('is_active', true)
        .lte('start_datetime', endDate.toISOString())
        .gte('end_datetime', startDate.toISOString())

      // Obtener horarios del profesional
      const { data: schedule } = await supabaseClient
        .from('business_hours')
        .select('day_of_week, start_time, end_time')
        .eq('professional_id', prof.id)
        .eq('is_active', true)

      // Si no tiene horarios propios, usar los del tenant
      let businessHours = schedule || []
      
      if (businessHours.length === 0) {
        const { data: tenantSchedule } = await supabaseClient
          .from('business_hours')
          .select('day_of_week, start_time, end_time')
          .eq('tenant_id', tenant_id)
          .is('professional_id', null)
          .eq('is_active', true)

        businessHours = tenantSchedule || []
      }

      if (businessHours.length === 0) {
        console.log(`No business hours for professional ${prof.id}`)
        continue
      }

      // Obtener citas existentes del profesional
      const { data: existingAppointments } = await supabaseClient
        .from('appointments')
        .select('start_time, end_time')
        .eq('professional_id', prof.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .in('status', ['confirmed', 'pending'])

      // Generar slots disponibles
      const professionalSlots = generateAvailableSlots({
        professionalId: prof.id,
        professionalName: prof.full_name,
        serviceName: service.name,
        dateFrom: startDate,
        dateTo: endDate,
        businessHours,
        existingAppointments: existingAppointments || [],
        unavailabilities: unavailabilities || [],
        duration: effectiveDuration,
        buffer: tenant.buffer_minutes || 0,
        price: effectivePrice,
        timezone: tenant.timezone
      })

      allSlots.push(...professionalSlots)
    }

    // ============================================
    // 7. FILTRAR POR HORARIO PREFERIDO
    // ============================================
    let filteredSlots = allSlots

    if (preferred_time !== 'any') {
      filteredSlots = allSlots.filter(slot => slot.time_period === preferred_time)
    }

    // ============================================
    // 8. ORDENAR RESULTADOS
    // ============================================
    if (prioritize === 'earliest') {
      filteredSlots.sort((a, b) => 
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      )
    } else {
      filteredSlots.sort((a, b) => 
        new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      )
    }

    // ============================================
    // 9. LIMITAR RESULTADOS
    // ============================================
    const limitedSlots = filteredSlots.slice(0, max_results)

    // ============================================
    // 10. CONSTRUIR RESPUESTA
    // ============================================
    const response = {
      tenant: {
        id: tenant.id,
        business_name: tenant.business_name
      },
      service: {
        id: service.id,
        name: service.name
      },
      search_criteria: {
        date_from: startDate.toISOString().split('T')[0],
        date_to: endDate.toISOString().split('T')[0],
        preferred_time: preferred_time,
        professionals_checked: professionalsToCheck.length
      },
      slots: limitedSlots,
      count: limitedSlots.length,
      total_found: filteredSlots.length,
      message: buildSlotsMessage(limitedSlots, {
        service: service.name,
        preferred_time,
        total: filteredSlots.length,
        showing: limitedSlots.length
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
    console.error('Error in get-available-slots:', error)
    
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

/**
 * Genera slots disponibles para un profesional
 */
function generateAvailableSlots(params: {
  professionalId: string
  professionalName: string
  serviceName: string
  dateFrom: Date
  dateTo: Date
  businessHours: any[]
  existingAppointments: any[]
  unavailabilities: any[]
  duration: number
  buffer: number
  price: string
  timezone: string
}): TimeSlot[] {
  const {
    professionalId,
    professionalName,
    serviceName,
    dateFrom,
    dateTo,
    businessHours,
    existingAppointments,
    unavailabilities,
    duration,
    buffer,
    price,
    timezone
  } = params

  const slots: TimeSlot[] = []
  const slotInterval = duration + buffer
  const now = new Date()

  // Iterar día por día
  for (let date = new Date(dateFrom); date <= dateTo; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay()

    // Verificar si el profesional está ausente este día
    const isUnavailable = unavailabilities.some(unavail => {
      const unavailStart = new Date(unavail.start_datetime)
      const unavailEnd = new Date(unavail.end_datetime)
      return date >= unavailStart && date <= unavailEnd
    })

    if (isUnavailable) continue

    // Buscar horario laboral para este día
    const daySchedules = businessHours.filter(bh => bh.day_of_week === dayOfWeek)
    
    if (daySchedules.length === 0) continue

    // Procesar cada bloque horario del día (puede haber mañana y tarde separados)
    for (const daySchedule of daySchedules) {
      const [startHour, startMin] = daySchedule.start_time.split(':').map(Number)
      const [endHour, endMin] = daySchedule.end_time.split(':').map(Number)

      const dayStart = new Date(date)
      dayStart.setHours(startHour, startMin, 0, 0)

      const dayEnd = new Date(date)
      dayEnd.setHours(endHour, endMin, 0, 0)

      // Generar slots cada X minutos
      let currentSlot = new Date(dayStart)

      while (currentSlot < dayEnd) {
        const slotEnd = new Date(currentSlot.getTime() + duration * 60000)

        // Verificar que el slot no exceda el horario laboral
        if (slotEnd > dayEnd) break

        // Verificar que sea en el futuro (al menos 1 hora de anticipación)
        if (currentSlot <= new Date(now.getTime() + 60 * 60 * 1000)) {
          currentSlot = new Date(currentSlot.getTime() + slotInterval * 60000)
          continue
        }

        // Verificar conflicto con citas existentes
        const hasConflict = existingAppointments.some(apt => {
          const aptStart = new Date(apt.start_time)
          const aptEnd = new Date(apt.end_time)
          
          return (
            (currentSlot >= aptStart && currentSlot < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (currentSlot <= aptStart && slotEnd >= aptEnd)
          )
        })

        if (!hasConflict) {
          slots.push({
            datetime: currentSlot.toISOString(),
            date: formatDate(currentSlot),
            time: formatTime(currentSlot),
            formatted: formatFullDateTime(currentSlot),
            professional_id: professionalId,
            professional_name: professionalName,
            service_name: serviceName,
            duration_minutes: duration,
            price: price,
            end_time: slotEnd.toISOString(),
            day_of_week: getDayName(currentSlot),
            time_period: getTimePeriod(currentSlot)
          })
        }

        currentSlot = new Date(currentSlot.getTime() + slotInterval * 60000)
      }
    }
  }

  return slots
}

/**
 * Formatea fecha: "Viernes 25 de Octubre"
 */
function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }
  return date.toLocaleDateString('es-ES', options)
}

/**
 * Formatea hora: "10:00"
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Formatea fecha y hora completa: "Viernes 25 de Octubre a las 10:00"
 */
function formatFullDateTime(date: Date): string {
  return `${formatDate(date)} a las ${formatTime(date)}`
}

/**
 * Obtiene nombre del día: "Viernes"
 */
function getDayName(date: Date): string {
  return date.toLocaleDateString('es-ES', { weekday: 'long' })
}

/**
 * Determina período del día: morning, afternoon, evening
 */
function getTimePeriod(date: Date): string {
  const hour = date.getHours()
  
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

/**
 * Construye mensaje contextual sobre los slots encontrados
 */
function buildSlotsMessage(
  slots: TimeSlot[], 
  context: { service: string, preferred_time: string, total: number, showing: number }
): string {
  if (slots.length === 0) {
    let message = `No se encontraron horarios disponibles para ${context.service}`
    if (context.preferred_time !== 'any') {
      const timeLabels = {
        morning: 'por la mañana',
        afternoon: 'por la tarde',
        evening: 'por la noche'
      }
      message += ` ${timeLabels[context.preferred_time]}`
    }
    return message + '. Intenta con otras fechas u horarios.'
  }

  const firstSlot = slots[0]
  let message = `Encontré ${context.total} horario${context.total > 1 ? 's' : ''} disponible${context.total > 1 ? 's' : ''}`
  
  if (context.preferred_time !== 'any') {
    const timeLabels = {
      morning: 'en la mañana',
      afternoon: 'en la tarde',
      evening: 'en la noche'
    }
    message += ` ${timeLabels[context.preferred_time]}`
  }

  message += `. El más cercano es ${firstSlot.formatted}`

  if (context.showing < context.total) {
    message += `. Mostrando los primeros ${context.showing}.`
  }

  return message
}