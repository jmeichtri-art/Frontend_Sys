# CLAUDE.md — Contexto del proyecto: ForkBuilder Frontend

## ¿Qué es este proyecto?

**ForkBuilder** (powered by Hecato Origins) es una aplicación web para configurar y cotizar autoelevadores (forklifts). Permite al equipo de ventas:

- Configurar equipos paso a paso (características SAP: motores, mástiles, llantas, baterías, etc.)
- Guardar configuraciones como templates reutilizables
- Generar cotizaciones vinculadas a clientes SAP
- Administrar listas de precios
- Gestionar usuarios y compañías conectadas al sistema

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14.2.29 — App Router |
| Lenguaje | TypeScript 5, strict mode |
| HTTP | Axios 1.7.9 |
| UI primitives | Radix UI (dialog, dropdown, label, separator, tooltip, etc.) |
| Estilos | Tailwind CSS 3.4.19 + CSS custom properties |
| Variantes de componentes | class-variance-authority |
| Íconos | Lucide React 0.469.0 |
| Utilidades | clsx, tailwind-merge |
| Formularios | React state puro (sin react-hook-form ni Zod) |
| Dev port | 3001 |

---

## Estructura de carpetas

```
src/
├── app/
│   ├── layout.tsx                   # Root: AuthProvider + metadata
│   ├── page.tsx                     # Redirect → /sales
│   ├── login/page.tsx               # Login público
│   └── (core)/                      # Rutas protegidas (requieren auth)
│       ├── layout.tsx               # CompanyProvider + AppLayout
│       ├── dashboard/               # Redirect → /sales
│       ├── sales/
│       │   ├── page.tsx             # Hub de ventas (KPIs + lista cotizaciones)
│       │   ├── configurator/page.tsx # Wizard 4 pasos
│       │   ├── quotation/
│       │   │   ├── page.tsx         # Lista de cotizaciones
│       │   │   ├── new/page.tsx     # Crear cotización desde draft
│       │   │   └── [id]/page.tsx    # Detalle de cotización
│       │   ├── templates/
│       │   │   ├── page.tsx         # Lista de templates
│       │   │   └── [id]/page.tsx    # Detalle de template
│       │   └── price-list/page.tsx  # Listas de precios (CRUD)
│       └── config/
│           ├── users/page.tsx       # ABM usuarios
│           └── companies/page.tsx   # ABM compañías
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx            # Wrapper protegido: sidebar + topbar
│   │   ├── Sidebar.tsx              # Menú colapsable con secciones
│   │   └── Topbar.tsx               # Breadcrumb + avatar
│   └── ui/
│       ├── Button.tsx               # variants: default|destructive|outline|secondary|ghost|link
│       ├── Card.tsx                 # CardHeader/Content/Footer
│       ├── Input.tsx
│       ├── Label.tsx
│       ├── Badge.tsx                # variants: default|primary|success|warning|destructive|info|outline + dot
│       ├── Separator.tsx
│       ├── CompanySelector.tsx      # Dropdown de compañías activas (desde contexto)
│       └── CustomerCombobox.tsx     # Async combobox clientes SAP (busca por companyId)
├── services/
│   ├── api.ts                       # Axios instance + interceptores auth
│   ├── company.service.ts
│   ├── equipment.service.ts
│   ├── quotation.service.ts
│   ├── template.service.ts
│   ├── user.service.ts
│   ├── sap.service.ts
│   ├── price-list.service.ts
│   └── configurador.service.ts
├── types/
│   ├── api.ts                       # ApiResponse<T>
│   ├── company.ts
│   ├── equipment.ts                 # Machine, Characteristic, Option, Compatibility
│   ├── machine.ts                   # MachineModel (configurador UI, no SAP)
│   ├── quotation.ts
│   ├── template.ts
│   ├── user.ts
│   ├── price-list.ts
│   └── index.ts
└── lib/
    ├── utils.ts                     # cn(), formatCurrency(), formatDate()
    ├── auth/AuthContext.tsx
    └── company/CompanyContext.tsx
```

---

## Autenticación

- **Endpoint:** `POST /api/v1/auth/login` → `{ token, user }`
- El token se guarda en `localStorage` con clave `hecato_token`
- El usuario se guarda en `localStorage` con clave `hecato_user`
- El interceptor de Axios agrega `Authorization: Bearer {token}` en cada request
- Si el servidor responde 401, el interceptor limpia localStorage y redirige a `/login`
- `useAuth()` expone: `user`, `isAuthenticated`, `isLoading`, `login()`, `logout()`

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: string;       // 'admin' | 'sales' | 'viewer'
  company_id: number;
}
```

---

## Contextos globales

### `useAuth()` — `src/lib/auth/AuthContext.tsx`
Estado de sesión. Disponible en toda la app.

### `useCompany()` — `src/lib/company/CompanyContext.tsx`
Lista de compañías activas + selección actual. Disponible dentro del layout `(core)`.

```typescript
interface CompanyContextType {
  companies: Company[];        // Solo activas
  isLoading: boolean;
  error: string;
  selectedCompany: Company | null;
  setSelectedCompany(c: Company | null): void;
}
```

Muchas features dependen de `selectedCompany` (lista de cotizaciones, CustomerCombobox, etc.).

---

## Capa de servicios y API

### `src/services/api.ts`
- Base URL: `process.env.API_URL` (SSR) o vacío (cliente — usa rewrite de Next.js)
- Timeout: 10 segundos
- Respuesta estándar: `{ success, data?, message?, error? }`
- Todos los servicios retornan `response.data.data`

### Proxy (next.config.mjs)
```
/api/* → ${API_URL}/api/*
```
Evita CORS en desarrollo y producción.

### Endpoints en uso

| Método | Ruta | Servicio | Notas |
|--------|------|---------|-------|
| POST | `/api/v1/auth/login` | — | Retorna `{ token, user }` |
| GET | `/api/v1/companies` | company | |
| POST | `/api/v1/companies` | company | |
| PUT | `/api/v1/companies/:id` | company | |
| DELETE | `/api/v1/companies/:id` | company | |
| GET | `/api/v1/users` | user | |
| POST | `/api/v1/users` | user | |
| PUT | `/api/v1/users/:id` | user | |
| DELETE | `/api/v1/users/:id` | user | |
| GET | `/api/v1/equipment/machines` | equipment | |
| GET | `/api/v1/equipment/machines/:id/options` | equipment | Retorna `{ characteristics, options, compatibility }` |
| GET | `/api/v1/templates` | template | `?companyId=` |
| POST | `/api/v1/templates` | template | |
| GET | `/api/v1/templates/:id` | template | |
| GET | `/api/v1/sap/customers` | sap | `?companyId=` |
| GET | `/api/v1/quotations` | quotation | `?companyId=` |
| POST | `/api/v1/quotations` | quotation | |
| GET | `/api/v1/quotations/:id` | quotation | |
| GET | `/api/v1/price-lists` | price-list | |
| POST | `/api/v1/price-lists` | price-list | Roles: admin, sales |
| DELETE | `/api/v1/price-lists/:id` | price-list | Rol: admin. Cascade automático |

---

## Tipos TypeScript principales

### `ApiResponse<T>`
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

### `Company`
```typescript
interface Company {
  id: number;
  name: string;
  active: boolean;
  database_name: string;
  created_at: string;
  updated_at: string;
}
```

### `AppUser`
```typescript
interface AppUser {
  id: number;
  email: string;
  role: 'admin' | 'sales' | 'viewer';
  created_at: string;
}
```

### `Machine` (equipo SAP)
```typescript
interface Machine {
  id: number;
  matnr: string;       // Nro. de material SAP
  matnrk: string;      // Código de display
  description: string;
}
```

### `MachineOptions`
```typescript
interface MachineOptions {
  characteristics: Characteristic[];   // merkm = código SAP
  options: Option[];                    // mrkwrt = valor SAP
  compatibility: Compatibility[];       // level: 0=excluido, 1=obligatorio, 2-4=opcional
}
```

### `QuotationApiItem`
```typescript
interface QuotationApiItem {
  id: number;
  company_id: number;
  cardcode: string;        // Código cliente SAP
  cardname: string;        // Nombre cliente SAP
  machine_id: number;
  matnrk: string;
  machine_description: string;
  template_id: number | null;
  valid_until: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  sync_status: 'pending' | 'synced' | 'error';
  docentry: number | null; // Nro. documento SAP post-sync
  notes: string | null;
  customer_reference: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  lines?: QuotationApiLine[];
}
```

### `PriceList`
```typescript
interface PriceList {
  id: number;
  list_number: string;      // Ej: "LP-001"
  name: string;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  companies?: { id: number; name: string }[];
  items?: PriceListItem[];
}

// POST body
interface CreatePriceListPayload {
  list_number: string;
  name: string;
  valid_from: string;
  valid_until?: string;
  company_ids?: number[];
  items?: {
    machine_id?: number;
    article_id?: number;
    unit_price: number;
    currency_id: number;
  }[];
}
```

---

## Flujo principal: Configurador → Cotización

```
1. /sales/configurator
   - Paso 1: Seleccionar máquina + variante de modelo (merkm='1100')
   - Paso 2: Elegir opciones obligatorias (compatibility.level === 1)
   - Paso 3: Elegir opciones opcionales (level 2-4)
   - Paso 4: Resumen → guardar como template (opcional) → "Cotizar"
   - Guarda QuotationDraft en sessionStorage: clave `hecato_quotation_draft`

2. /sales/quotation/new
   - Lee draft de sessionStorage
   - Selección de cliente (CustomerCombobox → SAP customers por companyId)
   - Fecha de validez + referencia + notas
   - POST /api/v1/quotations → redirige a /sales/quotation

3. /sales/quotation/[id]
   - Vista detalle con líneas, precios y estado de sync con SAP
```

---

## Patrones de código

### Formularios
Sin librerías externas. Patrón manual:

```typescript
interface MyForm { field1: string; field2: string; }
const EMPTY: MyForm = { field1: '', field2: '' };

const [form, setForm] = useState<MyForm>(EMPTY);
const [formError, setFormError] = useState('');
const [submitting, setSubmitting] = useState(false);

function setField<K extends keyof MyForm>(key: K, value: MyForm[K]) {
  setForm((f) => ({ ...f, [key]: value }));
  setFormError('');
}

async function handleSubmit() {
  if (!form.field1.trim()) { setFormError('Requerido.'); return; }
  setSubmitting(true);
  try {
    await someService(form);
  } catch (err: unknown) {
    setFormError(err instanceof Error ? err.message : 'Error genérico.');
  } finally {
    setSubmitting(false);
  }
}
```

### Inputs (Tailwind class estándar)
```
px-3 py-2 text-sm rounded-lg border border-border bg-background
focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all
```

### Errores inline
```tsx
{formError && (
  <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2 rounded-lg text-sm">
    <AlertCircle size={14} /> {formError}
  </div>
)}
```

### Delete con confirmación (inline en tabla)
```tsx
{isConfirming ? (
  <>
    <span className="text-xs text-muted-foreground mr-1">¿Eliminar?</span>
    <Button variant="destructive" size="sm" loading={deleting} onClick={() => handleDelete(id)}>
      <Check size={13} /> Sí
    </Button>
    <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)} disabled={deleting}>
      No
    </Button>
  </>
) : (
  <button onClick={() => setConfirmDelete(id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar">
    <Trash2 size={14} />
  </button>
)}
```

### Tabla estándar
```tsx
<Card>
  <CardContent className="p-0">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
            Columna
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
            <td className="px-5 py-3.5">{item.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </CardContent>
</Card>
```

### Empty state en tabla
```tsx
<div className="py-16 text-center text-muted-foreground">
  <IconComponent size={36} className="mx-auto mb-3 opacity-25" />
  <p className="text-sm">No hay registros.</p>
</div>
```

---

## Sidebar — agregar ítem

Para agregar una ruta nueva al menú editar `src/components/layout/Sidebar.tsx`:

```typescript
// Importar ícono de lucide-react
import { NuevoIcono } from 'lucide-react';

// Agregar en NAV_ITEMS dentro del array children correspondiente
{ label: 'Nombre', href: '/sales/ruta', icon: <NuevoIcono size={18} /> },
```

---

## Variables de entorno

| Variable | Uso |
|---|---|
| `API_URL` | URL base del backend (ej: `http://localhost:3000`) |

---

## Comandos

```bash
npm run dev    # Desarrollo en puerto 3001
npm run build  # Build de producción
npm start      # Producción en puerto 3001
npm run lint   # ESLint
```

---

## Idioma y locale

Todo el UI está en **español argentino**. Fechas y monedas usan `es-AR`:
- `formatDate("2026-01-01")` → `"01/01/2026"`
- `formatCurrency(45000)` → `"$45.000"` (USD hardcodeado en la función)
