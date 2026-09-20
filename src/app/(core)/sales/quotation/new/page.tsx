'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { QuotationDraft } from '@/types/quotation';
import { QuotationForm } from '@/components/quotation/QuotationForm';
import { QUOTATION_DRAFT_KEY as DRAFT_KEY } from '@/lib/quotation/draft-storage';

export default function NewQuotationPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<QuotationDraft | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) { router.replace('/sales/configurator'); return; }
    try {
      setDraft(JSON.parse(raw) as QuotationDraft);
    } catch { router.replace('/sales/configurator'); }
  }, [router]);

  if (!draft) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <QuotationForm
      mode="create"
      draft={draft}
      onSuccess={(id) => {
        sessionStorage.removeItem(DRAFT_KEY);
        router.push(`/sales/quotation/${id}`);
      }}
    />
  );
}
