import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  tenant_id: string
  professional_id: string // UUID del profesional
  date_from?: string // Fecha de inicio (ISO string, default: hoy)
  date_to?: string // Fecha de fin (ISO string, default: +30 días)
  status?: string // Filtrar por estado: 'all', 'confirmed', 'pending', 'cancelled', 'completed'
  limit?: number // Límite de resultados (default: 100)
  include_cancelled?: boolean // Incluir citas canceladas (default: true)
  order_by?: 'start_time_asc' | 'start_time_desc' // Orden de resultados (default: start_time_asc)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenant_id,
      professional_id,
      date_from,
      date_to,
      status,
      limit = 100,
      include_cancelled = true,
      order_by = 'start_time_asc'
    }: RequestBody = await req.json()

    // ============================================
    // 1. VALIDACIONES
    // ============================================
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ 
          error: 'tenant_id is required',
          code: 'MISSING_TENANT_ID'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!professional_id) {
      return new Response(
        JSON.stringify({ 
          error: 'professional_id is required',
          code: 'MISSING_PROFESSIONAL_ID'
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
    // 3. VERIFICAR PROFESIONAL
    // ============================================
    const { data: professional, error: professionalError } = await supabaseClient
      .from('professionals')
      .select('id, full_name, specialty, email, phone, tenant_id, is_active')
      .eq('id', professional_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (professionalError || !professional) {
      return new Response(
        JSON.stringify({ 
          error: 'Professional not found',
          code: 'PROFESSIONAL_NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!professional.is_active) {
      return new Response(
        JSON.stringify({ 
          error: 'Professional is not active',
          code: 'PROFESSIONAL_INACTIVE'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 4. CONSTRUIR RANGO DE FECHAS
    // ============================================
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    let startDate: Date
    let endDate: Date

    if (date_from) {
      startDate = new Date(date_from)
    } else {
      startDate = new Date(today)
    }

    if (date_to) {
      endDate = new Date(date_to)
      // Incluir todo el día final
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Default: +30 días desde hoy
      endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 30)
      endDate.setHours(23, 59, 59, 999)
    }

    // Validar que date_from <= date_to
    if (startDate > endDate) {
      return new Response(
        JSON.stringify({ 
          error: 'date_from must be less than or equal to date_to',
          code: 'INVALID_DATE_RANGE'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 5. CONSTRUIR QUERY DE CITAS
    // ============================================
    let appointmentsQuery = supabaseClient
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
        cancelled_at,
        completed_at,
        created_at,
        updated_at,
        clients:client_id (
          id,
          full_name,
          phone,
          email
        ),
        professionals:professional_id (
          id,
          full_name,
          specialty,
          email,
          phone
        ),
        services:service_id (
          id,
          name,
          description,
          duration_minutes,
          price
        )
      `)
      .eq('tenant_id', tenant_id)
      .eq('professional_id', professional_id)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())

    // Filtro: Estado
    if (status && status !== 'all') {
      appointmentsQuery = appointmentsQuery.eq('status', status)
    } else if (!include_cancelled) {
      appointmentsQuery = appointmentsQuery.neq('status', 'cancelled')
    }

    // Orden
    const ascending = order_by === 'start_time_asc'
    appointmentsQuery = appointmentsQuery.order('start_time', { ascending })

    // Límite
    appointmentsQuery = appointmentsQuery.limit(limit)

    const { data: appointments, error: appointmentsError } = await appointmentsQuery

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      throw appointmentsError
    }

    // ============================================
    // 6. FORMATEAR RESPUESTA PARA EL LLM
    // ============================================
    const nowDate = new Date()
    const formattedAppointments = (appointments || []).map(apt => {
      const appointmentDate = new Date(apt.start_time)
      const appointmentEndDate = new Date(apt.end_time)
      
      const formattedDate = formatDateConversational(appointmentDate)
      const formattedTime = formatTime(appointmentDate)
      const formattedEndTime = formatTime(appointmentEndDate)
      const dayOfWeek = getDayName(appointmentDate)
      const timePeriod = getTimePeriod(appointmentDate)

      const hoursUntil = Math.floor((appointmentDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60))
      const daysUntil = Math.floor(hoursUntil / 24)
      const minutesUntil = Math.floor((appointmentDate.getTime() - nowDate.getTime()) / (1000 * 60))

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

      return {
        id: apt.id,
        status: apt.status,
        
        datetime: {
          iso: {
            start: apt.start_time,
            end: apt.end_time
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
          is_today: daysUntil === 0 && hoursUntil >= 0,
          is_future: minutesUntil > 0
        },
        
        client: apt.clients ? {
          id: apt.clients.id,
          name: apt.clients.full_name,
          phone: apt.clients.phone,
          email: apt.clients.email
        } : null,
        
        professional: apt.professionals ? {
          id: apt.professionals.id,
          name: apt.professionals.full_name,
          specialty: apt.professionals.specialty,
          email: apt.professionals.email,
          phone: apt.professionals.phone
        } : null,
        
        service: apt.services ? {
          id: apt.services.id,
          name: apt.services.name,
          description: apt.services.description,
          duration_minutes: apt.services.duration_minutes,
          price: apt.services.price
        } : null,
        
        notes: apt.notes,
        cancellation_reason: apt.cancellation_reason || undefined,
        
        metadata: {
          created_at: apt.created_at,
          updated_at: apt.updated_at,
          cancelled_at: apt.cancelled_at || undefined,
          completed_at: apt.completed_at || undefined
        },
        
        summary: buildAppointmentSummary(apt, {
          formattedDate,
          formattedTime,
          timeUntilMessage,
          dayOfWeek,
          serviceName: apt.services?.name,
          clientName: apt.clients?.full_name
        })
      }
    })

    // Separar citas futuras y pasadas
    const futureAppointments = formattedAppointments.filter(apt => apt.time_until.is_future)
    const pastAppointments = formattedAppointments.filter(apt => apt.time_until.is_past)
    const todayAppointments = formattedAppointments.filter(apt => apt.time_until.is_today)

    // Agrupar por estado
    const byStatus = {
      confirmed: formattedAppointments.filter(apt => apt.status === 'confirmed'),
      pending: formattedAppointments.filter(apt => apt.status === 'pending'),
      cancelled: formattedAppointments.filter(apt => apt.status === 'cancelled'),
      completed: formattedAppointments.filter(apt => apt.status === 'completed')
    }

    // Agrupar por día para visualización de calendario
    const groupedByDay = groupAppointmentsByDay(formattedAppointments)

    // ============================================
    // 7. CONSTRUIR RESPUESTA FINAL
    // ============================================
    const response = {
      tenant: {
        id: tenant.id,
        business_name: tenant.business_name
      },
      professional: {
        id: professional.id,
        name: professional.full_name,
        specialty: professional.specialty,
        email: professional.email,
        phone: professional.phone
      },
      date_range: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        formatted: {
          from: formatDateConversational(startDate),
          to: formatDateConversational(endDate)
        }
      },
      appointments: formattedAppointments,
      grouped_by_day: groupedByDay,
      count: formattedAppointments.length,
      summary: {
        total: formattedAppointments.length,
        future: futureAppointments.length,
        past: pastAppointments.length,
        today: todayAppointments.length,
        by_status: {
          confirmed: byStatus.confirmed.length,
          pending: byStatus.pending.length,
          cancelled: byStatus.cancelled.length,
          completed: byStatus.completed.length
        }
      },
      filters_applied: {
        status: status || 'all',
        include_cancelled,
        order_by,
        date_from: startDate.toISOString(),
        date_to: endDate.toISOString()
      },
      message: buildListMessage(formattedAppointments, {
        professionalName: professional.full_name,
        futureCount: futureAppointments.length,
        pastCount: pastAppointments.length,
        todayCount: todayAppointments.length,
        dateFrom: formatDateConversational(startDate),
        dateTo: formatDateConversational(endDate)
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
    console.error('Error in list-professional-appointments:', error)
    
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
 * Formatea fecha corta (solo día y mes)
 */
function formatDateShort(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long'
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
 * Agrupa citas por día para visualización de calendario
 */
function groupAppointmentsByDay(appointments: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}
  
  appointments.forEach(apt => {
    const date = new Date(apt.datetime.iso.start)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    
    grouped[dateKey].push(apt)
  })
  
  // Ordenar citas dentro de cada día por hora
  Object.keys(grouped).forEach(dateKey => {
    grouped[dateKey].sort((a, b) => {
      const timeA = new Date(a.datetime.iso.start).getTime()
      const timeB = new Date(b.datetime.iso.start).getTime()
      return timeA - timeB
    })
  })
  
  return grouped
}

/**
 * Construye un resumen conversacional de la cita
 */
function buildAppointmentSummary(appointment: any, params: any): string {
  const { formattedDate, formattedTime, timeUntilMessage, dayOfWeek, serviceName, clientName } = params
  
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
  
  if (clientName) {
    parts.push(`con ${clientName}`)
  }
  
  parts.push(`el ${formattedDate} a las ${formattedTime}`)
  
  if (timeUntilMessage && appointment.status === 'confirmed') {
    parts.push(`(${timeUntilMessage})`)
  }
  
  return parts.join(' - ')
}

/**
 * Construye mensaje resumen de la lista de citas
 */
function buildListMessage(appointments: any[], params: any): string {
  const { professionalName, futureCount, pastCount, todayCount, dateFrom, dateTo } = params
  const total = appointments.length

  if (total === 0) {
    return `${professionalName} no tiene citas registradas entre ${dateFrom} y ${dateTo}`
  }

  const parts = []
  parts.push(`${professionalName} tiene ${total} cita${total > 1 ? 's' : ''} registrada${total > 1 ? 's' : ''}`)

  if (futureCount > 0) {
    parts.push(`${futureCount} futura${futureCount > 1 ? 's' : ''}`)
  }

  if (todayCount > 0) {
    parts.push(`${todayCount} hoy`)
  }

  if (pastCount > 0) {
    parts.push(`${pastCount} pasada${pastCount > 1 ? 's' : ''}`)
  }

  parts.push(`entre ${dateFrom} y ${dateTo}`)

  return parts.join(', ')
}

