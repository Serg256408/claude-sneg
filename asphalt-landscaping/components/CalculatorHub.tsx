import React, { useState, useMemo } from 'react';
import { formatPrice } from '../types';
import {
  ArrowLeft, Send, Square, Box, Mountain, BrickWall,
  Grid3X3, Paintbrush, Construction, Droplets,
  Shapes, ArrowLeftRight,
} from 'lucide-react';

interface CalculatorHubProps {
  onSendToChat: (text: string) => void;
  onGoToChat: () => void;
}

// ─── Helpers ───
const N = (v: number, d = 1) => Number(v.toFixed(d));
const fmt = (v: number, d = 1) => v.toFixed(d).replace(/\.0$/, '');

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{children}</label>
);

const NumInput: React.FC<{
  value: number; onChange: (v: number) => void; suffix?: string; placeholder?: string; min?: number; step?: number;
}> = ({ value, onChange, suffix, placeholder, min = 0, step = 1 }) => (
  <div className="flex items-center gap-2">
    <input type="number" min={min} step={step} value={value || ''} onChange={e => onChange(Number(e.target.value) || 0)}
      placeholder={placeholder || '0'}
      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
    {suffix && <span className="text-xs text-slate-400 font-bold shrink-0">{suffix}</span>}
  </div>
);

const Pill: React.FC<{
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${value === o.value
          ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
        {o.label}
      </button>
    ))}
  </div>
);

const ResultCard: React.FC<{ label: string; value: string; unit: string; accent?: boolean }> = ({ label, value, unit, accent }) => (
  <div className={`rounded-xl p-3 text-center ${accent ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-100'}`}>
    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">{label}</p>
    <p className={`text-lg font-black ${accent ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
    <p className="text-[10px] text-slate-400">{unit}</p>
  </div>
);

// ─── Calculator definitions ───
type CalcId = 'asphalt' | 'concrete' | 'aggregate' | 'brick' | 'tile' | 'paint' | 'rebar' | 'pipes' | 'area' | 'converter';

const CALCULATORS: { id: CalcId; label: string; icon: React.FC<any>; color: string }[] = [
  { id: 'asphalt', label: 'Асфальт', icon: Square, color: 'bg-slate-700 text-amber-400' },
  { id: 'concrete', label: 'Бетон', icon: Box, color: 'bg-slate-500 text-white' },
  { id: 'aggregate', label: 'Щебень / Песок', icon: Mountain, color: 'bg-amber-500 text-white' },
  { id: 'brick', label: 'Кирпич', icon: BrickWall, color: 'bg-red-500 text-white' },
  { id: 'tile', label: 'Плитка', icon: Grid3X3, color: 'bg-blue-500 text-white' },
  { id: 'paint', label: 'Краска', icon: Paintbrush, color: 'bg-purple-500 text-white' },
  { id: 'rebar', label: 'Арматура', icon: Construction, color: 'bg-zinc-600 text-orange-300' },
  { id: 'pipes', label: 'Трубы', icon: Droplets, color: 'bg-cyan-600 text-white' },
  { id: 'area', label: 'Площадь', icon: Shapes, color: 'bg-green-600 text-white' },
  { id: 'converter', label: 'т ↔ м³', icon: ArrowLeftRight, color: 'bg-indigo-600 text-white' },
];

// ─── Individual calculators ───

const CalcAsphalt: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const [area, setArea] = useState(500);
  const [thickness, setThickness] = useState(50);
  const vol = N(area * thickness / 1000, 2);
  const tons = N(vol * 2.3);
  const emulsion = N(area * 0.5);
  React.useEffect(() => { onResult(`Асфальт: ${area} м² × ${thickness} мм = ${tons} т смеси, ${fmt(emulsion)} л эмульсии`); }, [area, thickness]);
  return (
    <div className="space-y-4">
      <div><Label>Площадь</Label><NumInput value={area} onChange={setArea} suffix="м²" /></div>
      <div><Label>Толщина слоя</Label><NumInput value={thickness} onChange={setThickness} suffix="мм" />
        <div className="flex gap-1 mt-1.5">{[30, 40, 50, 60, 80].map(p => (
          <button key={p} onClick={() => setThickness(p)} className={`px-2 py-1 rounded text-[10px] font-bold ${thickness === p ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{p}</button>
        ))}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultCard label="Объём" value={fmt(vol)} unit="м³" />
        <ResultCard label="Масса смеси" value={fmt(tons)} unit="тонн" accent />
        <ResultCard label="Эмульсия" value={fmt(emulsion)} unit="литров" />
      </div>
    </div>
  );
};

const CalcConcrete: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const [l, setL] = useState(6);
  const [w, setW] = useState(4);
  const [h, setH] = useState(0.3);
  const [grade, setGrade] = useState('M200');
  const proportions: Record<string, { c: number; s: number; g: number; w: number; label: string }> = {
    M100: { c: 200, s: 800, g: 1200, w: 140, label: 'М100 (1:4:6)' },
    M200: { c: 280, s: 700, g: 1100, w: 150, label: 'М200 (1:2.8:4.8)' },
    M300: { c: 350, s: 600, g: 1050, w: 155, label: 'М300 (1:1.9:3.7)' },
    M400: { c: 420, s: 530, g: 1000, w: 165, label: 'М400 (1:1.2:2.7)' },
  };
  const p = proportions[grade];
  const vol = N(l * w * h, 2);
  const cement = N(vol * p.c);
  const sand = N(vol * p.s);
  const gravel = N(vol * p.g);
  const water = N(vol * p.w);
  React.useEffect(() => { onResult(`Бетон ${grade}: ${l}×${w}×${h} м = ${fmt(vol)} м³. Цемент ${fmt(cement, 0)} кг, песок ${fmt(sand, 0)} кг, щебень ${fmt(gravel, 0)} кг`); }, [l, w, h, grade]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div><Label>Длина</Label><NumInput value={l} onChange={setL} suffix="м" step={0.1} /></div>
        <div><Label>Ширина</Label><NumInput value={w} onChange={setW} suffix="м" step={0.1} /></div>
        <div><Label>Высота</Label><NumInput value={h} onChange={setH} suffix="м" step={0.05} /></div>
      </div>
      <div><Label>Марка бетона</Label>
        <Pill options={Object.entries(proportions).map(([k, v]) => ({ value: k, label: v.label }))} value={grade} onChange={setGrade} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultCard label="Объём" value={fmt(vol)} unit="м³" accent />
        <ResultCard label="Цемент" value={fmt(cement, 0)} unit="кг" />
        <ResultCard label="Песок" value={fmt(sand, 0)} unit="кг" />
        <ResultCard label="Щебень" value={fmt(gravel, 0)} unit="кг" />
        <ResultCard label="Вода" value={fmt(water, 0)} unit="л" />
      </div>
    </div>
  );
};

const CalcAggregate: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const materials = [
    { value: 'sand', label: 'Песок', density: 1.6 },
    { value: 'granite', label: 'Щебень гранитный', density: 1.35 },
    { value: 'gravel', label: 'Щебень гравийный', density: 1.4 },
    { value: 'pgs', label: 'ПГС', density: 1.65 },
    { value: 'keramzit', label: 'Керамзит', density: 0.45 },
  ];
  const [area, setArea] = useState(200);
  const [thickness, setThickness] = useState(200);
  const [mat, setMat] = useState('sand');
  const m = materials.find(x => x.value === mat)!;
  const vol = N(area * thickness / 1000, 2);
  const tons = N(vol * m.density, 2);
  React.useEffect(() => { onResult(`${m.label}: ${area} м² × ${thickness} мм = ${fmt(vol)} м³ = ${fmt(tons)} т`); }, [area, thickness, mat]);
  return (
    <div className="space-y-4">
      <div><Label>Материал</Label>
        <Pill options={materials.map(x => ({ value: x.value, label: x.label }))} value={mat} onChange={setMat} />
      </div>
      <div><Label>Площадь</Label><NumInput value={area} onChange={setArea} suffix="м²" /></div>
      <div><Label>Толщина слоя</Label><NumInput value={thickness} onChange={setThickness} suffix="мм" />
        <div className="flex gap-1 mt-1.5">{[100, 150, 200, 250, 300].map(p => (
          <button key={p} onClick={() => setThickness(p)} className={`px-2 py-1 rounded text-[10px] font-bold ${thickness === p ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{p}</button>
        ))}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultCard label="Объём" value={fmt(vol)} unit="м³" />
        <ResultCard label="Масса" value={fmt(tons)} unit="тонн" accent />
        <ResultCard label="Плотность" value={String(m.density)} unit="т/м³" />
      </div>
    </div>
  );
};

const CalcBrick: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const [length, setLength] = useState(10);
  const [height, setHeight] = useState(3);
  const [wallType, setWallType] = useState('1'); // 0.5, 1, 1.5, 2 кирпича
  const [brickType, setBrickType] = useState('single'); // single / half
  const brickH = brickType === 'single' ? 65 : 88; // мм
  const wallMultiplier: Record<string, number> = { '0.5': 51, '1': 102, '1.5': 153, '2': 204 };
  const perM2 = wallMultiplier[wallType] || 102;
  const area = N(length * height, 1);
  const rawCount = Math.ceil(area * perM2);
  const count = Math.ceil(rawCount * 1.05);
  const mortarVol = N(area * Number(wallType) * 0.025, 2); // ~25 л на м² на полкирпича
  React.useEffect(() => { onResult(`Кирпич: стена ${length}×${height} м, кладка ${wallType} кирп. = ${count} шт (${brickType === 'single' ? 'одинарный' : 'полуторный'}), раствор ${fmt(mortarVol)} м³`); }, [length, height, wallType, brickType]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Длина стены</Label><NumInput value={length} onChange={setLength} suffix="м" step={0.5} /></div>
        <div><Label>Высота стены</Label><NumInput value={height} onChange={setHeight} suffix="м" step={0.1} /></div>
      </div>
      <div><Label>Толщина кладки</Label>
        <Pill options={[
          { value: '0.5', label: '0.5 кирп. (120 мм)' },
          { value: '1', label: '1 кирп. (250 мм)' },
          { value: '1.5', label: '1.5 кирп. (380 мм)' },
          { value: '2', label: '2 кирп. (510 мм)' },
        ]} value={wallType} onChange={setWallType} />
      </div>
      <div><Label>Тип кирпича</Label>
        <Pill options={[
          { value: 'single', label: 'Одинарный (250×120×65)' },
          { value: 'half', label: 'Полуторный (250×120×88)' },
        ]} value={brickType} onChange={setBrickType} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultCard label="Площадь" value={fmt(area)} unit="м²" />
        <ResultCard label="Кирпичей" value={String(count)} unit="шт (+5%)" accent />
        <ResultCard label="Раствор" value={fmt(mortarVol)} unit="м³" />
      </div>
    </div>
  );
};

const CalcTile: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const [area, setArea] = useState(100);
  const [thickness, setThickness] = useState(60);
  const tileArea = N(area * 1.05, 1);
  const cps = N(area * 0.05 * 1.5, 1); // 50 мм ЦПС, плотность 1.5
  const perimeter = N(Math.sqrt(area) * 4, 0);
  const borders = Math.ceil(perimeter);
  React.useEffect(() => { onResult(`Плитка: ${area} м² → ${fmt(tileArea)} м² плитки (${thickness} мм), ЦПС ${fmt(cps)} т, бордюр ~${borders} шт`); }, [area, thickness]);
  return (
    <div className="space-y-4">
      <div><Label>Площадь</Label><NumInput value={area} onChange={setArea} suffix="м²" /></div>
      <div><Label>Толщина плитки</Label>
        <Pill options={[{ value: '40', label: '40 мм' }, { value: '60', label: '60 мм' }, { value: '80', label: '80 мм' }]}
          value={String(thickness)} onChange={v => setThickness(Number(v))} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultCard label="Плитка (+5%)" value={fmt(tileArea)} unit="м²" accent />
        <ResultCard label="ЦПС подсыпка" value={fmt(cps)} unit="тонн" />
        <ResultCard label="Бордюр" value={String(borders)} unit="шт (~)" />
      </div>
    </div>
  );
};

const CalcPaint: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const [area, setArea] = useState(50);
  const [consumption, setConsumption] = useState(150); // мл/м²
  const [canSize, setCanSize] = useState(10);
  const liters = N(area * consumption / 1000, 1);
  const cans = Math.ceil(liters / canSize);
  React.useEffect(() => { onResult(`Краска: ${area} м² × ${consumption} мл/м² = ${fmt(liters)} л = ${cans} банок по ${canSize} л`); }, [area, consumption, canSize]);
  return (
    <div className="space-y-4">
      <div><Label>Площадь окраски</Label><NumInput value={area} onChange={setArea} suffix="м²" /></div>
      <div><Label>Расход краски</Label><NumInput value={consumption} onChange={setConsumption} suffix="мл/м²" />
        <div className="flex gap-1 mt-1.5">{[100, 150, 200, 250].map(p => (
          <button key={p} onClick={() => setConsumption(p)} className={`px-2 py-1 rounded text-[10px] font-bold ${consumption === p ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{p}</button>
        ))}</div>
      </div>
      <div><Label>Объём банки</Label>
        <Pill options={[{ value: '1', label: '1 л' }, { value: '3', label: '3 л' }, { value: '5', label: '5 л' }, { value: '10', label: '10 л' }]}
          value={String(canSize)} onChange={v => setCanSize(Number(v))} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultCard label="Объём краски" value={fmt(liters)} unit="литров" accent />
        <ResultCard label="Банок" value={String(cans)} unit="шт" />
        <ResultCard label="Площадь" value={fmt(area)} unit="м²" />
      </div>
    </div>
  );
};

const CalcRebar: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const [l, setL] = useState(10);
  const [w, setW] = useState(6);
  const [step, setStep] = useState(200);
  const [dia, setDia] = useState(12);
  const weightPerMeter: Record<number, number> = { 8: 0.395, 10: 0.617, 12: 0.888, 14: 1.21, 16: 1.58 };
  const barsX = Math.floor(w / (step / 1000)) + 1;
  const barsY = Math.floor(l / (step / 1000)) + 1;
  const totalBars = barsX + barsY;
  const metersX = barsX * l;
  const metersY = barsY * w;
  const totalMeters = N(metersX + metersY, 1);
  const weight = N(totalMeters * (weightPerMeter[dia] || 0.888), 1);
  React.useEffect(() => { onResult(`Арматура d${dia}: ${l}×${w} м, шаг ${step} мм = ${totalBars} стержней, ${fmt(totalMeters)} п.м., ${fmt(weight)} кг`); }, [l, w, step, dia]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Длина</Label><NumInput value={l} onChange={setL} suffix="м" step={0.5} /></div>
        <div><Label>Ширина</Label><NumInput value={w} onChange={setW} suffix="м" step={0.5} /></div>
      </div>
      <div><Label>Шаг сетки</Label>
        <Pill options={[{ value: '150', label: '150 мм' }, { value: '200', label: '200 мм' }, { value: '250', label: '250 мм' }, { value: '300', label: '300 мм' }]}
          value={String(step)} onChange={v => setStep(Number(v))} />
      </div>
      <div><Label>Диаметр</Label>
        <Pill options={[{ value: '8', label: 'd8' }, { value: '10', label: 'd10' }, { value: '12', label: 'd12' }, { value: '14', label: 'd14' }]}
          value={String(dia)} onChange={v => setDia(Number(v))} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultCard label="Стержней" value={String(totalBars)} unit="шт" />
        <ResultCard label="Погонаж" value={fmt(totalMeters)} unit="п.м." />
        <ResultCard label="Масса" value={fmt(weight)} unit="кг" accent />
      </div>
    </div>
  );
};

const CalcPipes: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const [length, setLength] = useState(30);
  const [dia, setDia] = useState('110');
  const [turns, setTurns] = useState(4);
  const [drains, setDrains] = useState(3);
  const pipeLength = 3; // стандартная длина трубы 3 м
  const pipes = Math.ceil(length / pipeLength);
  const couplings = pipes - 1;
  React.useEffect(() => { onResult(`Трубы ∅${dia}: ${length} м = ${pipes} труб (по ${pipeLength} м), ${turns} отводов, ${drains} дождеприёмников`); }, [length, dia, turns, drains]);
  return (
    <div className="space-y-4">
      <div><Label>Длина трассы</Label><NumInput value={length} onChange={setLength} suffix="м" /></div>
      <div><Label>Диаметр трубы</Label>
        <Pill options={[{ value: '110', label: '∅110 мм' }, { value: '160', label: '∅160 мм' }, { value: '200', label: '∅200 мм' }]}
          value={dia} onChange={setDia} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Поворотов</Label><NumInput value={turns} onChange={setTurns} suffix="шт" /></div>
        <div><Label>Дождеприёмников</Label><NumInput value={drains} onChange={setDrains} suffix="шт" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultCard label="Труб" value={String(pipes)} unit={`шт (по ${pipeLength} м)`} accent />
        <ResultCard label="Муфт" value={String(couplings)} unit="шт" />
        <ResultCard label="Отводов" value={String(turns)} unit="шт" />
        <ResultCard label="Дождеприёмники" value={String(drains)} unit="шт" />
      </div>
    </div>
  );
};

const CalcArea: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const [shape, setShape] = useState<'rect' | 'circle' | 'trapez' | 'triangle'>('rect');
  const [a, setA] = useState(10);
  const [b, setB] = useState(8);
  const [h, setH] = useState(5);
  const [r, setR] = useState(5);

  const area = useMemo(() => {
    switch (shape) {
      case 'rect': return N(a * b, 2);
      case 'circle': return N(Math.PI * r * r, 2);
      case 'trapez': return N((a + b) / 2 * h, 2);
      case 'triangle': return N(a * h / 2, 2);
      default: return 0;
    }
  }, [shape, a, b, h, r]);

  React.useEffect(() => {
    const shapeNames: Record<string, string> = { rect: 'Прямоугольник', circle: 'Круг', trapez: 'Трапеция', triangle: 'Треугольник' };
    onResult(`Площадь (${shapeNames[shape]}): ${fmt(area)} м²`);
  }, [area, shape]);

  return (
    <div className="space-y-4">
      <div><Label>Фигура</Label>
        <Pill options={[
          { value: 'rect', label: 'Прямоугольник' },
          { value: 'circle', label: 'Круг' },
          { value: 'trapez', label: 'Трапеция' },
          { value: 'triangle', label: 'Треугольник' },
        ]} value={shape} onChange={v => setShape(v as any)} />
      </div>
      {shape === 'rect' && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Сторона A</Label><NumInput value={a} onChange={setA} suffix="м" step={0.1} /></div>
          <div><Label>Сторона B</Label><NumInput value={b} onChange={setB} suffix="м" step={0.1} /></div>
        </div>
      )}
      {shape === 'circle' && (
        <div><Label>Радиус</Label><NumInput value={r} onChange={setR} suffix="м" step={0.1} /></div>
      )}
      {shape === 'trapez' && (
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Основание A</Label><NumInput value={a} onChange={setA} suffix="м" step={0.1} /></div>
          <div><Label>Основание B</Label><NumInput value={b} onChange={setB} suffix="м" step={0.1} /></div>
          <div><Label>Высота</Label><NumInput value={h} onChange={setH} suffix="м" step={0.1} /></div>
        </div>
      )}
      {shape === 'triangle' && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Основание</Label><NumInput value={a} onChange={setA} suffix="м" step={0.1} /></div>
          <div><Label>Высота</Label><NumInput value={h} onChange={setH} suffix="м" step={0.1} /></div>
        </div>
      )}
      <ResultCard label="Площадь" value={fmt(area)} unit="м²" accent />
    </div>
  );
};

const CalcConverter: React.FC<{ onResult: (s: string) => void }> = ({ onResult }) => {
  const materials = [
    { value: 'sand', label: 'Песок', density: 1.6 },
    { value: 'granite', label: 'Щебень гранитный', density: 1.35 },
    { value: 'gravel', label: 'Гравий', density: 1.4 },
    { value: 'soil', label: 'Грунт', density: 1.8 },
    { value: 'asphalt', label: 'Асфальтобетон', density: 2.3 },
    { value: 'concrete', label: 'Бетон', density: 2.4 },
    { value: 'keramzit', label: 'Керамзит', density: 0.45 },
    { value: 'cps', label: 'ЦПС', density: 1.5 },
  ];
  const [mat, setMat] = useState('sand');
  const [tons, setTons] = useState(10);
  const [mode, setMode] = useState<'t2m' | 'm2t'>('t2m');
  const m = materials.find(x => x.value === mat)!;
  const result = mode === 't2m' ? N(tons / m.density, 2) : N(tons * m.density, 2);
  const fromUnit = mode === 't2m' ? 'тонн' : 'м³';
  const toUnit = mode === 't2m' ? 'м³' : 'тонн';
  React.useEffect(() => { onResult(`${m.label}: ${fmt(tons)} ${fromUnit} = ${fmt(result)} ${toUnit} (плотность ${m.density} т/м³)`); }, [tons, mat, mode]);
  return (
    <div className="space-y-4">
      <div><Label>Материал</Label>
        <Pill options={materials.map(x => ({ value: x.value, label: x.label }))} value={mat} onChange={setMat} />
      </div>
      <div><Label>Направление</Label>
        <Pill options={[{ value: 't2m', label: 'Тонны → м³' }, { value: 'm2t', label: 'м³ → Тонны' }]}
          value={mode} onChange={v => setMode(v as any)} />
      </div>
      <div><Label>{mode === 't2m' ? 'Тонны' : 'Кубометры'}</Label><NumInput value={tons} onChange={setTons} suffix={fromUnit} step={0.5} /></div>
      <div className="grid grid-cols-2 gap-2">
        <ResultCard label={mode === 't2m' ? 'Кубометры' : 'Тонны'} value={fmt(result)} unit={toUnit} accent />
        <ResultCard label="Плотность" value={String(m.density)} unit="т/м³" />
      </div>
    </div>
  );
};

// ─── Main hub ───

export const CalculatorHub: React.FC<CalculatorHubProps> = ({ onSendToChat, onGoToChat }) => {
  const [activeCalc, setActiveCalc] = useState<CalcId | null>(null);
  const [lastResult, setLastResult] = useState('');

  const renderCalc = () => {
    switch (activeCalc) {
      case 'asphalt': return <CalcAsphalt onResult={setLastResult} />;
      case 'concrete': return <CalcConcrete onResult={setLastResult} />;
      case 'aggregate': return <CalcAggregate onResult={setLastResult} />;
      case 'brick': return <CalcBrick onResult={setLastResult} />;
      case 'tile': return <CalcTile onResult={setLastResult} />;
      case 'paint': return <CalcPaint onResult={setLastResult} />;
      case 'rebar': return <CalcRebar onResult={setLastResult} />;
      case 'pipes': return <CalcPipes onResult={setLastResult} />;
      case 'area': return <CalcArea onResult={setLastResult} />;
      case 'converter': return <CalcConverter onResult={setLastResult} />;
      default: return null;
    }
  };

  const activeDef = CALCULATORS.find(c => c.id === activeCalc);

  // Grid view
  if (!activeCalc) {
    return (
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Строительные калькуляторы</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {CALCULATORS.map(calc => (
            <button
              key={calc.id}
              onClick={() => setActiveCalc(calc.id)}
              className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all text-center group active:scale-95"
            >
              <div className={`w-12 h-12 rounded-xl ${calc.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                <calc.icon size={22} />
              </div>
              <p className="text-xs font-bold text-slate-700 leading-tight">{calc.label}</p>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 text-center">Все расчёты приблизительные. Для точной сметы обратитесь к менеджеру.</p>
      </div>
    );
  }

  // Calculator view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setActiveCalc(null)}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          {activeDef && (
            <div className={`w-8 h-8 rounded-lg ${activeDef.color} flex items-center justify-center`}>
              <activeDef.icon size={16} />
            </div>
          )}
          <h3 className="font-bold text-slate-800">{activeDef?.label}</h3>
        </div>
      </div>

      {/* Calculator content */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        {renderCalc()}
      </div>

      {/* Send to chat */}
      <button
        onClick={() => { onSendToChat(`Расчёт: ${lastResult}`); onGoToChat(); }}
        className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 active:scale-[0.98] transition-all shadow-lg text-sm"
      >
        <Send size={16} /> Отправить менеджеру
      </button>
    </div>
  );
};
