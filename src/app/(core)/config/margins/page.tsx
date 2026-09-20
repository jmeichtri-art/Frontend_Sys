'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Plus, Pencil, Trash2, X, Check, TrendingUp, ShieldAlert } from 'lucide-react';
import { getMargins, createMargin, updateMargin, deleteMargin } from '@/services/margin.service';
import { getMachines, getMachineOptions } from '@/services/equipment.service';
import { ProfitMargin } from '@/types/margin';
import { Machine, Option } from '@/types/equipment';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCompany } from '@/lib/company/CompanyContext';
import { useAuth } from '@/lib/auth/AuthContext';

// SAP convention: merkm '1100' holds the model variant options
const MODEL_VARIANT_MERKM = '1100';

interface CreateFormState {
  machine_id: string;
  model_option_id: string;
  margin_pct: string;
}
const EMPTY_CREATE: CreateFormState = { machine_id: '', model_option_id: '', margin_pct: '' };

/** precio_final = precio_base / (1 - margen/100) — mismo cálculo que hace el backend */
function previewPrice(marginPct: number, base = 10000): string {
  if (marginPct < 0 || marginPct >= 100) return '—';
  return (Math.round((base / (1 - marginPct / 100)) * 100) / 100)
    .toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MarginsPage() {
  const { companies, isLoading: companiesLoading } = useCompany();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);

  const [margins, setMargins] = useState<ProfitMargin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [machines, setMachines] = useState<Machine[]>([]);
  const [modelOptions, setModelOptions]               = useState<Option[]>([]);
  const [modelOptionsLoading, setModelOptionsLoading] = useState(false);

  const [showCreate, setShowCreate]   = useState(false);
  const [createForm, setCreateForm]   = useState<CreateFormState>(EMPTY_CREATE);
  const [createError, setCreateError] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const [editingId, setEditingId]   = useState<number | null>(null);
  const [editForm, setEditForm]     = useState({ margin_pct: '', active: true });
  const [editError, setEditError]   = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => {
    if (!companiesLoading && companies.length > 0 && activeCompanyId === null) {
      setActiveCompanyId(companies[0].id);
    }
  }, [companiesLoading, companies, activeCompanyId]);

  useEffect(() => {
    if (!isAdmin) return;
    getMachines().then(setMachines).catch(() => {/* el selector queda vacío */});
  }, [isAdmin]);

  useEffect(() => {
    if (!activeCompanyId || !isAdmin) return;
    setLoading(true);
    setError('');
    setShowCreate(false);
    setEditingId(null);
    setConfirmDelete(null);
    getMargins(activeCompanyId)
      .then(setMargins)
      .catch(() => setError('No se pudieron cargar los márgenes.'))
      .finally(() => setLoading(false));
  }, [activeCompanyId, isAdmin]);

  async function handleMachineChange(machineId: string) {
    setCreateForm((f) => ({ ...f, machine_id: machineId, model_option_id: '' }));
    setCreateError('');
    setModelOptions([]);
    if (!machineId) return;
    setModelOptionsLoading(true);
    try {
      const opts = await getMachineOptions(Number(machineId));
      const modelChar = opts.characteristics.find((c) => c.merkm === MODEL_VARIANT_MERKM);
      setModelOptions(modelChar ? opts.options.filter((o) => Number(o.characteristicId) === Number(modelChar.id)) : []);
    } catch {
      setCreateError('No se pudieron cargar los modelos de este equipo.');
    } finally {
      setModelOptionsLoading(false);
    }
  }

  async function handleCreate() {
    if (!activeCompanyId) return;
    if (!createForm.model_option_id) { setCreateError('Seleccioná un modelo.'); return; }
    const pct = Number(createForm.margin_pct);
    if (createForm.margin_pct === '' || isNaN(pct) || pct < 0 || pct >= 100) {
      setCreateError('El margen debe ser un número entre 0 y 99,99.');
      return;
    }

    setSubmitting(true); setCreateError('');
    try {
      await createMargin({
        company_id: activeCompanyId,
        model_option_id: Number(createForm.model_option_id),
        margin_pct: pct,
      });
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      setMargins(await getMargins(activeCompanyId));
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear el margen.');
    } finally { setSubmitting(false); }
  }

  function openEdit(margin: ProfitMargin) {
    setEditingId(margin.id);
    setEditForm({ margin_pct: String(margin.margin_pct), active: margin.active });
    setEditError('');
    setShowCreate(false);
    setConfirmDelete(null);
  }

  async function handleSaveEdit(id: number) {
    if (!activeCompanyId) return;
    const pct = Number(editForm.margin_pct);
    if (editForm.margin_pct === '' || isNaN(pct) || pct < 0 || pct >= 100) {
      setEditError('El margen debe ser un número entre 0 y 99,99.');
      return;
    }

    setSavingEdit(true); setEditError('');
    try {
      await updateMargin(id, activeCompanyId, { margin_pct: pct, active: editForm.active });
      setEditingId(null);
      setMargins(await getMargins(activeCompanyId));
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'No se pudo guardar el margen.');
    } finally { setSavingEdit(false); }
  }

  async function handleDelete(id: number) {
    if (!activeCompanyId) return;
    setDeleting(true);
    try {
      await deleteMargin(id, activeCompanyId);
      setConfirmDelete(null);
      setMargins(await getMargins(activeCompanyId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el margen.');
    } finally { setDeleting(false); }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/40 text-muted-foreground text-sm">
          <ShieldAlert size={16} className="shrink-0" />
          Los márgenes de ganancia solo pueden verse y modificarse con un usuario administrador.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Margen de ganancia</h1>
          <p className="text-muted-foreground mt-1">
            Margen por modelo de equipo, aplicado a los precios de lista
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            title="Compañía"
            value={activeCompanyId ?? ''}
            onChange={(e) => setActiveCompanyId(Number(e.target.value))}
            disabled={companiesLoading || companies.length === 0}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
          >
            {companiesLoading && <option value="">Cargando…</option>}
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!showCreate && activeCompanyId && (
            <Button onClick={() => { setCreateForm(EMPTY_CREATE); setModelOptions([]); setCreateError(''); setShowCreate(true); setEditingId(null); }}>
              <Plus size={16} />
              Nuevo margen
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-3 px-4 py-3.5 rounded-lg border border-primary/20 bg-primary/5 text-sm text-muted-foreground">
        <TrendingUp size={16} className="shrink-0 mt-0.5 text-primary" />
        <p>
          Los precios de lista se muestran <span className="font-semibold text-foreground">ya con el margen aplicado</span>{' '}
          (<span className="font-mono text-xs">precio / (1 − margen)</span>). El vendedor nunca ve el margen ni el precio
          base: el cálculo se hace en el servidor. Los ítems adicionales con precio cargado a mano no llevan margen.
        </p>
      </div>

      {/* Create */}
      {showCreate && (
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base">Nuevo margen</h2>
              <button type="button" title="Cerrar" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Equipo <span className="text-destructive">*</span>
                </label>
                <select
                  title="Equipo"
                  value={createForm.machine_id}
                  onChange={(e) => handleMachineChange(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                >
                  <option value="">Seleccioná un equipo…</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>{m.matnrk} — {m.description}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Modelo <span className="text-destructive">*</span>
                </label>
                <select
                  title="Modelo"
                  value={createForm.model_option_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, model_option_id: e.target.value }))}
                  disabled={!createForm.machine_id || modelOptionsLoading}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                >
                  <option value="">{modelOptionsLoading ? 'Cargando…' : 'Seleccioná un modelo…'}</option>
                  {modelOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.mrkwrt} — {o.description}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Margen % <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={99.99}
                  step={0.01}
                  title="Margen"
                  placeholder="5"
                  value={createForm.margin_pct}
                  onChange={(e) => setCreateForm((f) => ({ ...f, margin_pct: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all tabular-nums"
                />
                {createForm.margin_pct !== '' && !isNaN(Number(createForm.margin_pct)) && (
                  <p className="text-[11px] text-muted-foreground">
                    Un precio de 10.000 se cotiza {previewPrice(Number(createForm.margin_pct))}
                  </p>
                )}
              </div>
            </div>

            {createError && (
              <p className="flex items-center gap-1.5 text-destructive text-sm mt-4">
                <AlertCircle size={14} /> {createError}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleCreate} loading={submitting}>
                <Check size={16} /> Crear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Listado */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 justify-center py-16 text-destructive text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          ) : margins.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <TrendingUp size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Sin márgenes cargados para esta compañía.</p>
              <p className="text-xs mt-1">Los precios se cotizan tal como están en la lista.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Equipo</th>
                  <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Modelo</th>
                  <th className="text-right px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Margen</th>
                  <th className="text-right px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">10.000 se cotiza</th>
                  <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {margins.map((m) => (
                  <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{m.machine_matnrk ?? '—'}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{m.model_code}</p>
                      <p className="text-xs text-muted-foreground">{m.model_description}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === m.id ? (
                        <input
                          type="number"
                          min={0}
                          max={99.99}
                          step={0.01}
                          title="Margen"
                          value={editForm.margin_pct}
                          onChange={(e) => setEditForm((f) => ({ ...f, margin_pct: e.target.value }))}
                          className="w-24 px-2 py-1 text-sm text-right rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 tabular-nums"
                        />
                      ) : (
                        <span className="font-semibold tabular-nums">{Number(m.margin_pct).toFixed(2)}%</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                      {previewPrice(Number(m.margin_pct))}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === m.id ? (
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={editForm.active}
                            onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                          />
                          Activo
                        </label>
                      ) : (
                        <Badge variant={m.active ? 'success' : 'outline'} dot>
                          {m.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === m.id ? (
                        <div className="flex items-center justify-end gap-2">
                          {editError && <span className="text-destructive text-xs">{editError}</span>}
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} disabled={savingEdit}>Cancelar</Button>
                          <Button size="sm" onClick={() => handleSaveEdit(m.id)} loading={savingEdit}>Guardar</Button>
                        </div>
                      ) : confirmDelete === m.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">¿Eliminar?</span>
                          <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>No</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(m.id)} loading={deleting}>Sí</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" title="Editar" onClick={() => openEdit(m)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button type="button" title="Eliminar" onClick={() => setConfirmDelete(m.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
