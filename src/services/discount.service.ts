import api from './api';
import {
  DiscountRule,
  CreateDiscountRulePayload,
  UpdateDiscountRulePayload,
  ResolveDiscountResult,
  ImportDiscountsResult,
  ComponentCategory,
} from '@/types/discount';

export async function getDiscounts(companyId: number): Promise<DiscountRule[]> {
  const response = await api.get('/api/v1/discounts', { params: { companyId } });
  return response.data.data;
}

export async function createDiscount(payload: CreateDiscountRulePayload): Promise<DiscountRule> {
  const response = await api.post('/api/v1/discounts', payload);
  return response.data.data;
}

export async function updateDiscount(id: number, payload: UpdateDiscountRulePayload): Promise<DiscountRule> {
  const response = await api.put(`/api/v1/discounts/${id}`, payload);
  return response.data.data;
}

export async function deleteDiscount(id: number, companyId: number): Promise<void> {
  await api.delete(`/api/v1/discounts/${id}`, { params: { companyId } });
}

export async function resolveDiscount(
  companyId: number,
  modelOptionId: number,
  componentCategoryId?: number | null
): Promise<ResolveDiscountResult> {
  const response = await api.get('/api/v1/discounts/resolve', {
    params: {
      companyId,
      modelOptionId,
      ...(componentCategoryId != null && { componentCategoryId }),
    },
  });
  return response.data.data;
}

export async function importDiscounts(file: File, companyId: number): Promise<ImportDiscountsResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/v1/discounts/import', formData, {
    params: { companyId },
    headers: { 'Content-Type': undefined },
    timeout: 60_000,
  });
  return response.data.data;
}

export async function getComponentCategories(): Promise<ComponentCategory[]> {
  const response = await api.get('/api/v1/component-categories');
  return response.data.data;
}
