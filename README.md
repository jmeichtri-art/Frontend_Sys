# ForkBuilder — Frontend

> Powered by Hecato Origins

Plataforma de ventas y configuración de autoelevadores. Permite a equipos comerciales armar presupuestos personalizados a partir de configuraciones de máquinas.

---

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 3 |
| Componentes UI | Radix UI + Lucide React |
| HTTP Client | Axios |
| Auth | React Context API (mock) |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/            # Panel principal
│   │   └── ventas/
│   │       ├── configurador/     # Configurador de máquinas
│   │       └── cotizacion/       # Listado y detalle de cotizaciones
│   ├── login/                    # Página de login
│   ├── layout.tsx                # Layout raíz (AuthProvider)
│   └── page.tsx                  # Redirige a /ventas
├── components/
│   ├── layout/                   # AppLayout, Sidebar, Topbar
│   └── ui/                       # Button, Card, Badge, Input, Label, etc.
├── lib/
│   ├── auth/                     # AuthContext
│   └── utils.ts
├── services/
│   ├── api.ts                    # Instancia Axios con interceptors
│   ├── configurador.service.ts
│   └── cotizacion.service.ts
└── types/                        # Tipos globales (machine, quotation, api)
```

---

## Módulos principales

### Configurador de máquinas
Interfaz de build-to-order para configurar autoelevadores con:
- Modelos: Contrapeso, Reach Truck, Order Picker, Apilador
- Propulsión: AC Eléctrico, Litio, GNC, Gas LP
- Mástil: Simple, Dúplex, Tríplex, Plus
- Ruedas: Neumáticas, Poliuretano, Super-elásticas
- Batería: Plomo-ácido, Litio
- Accesorios opcionales: cabina, cámara, luces LED, pinza hidráulica, rotador, etc.
- Cálculo de precio en tiempo real

### Gestión de cotizaciones
- Crear cotizaciones desde configuraciones
- Estados: borrador, enviado, aceptado, rechazado, vencido
- Dashboard con KPIs: cotizaciones activas, aceptadas del mes, pendientes, valor del pipeline

### Autenticación
Sistema mock con dos usuarios de prueba:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Administrador |
| `vendedor` | `venta123` | Vendedor |

---

## Variables de entorno

Crear un archivo `.env` en la raíz basado en el siguiente esquema:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_API_TOKEN=your_token_here
```

---

## Comandos

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar servidor de producción
npm start

# Linting
npm run lint
```

---

## Diseño

- Color de marca: Rojo `#AA0020`
- Sidebar oscuro con área de contenido clara
- Soporte para modo oscuro (via Tailwind `dark:`)
- Animaciones: `fade-in`, `slide-in`
- Componentes accesibles con Radix UI
