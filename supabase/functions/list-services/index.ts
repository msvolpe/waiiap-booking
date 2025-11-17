import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  tenant_id: string
  service_name?: string // Búsqueda parcial: "Consulta", "Limpieza", etc
  is_active?: boolean // Filtrar por estado activo (default: true)
  include_professionals?: boolean // Incluir lista de profesionales que lo ofrecen (default: false)
  include_pricing?: boolean // Incluir detalles de precios personalizados (default: true)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      tenant_id,
      service_name,
      is_active = true,
      include_professionals = false,
      include_pricing = true
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
    let servicesQuery = supabaseClient
      .from('services')
      .select('id, name, description, duration_minutes, price, color, is_active, requires_approval')
      .eq('tenant_id', tenant_id)
      .order('name')

    // Filtro: Por estado activo
    if (is_active !== undefined) {
      servicesQuery = servicesQuery.eq('is_active', is_active)
    }

    // Filtro: Por nombre (case-insensitive, búsqueda parcial)
    if (service_name) {
      servicesQuery = servicesQuery.ilike('name', `%${service_name}%`)
    }

    const { data: services, error: servicesError } = await servicesQuery

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      throw servicesError
    }

    // Si no se encontraron servicios
    if (!services || services.length === 0) {
      return new Response(
        JSON.stringify({
          tenant: {
            id: tenant.id,
            business_name: tenant.business_name
          },
          services: [],
          count: 0,
          message: buildNoResultsMessage({ service_name, is_active }),
          search_criteria: {
            service_name: service_name || null,
            is_active: is_active
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 4. ENRIQUECER CON PROFESIONALES (si se solicitó)
    // ============================================
    if (include_professionals) {
      for (const service of services) {
        const { data: professionalServices } = await supabaseClient
          .from('professional_services')
          .select(`
            professional_id,
            custom_duration_minutes,
            custom_price,
            professionals:professional_id (
              id,
              full_name,
              is_active
            )
          `)
          .eq('service_id', service.id)
          .eq('is_active', true)

        if (professionalServices && professionalServices.length > 0) {
          // Filtrar solo profesionales activos
          const activeProfessionals = professionalServices
            .filter(ps => ps.professionals && ps.professionals.is_active)
            .map(ps => ({
              id: ps.professional_id,
              name: ps.professionals.full_name,
              custom_duration_minutes: ps.custom_duration_minutes || null,
              custom_price: ps.custom_price ? formatPrice(ps.custom_price) : null
            }))

          service.professionals = activeProfessionals
          service.professionals_count = activeProfessionals.length
        } else {
          service.professionals = []
          service.professionals_count = 0
        }
      }
    }

    // ============================================
    // 5. FORMATEAR RESPUESTA PARA EL LLM
    // ============================================
    const formattedServices = services.map(service => {
      const basePrice = service.price ? formatPrice(service.price) : null
      
      // Si incluye profesionales y hay precios personalizados
      let priceInfo = basePrice
      if (include_professionals && include_pricing && service.professionals && service.professionals.length > 0) {
        const customPrices = service.professionals
          .filter(p => p.custom_price)
          .map(p => p.custom_price)
        
        if (customPrices.length > 0) {
          const uniquePrices = [...new Set(customPrices)]
          if (uniquePrices.length === 1) {
            priceInfo = uniquePrices[0]
          } else {
            priceInfo = `Desde ${basePrice || uniquePrices[0]}`
          }
        }
      }

      return {
        id: service.id,
        name: service.name,
        description: service.description || null,
        duration_minutes: service.duration_minutes,
        price: service.price,
        formatted_price: priceInfo,
        color: service.color,
        requires_approval: service.requires_approval || false,
        professionals: include_professionals ? (service.professionals || []) : undefined,
        professionals_count: include_professionals ? (service.professionals_count || 0) : undefined,
        // Info útil para el LLM
        summary: buildServiceSummary(service, priceInfo)
      }
    })

    const response = {
      tenant: {
        id: tenant.id,
        business_name: tenant.business_name
      },
      services: formattedServices,
      count: formattedServices.length,
      search_criteria: {
        service_name: service_name || null,
        is_active: is_active
      },
      // Mensaje contextual para el LLM
      message: buildServicesMessage(formattedServices, { service_name, is_active })
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in list-services:', error)
    
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
 * Formatea el precio para que sea legible
 */
function formatPrice(price: string | number | null): string {
  if (!price || price === '0' || price === 0) {
    return 'Gratis'
  }
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  
  if (isNaN(numPrice)) {
    return 'Consultar precio'
  }
  
  return `€${numPrice.toFixed(2).replace('.', ',')}`
}

/**
 * Construye un resumen conversacional del servicio
 */
function buildServiceSummary(service: any, formattedPrice: string | null): string {
  const parts = []
  
  parts.push(service.name)
  
  if (service.duration_minutes) {
    parts.push(`${service.duration_minutes} min`)
  }
  
  if (formattedPrice) {
    parts.push(formattedPrice)
  }
  
  if (service.professionals_count && service.professionals_count > 0) {
    parts.push(`${service.professionals_count} profesional${service.professionals_count > 1 ? 'es' : ''}`)
  }
  
  return parts.join(' - ')
}

/**
 * Construye mensaje de resultados de búsqueda
 */
function buildServicesMessage(services: any[], criteria: any): string {
  const count = services.length
  
  if (count === 0) {
    return 'No se encontraron servicios con esos criterios'
  }
  
  if (count === 1) {
    return `Se encontró 1 servicio${criteria.service_name ? ` llamado "${criteria.service_name}"` : ''}`
  }
  
  return `Se encontraron ${count} servicios${criteria.service_name ? ` que coinciden con "${criteria.service_name}"` : ''}`
}

/**
 * Construye mensaje cuando no hay resultados
 */
function buildNoResultsMessage(criteria: any): string {
  const parts = []
  
  if (criteria.service_name) {
    parts.push(`nombre "${criteria.service_name}"`)
  }
  
  if (criteria.is_active === false) {
    parts.push('servicios inactivos')
  } else if (criteria.is_active === true) {
    parts.push('servicios activos')
  }
  
  if (parts.length === 0) {
    return 'No hay servicios disponibles'
  }
  
  return `No se encontraron servicios con ${parts.join(' y ')}`
}

