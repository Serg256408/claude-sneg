import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Search, Square, Layers, Box,
  PanelTop, Droplets, Timer,
} from 'lucide-react';

interface ConstructionReferenceProps {
  theme: 'dark' | 'light';
}

// ─── Data types ───
interface RefTable {
  title: string;
  columns: string[];
  rows: string[][];
}

interface RefNote {
  title: string;
  text: string;
  accent?: boolean;
}

interface RefSection {
  title: string;
  tables?: RefTable[];
  notes?: RefNote[];
}

interface RefCategory {
  id: string;
  label: string;
  icon: React.FC<any>;
  color: string;
  sections: RefSection[];
}

// ─── Reference data ───
const CATEGORIES: RefCategory[] = [
  {
    id: 'asphalt', label: 'Асфальтобетон', icon: Square,
    color: 'bg-slate-700 text-amber-400',
    sections: [
      {
        title: 'Плотность смесей',
        tables: [{
          title: '', columns: ['Тип смеси', 'Плотность, т/м³'],
          rows: [
            ['Мелкозернистая Б-II (м/з)', '2.30'],
            ['Крупнозернистая А-I (к/з)', '2.35'],
            ['ЩМА-15', '2.38'],
            ['Песчаная Д-II', '2.25'],
          ],
        }],
      },
      {
        title: 'Расход смеси на 1 м²',
        tables: [{
          title: '', columns: ['Толщина, мм', 'Расход, т/м²', 'На 100 м², т'],
          rows: [
            ['30', '0.069', '6.9'],
            ['40', '0.092', '9.2'],
            ['50', '0.115', '11.5'],
            ['60', '0.138', '13.8'],
            ['80', '0.184', '18.4'],
            ['100', '0.230', '23.0'],
          ],
        }],
        notes: [{ title: 'Плотность', text: 'Расчёт при плотности 2.3 т/м³ (м/з Б-II). Для к/з А-I умножить на 1.02' }],
      },
      {
        title: 'Битумная эмульсия',
        tables: [{
          title: '', columns: ['Назначение', 'Расход, л/м²'],
          rows: [
            ['Подгрунтовка основания', '0.3 – 0.5'],
            ['Межслойная проливка', '0.2 – 0.3'],
            ['Обработка стыков', '0.1 – 0.2'],
          ],
        }],
      },
      {
        title: 'Температурные режимы',
        notes: [
          { title: 'Мин. температура воздуха (нижний слой)', text: '+5°C', accent: true },
          { title: 'Мин. температура воздуха (верхний слой)', text: '+10°C', accent: true },
          { title: 'Температура смеси при укладке', text: '120 – 160°C' },
          { title: 'Температура смеси при уплотнении', text: 'не ниже 100°C' },
          { title: 'Запрет укладки', text: 'В дождь, на мокрое основание, при ветре > 15 м/с', accent: true },
        ],
      },
      {
        title: 'Уплотнение и толщины',
        notes: [
          { title: 'Коэффициент уплотнения', text: '1.25 – 1.30 (от рыхлой смеси)' },
          { title: 'Мин. толщина м/з (Б-II)', text: '30 мм' },
          { title: 'Мин. толщина к/з (А-I)', text: '40 мм' },
          { title: 'Мин. толщина ЩМА', text: '50 мм' },
          { title: 'Число проходов катка', text: '6–10 (3–4 без вибрации + 3–6 с вибрацией)' },
        ],
      },
    ],
  },
  {
    id: 'base', label: 'Основания', icon: Layers,
    color: 'bg-amber-600 text-white',
    sections: [
      {
        title: 'Плотность материалов',
        tables: [{
          title: '', columns: ['Материал', 'Плотность, т/м³'],
          rows: [
            ['Песок строительный', '1.50 – 1.70'],
            ['Песок мытый', '1.60 – 1.65'],
            ['Щебень гранитный фр. 20-40', '1.30 – 1.40'],
            ['Щебень гравийный фр. 20-40', '1.35 – 1.45'],
            ['Щебень известняковый', '1.20 – 1.30'],
            ['Щебень вторичный', '1.20 – 1.35'],
            ['ПГС (песчано-гравийная)', '1.60 – 1.70'],
            ['Грунт (суглинок)', '1.60 – 1.90'],
            ['Керамзит фр. 10-20', '0.35 – 0.50'],
            ['ЦПС (цементно-песчаная)', '1.50 – 1.60'],
          ],
        }],
      },
      {
        title: 'Коэффициенты уплотнения',
        tables: [{
          title: '', columns: ['Материал', 'К уплотнения'],
          rows: [
            ['Песок', '1.10 – 1.15'],
            ['Щебень', '1.25 – 1.30'],
            ['ПГС', '1.15 – 1.20'],
            ['Грунт (обратная засыпка)', '1.05 – 1.10'],
          ],
        }],
        notes: [{ title: 'Как использовать', text: 'Объём в рыхлом состоянии = объём в плотном теле × К уплотнения. Заказывать щебень с запасом 25-30%.' }],
      },
      {
        title: 'Коэффициенты разрыхления',
        tables: [{
          title: '', columns: ['Грунт', 'К разрыхления (первич.)', 'К остаточного разрыхл.'],
          rows: [
            ['Песок', '1.10 – 1.15', '1.02 – 1.05'],
            ['Суглинок', '1.20 – 1.26', '1.03 – 1.06'],
            ['Глина', '1.24 – 1.30', '1.04 – 1.07'],
            ['Скальный грунт', '1.45 – 1.50', '1.20 – 1.30'],
          ],
        }],
        notes: [{ title: 'Важно для вывоза', text: 'При вывозе грунта объём увеличивается на К разрыхления. Самосвал 10 м³ вывезет ~8 м³ грунта в плотном теле.' }],
      },
      {
        title: 'Геотекстиль',
        notes: [
          { title: 'Нахлёст полотен', text: '30 – 50 см' },
          { title: 'Запас на нахлёст', text: '+10–15% к площади' },
          { title: 'Под дорогу (транспорт)', text: '250 – 300 г/м²' },
          { title: 'Под тротуар (пешеходы)', text: '150 – 200 г/м²' },
          { title: 'Под парковку', text: '200 – 300 г/м²' },
        ],
      },
      {
        title: 'Минимальные толщины основания',
        tables: [{
          title: '', columns: ['Нагрузка', 'Щебень, мм', 'Песок, мм', 'Общее, мм'],
          rows: [
            ['Пешеходы', '100', '100', '200'],
            ['Легковые авто', '150', '150', '300'],
            ['Грузовые авто', '200–250', '200', '400–450'],
            ['Тяжёлый транспорт', '250–300', '200–250', '450–550'],
          ],
        }],
      },
    ],
  },
  {
    id: 'concrete', label: 'Бетон', icon: Box,
    color: 'bg-slate-500 text-white',
    sections: [
      {
        title: 'Пропорции бетона (Ц:П:Щ)',
        tables: [{
          title: 'На 1 м³ бетона (цемент М400)', columns: ['Марка', 'Пропорции', 'Цемент, кг', 'Песок, кг', 'Щебень, кг', 'Вода, л'],
          rows: [
            ['М100', '1 : 4 : 6', '200', '800', '1200', '140'],
            ['М200', '1 : 2.8 : 4.8', '280', '700', '1100', '150'],
            ['М300', '1 : 1.9 : 3.7', '350', '600', '1050', '155'],
            ['М400', '1 : 1.2 : 2.7', '420', '530', '1000', '165'],
          ],
        }],
      },
      {
        title: 'Набор прочности',
        tables: [{
          title: 'При температуре +20°C', columns: ['Дни', '% от марочной'],
          rows: [
            ['1', '20–25%'],
            ['3', '40–50%'],
            ['7', '65–75%'],
            ['14', '80–90%'],
            ['28', '100%'],
          ],
        }],
        notes: [
          { title: 'При +5°C', text: 'Скорость набора прочности снижается в 2–3 раза' },
          { title: 'При 0°C и ниже', text: 'Набор прочности прекращается! Необходим прогрев или противоморозные добавки', accent: true },
        ],
      },
      {
        title: 'Температурные режимы',
        notes: [
          { title: 'Мин. температура бетонирования', text: '+5°C (без добавок)', accent: true },
          { title: 'С противоморозными добавками', text: 'до -15°C' },
          { title: 'Время начала схватывания', text: '1–2 часа (от замеса до укладки)' },
          { title: 'Уход за бетоном', text: 'Полив водой 5–7 дней, укрытие плёнкой в жару' },
        ],
      },
    ],
  },
  {
    id: 'curbs', label: 'Бордюры и плитка', icon: PanelTop,
    color: 'bg-blue-600 text-white',
    sections: [
      {
        title: 'Бордюры — расход материалов',
        tables: [{
          title: '', columns: ['Параметр', 'Дорожный БР 100.30.18', 'Садовый БР 100.20.8'],
          rows: [
            ['Размеры, мм', '1000 × 300 × 180', '1000 × 200 × 80'],
            ['Масса, кг', '~95', '~35'],
            ['Бетон на установку', '~0.05 м³/п.м.', '~0.03 м³/п.м.'],
            ['Шт. на 100 п.м.', '100', '100'],
            ['Запас на бой', '+2–3%', '+2–3%'],
          ],
        }],
      },
      {
        title: 'Тротуарная плитка',
        tables: [{
          title: 'Расход материалов', columns: ['Параметр', 'Значение'],
          rows: [
            ['Плитка (с запасом)', 'площадь × 1.05–1.10'],
            ['ЦПС (слой 30–50 мм)', '100–150 кг/м²'],
            ['Щебень основания', '100–150 мм (для авто 200 мм)'],
            ['Песок подстилающий', '50–100 мм'],
            ['Геотекстиль', 'площадь × 1.15'],
          ],
        }],
        notes: [
          { title: 'Запас на подрез', text: '5% (прямая укладка), 10% (диагональная/фигурная)' },
          { title: 'Уклон для водоотвода', text: '1–2% от здания', accent: true },
          { title: 'Ширина шва', text: '2–5 мм (засыпка кварцевым песком)' },
        ],
      },
    ],
  },
  {
    id: 'slopes', label: 'Уклоны и дренаж', icon: Droplets,
    color: 'bg-cyan-600 text-white',
    sections: [
      {
        title: 'Уклоны дорог и площадок',
        tables: [{
          title: '', columns: ['Элемент', 'Уклон'],
          rows: [
            ['Поперечный уклон проезжей части', '15 – 25 ‰ (1.5–2.5%)'],
            ['Продольный уклон дороги (мин.)', '5 ‰ (0.5%)'],
            ['Продольный уклон дороги (макс.)', '60 – 80 ‰ (6–8%)'],
            ['Уклон тротуара поперечный', '10 – 20 ‰ (1–2%)'],
            ['Уклон отмостки', '30 – 50 ‰ (3–5%)'],
            ['Уклон парковки', '15 – 25 ‰ (1.5–2.5%)'],
            ['Пандус для инвалидов (макс.)', '80 ‰ (8%)'],
          ],
        }],
      },
      {
        title: 'Ливневая канализация',
        tables: [{
          title: '', columns: ['Параметр', 'Значение'],
          rows: [
            ['Мин. уклон ∅110 мм', '5 – 7 ‰'],
            ['Мин. уклон ∅160 мм', '3 – 5 ‰'],
            ['Мин. уклон ∅200 мм', '3 – 4 ‰'],
            ['Глубина (под тротуаром)', 'мин. 0.3 м'],
            ['Глубина (под дорогой)', 'мин. 0.7 м'],
            ['Дождеприёмники', 'через 30–50 м и в низинах'],
            ['Смотровые колодцы', 'через 35–50 м, на поворотах'],
          ],
        }],
      },
      {
        title: 'Подсказки',
        notes: [
          { title: 'Перевод ‰ в %', text: '10 ‰ = 1% = 1 см на 1 м длины' },
          { title: 'Перевод уклона в высоту', text: 'Уклон 20‰ на 10 м = 20 см перепада' },
          { title: 'Направление уклона', text: 'Всегда от здания / к дождеприёмникам', accent: true },
        ],
      },
    ],
  },
  {
    id: 'output', label: 'Нормы выработки', icon: Timer,
    color: 'bg-green-600 text-white',
    sections: [
      {
        title: 'Механизированные работы',
        tables: [{
          title: 'За 1 смену (8 ч)', columns: ['Техника / работа', 'Выработка'],
          rows: [
            ['Асфальтоукладчик (50 мм)', '200 – 400 м²'],
            ['Каток вибрационный (уплотнение)', '300 – 600 м²'],
            ['Фреза дорожная (фрезерование)', '300 – 500 м²'],
            ['Экскаватор-погрузчик (выемка)', '50 – 100 м³'],
            ['Гусеничный экскаватор (выемка)', '150 – 300 м³'],
            ['Автогрейдер (планировка)', '1000 – 3000 м²'],
            ['Виброплита (уплотнение осн.)', '200 – 400 м²'],
          ],
        }],
      },
      {
        title: 'Ручные работы (бригада)',
        tables: [{
          title: 'За 1 смену (8 ч)', columns: ['Работа', 'Бригада', 'Выработка'],
          rows: [
            ['Ручная укладка асфальта', '5 чел', '80 – 150 м²'],
            ['Установка бордюра', '3 чел', '50 – 80 п.м.'],
            ['Укладка тротуарной плитки', '2–3 чел', '20 – 40 м²'],
            ['Устройство газона (посевной)', '3 чел', '200 – 500 м²'],
            ['Устройство газона (рулонный)', '3 чел', '100 – 250 м²'],
            ['Копка траншеи вручную', '2 чел', '3 – 5 м³'],
          ],
        }],
      },
      {
        title: 'Расход техники (м/смен на объект)',
        notes: [
          { title: '500 м² асфальтирование', text: 'Укладчик 2 м/см, каток 2 м/см, самосвал 3–5 рейсов' },
          { title: '1000 м² асфальтирование', text: 'Укладчик 3 м/см, каток 3 м/см, самосвал 5–8 рейсов' },
          { title: 'Подготовка основания 500 м²', text: 'Экскаватор-погрузчик 3–5 м/см, виброплита 2 м/см' },
        ],
      },
    ],
  },
];

// ─── Component ───
export const ConstructionReference: React.FC<ConstructionReferenceProps> = ({ theme }) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isDark = theme === 'dark';

  // Стили в зависимости от темы
  const s = {
    bg: isDark ? 'bg-slate-900' : 'bg-white',
    cardBg: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100',
    cardHover: isDark ? 'hover:border-orange-500' : 'hover:border-emerald-300',
    text: isDark ? 'text-slate-200' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    textAccent: isDark ? 'text-orange-400' : 'text-emerald-600',
    heading: isDark ? 'text-slate-500' : 'text-slate-400',
    accent: isDark ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    tableBg: isDark ? 'bg-slate-800/50' : 'bg-slate-50',
    tableHead: isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600',
    tableRow: isDark ? 'border-slate-700' : 'border-slate-100',
    inputBg: isDark ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-orange-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-emerald-500',
    btnBack: isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500',
  };

  const activeData = CATEGORIES.find(c => c.id === activeCategory);

  // Фильтрация секций по поиску
  const filteredSections = useMemo(() => {
    if (!activeData || !searchQuery.trim()) return activeData?.sections || [];
    const q = searchQuery.toLowerCase();
    return activeData.sections.filter(sec => {
      if (sec.title.toLowerCase().includes(q)) return true;
      if (sec.notes?.some(n => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))) return true;
      if (sec.tables?.some(t =>
        t.columns.some(c => c.toLowerCase().includes(q)) ||
        t.rows.some(r => r.some(cell => cell.toLowerCase().includes(q)))
      )) return true;
      return false;
    });
  }, [activeData, searchQuery]);

  // Сетка категорий
  if (!activeCategory) {
    return (
      <div className="space-y-4">
        <h3 className={`text-xs font-black uppercase tracking-widest ${s.heading}`}>Справочник строительных норм</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
              className={`${s.cardBg} rounded-2xl p-4 border ${s.cardHover} transition-all text-center group active:scale-95`}>
              <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                <cat.icon size={22} />
              </div>
              <p className={`text-xs font-bold ${s.text} leading-tight`}>{cat.label}</p>
              <p className={`text-[10px] ${s.textMuted} mt-0.5`}>{cat.sections.length} разделов</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Содержимое категории
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setActiveCategory(null)}
          className={`w-9 h-9 rounded-xl ${s.btnBack} flex items-center justify-center transition-colors`}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          {activeData && (
            <div className={`w-8 h-8 rounded-lg ${activeData.color} flex items-center justify-center`}>
              <activeData.icon size={16} />
            </div>
          )}
          <h3 className={`font-bold ${s.text}`}>{activeData?.label}</h3>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${s.textMuted}`} />
        <input
          type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск по справочнику..."
          className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 ${s.inputBg}`}
        />
      </div>

      {/* Sections */}
      {filteredSections.length > 0 ? (
        <div className="space-y-4">
          {filteredSections.map((sec, si) => (
            <div key={si} className={`${s.cardBg} rounded-2xl border overflow-hidden`}>
              <div className={`px-4 py-2.5 border-b ${s.tableRow}`}>
                <h4 className={`text-xs font-black uppercase tracking-wider ${s.textAccent}`}>{sec.title}</h4>
              </div>

              <div className="p-4 space-y-4">
                {/* Tables */}
                {sec.tables?.map((table, ti) => (
                  <div key={ti} className="overflow-x-auto -mx-1">
                    {table.title && <p className={`text-[10px] font-bold ${s.textMuted} uppercase mb-1.5 px-1`}>{table.title}</p>}
                    <table className="w-full text-xs min-w-[300px]">
                      <thead>
                        <tr>
                          {table.columns.map((col, ci) => (
                            <th key={ci} className={`px-2.5 py-2 text-left font-bold text-[10px] uppercase tracking-wider ${s.tableHead} ${ci === 0 ? 'rounded-tl-lg' : ''} ${ci === table.columns.length - 1 ? 'rounded-tr-lg' : ''}`}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, ri) => (
                          <tr key={ri} className={`border-b ${s.tableRow} last:border-0`}>
                            {row.map((cell, ci) => (
                              <td key={ci} className={`px-2.5 py-2 ${ci === 0 ? `font-medium ${s.text}` : `${s.textMuted} font-mono`}`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Notes */}
                {sec.notes?.map((note, ni) => (
                  <div key={ni} className={`rounded-xl px-3 py-2.5 border ${note.accent ? s.accent : `${s.tableBg} ${s.tableRow}`}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${note.accent ? '' : s.textMuted} mb-0.5`}>{note.title}</p>
                    <p className={`text-sm font-medium ${note.accent ? '' : s.text}`}>{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search size={32} className={`mx-auto ${s.textMuted} mb-2`} />
          <p className={s.textMuted}>Ничего не найдено по запросу "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};
