'use client';

import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { isAxiosError } from 'axios';
import {
  AlertCircle, Loader2, Plus, Pencil, Trash2, X, Check, Percent,
  Upload, FileSpreadsheet, CheckCircle2, ShieldAlert,
} from 'lucide-react';
import {
  getDiscounts, createDiscount, updateDiscount, deleteDiscount,
  importDiscounts, getComponentCategories,
} from '@/services/discount.service';
import { getMachines, getMachineOptions } from '@/services/equipment.service';
import { DiscountRule, ComponentCategory, ImportDiscountsResult, ImportDiscountsRowError } from '@/types/discount';
import { Machine, Option } from '@/types/equipment';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCompany } from '@/lib/company/CompanyContext';
import { useAuth } from '@/lib/auth/AuthContext';

// SAP convention: merkm '1100' holds the model variant options
const MODEL_VARIANT_MERKM = '1100';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface CreateFormState {
  machine_id: string;
  model_option_id: string;
  component_category_id: string;
  discount_pct: string;
}
const EMPTY_CREATE: CreateFormState = { machine_id: '', model_option_id: '', component_category_id: '', discount_pct: '' };

interface EditFormState { discount_pct: string; active: boolean; }

export default function DiscountsPage() {
  const { companies, isLoading: companiesLoading } = useCompany();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);

  const [rules, setRules]     = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [machines, setMachines]     = useState<Machine[]>([]);
  const [modelOptions, setModelOptions]               = useState<Option[]>([]);
  const [modelOptionsLoading, setModelOptionsLoading] = useState(false);

  const [showCreate, setShowCreate]   = useState(false);
  const [createForm, setCreateForm]   = useState<CreateFormState>(EMPTY_CREATE);
  const [createError, setCreateError] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm]   = useState<EditFormState>({ discount_pct: '', active: true });
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // Import
  const [file, setFile]               = useState<File | null>(null);
  const [sizeError, setSizeError]     = useState('');
  const [uploading, setUploading]     = useState(false);
  const [importError, setImportError] = useState('');
  const [importRowErrors, setImportRowErrors] = useState<ImportDiscountsRowError[]>([]);
  const [importResult, setImportResult]       = useState<ImportDiscountsResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-select first company once the list loads
  useEffect(() => {
    if (!companiesLoading && companies.length > 0 && activeCompanyId === null) {
      setActiveCompanyId(companies[0].id);
    }
  }, [companiesLoading, companies, activeCompanyId]);

  useEffect(() => {
    getComponentCategories().then(setCategories).catch(() => {/* selector queda vacío */});
    getMachines().then(setMachines).catch(() => {/* selector queda vacío */});
  }, []);

  // Load rules whenever the active company changes
  useEffect(() => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError('');
    setShowCreate(false);
    setEditingId(null);
    setConfirmDelete(null);
    getDiscounts(activeCompanyId)
      .then(setRules)
      .catch(() => setError('No se pudieron cargar los descuentos.'))
      .finally(() => setLoading(false));
  }, [activeCompanyId]);

  function openCreate() {
    setCreateForm(EMPTY_CREATE);
    setModelOptions([]);
    setCreateError('');
    setShowCreate(true);
    setEditingId(null);
    setConfirmDelete(null);
  }

  function closeCreate() {
    setShowCreate(false);
    setCreateError('');
  }

  async function handleMachineChange(machineId: string) {
    setCreateForm((f) => ({ ...f, machine_id: machineId, model_option_id: '' }));
    setCreateError('');
    setModelOptions([]);
    if (!machineId) return;
    setModelOptionsLoading(true);
    try {
      const opts = await getMachineOptions(Number(machineId));
      const modelChar = opts.characteristics.find((c) => c.merkm === MODEL_VARIANT_MERKM);
      const options = modelChar
        ? opts.options.filter((o) => Number(o.characteristicId) === Number(modelChar.id))
        : [];
      setModelOptions(options);
    } catch {
      setCreateError('No se pudieron cargar los modelos de este equipo.');
    } finally {
      setModelOptionsLoading(false);
    }
  }

  function setCreateField<K extends keyof CreateFormState>(key: K, value: string) {
    setCreateForm((f) => ({ ...f, [key]: value }));
    setCreateError('');
  }

  async function handleCreateSubmit() {
    if (!activeCompanyId) return;
    if (!createForm.model_option_id) { setCreateError('Seleccioná un modelo.'); return; }
    const pct = Number(createForm.discount_pct);
    if (createForm.discount_pct === '' || isNaN(pct) || pct < 0 || pct > 100) {
      setCreateError('El porcentaje de descuento debe estar entre 0 y 100.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createDiscount({
        company_id: activeCompanyId,
        model_option_id: Number(createForm.model_option_id),
        component_category_id: createForm.component_category_id ? Number(createForm.component_category_id) : null,
        discount_pct: pct,
      });
      setRules((prev) => [created, ...prev]);
      closeCreate();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear la regla de descuento.');
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(rule: DiscountRule) {
    setEditingId(rule.id);
    setEditForm({ discount_pct: rule.discount_pct, active: rule.active });
    setEditError('');
    setShowCreate(false);
    setConfirmDelete(null);
  }

  function closeEdit() {
    setEditingId(null);
    setEditError('');
  }

  async function handleEditSubmit(rule: DiscountRule) {
    if (!activeCompanyId) return;
    const pct = Number(editForm.discount_pct);
    if (editForm.discount_pct === '' || isNaN(pct) || pct < 0 || pct > 100) {
      setEditError('El porcentaje de descuento debe estar entre 0 y 100.');
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await updateDiscount(rule.id, {
        company_id: activeCompanyId,
        discount_pct: pct,
        active: editForm.active,
      });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      closeEdit();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'No se pudo actualizar la regla.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: number) {
    if (!activeCompanyId) return;
    setDeleting(true);
    try {
      await deleteDiscount(id, activeCompanyId);
      setRules((prev) => prev.filter((r) => r.id !== id));
      setConfirmDelete(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la regla.');
    } finally {
      setDeleting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setSizeError(''); setImportError(''); setImportRowErrors([]); setImportResult(null);
    if (selected && selected.size > MAX_SIZE_BYTES) {
      setSizeError('El archivo supera el tamaño máximo de 10 MB.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setFile(selected);
  }

  function clearFile() {
    setFile(null); setSizeError(''); setImportError(''); setImportRowErrors([]); setImportResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleUpload() {
    if (!file || !activeCompanyId) return;
    setUploading(true); setImportError(''); setImportRowErrors([]); setImportResult(null);
    try {
      const data = await importDiscounts(file, activeCompanyId);
      setImportResult(data);
      clearFile();
      getDiscounts(activeCompanyId).then(setRules).catch(() => {});
    } catch (err: unknown) {
      const rows = isAxiosError(err) ? (err.response?.data?.data as ImportDiscountsRowError[] | undefined) : undefined;
      if (Array.isArray(rows) && rows.length > 0) {
        setImportRowErrors(rows);
        setImportError('Se encontraron errores de validación en el archivo.');
      } else {
        setImportError(err instanceof Error ? err.message : 'Error al importar el archivo.');
      }
    } finally {
      setUploading(false);
    }
  }

  const fileSizeLabel = file
    ? file.size >= 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`
    : '';

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Descuentos</h1>
          <p className="text-muted-foreground mt-1">
            Reglas de descuento sugerido por modelo y categoría de componente
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
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nueva regla
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-3 px-4 py-3.5 rounded-lg border border-primary/20 bg-primary/5 text-sm text-muted-foreground">
        <Percent size={16} className="shrink-0 mt-0.5 text-primary" />
        <p>
          Estos descuentos son <span className="font-semibold text-foreground">sugeridos, no forzados</span>:
          al armar una cotización se usan para prellenar el descuento de cada línea, pero el vendedor
          puede pisarlos libremente.
        </p>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base">Nueva regla de descuento</h2>
              <button type="button" title="Cerrar" onClick={closeCreate} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
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
                  onChange={(e) => setCreateField('model_option_id', e.target.value)}
                  disabled={!createForm.machine_id || modelOptionsLoading}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                >
                  <option value="">
                    {modelOptionsLoading ? 'Cargando…' : 'Seleccioná un modelo…'}
                  </option>
                  {modelOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.mrkwrt} — {o.description}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Categoría de componente{' '}
                  <span className="text-muted-foreground/60 normal-case font-normal">(opcional)</span>
                </label>
                <select
                  title="Categoría de componente"
                  value={createForm.component_category_id}
                  onChange={(e) => setCreateField('component_category_id', e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                >
                  <option value="">General (todo el modelo)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Descuento % <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="0 - 100"
                  value={createForm.discount_pct}
                  onChange={(e) => setCreateField('discount_pct', e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {createError && (
              <div className="flex items-center gap-2 mt-4 text-destructive bg-destructive/10 px-3 py-2 rounded-lg text-sm">
                <AlertCircle size={14} /> {createError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={closeCreate} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={handleCreateSubmit} loading={submitting}>
                Crear regla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error general */}
      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      {loading || companiesLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {rules.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Percent size={36} className="mx-auto mb-3 opacity-25" />
                <p className="text-sm">No hay reglas de descuento para esta compañía.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Modelo</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Categoría</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Descuento</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Estado</th>
                    <th className="px-5 py-3"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => {
                    const isEditing    = editingId === rule.id;
                    const isConfirming = confirmDelete === rule.id;
                    return (
                      <tr key={rule.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors align-top">
                        <td className="px-5 py-3.5">
                          <p className="font-medium">{rule.model_description}</p>
                          <p className="text-xs font-mono text-muted-foreground">{rule.model_code}</p>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {rule.component_category_name ?? <span className="italic">General</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              title="Descuento %"
                              value={editForm.discount_pct}
                              onChange={(e) => { setEditForm((f) => ({ ...f, discount_pct: e.target.value })); setEditError(''); }}
                              className="w-24 px-2 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                            />
                          ) : (
                            <span className="font-semibold tabular-nums">{Number(rule.discount_pct)}%</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {isEditing ? (
                            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.active}
                                onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                                className="accent-primary"
                              />
                              Activa
                            </label>
                          ) : (
                            <Badge variant={rule.active ? 'success' : 'default'}>
                              {rule.active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          )}
                          {isEditing && editError && (
                            <p className="flex items-center gap-1 text-xs text-destructive mt-1.5">
                              <AlertCircle size={12} /> {editError}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button variant="secondary" size="sm" onClick={() => handleEditSubmit(rule)} loading={savingEdit}>
                                  <Check size={13} /> Guardar
                                </Button>
                                <Button variant="secondary" size="sm" onClick={closeEdit} disabled={savingEdit}>
                                  No
                                </Button>
                              </>
                            ) : isConfirming ? (
                              <>
                                <span className="text-xs text-muted-foreground mr-1">¿Eliminar?</span>
                                <Button variant="destructive" size="sm" loading={deleting} onClick={() => handleDelete(rule.id)}>
                                  <Check size={13} /> Sí
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                                  No
                                </Button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(rule)}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setConfirmDelete(rule.id); setEditingId(null); }}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Excel — solo admin */}
      {isAdmin && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-base">Importar descuentos vía Excel</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Columnas: <code className="font-mono text-xs bg-secondary px-1 rounded">MODEL_CODE</code>,{' '}
                <code className="font-mono text-xs bg-secondary px-1 rounded">COMPONENT_CATEGORY</code> (opcional),{' '}
                <code className="font-mono text-xs bg-secondary px-1 rounded">DISCOUNT_PCT</code>.
                Reimportar el mismo archivo actualiza los valores existentes.
              </p>
            </div>

            {file ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/40 bg-primary/5">
                <FileSpreadsheet size={20} className="text-primary shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{fileSizeLabel}</span>
                <button onClick={clearFile} title="Quitar archivo" className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="discount-file-upload"
                className="flex flex-col items-center gap-2 px-6 py-10 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <Upload size={28} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Hacé click para seleccionar un archivo</span>
                <span className="text-xs text-muted-foreground/60">.xlsx · .xls · máx. 10 MB</span>
              </label>
            )}
            <input
              id="discount-file-upload"
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="sr-only"
            />

            {sizeError && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2.5 rounded-lg text-sm">
                <AlertCircle size={14} className="shrink-0" /> {sizeError}
              </div>
            )}
            {importError && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2.5 rounded-lg text-sm">
                  <AlertCircle size={14} className="shrink-0" /> {importError}
                </div>
                {importRowErrors.length > 0 && (
                  <div className="rounded-lg border border-destructive/20 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-destructive/5 border-b border-destructive/20">
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Fila</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Campo</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRowErrors.map((e, i) => (
                          <tr key={i} className="border-b border-destructive/10 last:border-0">
                            <td className="px-3 py-1.5 font-mono">{e.row}</td>
                            <td className="px-3 py-1.5 font-mono">{e.field}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleUpload} loading={uploading} disabled={!file || !activeCompanyId || uploading}>
                <Upload size={15} />
                Importar
              </Button>
            </div>

            {importResult && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-2.5 rounded-lg text-sm">
                <CheckCircle2 size={16} className="shrink-0" />
                {importResult.upserted} regla(s) actualizadas · {importResult.duration_ms} ms
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isAdmin && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/40 text-muted-foreground text-sm">
          <ShieldAlert size={16} className="shrink-0" />
          Solo los administradores pueden importar descuentos vía Excel.
        </div>
      )}
    </div>
  );
}
