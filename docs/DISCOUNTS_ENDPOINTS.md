# Descuentos — Documentación de Endpoints

Base URL: `/api/v1/discounts`

Todos los endpoints requieren autenticación (`Bearer token`). Los descuentos son
**sugeridos, no forzados**: el backend de cotizaciones no valida ni impone estos valores,
solo se consultan para prellenar `discount_line` en el frontend.

Se documentan además, como referencia rápida, los endpoints de soporte directo de esta
feature: `component-categories` y la asignación de categoría a una característica.

---

## 1. Listar reglas de descuento de una compañía

**GET** `/api/v1/discounts?companyId={id}`

| Parámetro   | Tipo    | Requerido | Descripción      |
|-------------|---------|-----------|------------------|
| `companyId` | integer | Sí        | ID de la compañía (distribuidor) |

### Respuesta exitosa `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "model_option_id": 54,
      "model_code": "M25",
      "model_description": "Modelo M25",
      "matnrk": "MAT-054",
      "component_category_id": null,
      "component_category_code": null,
      "component_category_name": null,
      "discount_pct": "54.00",
      "active": true,
      "created_at": "2026-08-01T10:00:00.000Z",
      "updated_at": "2026-08-01T10:00:00.000Z"
    }
  ]
}
```

---

## 2. Obtener regla por ID

**GET** `/api/v1/discounts/:id?companyId={id}`

Mismo shape que el ítem de la lista anterior. `404` si no existe o no pertenece a la
`companyId` indicada.

---

## 3. Crear regla de descuento

**POST** `/api/v1/discounts`

```json
{
  "company_id": 1,
  "model_option_id": 54,
  "component_category_id": null,
  "discount_pct": 54
}
```

| Campo                    | Tipo    | Requerido | Descripción                                                              |
|--------------------------|---------|-----------|---------------------------------------------------------------------------|
| `company_id`             | integer | Sí        | Compañía dueña de la regla                                                |
| `model_option_id`        | integer | Sí        | Opción de `core.characteristic_options` dentro del grupo MODEL (merkm=1100) |
| `component_category_id`  | integer | No        | `null`/ausente = regla general del modelo. Si se especifica, acota el descuento a esa categoría (ej. batería) |
| `discount_pct`           | number  | Sí        | Porcentaje sugerido (0-100)                                               |

### Errores

| Código | Causa                                                                         |
|--------|--------------------------------------------------------------------------------|
| 400    | Falta `company_id`, `model_option_id` o `discount_pct`, o `discount_pct` fuera de 0-100 |
| 409    | Ya existe una regla general (o por esa categoría) para esa compañía + modelo   |

---

## 4. Actualizar regla

**PUT** `/api/v1/discounts/:id`

```json
{ "company_id": 1, "discount_pct": 50, "active": true }
```

Solo `discount_pct` y `active` son editables. `company_id` es requerido en el body para
confirmar el scope (mismo criterio que `PUT /price-lists/:id`).

---

## 5. Eliminar regla

**DELETE** `/api/v1/discounts/:id?companyId={id}`

---

## 6. Resolver el descuento sugerido para una línea

**GET** `/api/v1/discounts/resolve?companyId={id}&modelOptionId={id}&componentCategoryId={id}`

Endpoint de solo lectura. El frontend lo consulta al armar cada línea de la cotización
para prellenar `discount_line` — nunca escribe ni valida nada.

| Parámetro             | Tipo    | Requerido | Descripción                                   |
|------------------------|---------|-----------|------------------------------------------------|
| `companyId`            | integer | Sí        | Compañía                                        |
| `modelOptionId`        | integer | Sí        | Modelo de la máquina                            |
| `componentCategoryId`  | integer | No        | Si la línea es de una categoría puntual (ej. batería) |

### Lógica de resolución

1. Si se pasó `componentCategoryId` y existe una regla activa para
   `companyId + modelOptionId + componentCategoryId` → devuelve ese `discount_pct`.
2. Si no, busca la regla general activa (`component_category_id IS NULL`) para
   `companyId + modelOptionId`.
3. Si no hay ninguna → `discount_pct: null` (sin sugerencia; el vendedor decide libremente).

### Respuesta

```json
{ "success": true, "data": { "discount_pct": 54, "source": "general" } }
```

`source` es `"category"`, `"general"` o `null`.

---

## 7. Importar descuentos vía Excel

**POST** `/api/v1/discounts/import?companyId={id}`

Multipart (`multipart/form-data`), campo `file`. Requiere rol `admin`. Módulo separado del
import de catálogo (`equipment/import`) — no toca `core.machines`, `core.characteristics`
ni las listas de precio.

### Columnas esperadas

| Columna              | Requerida | Descripción                                                              |
|-----------------------|:---------:|---------------------------------------------------------------------------|
| `MODEL_CODE`          | Sí        | `mrkwrt` del modelo dentro del grupo `merkm=1100` (ej. `M25`)              |
| `COMPONENT_CATEGORY`  | No        | `code` de `business.component_categories`. Vacío = regla general del modelo |
| `DISCOUNT_PCT`        | Sí        | Porcentaje (0-100)                                                       |

### Resolución y validación

- `MODEL_CODE` se busca en `core.characteristic_options` dentro del grupo `MERKM=1100`.
  Si no existe (modelo no importado del catálogo SAP todavía) o si el código matchea en
  **más de una máquina** (ambiguo), la fila se reporta como error y no se procesa.
- `COMPONENT_CATEGORY`, si viene, debe existir en `business.component_categories`.
- El import es **idempotente**: reimportar el mismo archivo actualiza `discount_pct` de
  las reglas existentes (upsert por `company_id + model_option_id [+ component_category_id]`).

### Respuesta exitosa `200 OK`

```json
{ "success": true, "data": { "upserted": 12, "duration_ms": 84 } }
```

### Errores

| Código | Causa                                                                 |
|--------|------------------------------------------------------------------------|
| 400    | No se adjuntó archivo, o falta `companyId`                            |
| 422    | Errores de validación de estructura (`MODEL_CODE`/`DISCOUNT_PCT` ausentes/ inválidos) o de resolución (modelo/categoría no encontrados o ambiguos). Devuelve `data: [{ row, field, message }, ...]` |

---

## 8. Categorías de componente (`/api/v1/component-categories`)

Maestro global (no depende de `companyId`), CRUD simple:

- **GET** `/` — listar. **GET** `/:id` — obtener una.
- **POST** `/` — `{ "code": "BATTERY", "name": "Batería" }`. `409` si `code` ya existe.
- **PUT** `/:id` — `{ "name": "...", "active": true }`.
- **DELETE** `/:id` — rol `admin`.

## 9. Asignar categoría a una característica

**PATCH** `/api/v1/equipment/characteristics/:id/category`

```json
{ "component_category_id": 3 }
```

Rol `admin`. Marca manualmente que un grupo de características (`core.characteristics`,
ej. el grupo `MERKM=1400` de una máquina) corresponde a una categoría de componente. `null`
quita la asignación. Esta asignación **no se pisa** al reimportar el catálogo de equipos.
