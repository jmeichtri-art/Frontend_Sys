import api from './api';
import { Currency } from '@/types/currency';

export async function getCurrencies(companyId: number): Promise<Currency[]> {
  const response = await api.get('/api/v1/currencies', { params: { companyId } });
  return response.data.data;
}
