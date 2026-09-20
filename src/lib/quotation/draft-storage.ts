import { QuotationDraftLine } from '@/types/quotation';

/** Configuración recién armada en el asistente, camino a una cotización nueva. */
export const QUOTATION_DRAFT_KEY = 'hecato_quotation_draft';

/** Configuración rearmada en el asistente para una cotización que ya existe. */
export const RECONFIGURE_KEY = 'hecato_quotation_reconfigure';

export interface ReconfigureDraft {
  quotation_id: number;
  lines: QuotationDraftLine[];
}

/**
 * Devuelve la reconfiguración pendiente para esa cotización y la consume: una vez leída
 * se borra, así un refresh no vuelve a aplicar una configuración que el usuario descartó.
 */
export function takeReconfigureDraft(quotationId: number): ReconfigureDraft | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(RECONFIGURE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ReconfigureDraft;
    if (Number(parsed.quotation_id) !== Number(quotationId)) return null;
    sessionStorage.removeItem(RECONFIGURE_KEY);
    return parsed;
  } catch {
    sessionStorage.removeItem(RECONFIGURE_KEY);
    return null;
  }
}
