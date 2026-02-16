import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Brain, Cpu, Calculator, Shield, FileCode, Search } from 'lucide-react';
import { AIKnowledgeSection } from '../types';
import { DEFAULT_AI_KNOWLEDGE } from '../constants';
import { loadKnowledgeSections, saveKnowledgeSections, isSectionCustomized, getDefaultSection } from '../services/knowledgeBaseService';

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  system: { label: 'Система', color: 'text-blue-600', bg: 'bg-blue-100', icon: Cpu },
  norms: { label: 'Нормы', color: 'text-purple-600', bg: 'bg-purple-100', icon: Calculator },
  rules: { label: 'Правила', color: 'text-orange-600', bg: 'bg-orange-100', icon: Shield },
  format: { label: 'Формат', color: 'text-green-600', bg: 'bg-green-100', icon: FileCode },
};

type FilterCategory = 'all' | 'system' | 'norms' | 'rules' | 'format';

export const AIKnowledgeBase: React.FC = () => {
  const [sections, setSections] = useState<AIKnowledgeSection[]>(loadKnowledgeSections);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(sections.map(s => s.id)));
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [search, setSearch] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback((updated: AIKnowledgeSection[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveKnowledgeSections(updated), 500);
  }, []);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateContent = (id: string, content: string) => {
    const updated = sections.map(s => s.id === id ? { ...s, content } : s);
    setSections(updated);
    debouncedSave(updated);
  };

  const resetSection = (id: string) => {
    const def = getDefaultSection(id);
    if (!def) return;
    const updated = sections.map(s => s.id === id ? { ...s, content: def.content } : s);
    setSections(updated);
    saveKnowledgeSections(updated);
  };

  const resetAll = () => {
    if (!confirm('Сбросить все секции к значениям по умолчанию? Ваши изменения будут потеряны.')) return;
    const fresh = [...DEFAULT_AI_KNOWLEDGE];
    setSections(fresh);
    saveKnowledgeSections(fresh);
  };

  const filteredSections = sections
    .filter(s => filter === 'all' || s.category === filter)
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase()));

  const customizedCount = sections.filter(s => isSectionCustomized(s)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
            <Brain size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">База знаний ИИ</h2>
            <p className="text-xs text-slate-500">
              {sections.length} секций{customizedCount > 0 && <span className="text-orange-500 font-bold ml-1">({customizedCount} изменено)</span>}
            </p>
          </div>
        </div>
        <button onClick={resetAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all">
          <RotateCcw size={14} /> Сбросить всё
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200/50 rounded-2xl p-5">
        <p className="text-sm text-slate-700 leading-relaxed">
          Здесь хранятся все правила и нормы, которые ИИ использует при генерации смет. Измените коэффициенты, добавьте новые правила — ИИ сразу начнёт их учитывать.
        </p>
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
          {([
            { id: 'all' as const, label: 'Все' },
            { id: 'system' as const, label: 'Система' },
            { id: 'norms' as const, label: 'Нормы' },
            { id: 'rules' as const, label: 'Правила' },
            { id: 'format' as const, label: 'Формат' },
          ]).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по содержимому..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {filteredSections.map(section => {
          const cat = CATEGORY_CONFIG[section.category];
          const expanded = expandedIds.has(section.id);
          const customized = isSectionCustomized(section);
          const CatIcon = cat.icon;

          return (
            <div key={section.id} className={`bg-white rounded-2xl border transition-all ${customized ? 'border-orange-200 shadow-sm shadow-orange-100' : 'border-slate-200'}`}>
              {/* Section header */}
              <button onClick={() => toggleExpand(section.id)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-slate-50/50 transition-colors rounded-2xl">
                {expanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{section.title}</span>
                    {customized && <span className="w-2 h-2 bg-orange-500 rounded-full" title="Изменено" />}
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${cat.bg} ${cat.color}`}>
                  <CatIcon size={12} />
                  {cat.label}
                </div>
              </button>

              {/* Section content */}
              {expanded && (
                <div className="px-5 pb-5 space-y-3">
                  <textarea
                    value={section.content}
                    onChange={e => updateContent(section.id, e.target.value)}
                    rows={Math.max(4, section.content.split('\n').length + 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-mono leading-relaxed focus:ring-2 focus:ring-purple-500 focus:border-purple-300 outline-none resize-y"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold">
                      {section.content.length} символов
                    </span>
                    {customized && (
                      <button onClick={() => resetSection(section.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-orange-600 hover:bg-orange-50 border border-orange-200 transition-all">
                        <RotateCcw size={10} /> Сбросить
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-sm">Нет секций, подходящих под фильтр</p>
        </div>
      )}
    </div>
  );
};
