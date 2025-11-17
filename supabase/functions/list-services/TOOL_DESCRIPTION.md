# Tool Description: list-services

## Nombre
`list-services`

## Descripción
Lista los servicios disponibles de un tenant (clínica/negocio). Permite buscar servicios por nombre, filtrar por estado activo/inactivo, e incluir información sobre los profesionales que ofrecen cada servicio. Útil para mostrar al usuario qué servicios están disponibles antes de agendar una cita.

## Cuándo usar esta tool
- Cuando el usuario pregunta "¿Qué servicios tienen?", "¿Qué ofrecen?", "¿Qué servicios están disponibles?"
- Cuando el usuario busca un servicio específico por nombre
- Cuando necesitas mostrar opciones de servicios antes de crear una cita
- Cuando el usuario pregunta por precios o duraciones de servicios
- Cuando necesitas verificar si un servicio existe antes de proceder con una reserva

## Parámetros

### Requeridos
- **tenant_id** (string, UUID): Identificador único del tenant/clínica. Siempre requerido.

### Opcionales
- **service_name** (string): Búsqueda parcial por nombre del servicio. Ejemplo: "Consulta", "Limpieza", "Revisión". Case-insensitive.
- **is_active** (boolean, default: true): Filtrar por servicios activos (true) o inactivos (false). Por defecto solo muestra activos.
- **include_professionals** (boolean, default: false): Si es true, incluye la lista de profesionales que ofrecen cada servicio. Útil cuando el usuario pregunta "¿Quién ofrece este servicio?"
- **include_pricing** (boolean, default: true): Si es true, incluye información detallada de precios, incluyendo precios personalizados por profesional cuando include_professionals también es true.

## Ejemplo de uso

### Caso 1: Listar todos los servicios activos
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Caso 2: Buscar un servicio específico
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "service_name": "Consulta"
}
```

### Caso 3: Listar servicios con profesionales incluidos
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "include_professionals": true,
  "include_pricing": true
}
```

## Respuesta

La respuesta incluye:
- **tenant**: Información del tenant (id, business_name)
- **services**: Array de servicios con:
  - `id`: UUID del servicio
  - `name`: Nombre del servicio
  - `description`: Descripción (puede ser null)
  - `duration_minutes`: Duración en minutos
  - `price`: Precio base (puede ser null)
  - `formatted_price`: Precio formateado para mostrar ("€50,00", "Gratis", "Consultar precio")
  - `summary`: Resumen conversacional (ej: "Consulta General - 30 min - €50,00")
  - `requires_approval`: Si requiere aprobación antes de confirmar
  - `professionals`: (Opcional) Lista de profesionales que ofrecen el servicio
  - `professionals_count`: (Opcional) Cantidad de profesionales que ofrecen el servicio
- **count**: Número total de servicios encontrados
- **message**: Mensaje contextual para el LLM sobre los resultados
- **search_criteria**: Criterios de búsqueda utilizados

## Ejemplo de respuesta

```json
{
  "tenant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "business_name": "Clínica Dental San Martín"
  },
  "services": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Consulta General",
      "description": "Consulta médica general de 30 minutos",
      "duration_minutes": 30,
      "price": "50.00",
      "formatted_price": "€50,00",
      "summary": "Consulta General - 30 min - €50,00",
      "requires_approval": false,
      "professionals": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "name": "Dr. García",
          "custom_duration_minutes": null,
          "custom_price": null
        }
      ],
      "professionals_count": 1
    }
  ],
  "count": 1,
  "message": "Se encontró 1 servicio llamado \"Consulta\"",
  "search_criteria": {
    "service_name": "Consulta",
    "is_active": true
  }
}
```

## Notas para el LLM

1. **Siempre incluye tenant_id**: Este parámetro es obligatorio. Si el usuario no lo proporciona, debes solicitarlo o inferirlo del contexto de la conversación.

2. **Búsqueda flexible**: El parámetro `service_name` hace búsqueda parcial, así que "consulta" encontrará "Consulta General", "Consulta de Seguimiento", etc.

3. **Información de profesionales**: Usa `include_professionals: true` cuando el usuario pregunte quién ofrece un servicio o necesites mostrar opciones de profesionales junto con servicios.

4. **Precios formateados**: Usa el campo `formatted_price` para mostrar precios al usuario, ya que maneja casos especiales (Gratis, Consultar precio).

5. **Resumen conversacional**: El campo `summary` está diseñado para ser usado directamente en respuestas al usuario.

6. **Mensaje contextual**: El campo `message` te ayuda a entender el resultado y formular una respuesta apropiada al usuario.

7. **Sin resultados**: Si `count` es 0, informa al usuario amablemente y sugiere alternativas o verificar la búsqueda.

## Flujo típico de uso

1. Usuario pregunta: "¿Qué servicios tienen?"
   → Llamar con `tenant_id` solamente

2. Usuario pregunta: "¿Tienen limpieza dental?"
   → Llamar con `tenant_id` y `service_name: "limpieza"`

3. Usuario pregunta: "¿Quién hace las consultas?"
   → Llamar con `tenant_id`, `service_name: "consulta"`, `include_professionals: true`

4. Usuario quiere agendar pero no sabe qué servicio elegir
   → Llamar con `tenant_id` y `include_professionals: true` para mostrar opciones completas

