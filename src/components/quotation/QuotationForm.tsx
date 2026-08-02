'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, AlertCircle, Loader2, Check, Building2, Tag, Banknote, User, Calendar, Plus, X, Boxes } from 'lucide-react';
import Link from 'next/link';
import { QuotationDraft, QuotationApiItem, QuotationLinePayload } from '@/types/quotation';
import { PriceList, PriceListOptionPrice } from '@/types/price-list';
import { Item } from '@/types/item';
import { SapCustomer } from '@/services/sap.service';
import { createQuotation, updateQuotationLines } from '@/services/quotation.service';
import { getPriceLists, getPriceListPrices } from '@/services/price-list.service';
import { getItems } from '@/services/item.service';
import { resolveDiscount } from '@/services/discount.service';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SapCustomerCombobox } from '@/components/ui/SapCustomerCombobox';

// SAP convention: merkm '1100' holds the model variant options
const MODEL_VARIANT_MERKM = '1100';

interface FormLine {
  characteristic_id: number;
  characteristic_name: string;
  option_id: number;
  option_description: string;
  mrkwrt: string;
  required?: boolean;
  merkm?: string;
  component_category_id?: number | null;
}

interface ItemFormLine {
  item_id: number;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number | null;
  discount: number;
}

interface LineDiscount { discount: number; }

type QuotationFormProps =
  | { mode: 'create'; draft: QuotationDraft; onSuccess: (id: number) => void }
  | { mode: 'edit'; quotation: QuotationApiItem; onSaved: (updated: QuotationApiItem) => void; onCancel: () => void };

function buildInitialPrices(quotation: QuotationApiItem): Map<number, PriceListOptionPrice> {
  return new Map(
    (quotation.lines ?? [])
      .filter((l) => (l.line_type ?? 'machine') === 'machine' && l.option_id != null && l.unit_price != null)
      .map((l) => [l.option_id!, {
        characteristic_option_id: l.option_id!,
        unit_price:      l.unit_price!,
        currency_code:   l.currency_code   ?? undefined,
        currency_symbol: l.currency_symbol ?? undefined,
      }])
  );
}

export function QuotationForm(props: QuotationFormProps) {
  const isCreate = props.mode === 'create';
  const companyId = isCreate ? props.draft.company_id : props.quotation.company_id;

  const lines = useMemo<FormLine[]>(() => {
    if (isCreate) return props.draft.lines;
    return (props.quotation.lines ?? [])
      .filter((l) => (l.line_type ?? 'machine') === 'machine')
      .map((l) => ({
        characteristic_id:   l.characteristic_id!,
        characteristic_name: l.characteristic_name ?? '',
        option_id:           l.option_id!,
        option_description:  l.option_description ?? '',
        mrkwrt:              l.mrkwrt ?? '',
        merkm:               l.merkm ?? undefined,
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialPrices = useMemo(
    () => isCreate ? new Map<number, PriceListOptionPrice>() : buildInitialPrices(props.quotation as QuotationApiItem),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const [customer,          setCustomer]          = useState<SapCustomer | null>(null);
  const [validUntil,        setValidUntil]        = useState(!isCreate ? (props.quotation as QuotationApiItem).valid_until.slice(0, 10) : '');
  const [customerReference, setCustomerReference] = useState(!isCreate ? ((props.quotation as QuotationApiItem).customer_reference ?? '') : '');
  const [notes,             setNotes]             = useState(!isCreate ? ((props.quotation as QuotationApiItem).notes ?? '') : '');

  const [priceLists,          setPriceLists]          = useState<PriceList[]>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState('');
  const [prices,              setPrices]              = useState<Map<number, PriceListOptionPrice>>(initialPrices);
  const [fetchingPrices,      setFetchingPrices]      = useState(false);
  const [lineExtras,          setLineExtras]          = useState<LineDiscount[]>(lines.map(() => ({ discount: 0 })));
  const [touchedLines,        setTouchedLines]        = useState<Set<number>>(new Set());
  const [orderDiscountPct,    setOrderDiscountPct]    = useState(0);

  // The model-variant line (merkm === '1100') carries the option that discount rules key off of
  const modelOptionId = useMemo(
    () => lines.find((l) => l.merkm === MODEL_VARIANT_MERKM)?.option_id ?? null,
  [lines]);

  const [itemLines,       setItemLines]       = useState<ItemFormLine[]>(() => {
    if (isCreate) return [];
    return (props.quotation as QuotationApiItem).lines
      ?.filter((l) => l.line_type === 'item')
      .map((l) => ({
        item_id:    l.item_id!,
        item_code:  l.item_code ?? '',
        item_name:  l.item_name ?? '',
        quantity:   1,
        unit_price: l.unit_price,
        discount:   0,
      })) ?? [];
  });
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [addingItemId,   setAddingItemId]   = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => { getPriceLists().then(setPriceLists).catch(() => {}); }, []);
  useEffect(() => { getItems(companyId).then(setAvailableItems).catch(() => {}); }, [companyId]);

  const fetchPrices = useCallback(async (priceListId: number) => {
    setFetchingPrices(true);
    try {
      const ids    = lines.map((l) => l.option_id);
      const result = await getPriceListPrices(priceListId, companyId, ids);
      setPrices(new Map(result.map((p) => [p.characteristic_option_id, p])));
    } catch { setPrices(new Map()); }
    finally { setFetchingPrices(false); }
  }, [lines, companyId]);

  async function handlePriceListChange(value: string) {
    setSelectedPriceListId(value);
    if (value) await fetchPrices(Number(value));
    else setPrices(initialPrices);
  }

  const hasPriceList = !!selectedPriceListId || (!isCreate && prices.size > 0);

  function setLineDiscount(idx: number, raw: string) {
    const value = raw === '' ? 0 : Number(raw);
    if (isNaN(value)) return;
    setTouchedLines((prev) => new Set(prev).add(idx));
    setLineExtras((prev) => prev.map((e, i) =>
      i !== idx ? e : { discount: Math.min(100, Math.max(0, value)) }
    ));
  }

  // Prefill each line's discount from the company's suggested discount rules once prices are
  // available — never overwrites a discount the user already edited (touchedLines).
  useEffect(() => {
    if (!hasPriceList || !modelOptionId) return;
    const categoryIds = Array.from(new Set(
      lines
        .map((l) => (prices.get(l.option_id)?.unit_price != null ? l.component_category_id ?? null : undefined))
        .filter((v): v is number | null => v !== undefined)
    ));
    if (categoryIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const resolved = new Map<number | null, number | null>();
      await Promise.all(categoryIds.map(async (catId) => {
        try {
          const res = await resolveDiscount(companyId, modelOptionId, catId ?? undefined);
          resolved.set(catId, res.discount_pct);
        } catch {
          resolved.set(catId, null);
        }
      }));
      if (cancelled) return;
      setLineExtras((prev) => prev.map((extra, idx) => {
        if (touchedLines.has(idx)) return extra;
        const line = lines[idx];
        if (prices.get(line.option_id)?.unit_price == null) return extra;
        const pct = resolved.get(line.component_category_id ?? null);
        return pct != null ? { discount: pct } : extra;
      }));
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices, hasPriceList, modelOptionId, companyId]);

  function subtotalOf(optionId: number, idx: number): number | null {
    const p = prices.get(optionId);
    if (p?.unit_price == null) return null;
    const discount = lineExtras[idx]?.discount ?? 0;
    return Number(p.unit_price) * (1 - discount / 100);
  }

  function addItemLine() {
    const id = Number(addingItemId);
    const found = availableItems.find((i) => i.id === id);
    if (!found) return;
    setItemLines((prev) => [...prev, { item_id: found.id, item_code: found.code, item_name: found.name, quantity: 1, unit_price: null, discount: 0 }]);
    setAddingItemId('');
  }

  function removeItemLine(idx: number) {
    setItemLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function setItemQuantity(idx: number, raw: string) {
    const value = raw === '' ? 1 : Math.max(1, Math.floor(Number(raw)));
    if (isNaN(value)) return;
    setItemLines((prev) => prev.map((l, i) => i !== idx ? l : { ...l, quantity: value }));
  }

  function setItemPrice(idx: number, raw: string) {
    const value = raw === '' ? null : Number(raw);
    if (value !== null && isNaN(value)) return;
    setItemLines((prev) => prev.map((l, i) => i !== idx ? l : { ...l, unit_price: value }));
  }

  function setItemDiscount(idx: number, raw: string) {
    const value = raw === '' ? 0 : Number(raw);
    if (isNaN(value)) return;
    setItemLines((prev) => prev.map((l, i) => i !== idx ? l : { ...l, discount: Math.min(100, Math.max(0, value)) }));
  }

  const priceTotals = useMemo(() => {
    if (prices.size === 0) return [];
    const totals = new Map<string, { symbol: string; gross: number; subtotal: number }>();
    lines.forEach((line, idx) => {
      const p = prices.get(line.option_id);
      if (p?.unit_price == null) return;
      const discount  = lineExtras[idx]?.discount ?? 0;
      const unitPrice = Number(p.unit_price);
      const sub       = unitPrice * (1 - discount / 100);
      const code      = p.currency_code ?? '?';
      const entry     = totals.get(code);
      if (entry) { entry.gross += unitPrice; entry.subtotal += sub; }
      else totals.set(code, { symbol: p.currency_symbol ?? code, gross: unitPrice, subtotal: sub });
    });
    return Array.from(totals.entries()).map(([code, v]) => {
      const lineDiscountAmt  = +(v.gross - v.subtotal).toFixed(2);
      const orderDiscountAmt = +(v.subtotal * orderDiscountPct / 100).toFixed(2);
      return {
        code, symbol: v.symbol,
        gross:         v.gross,
        lineDiscount:  lineDiscountAmt,
        subtotal:      +v.subtotal.toFixed(2),
        orderDiscount: orderDiscountAmt,
        net:           +(v.subtotal - orderDiscountAmt).toFixed(2),
      };
    });
  }, [lines, prices, lineExtras, orderDiscountPct]);

  function buildLinesPayload(): QuotationLinePayload[] {
    const machineLines: QuotationLinePayload[] = lines.map((l, idx) => {
      const p        = prices.get(l.option_id);
      const discount = lineExtras[idx]?.discount ?? 0;
      if (p?.unit_price == null) {
        return { line_type: 'machine', characteristic_id: l.characteristic_id, option_id: l.option_id, quantity: 1 };
      }
      const unit_price      = Number(p.unit_price);
      const discount_amount = +(unit_price * (discount / 100)).toFixed(2);
      const line_total      = +(unit_price - discount_amount).toFixed(2);
      return { line_type: 'machine', characteristic_id: l.characteristic_id, option_id: l.option_id, unit_price, quantity: 1, discount_line: discount, discount_amount, line_total };
    });

    const extraItemLines: QuotationLinePayload[] = itemLines.map((l) => {
      if (l.unit_price == null) {
        return { line_type: 'item', item_id: l.item_id, quantity: l.quantity };
      }
      const discount_amount = +(l.unit_price * l.quantity * (l.discount / 100)).toFixed(2);
      const line_total      = +(l.unit_price * l.quantity - discount_amount).toFixed(2);
      return { line_type: 'item', item_id: l.item_id, unit_price: l.unit_price, quantity: l.quantity, discount_line: l.discount, discount_amount, line_total };
    });

    return [...machineLines, ...extraItemLines];
  }

  function buildTotalsPayload(linesPayload: QuotationLinePayload[]) {
    const lineTotals = linesPayload
      .map((l) => ('line_total' in l ? l.line_total : undefined))
      .filter((v): v is number => v !== undefined);
    if (lineTotals.length === 0) return {};
    const subtotal        = +lineTotals.reduce((s, v) => s + v, 0).toFixed(2);
    const discount_amount = +(subtotal * (orderDiscountPct / 100)).toFixed(2);
    const total           = +(subtotal - discount_amount).toFixed(2);
    return { subtotal, discount_pct: orderDiscountPct, discount_amount, total };
  }

  const canSubmit = isCreate ? (!!customer && !!validUntil && !submitting) : !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true); setError('');
    const linesPayload  = buildLinesPayload();
    const totalsPayload = buildTotalsPayload(linesPayload);
    try {
      if (isCreate) {
        const result = await createQuotation({
          company_id:         props.draft.company_id,
          cardcode:           customer!.CardCode,
          cardname:           customer!.CardName,
          machine_id:         props.draft.machine_id,
          template_id:        props.draft.template_id ?? null,
          valid_until:        validUntil,
          customer_reference: customerReference.trim() || undefined,
          notes:              notes.trim() || undefined,
          lines:              linesPayload,
          ...totalsPayload,
        });
        props.onSuccess(result.id);
      } else {
        const updated = await updateQuotationLines((props.quotation as QuotationApiItem).id, {
          lines: linesPayload,
          ...totalsPayload,
        });
        props.onSaved(updated);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la cotización.');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {isCreate ? (
            <Link href="/sales/configurator">
              <Button variant="ghost" size="sm" className="gap-1.5 mb-1 -ml-2">
                <ArrowLeft size={15} /> Volver al configurador
              </Button>
            </Link>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="gap-1.5 mb-1 -ml-2" onClick={(props as { onCancel: () => void }).onCancel}>
              <ArrowLeft size={15} /> Volver al detalle
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {isCreate ? 'Nueva Cotización' : 'Editar Cotización'}
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          {error && (
            <span className="flex items-center gap-1.5 text-destructive text-sm">
              <AlertCircle size={14} /> {error}
            </span>
          )}
          {isCreate ? (
            <Link href="/sales/configurator">
              <Button variant="secondary">Cancelar</Button>
            </Link>
          ) : (
            <Button variant="secondary" onClick={(props as { onCancel: () => void }).onCancel} disabled={submitting}>
              Cancelar
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
            <Check size={16} />
            {isCreate ? 'Crear Cotización' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Top row: Info · Condiciones · Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Compañía + Socio de Negocio */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Building2 size={13} className="text-primary" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {isCreate ? 'Compañía' : 'Equipo'}
                </span>
              </div>
              {isCreate ? (
                <>
                  <p className="text-sm font-semibold">{props.draft.company_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {props.draft.machine_matnrk} — {props.draft.machine_description}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">{(props.quotation as QuotationApiItem).matnrk}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(props.quotation as QuotationApiItem).machine_description}
                  </p>
                </>
              )}
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <User size={13} className="text-primary" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Socio de Negocio</span>
              </div>
              {isCreate ? (
                <>
                  <SapCustomerCombobox companyId={companyId} value={customer} onChange={setCustomer} />
                  {customer && (
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-secondary/60 text-xs text-muted-foreground">
                      <span>CardCode</span>
                      <span className="font-mono font-medium text-foreground">{customer.CardCode}</span>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-sm font-medium">{(props.quotation as QuotationApiItem).cardname}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{(props.quotation as QuotationApiItem).cardcode}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Condiciones */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Calendar size={13} className="text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Condiciones</span>
            </div>
            <div className="space-y-1">
              <Label htmlFor="validUntil" className="text-[11px]">
                Válida hasta {isCreate && <span className="text-destructive">*</span>}
              </Label>
              <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="customerRef" className="text-[11px]">Ref. cliente</Label>
              <Input id="customerRef" placeholder="OC-4521..." value={customerReference} onChange={(e) => setCustomerReference(e.target.value)} className="h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="priceList" className="flex items-center gap-1 text-[11px]">
                <Tag size={10} className="text-primary" /> Lista de precios
              </Label>
              <div className="relative">
                <select
                  id="priceList"
                  title="Lista de precios"
                  value={selectedPriceListId}
                  onChange={(e) => handlePriceListChange(e.target.value)}
                  disabled={fetchingPrices}
                  className="w-full h-7 px-2 text-xs rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">
                    {!isCreate && prices.size > 0 ? 'Precios actuales' : 'Sin lista de precios'}
                  </option>
                  {priceLists.map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.list_number} — {pl.name}</option>
                  ))}
                </select>
                {fetchingPrices && (
                  <Loader2 size={11} className="animate-spin text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-[11px]">Notas</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Observaciones..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded-md border border-input bg-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Total */}
        <Card className={priceTotals.length > 0 ? 'border-primary/25' : ''}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <Banknote size={13} className="text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total</span>
            </div>
            {hasPriceList && (
              <div className="space-y-1">
                <Label htmlFor="orderDiscount" className="text-[11px]">Descuento general (%)</Label>
                <input
                  id="orderDiscount"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  title="Descuento general"
                  value={orderDiscountPct}
                  onChange={(e) => setOrderDiscountPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-full px-2 py-1 text-xs rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}
            {!hasPriceList ? (
              <p className="text-xs text-muted-foreground italic">Sin lista de precios</p>
            ) : fetchingPrices ? (
              <Loader2 size={16} className="animate-spin text-muted-foreground mt-1" />
            ) : priceTotals.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sin precios disponibles</p>
            ) : (
              <div className="space-y-4 mt-1">
                {priceTotals.map(({ code, symbol, gross, lineDiscount, subtotal, orderDiscount, net }) => (
                  <div key={code} className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{code}</p>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Antes de descuentos</span>
                      <span className="text-sm tabular-nums font-medium">
                        {symbol} {gross.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {lineDiscount > 0 && (
                      <>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-muted-foreground">Desc. por línea</span>
                          <span className="text-sm tabular-nums font-medium text-destructive">
                            − {symbol} {lineDiscount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-muted-foreground">Subtotal</span>
                          <span className="text-sm tabular-nums font-medium">
                            {symbol} {subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    )}
                    {orderDiscount > 0 && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-muted-foreground">Desc. general ({orderDiscountPct}%)</span>
                        <span className="text-sm tabular-nums font-medium text-destructive">
                          − {symbol} {orderDiscount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline border-t border-border pt-1.5">
                      <span className="text-xs font-semibold">Total</span>
                      <span className="text-xl font-bold text-primary tabular-nums leading-tight">
                        {symbol} {net.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Ítems adicionales */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1.5">
              <Boxes size={13} className="text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Ítems adicionales
              </span>
              {itemLines.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
                  {itemLines.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                title="Seleccionar ítem"
                value={addingItemId}
                onChange={(e) => setAddingItemId(e.target.value)}
                disabled={availableItems.length === 0}
                className="h-7 px-2 text-xs rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 max-w-[240px]"
              >
                <option value="">
                  {availableItems.length === 0 ? 'Sin ítems disponibles' : 'Seleccioná un ítem…'}
                </option>
                {availableItems.map((i) => (
                  <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
                ))}
              </select>
              <Button type="button" size="sm" disabled={!addingItemId} onClick={addItemLine}>
                <Plus size={13} /> Agregar
              </Button>
            </div>
          </div>

          {itemLines.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Boxes size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs">Sin ítems adicionales. Usá el selector para agregar.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2">Código</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2">Nombre</th>
                  <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2 w-16">Cant.</th>
                  <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2">Precio unit.</th>
                  <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2 w-28">Desc. %</th>
                  <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2">Subtotal</th>
                  <th className="px-3 py-2"><span className="sr-only">Eliminar</span></th>
                </tr>
              </thead>
              <tbody>
                {itemLines.map((line, idx) => {
                  const sub = line.unit_price != null
                    ? +(line.unit_price * line.quantity * (1 - line.discount / 100)).toFixed(2)
                    : null;
                  return (
                    <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2 text-xs font-mono font-medium text-muted-foreground">{line.item_code}</td>
                      <td className="px-4 py-2 text-sm font-medium">{line.item_name}</td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          title="Cantidad"
                          value={line.quantity}
                          onChange={(e) => setItemQuantity(idx, e.target.value)}
                          className="w-14 h-7 px-2 text-xs text-center rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          title="Precio unitario"
                          placeholder="0.00"
                          value={line.unit_price ?? ''}
                          onChange={(e) => setItemPrice(idx, e.target.value)}
                          className="w-28 h-7 px-2 text-xs text-right rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          title="Descuento %"
                          value={line.discount}
                          onChange={(e) => setItemDiscount(idx, e.target.value)}
                          disabled={line.unit_price == null}
                          className="w-20 h-7 px-2 text-xs text-center rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-35 disabled:cursor-not-allowed tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {sub != null ? (
                          <span className="text-sm font-semibold text-primary tabular-nums">
                            {sub.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          title="Eliminar ítem"
                          onClick={() => removeItemLine(idx)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Tabla líneas de máquina */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">Característica</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">Opción</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">Código</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">Tipo</th>
                {hasPriceList && (
                  <>
                    <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">Precio Unit.</th>
                    <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5 w-28">Desc. %</th>
                    <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-4 py-2.5">Subtotal</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const price    = prices.get(line.option_id);
                const extra    = lineExtras[idx] ?? { discount: 0 };
                const sub      = subtotalOf(line.option_id, idx);
                const hasPrice = hasPriceList && price?.unit_price != null;
                return (
                  <tr key={line.characteristic_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{line.characteristic_name}</td>
                    <td className="px-4 py-2.5 text-sm font-medium">{line.option_description}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{line.mrkwrt}</td>
                    <td className="px-4 py-2.5">
                      {line.required === true && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">Obligatorio</span>
                      )}
                      {line.required === false && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-secondary text-muted-foreground">Opcional</span>
                      )}
                    </td>
                    {hasPriceList && (
                      <>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {fetchingPrices ? (
                            <span className="text-xs text-muted-foreground">…</span>
                          ) : hasPrice ? (
                            <span className="text-xs tabular-nums">
                              {price!.currency_symbol ?? price!.currency_code}{' '}
                              {Number(price!.unit_price).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            title="Descuento %"
                            value={extra.discount}
                            onChange={(e) => setLineDiscount(idx, e.target.value)}
                            disabled={!hasPrice}
                            className="w-20 h-7 px-2 text-xs text-center rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-35 disabled:cursor-not-allowed tabular-nums"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {sub != null ? (
                            <span className="text-sm font-semibold text-primary tabular-nums">
                              {price!.currency_symbol ?? price!.currency_code}{' '}
                              {sub.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  );
}
