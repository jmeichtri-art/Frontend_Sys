# Configuración SAP por Compañía — Documentación de Endpoints

Base URL: `/api/v1/companies`

Todos los endpoints requieren autenticación (`Bearer token`) y rol `admin`.

Estos valores son los que usa el backend al mapear una cotización hacia SAP B1
(`POST /api/v1/sync/quotations/:id`, ver `QUOTATIONS_ENDPOINTS.md`): warehouse, código de
impuesto, moneda, tipo de cambio, grupo de pago, serie y centro de costos por defecto de
cada compañía. Antes vivían en variables de entorno globales; ahora son seteables por
compañía sin redeploy.

---

## Roles

| Acción                              | admin | sales | viewer |
|--------------------------------------|:-----:|:-----:|:------:|
| Ver catálogo de claves disponibles   | ✓     |       |        |
| Ver configuración de una compañía    | ✓     |       |        |
| Setear/actualizar configuración      | ✓     |       |        |

---

## 1. Catálogo de claves disponibles

**GET** `/api/v1/companies/sap-setting-definitions`

Devuelve todas las claves de configuración que existen, con su tipo, label y valor por
defecto. Pensado para que el frontend arme el formulario de settings dinámicamente, sin
hardcodear los campos.

### Respuesta exitosa `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "key": "warehouse_code",
      "label": "Código de depósito",
      "data_type": "string",
      "description": "WarehouseCode por defecto para la línea de documento enviada a SAP.",
      "default_value": "01"
    },
    {
      "key": "tax_code",
      "label": "Código de impuesto",
      "data_type": "string",
      "description": "TaxCode por defecto.",
      "default_value": null
    },
    {
      "key": "doc_currency",
      "label": "Moneda del documento",
      "data_type": "string",
      "description": "DocCurrency. NULL usa la moneda local de la compañía en SAP.",
      "default_value": null
    },
    {
      "key": "doc_rate",
      "label": "Tipo de cambio",
      "data_type": "number",
      "description": "DocRate. NULL deja que SAP tome el vigente.",
      "default_value": null
    },
    {
      "key": "payment_group_code",
      "label": "Grupo de condición de pago",
      "data_type": "number",
      "description": "PaymentGroupCode. -1 usa el default del cliente en SAP.",
      "default_value": -1
    },
    {
      "key": "quotation_series",
      "label": "Serie de cotizaciones",
      "data_type": "number",
      "description": "Series para cotizaciones. NULL usa la serie default de SAP.",
      "default_value": null
    },
    {
      "key": "cost_center",
      "label": "Centro de costos",
      "data_type": "string",
      "description": "CostingCode / regla de distribución por defecto.",
      "default_value": null
    },
    {
      "key": "local_currency",
      "label": "Moneda local",
      "data_type": "string",
      "description": "Código ISO de la moneda local de la compañía (ej. PYG, ARS). Cotizar en otra moneda habilita el tipo de cambio. NULL cae al is_default de business.currencies.",
      "default_value": null
    }
  ]
}
```

> **`local_currency` define cuál es la moneda local de la compañía**, y con eso, cuándo
> una cotización está en moneda extranjera y necesita tipo de cambio. El listado de
> monedas (**GET** `/api/v1/currencies?companyId=`) marca la que coincide con
> `is_local: true` y la devuelve primero. Mientras el setting esté vacío se usa el
> `is_default` de `business.currencies` como fallback, así que **conviene cargarlo por
> compañía** para no depender de ese flag.

> `data_type` es `"string"`, `"number"` o `"boolean"`. Se usa tanto para renderizar el
> input correcto en el formulario como para la validación del backend al guardar.

### Errores

| Código | Error                     | Causa                        |
|--------|---------------------------|-------------------------------|
| 401    | `Token no proporcionado`  | Sin header de autorización    |
| 403    | `No tenés permisos...`    | El usuario no es `admin`      |

---

## 2. Obtener configuración de una compañía

**GET** `/api/v1/companies/:id/sap-settings`

Devuelve el valor efectivo de cada clave del catálogo para esa compañía: lo que haya
seteado explícitamente, y el `default_value` del catálogo para lo que falte.

### Path params

| Parámetro | Tipo    | Descripción         |
|-----------|---------|----------------------|
| `id`      | integer | ID de la compañía    |

### Respuesta exitosa `200 OK`

```json
{
  "success": true,
  "data": {
    "company_id": 1,
    "warehouse_code": "01",
    "tax_code": null,
    "doc_currency": null,
    "doc_rate": null,
    "payment_group_code": -1,
    "quotation_series": null,
    "cost_center": null,
    "configured": false
  }
}
```

> `configured: false` significa que la compañía todavía no tiene ninguna fila seteada
> propia — todos los valores mostrados son los `default_value` del catálogo. Una vez que
> se hace al menos un `PUT`, pasa a `true` (aunque algunas claves sigan en su default).

### Errores

| Código | Error                        | Causa                        |
|--------|-------------------------------|-------------------------------|
| 400    | `ID de compañía inválido`    | El `:id` no es un número      |
| 401    | `Token no proporcionado`     | Sin header de autorización    |
| 403    | `No tenés permisos...`       | El usuario no es `admin`      |

---

## 3. Setear/actualizar configuración de una compañía

**PUT** `/api/v1/companies/:id/sap-settings`

Actualiza **solo las claves enviadas** (merge parcial) — no hace falta reenviar todo el
objeto para cambiar un solo valor.

### Path params

| Parámetro | Tipo    | Descripción         |
|-----------|---------|----------------------|
| `id`      | integer | ID de la compañía    |

### Body `application/json`

Cualquier subconjunto de las claves listadas en `sap-setting-definitions`. Ejemplo:

```json
{
  "warehouse_code": "02",
  "cost_center": "CC-VENTAS"
}
```

### Respuesta exitosa `200 OK`

Mismo shape que **GET**, con `configured: true` y los valores ya mergeados:

```json
{
  "success": true,
  "data": {
    "company_id": 1,
    "warehouse_code": "02",
    "tax_code": null,
    "doc_currency": null,
    "doc_rate": null,
    "payment_group_code": -1,
    "quotation_series": null,
    "cost_center": "CC-VENTAS",
    "configured": true
  }
}
```

### Errores

| Código | Error                                          | Causa                                                              |
|--------|-------------------------------------------------|---------------------------------------------------------------------|
| 400    | `ID de compañía inválido`                      | El `:id` no es un número                                            |
| 404    | `Compañía no encontrada`                       | No existe una compañía con ese ID                                   |
| 422    | `Clave de configuración desconocida: <key>`    | Se envió una clave que no está en el catálogo                       |
| 422    | `<key> debe ser de tipo <string\|number\|boolean>` | El valor enviado no coincide con el `data_type` del catálogo    |
| 401    | `Token no proporcionado`                       | Sin header de autorización                                          |
| 403    | `No tenés permisos...`                         | El usuario no es `admin`                                             |

---

## Agregar una clave de configuración nueva

Esto es trabajo de backend (no se puede hacer desde el frontend): se agrega una fila a
`business.sap_setting_definitions` (nombre, tipo, label, default). No requiere migrar el
schema de `company_sap_settings`. Una vez agregada, aparece automáticamente en
`sap-setting-definitions` y puede setearse por compañía con `PUT`.
