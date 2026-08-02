export interface DiscountRule {
  id: number;
  company_id: number;
  model_option_id: number;
  model_code: string;
  model_description: string;
  matnrk: string;
  component_category_id: number | null;
  component_category_code: string | null;
  component_category_name: string | null;
  discount_pct: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscountRulePayload {
  company_id: number;
  model_option_id: number;
  component_category_id?: number | null;
  discount_pct: number;
}

export interface UpdateDiscountRulePayload {
  company_id: number;
  discount_pct: number;
  active: boolean;
}

export interface ResolveDiscountResult {
  discount_pct: number | null;
  source: 'category' | 'general' | null;
}

export interface ImportDiscountsResult {
  upserted: number;
  duration_ms: number;
}

export interface ImportDiscountsRowError {
  row: number;
  field: string;
  message: string;
}

export interface ComponentCategory {
  id: number;
  code: string;
  name: string;
  active: boolean;
}
