import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  tenant_id: string
  specialty?: string // "Cardiología", "Pediatría", etc
  professional_name?: string // Búsqueda parcial: "Carlos", "Dr. Martinez"
  service_id?: string // Buscar profesionales que ofrecen un servicio específico
  include_services?: boolean // Incluir lista de servicios que ofrece
  include_schedule?: boolean // Incluir horarios laborales
  only_available?: boolean // Solo profesionales activos y disponibles
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenant_id,
      specialty,
      professional_name,
      service_id,
      include_services = true,
      include_schedule = false,
      only_available = true
    }: RequestBody = await req.json()

    // ============================================
    // 1. VALIDACIÓN
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
    // 2. VERIFICAR TENANT
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
    // 3. CONSTRUIR QUERY BASE
    // ============================================
    let professionalsQuery = supabaseClient
      .from('professionals')
      .select('id, full_name, email, phone, specialty, bio, color, display_order')
      .eq('tenant_id', tenant_id)
      .order('display_order')

    // Filtro: Solo activos
    if (only_available) {
      professionalsQuery = professionalsQuery.eq('is_active', true)
    }

    // Filtro: Por especialidad (case-insensitive, búsqueda parcial)
    if (specialty) {
      professionalsQuery = professionalsQuery.ilike('specialty', `%${specialty}%`)
    }

    // Filtro: Por nombre (case-insensitive, búsqueda parcial)
    if (professional_name) {
      professionalsQuery = professionalsQuery.ilike('full_name', `%${professional_name}%`)
    }

    const { data: professionals, error: profError } = await professionalsQuery

    if (profError) {
      console.error('Error fetching professionals:', profError)
      throw profError
    }

    // Si no se encontraron profesionales
    if (!professionals || professionals.length === 0) {
      return new Response(
        JSON.stringify({
          tenant: {
            id: tenant.id,
            business_name: tenant.business_name
          },
          professionals: [],
          count: 0,
          message: buildNoResultsMessage({ specialty, professional_name, service_id })
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 4. FILTRAR POR SERVICIO (si se especificó)
    // ============================================
    let filteredProfessionals = professionals

    if (service_id) {
      const { data: profServices } = await supabaseClient
        .from('professional_services')
        .select('professional_id')
        .eq('service_id', service_id)
        .eq('is_active', true)

      if (profServices && profServices.length > 0) {
        const professionalIds = profServices.map(ps => ps.professional_id)
        filteredProfessionals = professionals.filter(p => professionalIds.includes(p.id))
      } else {
        // Ningún profesional ofrece ese servicio
        return new Response(
          JSON.stringify({
            tenant: {
              id: tenant.id,
              business_name: tenant.business_name
            },
            professionals: [],
            count: 0,
            message: 'No se encontraron profesionales que ofrezcan este servicio'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============================================
    // 5. ENRIQUECER CON SERVICIOS (si se solicitó)
    // ============================================
    if (include_services) {
      for (const prof of filteredProfessionals) {
        const { data: services } = await supabaseClient
          .from('professional_services')
          .select(`
            service_id,
            custom_duration_minutes,
            custom_price,
            services:service_id (
              id,
              name,
              description,
              duration_minutes,
              price
            )
          `)
          .eq('professional_id', prof.id)
          .eq('is_active', true)

        // Mapear servicios con valores efectivos (custom o default)
        prof.services = services?.map(ps => ({
          id: ps.services.id,
          name: ps.services.name,
          description: ps.services.description,
          duration_minutes: ps.custom_duration_minutes || ps.services.duration_minutes,
          price: ps.custom_price || ps.services.price
        })) || []
      }
    }

    // ============================================
    // 6. ENRIQUECER CON HORARIOS (si se solicitó)
    // ============================================
    if (include_schedule) {
      for (const prof of filteredProfessionals) {
        const { data: schedule } = await supabaseClient
          .from('business_hours')
          .select('day_of_week, start_time, end_time')
          .eq('professional_id', prof.id)
          .eq('is_active', true)
          .order('day_of_week')

        if (schedule && schedule.length > 0) {
          prof.schedule = formatScheduleForLLM(schedule)
        } else {
          // Usar horario del tenant si no tiene propio
          const { data: tenantSchedule } = await supabaseClient
            .from('business_hours')
            .select('day_of_week, start_time, end_time')
            .eq('tenant_id', tenant_id)
            .is('professional_id', null)
            .eq('is_active', true)
            .order('day_of_week')

          if (tenantSchedule && tenantSchedule.length > 0) {
            prof.schedule = formatScheduleForLLM(tenantSchedule)
          } else {
            prof.schedule = 'Horario no disponible'
          }
        }
      }
    }

    // ============================================
    // 7. VERIFICAR DISPONIBILIDAD FUTURA (si solo_available)
    // ============================================
    if (only_available) {
      // Filtrar profesionales que tienen ausencias activas
      const now = new Date().toISOString()
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 días

      const { data: unavailabilities } = await supabaseClient
        .from('professional_unavailability')
        .select('professional_id')
        .in('professional_id', filteredProfessionals.map(p => p.id))
        .eq('is_active', true)
        .lte('start_datetime', futureDate)
        .gte('end_datetime', now)

      if (unavailabilities && unavailabilities.length > 0) {
        const unavailableIds = unavailabilities.map(u => u.professional_id)
        
        // Marcar profesionales no disponibles pero no eliminarlos
        // (el LLM puede informar al usuario)
        filteredProfessionals.forEach(prof => {
          if (unavailableIds.includes(prof.id)) {
            prof.currently_unavailable = true
            prof.availability_note = 'Temporalmente no disponible'
          }
        })
      }
    }

    // ============================================
    // 8. FORMATEAR RESPUESTA PARA EL LLM
    // ============================================
    const response = {
      tenant: {
        id: tenant.id,
        business_name: tenant.business_name
      },
      professionals: filteredProfessionals.map(prof => ({
        id: prof.id,
        name: prof.full_name,
        specialty: prof.specialty,
        bio: prof.bio,
        services: prof.services || undefined,
        schedule: prof.schedule || undefined,
        currently_unavailable: prof.currently_unavailable || false,
        availability_note: prof.availability_note || undefined,
        // Info útil para el LLM
        summary: buildProfessionalSummary(prof)
      })),
      count: filteredProfessionals.length,
      search_criteria: {
        specialty: specialty || 'Todas',
        professional_name: professional_name || 'Todos',
        service_id: service_id || 'Ninguno'
      },
      // Mensaje contextual para el LLM
      message: buildSearchResultMessage(filteredProfessionals, { specialty, professional_name })
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in search-professionals:', error)
    
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
 * Construye un resumen conversacional del profesional
 */
function buildProfessionalSummary(prof: any): string {
  const parts = []
  
  parts.push(prof.full_name)
  
  if (prof.specialty) {
    parts.push(`especialista en ${prof.specialty}`)
  }
  
  if (prof.services && prof.services.length > 0) {
    const serviceNames = prof.services.map(s => s.name).slice(0, 3).join(', ')
    parts.push(`ofrece: ${serviceNames}`)
  }
  
  if (prof.currently_unavailable) {
    parts.push('(temporalmente no disponible)')
  }
  
  return parts.join(' - ')
}

/**
 * Construye mensaje de resultados de búsqueda
 */
function buildSearchResultMessage(professionals: any[], criteria: any): string {
  const count = professionals.length
  
  if (count === 0) {
    return 'No se encontraron profesionales con esos criterios'
  }
  
  if (count === 1) {
    return `Se encontró 1 profesional${criteria.specialty ? ` en ${criteria.specialty}` : ''}`
  }
  
  return `Se encontraron ${count} profesionales${criteria.specialty ? ` en ${criteria.specialty}` : ''}`
}

/**
 * Construye mensaje cuando no hay resultados
 */
function buildNoResultsMessage(criteria: any): string {
  const parts = []
  
  if (criteria.specialty) {
    parts.push(`especialidad "${criteria.specialty}"`)
  }
  
  if (criteria.professional_name) {
    parts.push(`nombre "${criteria.professional_name}"`)
  }
  
  if (criteria.service_id) {
    parts.push('servicio especificado')
  }
  
  if (parts.length === 0) {
    return 'No hay profesionales disponibles'
  }
  
  return `No se encontraron profesionales con ${parts.join(' y ')}`
}