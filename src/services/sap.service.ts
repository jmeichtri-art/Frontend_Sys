import api from './api';

export interface SapCustomer {
  CardCode: string;
  CardName: string;
}

export async function getSapCustomers(companyId: number): Promise<SapCustomer[]> {
  // El backend intenta SAP B1 primero (timeout interno de 10s) y si falla cae a los
  // clientes de backup — le damos margen al request para que ese fallback llegue a responder.
  const response = await api.get('/api/v1/sap/customers', { params: { companyId }, timeout: 15000 });
  return response.data.data;
}

export interface SapItem {
  ItemCode: string;
  ItemName: string;
}

export async function getSapItems(companyId: number): Promise<SapItem[]> {
  const response = await api.get('/api/v1/sap/items', { params: { companyId } });
  return response.data.data;
}

export interface SapCurrencyRate {
  currency: string;
  /** null si SAP no tiene ningún tipo de cambio cargado para esa moneda */
  rate: number | null;
  /** Fecha del tipo de cambio devuelto. Puede ser anterior a hoy si SAP no cargó el del día */
  rate_date: string | null;
}

export async function getSapCurrencyRate(companyId: number, currency: string): Promise<SapCurrencyRate> {
  const response = await api.get('/api/v1/sap/currency-rate', { params: { companyId, currency } });
  return response.data.data;
}
