'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Calendar, Forklift, AlertCircle, Loader2, FileText, Pencil, Send, Trash2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Badge,
  QUOTATION_STATUS_VARIANT_MAP,
  QUOTATION_STATUS_LABEL_MAP,
  SYNC_STATUS_VARIANT_MAP,
  SYNC_STATUS_LABEL_MAP,
} from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { getQuotationById, deleteQuotation, syncQuotationToSap } from '@/services/quotation.service';
import { QuotationApiItem } from '@/types/quotation';
import { QuotationForm } from '@/components/quotation/QuotationForm';
import { useAuth } from '@/lib/auth/AuthContext';

export default function CotizacionDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { user } = useAuth();
  const canSend = user?.role === 'admin' || user?.role === 'sales';
  const isAdmin = user?.role === 'admin';

  const [quotation, setQuotation] = useState<QuotationApiItem | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [editMode,  setEditMode]  = useState(false);

  const [syncing,   setSyncing]   = useState(false);
  const [syncError, setSyncError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState('');

  useEffect(() => {
    const numId = Number(id);
    if (isNaN(numId)) { setError('ID de cotización inválido.'); setLoading(false); return; }
    getQuotationById(numId)
      .then(setQuotation)
      .catch((err) => setError(err.message ?? 'No se pudo cargar la cotización.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSync() {
    if (!quotation) return;
    setSyncing(true);
    setSyncError('');
    try {
      await syncQuotationToSap(quotation.id);
      const updated = await getQuotationById(quotation.id);
      setQuotation(updated);
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'No se pudo sincronizar la cotización con SAP.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!quotation) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteQuotation(quotation.id);
      router.push('/sales/quotation');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar la cotización.');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <AlertCircle size={48} className="text-muted-foreground" />
        <h2 className="text-xl font-semibold">{error || 'Cotización no encontrada'}</h2>
        <Link href="/sales/quotation">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </div>
    );
  }

  if (editMode) {
    return (
      <QuotationForm
        mode="edit"
        quotation={quotation}
        onSaved={(updated) => { setQuotation(updated); setEditMode(false); }}
        onCancel={() => setEditMode(false)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link href="/sales/quotation">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft size={15} /> Volver
        </Button>
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-mono text-muted-foreground text-sm">#{quotation.id}</span>
                <Badge variant={QUOTATION_STATUS_VARIANT_MAP[quotation.status]} dot>
                  {QUOTATION_STATUS_LABEL_MAP[quotation.status]}
                </Badge>
                <Badge variant={SYNC_STATUS_VARIANT_MAP[quotation.sync_status]} dot>
                  {SYNC_STATUS_LABEL_MAP[quotation.sync_status]}
                </Badge>
                {quotation.sync_status === 'synced' && quotation.docentry && (
                  <span className="text-xs text-muted-foreground">SAP #{quotation.docentry}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{quotation.cardname}</h1>
              <p className="text-muted-foreground font-mono text-sm">{quotation.cardcode}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground mb-1">Equipo</p>
              <p className="font-bold text-lg">{quotation.matnrk}</p>
              <p className="text-xs text-muted-foreground">{quotation.machine_description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Socio de Negocio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User size={16} className="text-primary" /> Socio de Negocio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pt-0">
            <InfoRow label="Nombre"    value={quotation.cardname} />
            <InfoRow label="CardCode"  value={quotation.cardcode} mono />
            {quotation.customer_reference && (
              <InfoRow label="Referencia" value={quotation.customer_reference} />
            )}
          </CardContent>
        </Card>

        {/* Fechas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar size={16} className="text-primary" /> Fechas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pt-0">
            <InfoRow label="Creación"      value={formatDate(quotation.created_at)} />
            <InfoRow label="Actualización" value={formatDate(quotation.updated_at)} />
            <InfoRow label="Válida hasta"  value={formatDate(quotation.valid_until)} />
          </CardContent>
        </Card>

        {/* Configuración del equipo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Forklift size={16} className="text-primary" /> Configuración del equipo
              </CardTitle>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                title="Editar cotización"
                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Pencil size={15} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Forklift size={22} className="text-primary" />
              </div>
              <div>
                <p className="font-bold">{quotation.matnrk}</p>
                <p className="text-sm text-muted-foreground">{quotation.machine_description}</p>
              </div>
            </div>
            {quotation.lines && quotation.lines.length > 0 && (
              <div className="space-y-0">
                {quotation.lines.map((line, idx) =>
                  (line.line_type ?? 'machine') === 'machine' ? (
                    <div
                      key={`m-${line.characteristic_id ?? idx}`}
                      className="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-4"
                    >
                      <span className="text-xs text-muted-foreground shrink-0 pt-0.5 w-44">{line.characteristic_name}</span>
                      <div className="flex-1 text-right">
                        <p className="text-sm font-medium">{line.option_description}</p>
                        <p className="text-xs text-muted-foreground/60 font-mono">{line.mrkwrt}</p>
                      </div>
                      {line.unit_price != null && (
                        <p className="text-sm font-semibold shrink-0 text-right">
                          {line.currency_symbol} {line.unit_price.toLocaleString('es-AR')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div
                      key={`i-${line.item_id ?? idx}`}
                      className="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-4"
                    >
                      <span className="text-xs font-mono text-muted-foreground shrink-0 pt-0.5 w-44">{line.item_code}</span>
                      <div className="flex-1 text-right">
                        <p className="text-sm font-medium">{line.item_name}</p>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Ítem adicional</p>
                      </div>
                      {line.unit_price != null && (
                        <p className="text-sm font-semibold shrink-0 text-right">
                          {line.unit_price.toLocaleString('es-AR')}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notas */}
        {quotation.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText size={16} className="text-primary" /> Notas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{quotation.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {syncError && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2 rounded-lg text-sm">
          <AlertCircle size={14} /> {syncError}
        </div>
      )}
      {deleteError && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2 rounded-lg text-sm">
          <AlertCircle size={14} /> {deleteError}
        </div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        {isAdmin && !confirmDelete && (
          <Button variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} /> Eliminar
          </Button>
        )}
        {confirmDelete && (
          <>
            <span className="text-xs text-muted-foreground self-center mr-1">¿Eliminar cotización?</span>
            <Button variant="destructive" loading={deleting} onClick={handleDelete}>
              <Check size={15} /> Sí, eliminar
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              No
            </Button>
          </>
        )}
        {!confirmDelete && <Button variant="secondary">Exportar PDF</Button>}
        {!confirmDelete && <Button variant="outline">Duplicar</Button>}
        {canSend && quotation.sync_status !== 'synced' && !confirmDelete && (
          <Button onClick={handleSync} loading={syncing}>
            <Send size={15} />
            {quotation.sync_status === 'error' ? 'Reintentar sincronización' : 'Enviar cotización'}
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
