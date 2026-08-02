'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Settings, FileText,
  ChevronLeft, ChevronRight, LogOut, Forklift, ChevronDown, ChevronUp, BookMarked,
  Cog, Users, Building2, Tag, Package, FileUp, Boxes, Percent,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/Separator';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Ventas',
    icon: <ShoppingCart size={18} />,
    children: [
      { label: 'Configurador', href: '/sales/configurator', icon: <Settings size={18} /> },
      { label: 'Cotizaciones', href: '/sales/quotation', icon: <FileText size={18} /> },
      { label: 'Templates', href: '/sales/templates', icon: <BookMarked size={18} /> },
      { label: 'Listas de Precios', href: '/sales/price-list', icon: <Tag size={18} /> },
    ],
  },
  {
    label: 'Inventario',
    icon: <Package size={18} />,
    children: [
      { label: 'Ítems',            href: '/inventory/items',     icon: <Boxes size={18} />   },
      { label: 'Descuentos',       href: '/inventory/discounts', icon: <Percent size={18} /> },
      { label: 'Importar Equipos', href: '/inventory/import',    icon: <FileUp size={18} />  },
    ],
  },
  {
    label: 'Configuración',
    icon: <Cog size={18} />,
    children: [
      { label: 'Usuarios',   href: '/config/users',     icon: <Users size={18} />    },
      { label: 'Compañías',  href: '/config/companies', icon: <Building2 size={18} /> },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(['Ventas']);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const toggle = (label: string) =>
    setExpanded((p) => p.includes(label) ? p.filter((l) => l !== label) : [...p, label]);

  const isActive = (href?: string) => !!href && pathname.startsWith(href);

  const renderItem = (item: NavItem, depth = 0) => {
    const active = isActive(item.href);
    const isExpanded = expanded.includes(item.label);

    if (item.children) {
      return (
        <div key={item.label}>
          <button
            onClick={() => !collapsed && toggle(item.label)}
            title={collapsed ? item.label : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/60 hover:bg-white/7 hover:text-white transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </>
            )}
          </button>
          {!collapsed && isExpanded && (
            <div className="ml-4 pl-3 border-l border-white/10 mt-0.5 flex flex-col gap-0.5">
              {item.children.map((c) => renderItem(c, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href!}
        title={collapsed ? item.label : undefined}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
          active
            ? 'bg-primary/20 text-white'
            : 'text-white/60 hover:bg-white/7 hover:text-white',
          depth > 0 && 'text-[0.82rem] py-2',
          collapsed && 'justify-center'
        )}
      >
        <span className={cn('shrink-0', active && 'text-primary')}>
          {item.icon}
        </span>
        {!collapsed && <span className="flex-1">{item.label}</span>}
        {active && !collapsed && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-primary rounded-l-full" />
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen flex-shrink-0 bg-[hsl(var(--sidebar))] transition-[width] duration-300 overflow-hidden z-50',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/8">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Forklift size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-white font-extrabold tracking-[0.08em] text-sm">HECATO</span>
            <span className="text-white/40 text-[0.6rem] tracking-[0.15em] uppercase">Origins</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4">
        {!collapsed && (
          <p className="text-[0.6rem] font-bold text-white/30 tracking-[0.12em] uppercase px-2 pb-2">
            Menú
          </p>
        )}
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => renderItem(item))}
        </div>
      </nav>

      <Separator className="bg-white/8" />

      {/* Footer */}
      <div className="p-2.5 flex flex-col gap-1.5">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-white text-[0.8125rem] font-semibold truncate">{user.name}</span>
              <span className="text-white/40 text-[0.7rem]">{user.role}</span>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-white/40 text-sm hover:bg-red-500/15 hover:text-red-300 transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={16} />
          {!collapsed && <span>Salir</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expandir' : 'Colapsar'}
        className="absolute top-5 -right-3 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
