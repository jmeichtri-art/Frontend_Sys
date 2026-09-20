import type { MachineConfiguration } from './machine';

export interface Quotation {
  id: string;
  number: string;
  clientName: string;
  clientCompany: string;
  status: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';
  modelName: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  validUntil: string;
  configuration?: MachineConfiguration;
}

export interface QuotationDraftLine {
  characteristic_id: number;
  characteristic_name: string;
  merkm: string;
  option_id: number;
  option_description: string;
  mrkwrt: string;
  required?: boolean;
  component_category_id?: number | null;
}

export interface QuotationDraft {
  company_id: number;
  company_name: string;
  machine_id: number;
  machine_matnrk: string;
  machine_description: string;
  template_id?: number;
  lines: QuotationDraftLine[];
}

type MachineLinePayload = {
  line_type: 'machine';
  characteristic_id: number;
  option_id: number;
  /** Tilde "Mostrar Separado": true = línea propia en SAP, false = agrupado en la línea de texto */
  send_separately?: boolean;
  unit_price?: number;
  quantity?: number;
  discount_line?: number;
  discount_amount?: number;
  line_total?: number;
};

type ItemLinePayload = {
  line_type: 'item';
  item_id: number;
  /** Tilde "Mostrar Separado": true = línea propia en SAP, false = agrupado en la línea de texto */
  send_separately?: boolean;
  unit_price?: number;
  quantity?: number;
  discount_line?: number;
  discount_amount?: number;
  line_total?: number;
};

export type QuotationLinePayload = MachineLinePayload | ItemLinePayload;

export interface UpdateQuotationLinesPayload {
  // El PUT reemplaza la cotización completa: el backend exige la cabecera, no solo las líneas
  company_id: number;
  cardcode: string;
  cardname: string;
  machine_id: number;
  template_id?: number | null;
  price_list_id?: number | null;
  currency_id?: number | null;
  doc_rate?: number | null;
  margin_pct?: number | null;
  parity_coefficient?: number | null;
  valid_until: string;
  customer_reference?: string;
  notes?: string;
  lines: QuotationLinePayload[];
  subtotal?: number;
  discount_pct?: number;
  discount_amount?: number;
  total?: number;
}

export interface CreateQuotationPayload {
  company_id: number;
  cardcode: string;
  cardname: string;
  machine_id: number;
  template_id?: number | null;
  price_list_id?: number | null;
  currency_id?: number | null;
  doc_rate?: number | null;
  margin_pct?: number | null;
  parity_coefficient?: number | null;
  valid_until: string;
  customer_reference?: string;
  notes?: string;
  lines: QuotationLinePayload[];
  subtotal?: number;
  discount_pct?: number;
  discount_amount?: number;
  total?: number;
}

export interface QuotationApiLine {
  line_type: 'machine' | 'item';
  sort_order: number;
  // machine fields
  characteristic_id: number | null;
  merkm: string | null;
  characteristic_name: string | null;
  option_id: number | null;
  mrkwrt: string | null;
  option_description: string | null;
  // item fields
  item_id: number | null;
  item_code: string | null;
  item_name: string | null;
  send_separately: boolean;
  // pricing
  unit_price: number | null;
  currency_id: number | null;
  currency_code: string | null;
  currency_symbol: string | null;
  quantity: number | null;
  discount_line: number | null;
  discount_amount: number | null;
  line_total: number | null;
}

export interface SyncQuotationResult {
  docentry: number;
  /** Número visible del documento en SAP: es por el que buscan los usuarios */
  docnum: number | null;
  sap_response: unknown;
}

export interface QuotationApiItem {
  id: number;
  company_id: number;
  cardcode: string;
  cardname: string;
  machine_id: number;
  matnrk: string;
  machine_description: string;
  template_id: number | null;
  price_list_id: number | null;
  currency_id: number | null;
  currency_code: string | null;
  currency_symbol: string | null;
  doc_rate: number | null;
  /** Margen aplicado. Solo llega si el usuario es admin; para un vendedor viene undefined. */
  margin_pct?: number | null;
  parity_coefficient?: number | null;
  valid_until: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  sync_status: 'pending' | 'synced' | 'error';
  docentry: number | null;
  /** Número visible del documento en SAP: es por el que buscan los usuarios */
  docnum: number | null;
  notes: string | null;
  customer_reference: string | null;
  subtotal: number | null;
  discount_pct: number | null;
  discount_amount: number | null;
  total: number | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  lines?: QuotationApiLine[];
}
