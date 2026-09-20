# Margen de Ganancia — Documentación de Endpoints

Base URL: `/api/v1/margins`

**Todo el módulo es admin-only.** Un usuario `sales` o `viewer` recibe `403` en cualquiera
de estos endpoints. La pantalla vive en `/config/margins`.

---

## Cómo funciona

El margen se define **por compañía y por modelo de equipo** (la opción del grupo de
características `MODEL`, `merkm = '1100'` — la misma dimensión que usan los descuentos).

El grossing up se hace **en el backend**, al devolver los precios de lista:

```
precio_final = precio_base / (1 - margin_pct / 100)
```

Ejemplo: un precio de lista de `10.000` con margen `5%` se cotiza `10.526,32`.

Consecuencias importantes para el frontend:

- **`POST /api/v1/price-lists/prices` ya devuelve el precio con margen aplicado.** No hay
  que multiplicar nada del lado del cliente; el `unit_price` que se recibe es el final y
  es el que se guarda en la cotización. La respuesta tiene esta forma:

```json
{
  "success": true,
  "data": {
    "prices": [{ "characteristic_option_id": 45, "unit_price": 10526.32, "currency_code": "USD", "currency_symbol": "U$S" }],
    "margin_pct": 5,
    "model_margin_pct": 5
  }
}
```

`margin_pct` y `model_margin_pct` **solo se incluyen si el usuario es admin** — para un
vendedor la respuesta trae únicamente `prices`.
- **El vendedor nunca recibe el margen ni el precio base.** No viajan en ninguna
  respuesta que llegue a su navegador, así que no se ven ni abriendo la consola.
- El backend deduce solo qué margen usar: entre las opciones cuyo precio se pide, busca
  la del modelo. El frontend no manda nada extra.
- **Los ítems adicionales con precio cargado a mano no llevan margen**: lo que el
  vendedor tipea es el precio final de esa línea.
- Si el modelo no tiene margen cargado, o está inactivo, los precios salen tal cual.

### Negociar el margen en una cotización puntual (solo admin)

Un admin puede pisar el margen del modelo para una cotización concreta, por ejemplo para
resignar parte del margen y ganar esa operación. En el formulario de cotización aparece
el campo **Margen (%)** (oculto para el resto de los roles).

- Al cambiarlo, el frontend vuelve a pedir los precios mandando `margin_pct` en el body
  de `POST /api/v1/price-lists/prices`; el backend recalcula y devuelve los precios con
  ese margen.
- **El servidor solo respeta ese `margin_pct` si el usuario es admin.** Si lo manda un
  vendedor, se ignora en silencio y se usa el margen del modelo — mandar el campo a mano
  no sirve para cambiar precios.
- El margen usado **se persiste en la cotización** (`margin_pct`), así que al reabrirla
  un admin ve con cuál se armó. `GET /api/v1/quotations` y `GET /api/v1/quotations/:id`
  incluyen ese campo **solo para admin**.
- El campo se habilita únicamente con una lista de precios seleccionada: sin lista no hay
  precios base que recalcular.

---

## 1. Listar márgenes

**GET** `/api/v1/margins?companyId={id}`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "model_option_id": 54,
      "model_code": "M25",
      "model_description": "M25 Standard",
      "machine_matnrk": "003301",
      "margin_pct": 5,
      "active": true,
      "created_at": "2026-09-19T10:00:00.000Z",
      "updated_at": "2026-09-19T10:00:00.000Z"
    }
  ]
}
```

## 2. Obtener por ID

**GET** `/api/v1/margins/:id?companyId={id}`

## 3. Crear

**POST** `/api/v1/margins?companyId={id}`

```json
{ "company_id": 1, "model_option_id": 54, "margin_pct": 5 }
```

| Campo             | Tipo    | Requerido | Descripción                                   |
|-------------------|---------|-----------|-----------------------------------------------|
| `company_id`      | integer | Sí        | Compañía dueña del margen                     |
| `model_option_id` | integer | Sí        | Opción del grupo `MODEL` (`merkm = '1100'`)   |
| `margin_pct`      | number  | Sí        | Entre 0 y 99,99. 100 dividiría por cero       |
| `active`          | boolean | No        | Default `true`                                |

## 4. Actualizar

**PUT** `/api/v1/margins/:id?companyId={id}` — acepta `margin_pct` y/o `active`.

## 5. Eliminar

**DELETE** `/api/v1/margins/:id?companyId={id}`

## 6. Resolver el margen de un modelo

**GET** `/api/v1/margins/resolve?companyId={id}&modelOptionId={id}`

```json
{ "success": true, "data": { "margin_pct": 5 } }
```

Devuelve `null` si ese modelo no tiene margen activo. Es **admin-only** y sirve para la
pantalla de administración — **no lo llames desde el flujo de cotización**: ahí los
precios ya vienen con el margen aplicado, y pedir el % desde el navegador de un vendedor
lo expondría.

---

## Errores

| Código | Error | Causa |
|--------|-------|-------|
| 400    | `companyId es requerido y debe ser un número entero` | Falta el query param |
| 400    | `company_id, model_option_id y margin_pct son requeridos` | Falta un campo al crear |
| 400    | `margin_pct debe ser mayor o igual a 0 y menor a 100` | Valor fuera de rango |
| 403    | `No tenés permisos para realizar esta acción` | El usuario no es `admin` |
| 404    | `Margen no encontrado` | No existe para esa compañía |
| 409    | `Ya existe un margen para esa compañía y modelo` | Hay uno solo por compañía + modelo |
