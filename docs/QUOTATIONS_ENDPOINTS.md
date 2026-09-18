# Sales Quotations — Documentación de Endpoints

Base URL: `/api/v1/quotations`

Todos los endpoints requieren autenticación (`Bearer token`). El endpoint de sincronización
con SAP (`/api/v1/sync/quotations/:id`) vive fuera de este base URL — ver sección 6.

---

## Roles

| Acción              | admin | sales | viewer |
|----------------------|:-----:|:-----:|:------:|
| Listar               | ✓     | ✓     | ✓      |
| Ver por ID           | ✓     | ✓     | ✓      |
| Crear                | ✓     | ✓     |        |
| Actualizar           | ✓     | ✓     |        |
| Eliminar             | ✓     |       |        |
| Enviar/sincronizar a SAP | ✓ | ✓     |        |

---

## 1. Listar cotizaciones

**GET** `/api/v1/quotations?companyId={id}`

### Query params

| Parámetro   | Tipo    | Requerido | Descripción         |
|-------------|---------|-----------|---------------------|
| `companyId` | integer | Sí        | ID de la compañía   |

### Respuesta exitosa `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "cardcode": "C00123",
      "cardname": "Distribuidora Sur S.A.",
      "machine_id": 7,
      "matnrk": "003301",
      "machine_description": "Handpallettruck M25",
      "template_id": 2,
      "valid_until": "2026-06-30",
      "status": "draft",
      "sync_status": "pending",
      "docentry": null,
      "notes": "Cliente solicita entrega urgente",
      "created_by": 3,
      "updated_by": 3,
      "created_at": "2026-04-25T10:00:00.000Z",
      "updated_at": "2026-04-25T10:00:00.000Z"
    }
  ]
}
```

### Errores

| Código | Error                    | Causa                              |
|--------|--------------------------|------------------------------------|
| 400    | `companyId es requerido` | Parámetro ausente o no es número   |
| 401    | `Token no proporcionado` | Sin header de autorización         |

---

## 2. Obtener cotización por ID

**GET** `/api/v1/quotations/:id`

Incluye el detalle completo de las líneas de configuración.

### Path params

| Parámetro | Tipo    | Descripción          |
|-----------|---------|----------------------|
| `id`      | integer | ID de la cotización  |

### Respuesta exitosa `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "company_id": 1,
    "cardcode": "C00123",
    "cardname": "Distribuidora Sur S.A.",
    "machine_id": 7,
    "matnrk": "003301",
    "machine_description": "Handpallettruck M25",
    "template_id": 2,
    "valid_until": "2026-06-30",
    "status": "draft",
    "sync_status": "pending",
    "docentry": null,
    "notes": "Cliente solicita entrega urgente",
    "created_by": 3,
    "updated_by": 3,
    "created_at": "2026-04-25T10:00:00.000Z",
    "updated_at": "2026-04-25T10:00:00.000Z",
    "lines": [
      {
        "characteristic_id": 12,
        "merkm": "COLOR",
        "characteristic_name": "Color",
        "option_id": 45,
        "mrkwrt": "ROJO",
        "option_description": "Rojo",
        "unit_price": 150.00,
        "currency_id": 1,
        "currency_code": "USD",
        "currency_symbol": "U$S"
      },
      {
        "characteristic_id": 15,
        "merkm": "MOTOR",
        "characteristic_name": "Motor",
        "option_id": 61,
        "mrkwrt": "EL48V",
        "option_description": "Eléctrico 48V",
        "unit_price": null,
        "currency_id": null,
        "currency_code": null,
        "currency_symbol": null
      }
    ]
  }
}
```

### Errores

| Código | Error                         | Causa                               |
|--------|-------------------------------|-------------------------------------|
| 400    | `ID de cotización inválido`   | El `:id` no es un número            |
| 404    | `Cotización no encontrada`    | No existe una cotización con ese ID |
| 401    | `Token no proporcionado`      | Sin header de autorización          |

---

## 3. Crear cotización

**POST** `/api/v1/quotations`

### Body `application/json`

```json
{
  "company_id": 1,
  "cardcode": "C00123",
  "cardname": "Distribuidora Sur S.A.",
  "machine_id": 7,
  "template_id": 2,
  "valid_until": "2026-06-30",
  "notes": "Cliente solicita entrega urgente",
  "lines": [
    {
      "characteristic_id": 12,
      "option_id": 45,
      "unit_price": 150.00,
      "currency_id": 1
    },
    {
      "characteristic_id": 15,
      "option_id": 61
    }
  ]
}
```

| Campo                       | Tipo    | Requerido | Descripción                                              |
|-----------------------------|---------|-----------|----------------------------------------------------------|
| `company_id`                | integer | Sí        | ID de la compañía SAP                                    |
| `cardcode`                  | string  | Sí        | Código de cliente SAP (BP)                               |
| `cardname`                  | string  | Sí        | Nombre del cliente                                       |
| `machine_id`                | integer | Sí        | ID de la máquina                                         |
| `template_id`               | integer | No        | ID del template base. `null` si se configura desde cero  |
| `valid_until`               | string  | Sí        | Fecha de vencimiento (`YYYY-MM-DD`)                      |
| `notes`                     | string  | No        | Observaciones libres                                     |
| `lines`                     | array   | Sí        | Al menos una línea requerida                             |
| `lines[].characteristic_id` | integer | Sí        | ID de la característica                                  |
| `lines[].option_id`         | integer | Sí        | ID de la opción elegida                                  |
| `lines[].unit_price`        | number  | No        | Precio unitario de la opción                             |
| `lines[].currency_id`       | integer | No        | ID de la moneda (`business.currencies`)                  |

> `status` se inicializa en `draft` y `sync_status` en `pending` automáticamente.
> `created_by` y `updated_by` se asignan desde el token del usuario autenticado.

### Respuesta exitosa `201 Created`

```json
{
  "success": true,
  "data": {
    "id": 5,
    "company_id": 1,
    "cardcode": "C00123",
    "cardname": "Distribuidora Sur S.A.",
    "machine_id": 7,
    "template_id": 2,
    "valid_until": "2026-06-30",
    "status": "draft",
    "sync_status": "pending",
    "docentry": null,
    "notes": "Cliente solicita entrega urgente",
    "created_by": 3,
    "updated_by": 3,
    "created_at": "2026-04-25T12:00:00.000Z",
    "updated_at": "2026-04-25T12:00:00.000Z"
  }
}
```

> La respuesta devuelve solo la cabecera. Para ver las líneas usar **GET** `/:id`.

### Errores

| Código | Error                                                                   | Causa                              |
|--------|-------------------------------------------------------------------------|------------------------------------|
| 400    | `company_id, cardcode, cardname, machine_id y valid_until son requeridos` | Alguno de esos campos falta      |
| 400    | `La cotización debe tener al menos una línea de configuración`          | `lines` está vacío o ausente       |
| 401    | `Token no proporcionado`                                                | Sin header de autorización         |
| 403    | `No tenés permisos para realizar esta acción`                           | El usuario es `viewer`             |

---

## 4. Actualizar cotización

**PUT** `/api/v1/quotations/:id`

Usa la misma lógica que crear. Reemplaza todas las líneas existentes con las nuevas enviadas.

### Path params

| Parámetro | Tipo    | Descripción          |
|-----------|---------|----------------------|
| `id`      | integer | ID de la cotización  |

### Body `application/json`

Mismo esquema que **POST**. Todos los campos de cabecera y líneas son reemplazados.

Campos adicionales disponibles solo en update:

| Campo         | Tipo    | Descripción                                                                 |
|---------------|---------|-----------------------------------------------------------------------------|
| `status`      | string  | `draft`, `sent`, `approved`, `rejected`. Si se omite conserva el valor actual |
| `docentry`    | integer | DocEntry de SAP B1. Si se omite conserva el valor actual                    |
| `sync_status` | string  | `pending`, `synced`, `error`. Si se omite conserva el valor actual          |

### Respuesta exitosa `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 5,
    "company_id": 1,
    "cardcode": "C00123",
    "cardname": "Distribuidora Sur S.A.",
    "machine_id": 7,
    "template_id": 2,
    "valid_until": "2026-07-31",
    "status": "sent",
    "sync_status": "pending",
    "docentry": null,
    "notes": null,
    "created_by": 3,
    "updated_by": 3,
    "updated_at": "2026-04-25T14:00:00.000Z",
    "created_at": "2026-04-25T12:00:00.000Z"
  }
}
```

### Errores

| Código | Error                                                                    | Causa                               |
|--------|--------------------------------------------------------------------------|-------------------------------------|
| 400    | `ID de cotización inválido`                                              | El `:id` no es un número            |
| 400    | `company_id, cardcode, cardname, machine_id y valid_until son requeridos`| Alguno de esos campos falta         |
| 400    | `La cotización debe tener al menos una línea de configuración`           | `lines` está vacío o ausente        |
| 404    | `Cotización no encontrada`                                               | No existe una cotización con ese ID |
| 401    | `Token no proporcionado`                                                 | Sin header de autorización          |
| 403    | `No tenés permisos para realizar esta acción`                            | El usuario es `viewer`              |

---

## 5. Eliminar cotización

**DELETE** `/api/v1/quotations/:id`

### Path params

| Parámetro | Tipo    | Descripción          |
|-----------|---------|----------------------|
| `id`      | integer | ID de la cotización  |

### Respuesta exitosa `200 OK`

```json
{
  "success": true,
  "message": "Cotización eliminada"
}
```

> Las líneas se eliminan en cascada automáticamente.

### Errores

| Código | Error                                        | Causa                               |
|--------|----------------------------------------------|-------------------------------------|
| 400    | `ID de cotización inválido`                  | El `:id` no es un número            |
| 404    | `Cotización no encontrada`                   | No existe una cotización con ese ID |
| 401    | `Token no proporcionado`                     | Sin header de autorización          |
| 403    | `No tenés permisos para realizar esta acción`| El usuario no es `admin`            |

---

## 6. Enviar / sincronizar cotización con SAP B1

**POST** `/api/v1/sync/quotations/:id`

Envía la cotización a SAP B1 (Service Layer, recurso `Quotations`) usando la configuración
de la compañía (ver `SAP_SETTINGS_ENDPOINTS.md`). Dentro de SAP se manda **una sola línea**:
el ítem principal (matnrk de la máquina base), no cada característica/opción configurada.

Si la cotización **no tiene `docentry` guardado** (primer envío), crea un documento nuevo
en SAP (`POST`). Si **ya tiene `docentry`** (se sincronizó antes, se editó y `sync_status`
volvió a `pending`), actualiza ese mismo documento en SAP (`PATCH`) en vez de crear uno
nuevo — así no se acumulan documentos duplicados/huérfanos en SAP por reenvíos.

### Path params

| Parámetro | Tipo    | Descripción          |
|-----------|---------|----------------------|
| `id`      | integer | ID de la cotización  |

### Respuesta exitosa `200 OK`

```json
{
  "success": true,
  "data": {
    "docentry": 1042,
    "sap_response": { "...": "respuesta cruda de SAP Service Layer" }
  }
}
```

> Al sincronizar con éxito, la cotización pasa a `status: "sent"` y `sync_status: "synced"`,
> y queda guardado `docentry` (el DocEntry en SAP).

### Errores

| Código | Error                                                                    | Causa                                                                |
|--------|----------------------------------------------------------------------------|-----------------------------------------------------------------------|
| 400    | `ID de cotización inválido`                                               | El `:id` no es un número                                              |
| 404    | `Cotización no encontrada`                                                | No existe una cotización con ese ID                                   |
| 404    | `Compañía no encontrada o inactiva`                                       | La compañía de la cotización no existe o está inactiva                |
| 409    | `La cotización ya fue sincronizada con SAP. Editala para poder reenviarla.` | `sync_status` ya es `synced` — evita crear un documento duplicado en SAP |
| 422    | `La máquina base no tiene matnrk (ItemCode SAP) configurado`              | La máquina no tiene código SAP cargado                                 |
| 422    | `Las líneas de configuración de la máquina tienen cantidades distintas...` | Las líneas `machine` no tienen todas el mismo `quantity`               |
| 502    | `Error enviando a SAP: <mensaje de SAP>`                                  | SAP Service Layer rechazó el documento (deja `sync_status: "error"`)   |
| 401    | `Token no proporcionado`                                                  | Sin header de autorización                                             |
| 403    | `No tenés permisos para realizar esta acción`                            | El usuario es `viewer`                                                 |

> Si falla, `sync_status` queda en `error` y se puede reintentar llamando al mismo endpoint
> de nuevo (no está bloqueado porque no llegó a `synced`).
>
> Si la cotización ya está `synced` y se necesita reenviarla (ej. el cliente pidió un
> cambio), hay que editarla primero (`PUT /api/v1/quotations/:id`) — el `PUT` resetea
> `sync_status` a `pending` automáticamente cuando detecta que venía de `synced`, así el
> botón de sincronizar vuelve a estar disponible.

---

## Estados

### `status` — ciclo de vida de la cotización

| Valor      | Descripción                              |
|------------|------------------------------------------|
| `draft`    | Borrador, aún no enviada al cliente      |
| `sent`     | Enviada al cliente                       |
| `approved` | Aprobada por el cliente                  |
| `rejected` | Rechazada por el cliente                 |

### `sync_status` — integración SAP B1

| Valor     | Descripción                                          |
|-----------|------------------------------------------------------|
| `pending` | No enviada a SAP B1 (valor inicial)                  |
| `synced`  | Creada en SAP B1. `docentry` contiene el DocEntry    |
| `error`   | Falló el envío a SAP B1                              |
