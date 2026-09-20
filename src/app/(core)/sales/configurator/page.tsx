'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { ConfiguratorWizard } from '@/components/configurator/ConfiguratorWizard';
import { getQuotationById } from '@/services/quotation.service';
import { QuotationApiItem, QuotationDraft } from '@/types/quotation';
import {
  QUOTATION_DRAFT_KEY,
  RECONFIGURE_KEY,
  ReconfigureDraft,
} from '@/lib/quotation/draft-storage';

function ConfiguratorScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reconfigureId = Number(searchParams.get('reconfigure')) || null;
  const resumeDraft   = searchParams.get('draft') === '1';

  const [quotation, setQuotation] = useState<QuotationApiItem | null>(null);
  const [loading, setLoading]     = useState(!!reconfigureId);
  const [error, setError]         = useState('');

  // Volver al asistente desde una cotización que todavía no se creó: el draft sigue en
  // sessionStorage, así que se reusa para precargar en vez de arrancar de cero.
  const [pendingDraft] = useState<QuotationDraft | null>(() => {
    if (typeof window === 'undefined' || !resumeDraft) return null;
    const raw = sessionStorage.getItem(QUOTATION_DRAFT_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as QuotationDraft; } catch { return null; }
  });

  useEffect(() => {
    if (!reconfigureId) return;
    setLoading(true);
    getQuotationById(reconfigureId)
      .then(setQuotation)
      .catch(() => setError('No se pudo cargar la cotización a reconfigurar.'))
      .finally(() => setLoading(false));
  }, [reconfigureId]);

  function handleNewQuotation(draft: QuotationDraft) {
    sessionStorage.setItem(QUOTATION_DRAFT_KEY, JSON.stringify(draft));
    router.push('/sales/quotation/new');
  }

  // Al reconfigurar no se crea nada: se deja la configuración nueva para que la
  // cotización existente la levante en modo edición y el usuario revise precios.
  function handleReconfigured(draft: QuotationDraft) {
    if (!reconfigureId) return;
    const payload: ReconfigureDraft = { quotation_id: reconfigureId, lines: draft.lines };
    sessionStorage.setItem(RECONFIGURE_KEY, JSON.stringify(payload));
    router.push(`/sales/quotation/${reconfigureId}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <AlertCircle size={40} />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (reconfigureId && quotation) {
    const currentOptionIds = (quotation.lines ?? [])
      .filter((l) => (l.line_type ?? 'machine') === 'machine' && l.option_id != null)
      .map((l) => l.option_id as number);

    return (
      <ConfiguratorWizard
        initialMachineId={quotation.machine_id}
        initialOptionIds={currentOptionIds}
        submitLabel="Actualizar configuración"
        showTemplateActions={false}
        showCompanySelector={false}
        onSubmit={handleReconfigured}
      />
    );
  }

  if (pendingDraft) {
    return (
      <ConfiguratorWizard
        initialMachineId={pendingDraft.machine_id}
        initialOptionIds={pendingDraft.lines.map((l) => l.option_id)}
        submitLabel="Volver a la cotización"
        onSubmit={handleNewQuotation}
      />
    );
  }

  return <ConfiguratorWizard onSubmit={handleNewQuotation} />;
}

export default function ConfiguratorPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>}>
      <ConfiguratorScreen />
    </Suspense>
  );
}
