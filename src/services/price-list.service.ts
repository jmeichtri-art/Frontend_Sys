import api from './api';
import { PriceList, CreatePriceListPayload, UpdatePriceListPayload, PriceListOptionPrice } from '@/types/price-list';

export async function getPriceLists(): Promise<PriceList[]> {
  const response = await api.get('/api/v1/price-lists');
  return response.data.data;
}

export async function createPriceList(payload: CreatePriceListPayload): Promise<PriceList> {
  const response = await api.post('/api/v1/price-lists', payload);
  return response.data.data;
}

export async function updatePriceList(id: number, payload: UpdatePriceListPayload): Promise<PriceList> {
  const response = await api.post(`/api/v1/price-lists/${id}`, payload);
  return response.data.data;
}

export async function deletePriceList(id: number): Promise<void> {
  await api.delete(`/api/v1/price-lists/${id}`);
}

export interface PriceListPricesResult {
  prices: PriceListOptionPrice[];
  /** Moneda en la que está expresada la lista de precios. */
  price_list_currency: string | null;
  /** Coeficiente aplicado para convertir a la moneda pedida. null = no hubo conversión. */
  parity_coefficient: number | null;
  /** Margen aplicado. Solo llega si el usuario es admin; para un vendedor viene undefined. */
  margin_pct?: number | null;
  /** Margen configurado para el modelo, antes de cualquier ajuste puntual. Solo admin. */
  model_margin_pct?: number | null;
}

export interface PriceListPricesOptions {
  /** Solo lo respeta el servidor si el usuario es admin. */
  marginOverride?: number | null;
  /** Moneda en la que se quiere cotizar. Si difiere de la de la lista, se convierte. */
  currencyId?: number | null;
  /** Coeficiente que pisa al default de la compañía para esa conversión. */
  parityCoefficient?: number | null;
}

/**
 * Los precios vuelven ya calculados por el backend: con el margen aplicado y, si la
 * moneda pedida no es la de la lista, convertidos con el coeficiente de paridad.
 */
export async function getPriceListPrices(
  priceListId: number,
  companyId: number,
  characteristicOptionIds: number[],
  { marginOverride, currencyId, parityCoefficient }: PriceListPricesOptions = {},
): Promise<PriceListPricesResult> {
  const response = await api.post('/api/v1/price-lists/prices', {
    price_list_id: priceListId,
    company_id: companyId,
    characteristic_option_ids: characteristicOptionIds,
    ...(marginOverride != null && { margin_pct: marginOverride }),
    ...(currencyId != null && { currency_id: currencyId }),
    ...(parityCoefficient != null && { parity_coefficient: parityCoefficient }),
  });
  return response.data.data;
}
