
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, RotateCcw, Info } from 'lucide-react';
import { loadPricingRules, savePricingRules, DEFAULT_PRICING_RULES, isPricingRulesCustomized } from '../services/pricingRulesService';

export const PricingRulesPanel: React.FC = () => {
  const [rules, setRules] = useState(() => loadPricingRules());
  const [isCustomized, setIsCustomized] = useState(() => isPricingRulesCustomized());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((value: string) => {
    setRules(value);
    setIsCustomized(value !== DEFAULT_PRICING_RULES);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => savePricingRules(value), 500);
  }, []);

  const handleReset = () => {
    setRules(DEFAULT_PRICING_RULES);
    savePricingRules(DEFAULT_PRICING_RULES);
    setIsCustomized(false);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Правила ценообразования КП</h3>
              <p className="text-xs text-slate-500">Эти правила передаются ИИ при генерации коммерческого предложения</p>
            </div>
          </div>
          {isCustomized && (
            <button onClick={handleReset}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50">
              <RotateCcw size={12} /> Сбросить
            </button>
          )}
        </div>

        <textarea
          value={rules}
          onChange={(e) => handleChange(e.target.value)}
          rows={Math.max(8, rules.split('\n').length + 2)}
          placeholder="Напишите правила ценообразования для ИИ на русском языке..."
          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-mono rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-y leading-relaxed placeholder-slate-400"
        />

        {isCustomized && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span className="text-xs font-bold text-orange-600">Правила изменены</span>
          </div>
        )}
      </div>

      {/* Подсказки */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-2">
            <p className="font-bold">Как писать правила:</p>
            <ul className="space-y-1 list-disc list-inside text-blue-600">
              <li>Указывайте минимальные/максимальные цены для позиций</li>
              <li>Описывайте логику перераспределения (например, "разницу раскидывать на асфальтирование")</li>
              <li>Пишите на русском в свободной форме — ИИ понимает естественный язык</li>
              <li>Правила имеют высший приоритет при формировании КП</li>
            </ul>
            <p className="text-blue-500 mt-2">Примеры: "Бордюр дорожный не менее 1800 руб/п.м", "Самосвал не более 18000 руб/рейс"</p>
          </div>
        </div>
      </div>
    </div>
  );
};
