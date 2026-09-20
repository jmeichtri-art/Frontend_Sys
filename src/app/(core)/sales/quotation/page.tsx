'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { getQuotations } from '@/services/quotation.service';
import { QuotationApiItem } from '@/types/quotation';
import { useCompany } from '@/lib/company/CompanyContext';
import { CompanySelector } from '@/components/ui/CompanySelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, QUOTATION_STATUS_VARIANT_MAP, QUOTATION_STATUS_LABEL_MAP } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS = ['Todas', 'draft', 'sent', 'approved', 'rejected'] as const;

export default function CotizacionPage() {
  const { selectedCompany } = useCompany();

  const [quotations, setQuotations] = useState<QuotationApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todas');

  useEffect(() => {
    if (!selectedCompany) {
      setQuotations([]);
      return;
    }
    setLoading(true);
    setFetchError('');
    getQuotations(selectedCompany.id)
      .then(setQuotations)
      .catch(() => setFetchError('No se pudieron cargar las cotizaciones.'))
      .finally(() => setLoading(false));
  }, [selectedCompany]);

  const filtered = quotations.filter((q) => {
    const term = search.toLowerCase();
    const matchSearch =
      q.cardname.toLowerCase().includes(term) ||
      q.cardcode.toLowerCase().includes(term) ||
      q.machine_description.toLowerCase().includes(term) ||
      q.matnrk.toLowerCase().includes(term) ||
      String(q.docnum ?? '').includes(term);
    const matchStatus = statusFilter === 'Todas' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cotizaciones</h1>
          <p className="text-muted-foreground mt-1">
            {selectedCompany
              ? `${quotations.length} cotización${quotations.length !== 1 ? 'es' : ''} para ${selectedCompany.name}`
              : 'Seleccioná una compañía para ver las cotizaciones'}
          </p>
        </div>
        <Link href="/sales/configurator">
          <Button>
            <Plus size={16} />
            Nueva cotización
          </Button>
        </Link>
      </div>

      {/* Company selector */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 size={15} className="text-primary" />
          </div>
          <div className="flex-1 max-w-xs">
            <CompanySelector label="Compañía" />
          </div>
        </CardContent>
      </Card>

      {/* Filters — only when company selected */}
      {selectedCompany && (
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Buscar por N° SAP, cliente, código, equipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'Todas' ? 'Todas' : QUOTATION_STATUS_LABEL_MAP[s]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!selectedCompany ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Building2 size={40} className="opacity-25" />
          <p className="text-sm">Seleccioná una compañía para ver las cotizaciones</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : fetchError ? (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={16} /> {fetchError}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Listado de cotizaciones</CardTitle>
            <CardDescription>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">#</th>
                    <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">N° SAP</th>
                    <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Equipo</th>
                    <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
                    <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Válida hasta</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No se encontraron cotizaciones
                      </td>
                    </tr>
                  ) : (
                    filtered.map((q) => (
                      <tr key={q.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-xs text-muted-foreground">{q.id}</td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {q.docnum != null
                            ? <span className="font-semibold">{q.docnum}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{q.cardname}</p>
                            <p className="text-xs text-muted-foreground font-mono">{q.cardcode}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div>
                            <p className="font-medium">{q.matnrk}</p>
                            <p className="text-xs text-muted-foreground">{q.machine_description}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={QUOTATION_STATUS_VARIANT_MAP[q.status]} dot>
                            {QUOTATION_STATUS_LABEL_MAP[q.status]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell">
                          {formatDate(q.valid_until)}
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/sales/quotation/${q.id}`}>
                            <Button variant="ghost" size="sm">Ver</Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
