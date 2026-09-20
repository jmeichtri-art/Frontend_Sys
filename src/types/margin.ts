export interface ProfitMargin {
  id: number;
  company_id: number;
  model_option_id: number;
  model_code: string | null;
  model_description: string | null;
  machine_matnrk: string | null;
  margin_pct: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProfitMarginPayload {
  company_id: number;
  model_option_id: number;
  margin_pct: number;
  active?: boolean;
}

export interface UpdateProfitMarginPayload {
  margin_pct?: number;
  active?: boolean;
}
