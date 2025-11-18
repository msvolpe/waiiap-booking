import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  tenant_id: string
  client_id?: string // UUID del cliente
  client_phone?: string // Teléfono del cliente (alternativa a client_id)
  client_email?: string // Email del cliente (alternativa a client_id)
  status?: string // Filtrar por estado: 'confirmed', 'pending', 'cancelled', 'completed'
  only_future?: boolean // Solo citas futuras
  only_past?: boolean // Solo citas pasadas
  limit?: number // Límite de resultados (default: 50)
  include_cancelled?: boolean // Incluir citas canceladas (default: true)
  order_by?: 'start_time_asc' | 'start_time_desc' // Orden de resultados (default: start_time_desc)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenant_id,
      client_id,
      client_phone,
      client_email,
      status,
      only_future = false,
      only_past = false,
      limit = 50,
      include_cancelled = true,
      order_by = 'start_time_desc'
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

    if (!client_id && !client_phone && !client_email) {
      return new Response(
        JSON.stringify({ 
          error: 'At least one client identifier is required',
          required: ['client_id', 'client_phone', 'client_email'],
          code: 'MISSING_CLIENT_IDENTIFIER'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (only_future && only_past) {
      return new Response(
        JSON.stringify({ 
          error: 'only_future and only_past cannot both be true',
          code: 'INVALID_FILTERS'
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
    // 3. OBTENER O IDENTIFICAR CLIENTE
    // ============================================
    let client
    let resolvedClientId: string | null = null

    if (client_id) {
      // Si se proporciona client_id directamente, usarlo
      const { data: foundClient, error: clientError } = await supabaseClient
        .from('clients')
        .select('id, full_name, phone, email, tenant_id')
        .eq('id', client_id)
        .eq('tenant_id', tenant_id)
        .single()

      if (clientError || !foundClient) {
        return new Response(
          JSON.stringify({ 
            error: 'Client not found',
            code: 'CLIENT_NOT_FOUND'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      client = foundClient
      resolvedClientId = foundClient.id
    } else {
      // Buscar cliente por phone o email
      let clientQuery = supabaseClient
        .from('clients')
        .select('id, full_name, phone, email, tenant_id')
        .eq('tenant_id', tenant_id)

      if (client_phone) {
        clientQuery = clientQuery.eq('phone', client_phone)
      } else if (client_email) {
        clientQuery = clientQuery.eq('email', client_email)
      }

      const { data: foundClient, error: clientError } = await clientQuery.single()

      if (clientError || !foundClient) {
        return new Response(
          JSON.stringify({ 
            error: 'Client not found',
            code: 'CLIENT_NOT_FOUND',
            message: 'No se encontró un cliente con los datos proporcionados'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      client = foundClient
      resolvedClientId = foundClient.id
    }

    // ============================================
    // 4. CONSTRUIR QUERY DE CITAS
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
      .eq('client_id', resolvedClientId)

    // Filtro: Estado
    if (status) {
      appointmentsQuery = appointmentsQuery.eq('status', status)
    } else if (!include_cancelled) {
      appointmentsQuery = appointmentsQuery.neq('status', 'cancelled')
    }

    // Filtro: Fechas
    const now = new Date().toISOString()
    if (only_future) {
      appointmentsQuery = appointmentsQuery.gte('start_time', now)
    } else if (only_past) {
      appointmentsQuery = appointmentsQuery.lt('start_time', now)
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
    // 5. FORMATEAR RESPUESTA PARA EL LLM
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
          professionalName: apt.professionals?.full_name
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

    // ============================================
    // 6. CONSTRUIR RESPUESTA FINAL
    // ============================================
    const response = {
      tenant: {
        id: tenant.id,
        business_name: tenant.business_name
      },
      client: {
        id: client.id,
        name: client.full_name,
        phone: client.phone,
        email: client.email
      },
      appointments: formattedAppointments,
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
        only_future,
        only_past,
        include_cancelled,
        order_by
      },
      message: buildListMessage(formattedAppointments, {
        clientName: client.full_name,
        futureCount: futureAppointments.length,
        pastCount: pastAppointments.length,
        todayCount: todayAppointments.length
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
    console.error('Error in list-client-appointments:', error)
    
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

/**
 * Construye mensaje resumen de la lista de citas
 */
function buildListMessage(appointments: any[], params: any): string {
  const { clientName, futureCount, pastCount, todayCount } = params
  const total = appointments.length

  if (total === 0) {
    return `${clientName} no tiene citas registradas`
  }

  const parts = []
  parts.push(`${clientName} tiene ${total} cita${total > 1 ? 's' : ''} registrada${total > 1 ? 's' : ''}`)

  if (futureCount > 0) {
    parts.push(`${futureCount} futura${futureCount > 1 ? 's' : ''}`)
  }

  if (todayCount > 0) {
    parts.push(`${todayCount} hoy`)
  }

  if (pastCount > 0) {
    parts.push(`${pastCount} pasada${pastCount > 1 ? 's' : ''}`)
  }

  return parts.join(', ')
}

