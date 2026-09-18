import api from './api';
import { CreateQuotationPayload, UpdateQuotationLinesPayload, QuotationApiItem, SyncQuotationResult } from '@/types/quotation';

export async function createQuotation(payload: CreateQuotationPayload): Promise<QuotationApiItem> {
  const response = await api.post('/api/v1/quotations', payload);
  return response.data.data;
}

export async function getQuotations(companyId: number): Promise<QuotationApiItem[]> {
  const response = await api.get('/api/v1/quotations', { params: { companyId } });
  return response.data.data;
}

export async function getQuotationById(id: number): Promise<QuotationApiItem> {
  const response = await api.get(`/api/v1/quotations/${id}`);
  return response.data.data;
}

export async function updateQuotationLines(id: number, payload: UpdateQuotationLinesPayload): Promise<QuotationApiItem> {
  const response = await api.put(`/api/v1/quotations/${id}`, payload);
  return response.data.data;
}

export async function syncQuotationToSap(id: number): Promise<SyncQuotationResult> {
  const response = await api.post(`/api/v1/sync/quotations/${id}`);
  return response.data.data;
}
