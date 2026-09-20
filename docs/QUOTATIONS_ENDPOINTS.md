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
      "line_type": "machine",
      "characteristic_id": 12,
      "option_id": 45,
      "unit_price": 150.00,
      "currency_id": 1
    },
    {
      "line_type": "item",
      "item_id": 8,
      "send_separately": true,
      "unit_price": 1200.00,
      "currency_id": 1
    },
    {
      "line_type": "item",
      "item_id": 14,
      "send_separately": false,
      "unit_price": 300.00,
      "currency_id": 1
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
| `price_list_id`             | integer | No        | Lista de precios con la que se armó la cotización. Se guarda para preseleccionarla al reabrirla; los precios efectivos viven en cada línea |
| `currency_id`               | integer | No        | Moneda del documento (`business.currencies`). Viaja como `DocCurrency` a SAP. `null` = usar la configurada para la compañía |
| `doc_rate`                  | number  | No        | Tipo de cambio de esa moneda para esta cotización. Viaja como `DocRate`. `null` = usar el de la compañía / el vigente en SAP |
| `valid_until`               | string  | Sí        | Fecha de vencimiento (`YYYY-MM-DD`)                      |
| `notes`                     | string  | No        | Observaciones libres                                     |
| `lines`                     | array   | Sí        | Al menos una línea requerida                             |
| `lines[].line_type`         | string  | Sí        | `machine` (configuración de la máquina) o `item` (artículo suelto) |
| `lines[].characteristic_id` | integer | Sí (machine) | ID de la característica                               |
| `lines[].option_id`         | integer | Sí (machine) | ID de la opción elegida                               |
| `lines[].item_id`           | integer | Sí (item) | ID del artículo (`business.items`)                       |
| `lines[].send_separately`   | boolean | No        | Tilde **"Mostrar Separado"**, en cualquier tipo de línea. Default `false` — ver abajo |
| `lines[].unit_price`        | number  | No        | Precio unitario de la opción                             |
| `lines[].currency_id`       | integer | No        | ID de la moneda (`business.currencies`)                  |

### Moneda y tipo de cambio

La moneda del documento se elige de las monedas habilitadas de la compañía
(**GET** `/api/v1/currencies?companyId=`) y **se persiste en la cotización**; al reabrirla
vuelve seleccionada. En una cotización nueva arranca la moneda `is_default` de la
compañía.

Cuando la moneda elegida **no** es la local (`is_default: false`), se muestra el campo de
tipo de cambio, que se prellena con el vigente en SAP:

**GET** `/api/v1/sap/currency-rate?companyId={id}&currency=USD`

```json
{ "success": true, "data": { "currency": "USD", "rate": 7350.5, "rate_date": "2026-09-19" } }
```

Sale de la tabla `ORTT` de SAP. Si SAP todavía no cargó el del día, devuelve el último
anterior — por eso conviene mirar `rate_date` y avisar si no es de hoy. Si no hay ninguno,
`rate` viene en `null` y el vendedor lo carga a mano. **Es solo una referencia**: el valor
que quede en el campo es el que se guarda y el que viaja a SAP.

| Código | Error | Causa |
|--------|-------|-------|
| 400    | `currency es requerido` | Falta el parámetro |
| 404    | `La moneda X no está habilitada para esta compañía` | El código no está en `business.currencies` de esa compañía |

### Tilde "Mostrar Separado" (`send_separately`)

Cada línea — tanto las de configuración de la máquina como los ítems adicionales — tiene
un checkbox **"Mostrar Separado"**, **destildado por defecto**. Define cómo viaja esa
parte dentro del documento de SAP:

| Valor | Cómo viaja a SAP |
|-------|------------------|
| `false` (default) | Su **descripción** entra en la línea de texto del documento y su **importe** se suma al precio de la línea del modelo. No genera línea propia. |
| `true`  | Genera su **propia línea** en el documento SAP, con su código, cantidad y precio. |

Son excluyentes: una parte **o** viaja separada **o** aparece en la línea de texto, nunca
en las dos.

| Tipo de línea | Código que se usa como `ItemCode` en SAP |
|---------------|------------------------------------------|
| `item`    | `sap_code` del artículo (`business.items`) |
| `machine` | `mrkwrt` de la opción elegida — en SAP existe con ese mismo código |

> Si una línea marcada `true` no tiene código, el envío a SAP falla con `422` — ver
> sección 6.

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

Mismo esquema que **POST** — el `PUT` **reemplaza la cotización completa**, así que hay
que mandar la cabecera entera (`company_id`, `cardcode`, `cardname`, `machine_id`,
`valid_until` son obligatorios) y no solo las líneas. Si falta alguno, responde `400`.

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
de la compañía (ver `SAP_SETTINGS_ENDPOINTS.md`).

### Cómo se arma el documento en SAP

**`DocumentLines`** — la línea del modelo, más una línea por cada artículo con
`send_separately: true`:

| Línea | Contenido |
|-------|-----------|
| `LineNum: 0` | El ítem principal (`matnrk` de la máquina base). Su importe incluye todo lo que va agrupado (`send_separately: false`), sea configuración o artículo. |
| `LineNum: 1..n` | Una línea por cada parte marcada **"Mostrar Separado"**, con su código, cantidad y precio propios. |

**`DocumentSpecialLines`** — una línea de texto (`LineType: "dslt_Text"`,
`AfterLineNumber: 0`) que lista **las partes agrupadas por descripción, sin códigos**,
una por renglón precedida de `-`. Las partes que viajan separadas no aparecen acá.

```json
"DocumentSpecialLines": [
  {
    "LineNum": 0,
    "AfterLineNumber": 0,
    "OrderNumber": 1,
    "LineType": "dslt_Text",
    "LineText": "-M25 Standard\r-Asiento Confort\r-Kit herramientas"
  }
]
```

> Si no hay ninguna parte que describir, se manda `DocumentSpecialLines: []`. En un
> reenvío (`PATCH`) el array se manda siempre completo, así que quitar una parte de la
> cotización también la saca del documento en SAP.

> **Descuentos: a SAP viaja el neto, nunca el %.** El documento se crea con
> `DiscountPercent: 0` y la suma de las líneas da exactamente el `total` de la cotización
> (ya neto de descuentos de línea y de cabecera). Cuando hay descuento de cabecera, se
> reparte proporcionalmente entre las líneas. Los descuentos se siguen guardando y
> mostrando normalmente en la app (`discount_line`, `discount_pct`) — simplemente no se
> reflejan como porcentaje dentro del documento de SAP.

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
    "docnum": 5187,
    "sap_response": { "...": "respuesta cruda de SAP Service Layer" }
  }
}
```

> Al sincronizar con éxito, la cotización pasa a `status: "sent"` y `sync_status: "synced"`,
> y quedan guardados `docentry` y `docnum`.

### `docentry` vs `docnum`

| Campo      | Para qué sirve |
|------------|----------------|
| `docentry` | Clave interna del documento en SAP. Es la que usa el Service Layer para actualizarlo (`PATCH`). Uso técnico. |
| `docnum`   | Número visible del documento. **Es el que ven y buscan los usuarios.** Mostrarlo en pantalla y permitir filtrar por él. |

> El `PATCH` de Service Layer no devuelve el documento, así que en un reenvío se conserva
> el `docnum` ya guardado. Si falta (cotización sincronizada antes de que existiera el
> campo), se lo consulta a SAP una vez al reenviar.

### Errores

| Código | Error                                                                    | Causa                                                                |
|--------|----------------------------------------------------------------------------|-----------------------------------------------------------------------|
| 400    | `ID de cotización inválido`                                               | El `:id` no es un número                                              |
| 404    | `Cotización no encontrada`                                                | No existe una cotización con ese ID                                   |
| 404    | `Compañía no encontrada o inactiva`                                       | La compañía de la cotización no existe o está inactiva                |
| 409    | `La cotización ya fue sincronizada con SAP. Editala para poder reenviarla.` | `sync_status` ya es `synced` — evita crear un documento duplicado en SAP |
| 422    | `La máquina base no tiene matnrk (ItemCode SAP) configurado`              | La máquina no tiene código SAP cargado                                 |
| 422    | `Las líneas de configuración de la máquina tienen cantidades distintas...` | Las líneas `machine` no tienen todas el mismo `quantity`               |
| 422    | `"X" está marcado para mostrarse separado pero no tiene código SAP configurado` | Una línea con `send_separately: true` no tiene código (`sap_code` del ítem, o `mrkwrt` de la opción) |
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
