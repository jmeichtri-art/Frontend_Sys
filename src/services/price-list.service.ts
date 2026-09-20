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
  /** Margen aplicado. Solo llega si el usuario es admin; para un vendedor viene undefined. */
  margin_pct?: number | null;
  /** Margen configurado para el modelo, antes de cualquier ajuste puntual. Solo admin. */
  model_margin_pct?: number | null;
}

/**
 * Los precios vuelven con el margen ya aplicado por el backend.
 * `marginOverride` solo lo respeta el servidor si el usuario es admin.
 */
export async function getPriceListPrices(
  priceListId: number,
  companyId: number,
  characteristicOptionIds: number[],
  marginOverride?: number | null,
): Promise<PriceListPricesResult> {
  const response = await api.post('/api/v1/price-lists/prices', {
    price_list_id: priceListId,
    company_id: companyId,
    characteristic_option_ids: characteristicOptionIds,
    ...(marginOverride != null && { margin_pct: marginOverride }),
  });
  return response.data.data;
}
