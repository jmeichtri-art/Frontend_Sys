export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  /** Flag histórico de business.currencies. Para saber cuál es la moneda local usar `is_local`. */
  is_default: boolean;
  /** Moneda local de la compañía, según el setting `local_currency`. Cotizar en otra habilita el tipo de cambio. */
  is_local: boolean;
}
