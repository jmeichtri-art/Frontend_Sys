import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-secondary text-secondary-foreground',
        primary: 'border-transparent bg-primary/10 text-primary',
        success: 'border-transparent bg-green-100 text-green-700',
        warning: 'border-transparent bg-amber-100 text-amber-700',
        destructive: 'border-transparent bg-red-100 text-red-700',
        info: 'border-transparent bg-blue-100 text-blue-700',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };

export const STATUS_VARIANT_MAP: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  borrador: 'default',
  enviada: 'info',
  aceptada: 'success',
  rechazada: 'destructive',
  vencida: 'warning',
};

export const STATUS_LABEL_MAP: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
};

export const QUOTATION_STATUS_VARIANT_MAP: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  draft: 'default',
  sent: 'info',
  approved: 'success',
  rejected: 'destructive',
};

export const QUOTATION_STATUS_LABEL_MAP: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export const SYNC_STATUS_VARIANT_MAP: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  pending: 'default',
  synced: 'success',
  error: 'destructive',
};

export const SYNC_STATUS_LABEL_MAP: Record<string, string> = {
  pending: 'Sin sincronizar',
  synced: 'Sincronizada con SAP',
  error: 'Error de sincronización',
};
