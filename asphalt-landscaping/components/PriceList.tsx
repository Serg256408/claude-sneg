
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CLIENT_WORK_CATALOG } from '../constants';
import { loadPriceOverrides, savePriceOverrides } from '../services/priceListService';
import { Search, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

const SECTION_ORDER = [
  'Асфальтирование',
  'Устройство основания',
  'Земляные работы',
  'Благоустройство',
  'Озеленение',
  'Инженерные сети',
  'Прочие работы',
];

const SECTION_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'Асфальтирование': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', badge: 'bg-slate-200' },
  'Устройство основания': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-200' },
  'Земляные работы': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-200' },
  'Благоустройство': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-200' },
  'Озеленение': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-200' },
  'Инженерные сети': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-200' },
  'Прочие работы': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-200' },
};

export const PriceList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, number>>(() => loadPriceOverrides());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save
  const debouncedSave = useCallback((newOverrides: Map<string, number>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      savePriceOverrides(newOverrides);
    }, 500);
  }, []);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const handlePriceChange = (itemName: string, value: string) => {
    const num = parseFloat(value);
    const catalogItem = CLIENT_WORK_CATALOG.find(c => c.name === itemName);
    const defaultPrice = catalogItem?.recommendedPrice;

    const newOverrides = new Map(overrides);
    if (value === '' || (defaultPrice !== undefined && num === defaultPrice)) {
      newOverrides.delete(itemName);
    } else if (!isNaN(num) && num >= 0) {
      newOverrides.set(itemName, num);
    }
    setOverrides(newOverrides);
    debouncedSave(newOverrides);
  };

  const handleResetPrice = (itemName: string) => {
    const newOverrides = new Map(overrides);
    newOverrides.delete(itemName);
    setOverrides(newOverrides);
    debouncedSave(newOverrides);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const filteredCatalog = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return CLIENT_WORK_CATALOG.filter(item =>
      !term || item.name.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const groupedBySection = useMemo(() => {
    const map = new Map<string, typeof filteredCatalog>();
    filteredCatalog.forEach(item => {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    });
    // Сортировка по SECTION_ORDER
    const sorted: { section: string; items: typeof filteredCatalog }[] = [];
    SECTION_ORDER.forEach(s => {
      if (map.has(s)) sorted.push({ section: s, items: map.get(s)! });
    });
    // Добавить секции не из порядка
    map.forEach((items, section) => {
      if (!SECTION_ORDER.includes(section)) sorted.push({ section, items });
    });
    return sorted;
  }, [filteredCatalog]);

  const totalOverrides = overrides.size;
  const totalWithPrices = CLIENT_WORK_CATALOG.filter(c => c.recommendedPrice !== undefined || overrides.has(c.name)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Прайс-лист клиентских цен</h3>
            <p className="text-xs text-slate-400 mt-0.5">Рекомендованные цены для автоформирования КП. С ценой: {totalWithPrices} из {CLIENT_WORK_CATALOG.length}</p>
          </div>
          {totalOverrides > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              {totalOverrides} изменено
            </div>
          )}
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Поиск по названию работы..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Sections */}
      {groupedBySection.map(({ section, items }) => {
        const isCollapsed = collapsedSections.has(section);
        const colors = SECTION_COLORS[section] || SECTION_COLORS['Прочие работы'];
        const sectionOverrides = items.filter(i => overrides.has(i.name)).length;

        return (
          <div key={section} className={`bg-white rounded-xl shadow-sm border ${colors.border} overflow-hidden`}>
            {/* Section header */}
            <div
              className={`${colors.bg} px-5 py-3 flex items-center gap-3 cursor-pointer hover:brightness-95 transition-all select-none`}
              onClick={() => toggleSection(section)}
            >
              {isCollapsed
                ? <ChevronRight size={16} className={colors.text} />
                : <ChevronDown size={16} className={colors.text} />
              }
              <span className={`font-bold text-sm uppercase tracking-wider ${colors.text}`}>
                {section}
              </span>
              <span className={`${colors.badge} ${colors.text} text-xs font-bold px-2 py-0.5 rounded-full ml-auto`}>
                {items.length}
              </span>
              {sectionOverrides > 0 && (
                <span className="w-2 h-2 rounded-full bg-orange-500" title={`${sectionOverrides} изменено`}></span>
              )}
            </div>

            {/* Items */}
            {!isCollapsed && (
              <div className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const hasOverride = overrides.has(item.name);
                  const currentPrice = hasOverride ? overrides.get(item.name) : item.recommendedPrice;

                  return (
                    <div key={idx} className={`px-5 py-2.5 flex items-center gap-3 hover:bg-slate-50/50 transition-colors ${hasOverride ? 'bg-orange-50/30' : ''}`}>
                      {/* Indicator */}
                      <div className="w-1.5 shrink-0">
                        {hasOverride && <span className="block w-1.5 h-1.5 rounded-full bg-orange-500"></span>}
                      </div>
                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 leading-snug truncate" title={item.name}>
                          {item.name}
                        </div>
                      </div>
                      {/* Unit */}
                      <div className="text-xs text-slate-400 w-12 text-center shrink-0 font-medium">
                        {item.unit}
                      </div>
                      {/* Price input */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          className={`w-24 text-right text-sm border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                            hasOverride ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
                          } ${currentPrice === undefined ? 'text-slate-300' : 'text-slate-800 font-medium'}`}
                          value={currentPrice ?? ''}
                          onChange={(e) => handlePriceChange(item.name, e.target.value)}
                          placeholder="—"
                          min={0}
                        />
                        <span className="text-xs text-slate-400 w-6">₽</span>
                        {hasOverride && (
                          <button
                            onClick={() => handleResetPrice(item.name)}
                            className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title={`Сбросить к дефолту${item.recommendedPrice ? ` (${item.recommendedPrice} ₽)` : ''}`}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty search */}
      {searchTerm && filteredCatalog.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
          <Search size={32} className="text-slate-300 mx-auto mb-3" />
          <div className="text-slate-400 text-sm">Ничего не найдено по запросу &laquo;{searchTerm}&raquo;</div>
        </div>
      )}
    </div>
  );
};
