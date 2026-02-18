import React from 'react';
import { WizardData } from '../types';
import { Trash2, Mountain, Layers, Square, PanelTop, Grid3X3, TreePine, Droplets, Check, ArrowRight, ArrowLeft, Wand2, Loader2 } from 'lucide-react';

interface EstimateWizardProps {
  data: WizardData;
  onChange: (data: WizardData) => void;
  step: number;
  onStepChange: (step: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const WORK_OPTIONS = [
  { key: 'demolition' as const, label: 'Демонтаж покрытия', desc: 'Снятие старого асфальта или бетона', Icon: Trash2 },
  { key: 'earthwork' as const, label: 'Земляные работы', desc: 'Корыто, планировка, вывоз грунта', Icon: Mountain },
  { key: 'foundation' as const, label: 'Устройство основания', desc: 'Песок, щебень, уплотнение', Icon: Layers },
  { key: 'asphalt' as const, label: 'Асфальтирование', desc: 'Укладка а/б покрытия', Icon: Square },
  { key: 'curbs' as const, label: 'Бордюры', desc: 'Дорожные или садовые', Icon: PanelTop },
  { key: 'tiles' as const, label: 'Тротуарная плитка', desc: 'На ЦПС, вибропрессованная', Icon: Grid3X3 },
  { key: 'landscaping' as const, label: 'Озеленение', desc: 'Газон, деревья, кустарники', Icon: TreePine },
  { key: 'drainage' as const, label: 'Ливневая канализация', desc: 'Трубы, дождеприёмники', Icon: Droplets },
];

// Pill selector helper
const PillGroup = <T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(opt => (
      <button key={opt.value} onClick={() => onChange(opt.value)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${value === opt.value ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}>
        {opt.label}
      </button>
    ))}
  </div>
);

const NumberInput = ({ value, onChange, suffix, placeholder }: { value: number; onChange: (v: number) => void; suffix: string; placeholder?: string }) => (
  <div className="flex items-center gap-2">
    <input type="number" min={0} value={value || ''} onChange={e => onChange(Number(e.target.value) || 0)} placeholder={placeholder || '0'}
      className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
    <span className="text-slate-500 text-xs font-bold">{suffix}</span>
  </div>
);

// Ввод толщины: поле + быстрые кнопки-пресеты
const ThicknessInput = ({ value, onChange, presets, suffix = 'мм' }: { value: number; onChange: (v: number) => void; presets: number[]; suffix?: string }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <input type="number" min={0} value={value || ''} onChange={e => onChange(Number(e.target.value) || 0)} placeholder="0"
      className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
    <span className="text-slate-500 text-xs font-bold">{suffix}</span>
    <div className="flex gap-1 ml-1">
      {presets.map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${value === p ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'}`}>
          {p}
        </button>
      ))}
    </div>
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">{children}</label>
);

const MIX_LABELS: Record<string, string> = {
  fine_B2: 'Мелкозерн. Б-II',
  coarse_A1: 'Крупнозерн. А-I',
  SMA15: 'ЩМА-15',
  sand_D: 'Песчаная Д-II',
};

const GRAVEL_LABELS: Record<string, string> = {
  granite: 'Гранитный М1200',
  gravel: 'Гравийный М800',
  limestone: 'Известняковый М600',
  recycled: 'Вторичный',
};

export const EstimateWizard: React.FC<EstimateWizardProps> = ({ data, onChange, step, onStepChange, onGenerate, isGenerating }) => {
  const update = <K extends keyof WizardData>(key: K, value: WizardData[K]) => onChange({ ...data, [key]: value });
  const toggleWork = (key: keyof WizardData['works']) => onChange({ ...data, works: { ...data.works, [key]: !data.works[key] } });

  const hasAnyWork = Object.values(data.works).some(Boolean);
  const canStep2 = data.area > 0 && (!data.works.curbs || data.perimeterLength > 0);

  // ── Step 1: Work scope ──
  const renderStep1 = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {WORK_OPTIONS.map(({ key, label, desc, Icon }) => {
        const active = data.works[key];
        return (
          <button key={key} onClick={() => toggleWork(key)}
            className={`relative p-3 rounded-xl border-2 text-left transition-all ${active ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
            {active && <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>}
            <Icon size={20} className={active ? 'text-orange-400' : 'text-slate-500'} />
            <p className={`text-xs font-bold mt-1.5 ${active ? 'text-orange-300' : 'text-slate-300'}`}>{label}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{desc}</p>
          </button>
        );
      })}
    </div>
  );

  // ── Step 2: Parameters ──
  const renderStep2 = () => (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
      {/* Area — always */}
      <div className="bg-slate-800/50 rounded-xl p-4">
        <SectionLabel>Площадь объекта</SectionLabel>
        <NumberInput value={data.area} onChange={v => update('area', v)} suffix="м²" placeholder="500" />
      </div>

      {/* Curb perimeter */}
      {data.works.curbs && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <SectionLabel>Длина бордюра</SectionLabel>
          <NumberInput value={data.perimeterLength} onChange={v => update('perimeterLength', v)} suffix="п.м" placeholder="100" />
        </div>
      )}

      {/* Demolition */}
      {data.works.demolition && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <h4 className="text-orange-400 text-xs font-bold flex items-center gap-1.5"><Trash2 size={14} /> Демонтаж</h4>
          <div>
            <SectionLabel>Тип покрытия</SectionLabel>
            <PillGroup options={[{ value: 'asphalt' as const, label: 'Асфальт' }, { value: 'concrete' as const, label: 'Бетон' }]}
              value={data.demolitionCoverType} onChange={v => update('demolitionCoverType', v)} />
          </div>
          <div>
            <SectionLabel>Толщина покрытия</SectionLabel>
            <ThicknessInput value={data.demolitionThickness} onChange={v => update('demolitionThickness', v)} presets={[50, 80, 100, 150]} />
          </div>
          <div>
            <SectionLabel>Способ демонтажа</SectionLabel>
            <PillGroup options={[
              { value: 'hammer' as const, label: 'Гидромолот (до 1000 м²)' },
              { value: 'milling' as const, label: 'Фреза (от 1000 м²)' },
            ]}
              value={data.demolitionMethod} onChange={v => update('demolitionMethod', v)} />
          </div>
        </div>
      )}

      {/* Earthwork */}
      {data.works.earthwork && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <h4 className="text-orange-400 text-xs font-bold flex items-center gap-1.5"><Mountain size={14} /> Земляные работы</h4>
          <div>
            <SectionLabel>Тип экскаватора</SectionLabel>
            <PillGroup options={[
              { value: 'loader' as const, label: 'Экскаватор-погрузчик (малый объём)' },
              { value: 'tracked' as const, label: 'Гусеничный экскаватор (большой объём)' },
            ]}
              value={data.excavatorType} onChange={v => update('excavatorType', v)} />
          </div>
        </div>
      )}

      {/* Foundation */}
      {data.works.foundation && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <h4 className="text-orange-400 text-xs font-bold flex items-center gap-1.5"><Layers size={14} /> Основание</h4>
          <div>
            <SectionLabel>Слой песка</SectionLabel>
            <ThicknessInput value={data.sandLayer} onChange={v => update('sandLayer', v)} presets={[0, 100, 150, 200, 300]} />
          </div>
          <div>
            <SectionLabel>Слой щебня</SectionLabel>
            <ThicknessInput value={data.gravelLayer} onChange={v => update('gravelLayer', v)} presets={[0, 100, 150, 200, 250]} />
          </div>
          {data.gravelLayer > 0 && (
            <div>
              <SectionLabel>Тип щебня</SectionLabel>
              <PillGroup options={[
                { value: 'granite' as const, label: 'Гранитный М1200' },
                { value: 'gravel' as const, label: 'Гравийный М800' },
                { value: 'limestone' as const, label: 'Известняк. М600' },
                { value: 'recycled' as const, label: 'Вторичный' },
              ]}
                value={data.gravelType} onChange={v => update('gravelType', v)} />
            </div>
          )}
          <div>
            <SectionLabel>Геотекстиль (плотность)</SectionLabel>
            <PillGroup options={[
              { value: '0', label: 'Без' },
              { value: '200', label: '200 г/м²' },
              { value: '300', label: '300 г/м²' },
            ]}
              value={String(data.geotextileDensity)} onChange={v => update('geotextileDensity', Number(v))} />
          </div>
        </div>
      )}

      {/* Asphalt */}
      {data.works.asphalt && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <h4 className="text-orange-400 text-xs font-bold flex items-center gap-1.5"><Square size={14} /> Асфальтирование</h4>
          <div>
            <SectionLabel>Метод укладки</SectionLabel>
            <PillGroup options={[{ value: 'paver' as const, label: 'Укладчиком (от 300 м²)' }, { value: 'manual' as const, label: 'Вручную (до 300 м²)' }]}
              value={data.asphaltMethod} onChange={v => update('asphaltMethod', v)} />
          </div>
          <div>
            <SectionLabel>Количество слоёв</SectionLabel>
            <PillGroup options={[{ value: 1 as const, label: '1 слой' }, { value: 2 as const, label: '2 слоя (к/з + м/з)' }]}
              value={data.asphaltLayers} onChange={v => update('asphaltLayers', v)} />
          </div>

          {data.asphaltLayers === 2 ? (
            <>
              {/* Нижний слой */}
              <div className="border border-slate-700 rounded-lg p-3 space-y-2">
                <p className="text-[10px] font-bold text-orange-300 uppercase tracking-widest">Нижний слой (к/з)</p>
                <div>
                  <SectionLabel>Толщина</SectionLabel>
                  <ThicknessInput value={data.asphaltBottomThickness} onChange={v => update('asphaltBottomThickness', v)} presets={[40, 50, 60, 80]} />
                </div>
                <div>
                  <SectionLabel>Тип смеси</SectionLabel>
                  <PillGroup options={[
                    { value: 'coarse_A1' as const, label: 'Крупнозерн. А-I' },
                    { value: 'fine_B2' as const, label: 'Мелкозерн. Б-II' },
                    { value: 'sand_D' as const, label: 'Песчаная Д-II' },
                    { value: 'SMA15' as const, label: 'ЩМА-15' },
                  ]}
                    value={data.asphaltBottomMixType} onChange={v => update('asphaltBottomMixType', v)} />
                </div>
              </div>
              {/* Верхний слой */}
              <div className="border border-slate-700 rounded-lg p-3 space-y-2">
                <p className="text-[10px] font-bold text-orange-300 uppercase tracking-widest">Верхний слой (м/з)</p>
                <div>
                  <SectionLabel>Толщина</SectionLabel>
                  <ThicknessInput value={data.asphaltThickness} onChange={v => update('asphaltThickness', v)} presets={[30, 40, 50, 60]} />
                </div>
                <div>
                  <SectionLabel>Тип смеси</SectionLabel>
                  <PillGroup options={[
                    { value: 'fine_B2' as const, label: 'Мелкозерн. Б-II' },
                    { value: 'coarse_A1' as const, label: 'Крупнозерн. А-I' },
                    { value: 'sand_D' as const, label: 'Песчаная Д-II' },
                    { value: 'SMA15' as const, label: 'ЩМА-15' },
                  ]}
                    value={data.asphaltMixType} onChange={v => update('asphaltMixType', v)} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <SectionLabel>Толщина слоя</SectionLabel>
                <ThicknessInput value={data.asphaltThickness} onChange={v => update('asphaltThickness', v)} presets={[30, 40, 50, 60, 80]} />
              </div>
              <div>
                <SectionLabel>Тип смеси</SectionLabel>
                <PillGroup options={[
                  { value: 'fine_B2' as const, label: 'Мелкозерн. Б-II' },
                  { value: 'coarse_A1' as const, label: 'Крупнозерн. А-I' },
                  { value: 'sand_D' as const, label: 'Песчаная Д-II' },
                  { value: 'SMA15' as const, label: 'ЩМА-15' },
                ]}
                  value={data.asphaltMixType} onChange={v => update('asphaltMixType', v)} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Curbs type */}
      {data.works.curbs && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <h4 className="text-orange-400 text-xs font-bold flex items-center gap-1.5"><PanelTop size={14} /> Бордюры</h4>
          <div>
            <SectionLabel>Тип бордюра</SectionLabel>
            <PillGroup options={[{ value: 'road' as const, label: 'Дорожный БР 100.30.18' }, { value: 'garden' as const, label: 'Садовый БР 100.20.8' }]}
              value={data.curbType} onChange={v => update('curbType', v)} />
          </div>
        </div>
      )}

      {/* Tiles */}
      {data.works.tiles && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <h4 className="text-orange-400 text-xs font-bold flex items-center gap-1.5"><Grid3X3 size={14} /> Тротуарная плитка</h4>
          <div>
            <SectionLabel>Толщина плитки</SectionLabel>
            <ThicknessInput value={data.tileThickness} onChange={v => update('tileThickness', v)} presets={[40, 60, 80]} />
          </div>
        </div>
      )}

      {/* Landscaping */}
      {data.works.landscaping && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <h4 className="text-orange-400 text-xs font-bold flex items-center gap-1.5"><TreePine size={14} /> Озеленение</h4>
          <div>
            <SectionLabel>Тип газона</SectionLabel>
            <PillGroup options={[{ value: 'seed' as const, label: 'Посевной' }, { value: 'roll' as const, label: 'Рулонный' }]}
              value={data.lawnType} onChange={v => update('lawnType', v)} />
          </div>
        </div>
      )}

      {/* Drainage */}
      {data.works.drainage && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <h4 className="text-orange-400 text-xs font-bold flex items-center gap-1.5"><Droplets size={14} /> Ливневая канализация</h4>
          <div>
            <SectionLabel>Длина труб</SectionLabel>
            <NumberInput value={data.drainagePipeLength} onChange={v => update('drainagePipeLength', v)} suffix="п.м" placeholder="20" />
          </div>
          <div>
            <SectionLabel>Количество дождеприёмников</SectionLabel>
            <NumberInput value={data.drainageGrateCount} onChange={v => update('drainageGrateCount', v)} suffix="шт" placeholder="3" />
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 3: Summary ──
  const renderStep3 = () => {
    const items: string[] = [];
    if (data.works.demolition) items.push(`Демонтаж ${data.demolitionCoverType === 'asphalt' ? 'асфальта' : 'бетона'}, ${data.demolitionThickness} мм, ${data.demolitionMethod === 'milling' ? 'фрезой' : 'гидромолотом'}`);
    if (data.works.earthwork) items.push(`Земляные работы (${data.excavatorType === 'loader' ? 'экскаватор-погрузчик' : 'гусеничный экскаватор'})`);
    if (data.works.foundation) {
      const parts = [];
      if (data.sandLayer > 0) parts.push(`песок ${data.sandLayer} мм`);
      if (data.gravelLayer > 0) parts.push(`щебень ${GRAVEL_LABELS[data.gravelType] || data.gravelType} ${data.gravelLayer} мм`);
      if (data.geotextileDensity > 0) parts.push(`геотекстиль ${data.geotextileDensity} г/м²`);
      items.push(`Основание: ${parts.join(', ') || 'без слоёв'}`);
    }
    if (data.works.asphalt) {
      const method = data.asphaltMethod === 'paver' ? 'укладчиком' : 'вручную';
      if (data.asphaltLayers === 2) {
        items.push(`Асфальт 2 слоя: нижний — ${MIX_LABELS[data.asphaltBottomMixType] || data.asphaltBottomMixType} ${data.asphaltBottomThickness} мм + верхний — ${MIX_LABELS[data.asphaltMixType] || data.asphaltMixType} ${data.asphaltThickness} мм, ${method}`);
      } else {
        items.push(`Асфальт ${MIX_LABELS[data.asphaltMixType] || data.asphaltMixType}, ${data.asphaltThickness} мм, ${method}`);
      }
    }
    if (data.works.curbs) items.push(`Бордюры ${data.curbType === 'road' ? 'дорожные' : 'садовые'}, ${data.perimeterLength} п.м`);
    if (data.works.tiles) items.push(`Плитка ${data.tileThickness} мм`);
    if (data.works.landscaping) items.push(`Газон ${data.lawnType === 'seed' ? 'посевной' : 'рулонный'}`);
    if (data.works.drainage) items.push(`Ливнёвка: ${data.drainagePipeLength} п.м, ${data.drainageGrateCount} дождеприёмников`);

    return (
      <div className="space-y-3">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-slate-300 text-sm"><span className="text-orange-400 font-bold">Площадь:</span> {data.area} м²</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-orange-400 font-bold text-[10px] uppercase tracking-widest mb-2">Выбранные работы</p>
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                <Check size={14} className="text-orange-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-slate-500 text-[10px] text-center">AI рассчитает количества по строительным нормам и подберёт ресурсы из справочника</p>
      </div>
    );
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { n: 1, label: 'Работы' },
          { n: 2, label: 'Параметры' },
          { n: 3, label: 'Генерация' },
        ].map(({ n, label }) => (
          <React.Fragment key={n}>
            <button onClick={() => { if (n < step) onStepChange(n); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                n === step ? 'bg-orange-600 text-white' :
                n < step ? 'bg-orange-600/20 text-orange-400 cursor-pointer hover:bg-orange-600/30' :
                'bg-slate-800 text-slate-500'
              }`}>
              {n < step ? <Check size={10} /> : <span>{n}</span>}
              <span className="hidden sm:inline">{label}</span>
            </button>
            {n < 3 && <div className={`flex-1 h-px ${n < step ? 'bg-orange-600/40' : 'bg-slate-700'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {/* Navigation */}
      <div className="flex justify-between mt-5">
        {step > 1 ? (
          <button onClick={() => onStepChange(step - 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all">
            <ArrowLeft size={14} /> Назад
          </button>
        ) : <div />}

        {step < 3 && (
          <button onClick={() => onStepChange(step + 1)}
            disabled={step === 1 ? !hasAnyWork : !canStep2}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-all ml-auto">
            Далее <ArrowRight size={14} />
          </button>
        )}

        {step === 3 && (
          <button onClick={onGenerate} disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white transition-all ml-auto shadow-lg shadow-orange-600/20">
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <><Wand2 size={16} /> Создать смету</>}
          </button>
        )}
      </div>
    </div>
  );
};
