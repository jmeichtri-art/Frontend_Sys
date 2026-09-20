import api from './api';
import { ProfitMargin, CreateProfitMarginPayload, UpdateProfitMarginPayload } from '@/types/margin';

// Todos estos endpoints son admin-only: el vendedor nunca recibe el margen.
// Los precios le llegan con el grossing up ya aplicado desde /price-lists/prices.

export async function getMargins(companyId: number): Promise<ProfitMargin[]> {
  const response = await api.get('/api/v1/margins', { params: { companyId } });
  return response.data.data;
}

export async function createMargin(payload: CreateProfitMarginPayload): Promise<ProfitMargin> {
  const response = await api.post('/api/v1/margins', payload, { params: { companyId: payload.company_id } });
  return response.data.data;
}

export async function updateMargin(id: number, companyId: number, payload: UpdateProfitMarginPayload): Promise<ProfitMargin> {
  const response = await api.put(`/api/v1/margins/${id}`, payload, { params: { companyId } });
  return response.data.data;
}

export async function deleteMargin(id: number, companyId: number): Promise<void> {
  await api.delete(`/api/v1/margins/${id}`, { params: { companyId } });
}
