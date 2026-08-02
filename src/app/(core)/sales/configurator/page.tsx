'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Forklift, Settings, Package, ArrowRight, ArrowLeft, Search, X, Loader2, AlertCircle, BookMarked } from 'lucide-react';
import { getMachines, getMachineOptions } from '@/services/equipment.service';
import { createTemplate } from '@/services/template.service';
import { Machine, Option, MachineOptions, Characteristic } from '@/types/equipment';
import { QuotationDraft } from '@/types/quotation';
import { useCompany } from '@/lib/company/CompanyContext';
import { CompanySelector } from '@/components/ui/CompanySelector';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

// SAP convention: merkm '1100' holds the model variant options
const MODEL_VARIANT_KEY = '1100';

const STEPS = [
  { id: 1, label: 'Equipo',      icon: <Forklift size={16} /> },
  { id: 2, label: 'Obligatorio', icon: <Settings size={16} /> },
  { id: 3, label: 'Opcionales',  icon: <Package  size={16} /> },
  { id: 4, label: 'Resumen',     icon: <Check    size={16} /> },
];

interface CharacteristicGroup {
  char: Characteristic;
  options: Option[];
}

export default function ConfiguratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // Template saving
  const [templateName, setTemplateName] = useState('');
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    if (!selectedMachine || !user?.company_id) {
      setTemplateError('No se pudo determinar la compañía del usuario.');
      return;
    }
    const lines = Object.entries(selectedOptions).map(([charId, opt]) => ({
      characteristic_id: Number(charId),
      option_id: opt.id,
    }));
    if (lines.length === 0) {
      setTemplateError('El template debe tener al menos una línea.');
      return;
    }
    setSavingTemplate(true);
    setTemplateError('');
    try {
      await createTemplate({
        company_id: user.company_id,
        machine_id: selectedMachine.id,
        name: templateName.trim(),
        lines,
      });
      setTemplateSaved(true);
      setShowTemplateInput(false);
      setTemplateName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar el template.';
      setTemplateError(msg);
    } finally {
      setSavingTemplate(false);
    }
  };

  const { selectedCompany } = useCompany();

  const handleGenerateQuotation = () => {
    if (!selectedMachine || !selectedCompany) return;

    const lines: QuotationDraft['lines'] = [];

    if (modelVariantChar && selectedOptions[modelVariantChar.id]) {
      const opt = selectedOptions[modelVariantChar.id];
      lines.push({
        characteristic_id: modelVariantChar.id,
        characteristic_name: modelVariantChar.name,
        merkm: modelVariantChar.merkm,
        option_id: opt.id,
        option_description: opt.description,
        mrkwrt: opt.mrkwrt,
        required: true,
      });
    }

    for (const group of characteristicData.mandatory) {
      const opt = selectedOptions[group.char.id];
      if (!opt) continue;
      lines.push({
        characteristic_id: group.char.id,
        characteristic_name: group.char.name,
        merkm: group.char.merkm,
        option_id: opt.id,
        option_description: opt.description,
        mrkwrt: opt.mrkwrt,
        required: true,
        component_category_id: group.char.componentCategoryId ?? null,
      });
    }

    for (const group of characteristicData.optional) {
      const opt = selectedOptions[group.char.id];
      if (!opt) continue;
      lines.push({
        characteristic_id: group.char.id,
        characteristic_name: group.char.name,
        merkm: group.char.merkm,
        option_id: opt.id,
        option_description: opt.description,
        mrkwrt: opt.mrkwrt,
        required: false,
        component_category_id: group.char.componentCategoryId ?? null,
      });
    }

    const draft: QuotationDraft = {
      company_id: selectedCompany.id,
      company_name: selectedCompany.name,
      machine_id: selectedMachine.id,
      machine_matnrk: selectedMachine.matnrk,
      machine_description: selectedMachine.description,
      lines,
    };

    sessionStorage.setItem('hecato_quotation_draft', JSON.stringify(draft));
    router.push('/sales/quotation/new');
  };

  // Step 1
  const [machines, setMachines]               = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [machinesError, setMachinesError]     = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [machineSearch, setMachineSearch]     = useState('');

  // Options
  const [machineOptions, setMachineOptions] = useState<MachineOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError]     = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<number, Option>>({}); // characteristicId → Option
  const [optionSearch, setOptionSearch] = useState('');

  useEffect(() => { setOptionSearch(''); }, [step]);

  useEffect(() => {
    getMachines()
      .then(setMachines)
      .catch(() => setMachinesError('No se pudieron cargar los equipos. Verificá la conexión.'))
      .finally(() => setMachinesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedMachine) return;
    setOptionsLoading(true);
    setOptionsError('');
    setMachineOptions(null);
    setSelectedOptions({});
    getMachineOptions(selectedMachine.id)
      .then(setMachineOptions)
      .catch(() => setOptionsError('No se pudieron cargar las opciones de este equipo.'))
      .finally(() => setOptionsLoading(false));
  }, [selectedMachine]);

  // The model-variant characteristic (merkm === '1100')
  const modelVariantChar = useMemo(
    () => machineOptions?.characteristics.find((c) => c.merkm === MODEL_VARIANT_KEY) ?? null,
    [machineOptions],
  );

  const selectedModelVariantId: number | null = modelVariantChar
    ? (selectedOptions[modelVariantChar.id]?.id ?? null)
    : null;

  // All options for the model-variant characteristic (not filtered by compatibility)
  const modelVariantOptions = useMemo(() => {
    if (!modelVariantChar || !machineOptions) return [];
    return machineOptions.options.filter(
      (o) => Number(o.characteristicId) === Number(modelVariantChar.id),
    );
  }, [modelVariantChar, machineOptions]);

  // Split remaining characteristics into mandatory (level=1) and optional (level=2/3/4)
  // level=0 → excluded; options not in the compatibility matrix → excluded
  const characteristicData = useMemo((): { mandatory: CharacteristicGroup[]; optional: CharacteristicGroup[] } => {
    if (!machineOptions || !selectedModelVariantId) return { mandatory: [], optional: [] };

    const mandatory: CharacteristicGroup[] = [];
    const optional:  CharacteristicGroup[] = [];

    for (const char of machineOptions.characteristics) {
      if (char.merkm === MODEL_VARIANT_KEY) continue;

      const compatibleOptions = machineOptions.options
        .filter((o) => Number(o.characteristicId) === Number(char.id))
        .flatMap((o) => {
          const entry = machineOptions.compatibility.find(
            (c) => Number(c.optionId) === Number(o.id) && Number(c.modelId) === Number(selectedModelVariantId),
          );
          // level=0 or not present → incompatible → exclude
          return entry && entry.level !== 0 ? [{ option: o, level: entry.level }] : [];
        });

      if (compatibleOptions.length === 0) continue;

      const group: CharacteristicGroup = { char, options: compatibleOptions.map((c) => c.option) };

      if (compatibleOptions.some((c) => c.level === 1)) {
        mandatory.push(group);
      } else {
        optional.push(group);
      }
    }

    return { mandatory, optional };
  }, [machineOptions, selectedModelVariantId]);

  // Filter characteristic groups by search query (matches char name, option description, mrkwrt or comments)
  const filterGroups = (groups: CharacteristicGroup[]): CharacteristicGroup[] => {
    const q = optionSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            o.description.toLowerCase().includes(q) ||
            o.mrkwrt.toLowerCase().includes(q) ||
            (o.comments?.toLowerCase().includes(q) ?? false),
        ),
      }))
      .filter((g) => g.options.length > 0 || g.char.name.toLowerCase().includes(q));
  };

  const filteredMachines = useMemo(() => {
    const q = machineSearch.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter(
      (m) =>
        m.matnrk.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.matnr.toLowerCase().includes(q),
    );
  }, [machines, machineSearch]);

  const canNext =
    (step === 1 && !!selectedMachine && (modelVariantChar ? !!selectedModelVariantId : true)) ||
    (step === 2 && characteristicData.mandatory.every((g) => !!selectedOptions[g.char.id])) ||
    step === 3;

  const selectOption = (characteristicId: number, option: Option) => {
    setSelectedOptions((prev) => {
      const next = { ...prev, [characteristicId]: option };
      // When the model variant changes, wipe all other selections (compatibility changes)
      if (characteristicId === modelVariantChar?.id && option.id !== prev[characteristicId]?.id) {
        for (const key of Object.keys(next)) {
          if (Number(key) !== characteristicId) delete next[Number(key)];
        }
      }
      return next;
    });
  };

  // ── Shared: renders a list of characteristic groups with their options ──
  const renderGroups = (groups: CharacteristicGroup[]) =>
    groups.map(({ char, options }) => (
      <div key={char.id}>
        <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-3">{char.name}</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {options.map((opt) => {
            const selected = selectedOptions[char.id]?.id === opt.id;
            return (
              <Card
                key={opt.id}
                onClick={() => selectOption(char.id, opt)}
                className={cn(
                  'cursor-pointer transition-all duration-150 hover:shadow-sm',
                  selected ? 'border-primary ring-2 ring-primary/15' : 'border-border',
                )}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                    selected ? 'border-primary bg-primary' : 'border-border bg-background',
                  )}>
                    {selected && <Check size={11} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{opt.description}</p>
                    <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">{opt.mrkwrt}</p>
                    {opt.comments && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{opt.comments}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    ));

  // ── Shared: renders a summary table of characteristic → selected option ──
  const renderSummaryRows = (groups: CharacteristicGroup[]) =>
    groups.map(({ char }) => {
      const opt = selectedOptions[char.id];
      if (!opt) return null;
      return (
        <div key={char.id} className="flex items-start justify-between py-2 border-b border-border last:border-0 gap-4">
          <span className="text-xs text-muted-foreground shrink-0 pt-0.5 w-40">{char.name}</span>
          <div className="text-right">
            <p className="font-medium text-sm">{opt.description}</p>
            <p className="text-xs text-muted-foreground/60 font-mono">{opt.mrkwrt}</p>
          </div>
        </div>
      );
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configurador de Equipos</h1>
        <p className="text-muted-foreground mt-1">Configurá tu equipo paso a paso</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done   = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 min-w-[80px]">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                  done   ? 'bg-primary text-white' :
                  active ? 'bg-primary text-white ring-4 ring-primary/20' :
                           'bg-secondary text-muted-foreground',
                )}>
                  {done ? <Check size={16} /> : s.icon}
                </div>
                <span className={cn('text-xs font-medium whitespace-nowrap', active ? 'text-primary' : 'text-muted-foreground')}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mb-5 mx-2 transition-colors', done ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">

        {/* ── Step 1: Machine + Model variant ── */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Seleccioná el equipo base</h2>

            <div className="relative mb-5">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por código, descripción..."
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              {machineSearch && (
                <button
                  onClick={() => setMachineSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {machinesLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-muted-foreground" />
              </div>
            )}
            {machinesError && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-3 rounded-lg text-sm">
                <AlertCircle size={16} /> {machinesError}
              </div>
            )}

            {!machinesLoading && !machinesError && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMachines.length === 0 && (
                  <div className="col-span-3 py-12 text-center text-muted-foreground">
                    <Search size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      No se encontraron equipos para{' '}
                      <span className="font-medium text-foreground">&quot;{machineSearch}&quot;</span>
                    </p>
                  </div>
                )}
                {filteredMachines.map((machine) => {
                  const active = selectedMachine?.id === machine.id;
                  return (
                    <Card
                      key={machine.id}
                      onClick={() => setSelectedMachine(machine)}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                        active ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-border',
                      )}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', active ? 'bg-primary/10' : 'bg-secondary')}>
                            <Forklift size={20} className={active ? 'text-primary' : 'text-muted-foreground'} />
                          </div>
                          {active && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {machine.matnrk}
                        </span>
                        <p className="text-sm font-medium mt-2 mb-1 leading-snug">{machine.description}</p>
                        <p className="text-xs text-muted-foreground/60 font-mono">#{machine.matnr}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Model variant — appears after machine is selected */}
            {selectedMachine && (
              <div className="mt-8">
                {optionsLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" /> Cargando modelos...
                  </div>
                )}
                {optionsError && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-3 rounded-lg text-sm">
                    <AlertCircle size={16} /> {optionsError}
                  </div>
                )}
                {!optionsLoading && !optionsError && modelVariantChar && (
                  <>
                    <h2 className="text-lg font-semibold mb-1">{modelVariantChar.name}</h2>
                    <p className="text-sm text-muted-foreground mb-4">Seleccioná el modelo para este equipo</p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {modelVariantOptions.map((opt) => {
                        const selected = selectedOptions[modelVariantChar.id]?.id === opt.id;
                        return (
                          <Card
                            key={opt.id}
                            onClick={() => selectOption(modelVariantChar.id, opt)}
                            className={cn(
                              'cursor-pointer transition-all duration-150 hover:shadow-sm',
                              selected ? 'border-primary ring-2 ring-primary/15' : 'border-border',
                            )}
                          >
                            <CardContent className="p-4 flex items-start gap-3">
                              <div className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                                selected ? 'border-primary bg-primary' : 'border-border bg-background',
                              )}>
                                {selected && <Check size={11} className="text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{opt.description}</p>
                                <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">{opt.mrkwrt}</p>
                                {opt.comments && (
                                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{opt.comments}</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Mandatory options (level = 1) ── */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Equipamiento obligatorio</h2>
              <p className="text-sm text-muted-foreground mt-1">Seleccioná una opción por cada categoría</p>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar componente u opción..."
                value={optionSearch}
                onChange={(e) => setOptionSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              {optionSearch && (
                <button
                  onClick={() => setOptionSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {(() => {
              const groups = filterGroups(characteristicData.mandatory);
              if (characteristicData.mandatory.length === 0)
                return <p className="text-sm text-muted-foreground italic">No hay equipamiento obligatorio para este modelo.</p>;
              if (groups.length === 0)
                return <p className="text-sm text-muted-foreground italic">No se encontraron resultados para &quot;{optionSearch}&quot;.</p>;
              return renderGroups(groups);
            })()}
          </div>
        )}

        {/* ── Step 3: Optional options (level = 2, 3, 4) ── */}
        {step === 3 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Opcionales</h2>
              <p className="text-sm text-muted-foreground mt-1">Podés seleccionar opcionales o continuar sin ninguno</p>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar componente u opción..."
                value={optionSearch}
                onChange={(e) => setOptionSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              {optionSearch && (
                <button
                  onClick={() => setOptionSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {(() => {
              const groups = filterGroups(characteristicData.optional);
              if (characteristicData.optional.length === 0)
                return <p className="text-sm text-muted-foreground italic">No hay opcionales disponibles para este modelo.</p>;
              if (groups.length === 0)
                return <p className="text-sm text-muted-foreground italic">No se encontraron resultados para &quot;{optionSearch}&quot;.</p>;
              return renderGroups(groups);
            })()}
          </div>
        )}

        {/* ── Step 4: Summary ── */}
        {step === 4 && selectedMachine && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold mb-5">Resumen de configuración</h2>
            <div className="space-y-4 max-w-2xl">

              {/* Machine + model variant */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Equipo</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg">{selectedMachine.matnrk}</p>
                      <p className="text-sm text-muted-foreground">{selectedMachine.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">#{selectedMachine.matnr}</span>
                  </div>
                  {modelVariantChar && selectedOptions[modelVariantChar.id] && (
                    <div className="mt-3 pt-3 border-t border-border flex items-start justify-between gap-4">
                      <span className="text-xs text-muted-foreground pt-0.5 w-40 shrink-0">{modelVariantChar.name}</span>
                      <div className="text-right">
                        <p className="font-medium text-sm">{selectedOptions[modelVariantChar.id].description}</p>
                        <p className="text-xs text-muted-foreground/60 font-mono">{selectedOptions[modelVariantChar.id].mrkwrt}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mandatory */}
              {characteristicData.mandatory.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Obligatorio</h3>
                    <div className="space-y-0">{renderSummaryRows(characteristicData.mandatory)}</div>
                  </CardContent>
                </Card>
              )}

              {/* Optional — only if at least one was chosen */}
              {characteristicData.optional.some(({ char }) => !!selectedOptions[char.id]) && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Opcionales</h3>
                    <div className="space-y-0">{renderSummaryRows(characteristicData.optional)}</div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Compañía</h3>
                  <CompanySelector
                    description="Seleccioná la compañía para la que se generará la cotización. Los clientes se cargarán desde SAP B1 según esta selección."
                  />
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!selectedCompany}
                  onClick={handleGenerateQuotation}
                >
                  Generar Cotización
                  <ArrowRight size={16} />
                </Button>

                {templateSaved ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-green-600 bg-green-500/10 rounded-lg border border-green-500/20">
                    <Check size={15} />
                    Template guardado exitosamente
                  </div>
                ) : showTemplateInput ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nombre del template..."
                        value={templateName}
                        onChange={(e) => { setTemplateName(e.target.value); setTemplateError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                        autoFocus
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                      <Button
                        size="lg"
                        onClick={handleSaveTemplate}
                        disabled={!templateName.trim() || savingTemplate}
                      >
                        {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => { setShowTemplateInput(false); setTemplateName(''); setTemplateError(''); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                    {templateError && (
                      <p className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle size={13} /> {templateError}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" size="lg" onClick={() => setShowTemplateInput(true)}>
                    <BookMarked size={16} />
                    Guardar Template
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ArrowLeft size={16} />
          Anterior
        </Button>

        {step < 4 && (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
          >
            {step === 3 ? 'Ver resumen' : 'Siguiente'}
            <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
