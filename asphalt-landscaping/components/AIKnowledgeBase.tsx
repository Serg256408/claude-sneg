import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Brain, Cpu, Calculator, Shield, FileCode, Search, Plus, Trash2, Upload, Edit3, Check } from 'lucide-react';
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
type SectionCategory = 'system' | 'norms' | 'rules' | 'format';

function parseMdToSections(md: string): AIKnowledgeSection[] {
  const lines = md.split('\n');
  const sections: AIKnowledgeSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];
  let order = 1;

  const flush = () => {
    if (currentTitle && currentContent.length > 0) {
      const text = currentContent.join('\n').trim();
      if (text) {
        const lower = currentTitle.toLowerCase();
        let category: SectionCategory = 'norms';
        if (lower.includes('роль') || lower.includes('инструкция')) category = 'system';
        else if (lower.includes('правил') || lower.includes('проверк') || lower.includes('сценари') || lower.includes('включени')) category = 'rules';
        else if (lower.includes('формат') || lower.includes('json') || lower.includes('выход')) category = 'format';

        sections.push({
          id: `import_${order}`,
          title: currentTitle,
          category,
          order: order++,
          content: text,
        });
      }
    }
  };

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      flush();
      currentTitle = line.replace(/^#+\s*/, '').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  flush();
  return sections;
}

export const AIKnowledgeBase: React.FC = () => {
  const [sections, setSections] = useState<AIKnowledgeSection[]>(loadKnowledgeSections);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(sections.map(s => s.id)));
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [search, setSearch] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const updateCategory = (id: string, category: SectionCategory) => {
    const updated = sections.map(s => s.id === id ? { ...s, category } : s);
    setSections(updated);
    saveKnowledgeSections(updated);
  };

  const startEditTitle = (id: string, title: string) => {
    setEditingTitleId(id);
    setEditTitleValue(title);
  };

  const saveTitle = (id: string) => {
    if (editTitleValue.trim()) {
      const updated = sections.map(s => s.id === id ? { ...s, title: editTitleValue.trim() } : s);
      setSections(updated);
      saveKnowledgeSections(updated);
    }
    setEditingTitleId(null);
  };

  const resetSection = (id: string) => {
    const def = getDefaultSection(id);
    if (!def) return;
    const updated = sections.map(s => s.id === id ? { ...s, content: def.content } : s);
    setSections(updated);
    saveKnowledgeSections(updated);
  };

  const resetAll = () => {
    if (!confirm('Сбросить все секции к значениям по умолчанию? Пользовательские секции будут удалены, стандартные — восстановлены.')) return;
    const fresh = [...DEFAULT_AI_KNOWLEDGE];
    setSections(fresh);
    saveKnowledgeSections(fresh);
    setExpandedIds(new Set(fresh.map(s => s.id)));
  };

  const addSection = () => {
    const maxOrder = sections.reduce((max, s) => Math.max(max, s.order), 0);
    const newSection: AIKnowledgeSection = {
      id: `custom_${Date.now()}`,
      title: 'Новая секция',
      category: 'norms',
      order: maxOrder + 1,
      content: '',
    };
    const updated = [...sections, newSection];
    setSections(updated);
    saveKnowledgeSections(updated);
    setExpandedIds(prev => new Set([...prev, newSection.id]));
    setEditingTitleId(newSection.id);
    setEditTitleValue('Новая секция');
  };

  const deleteSection = (id: string) => {
    const section = sections.find(s => s.id === id);
    if (!section) return;
    if (!confirm(`Удалить секцию «${section.title}»?`)) return;
    const updated = sections.filter(s => s.id !== id);
    setSections(updated);
    saveKnowledgeSections(updated);
  };

  const handleImportMd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const imported = parseMdToSections(text);
      if (imported.length === 0) {
        alert('Не удалось разобрать файл. Убедитесь что заголовки начинаются с # или ##');
        return;
      }
      const mode = confirm(
        `Найдено ${imported.length} секций. Нажмите ОК чтобы ЗАМЕНИТЬ все секции, или Отмена чтобы ДОБАВИТЬ к существующим.`
      );
      if (mode) {
        setSections(imported);
        saveKnowledgeSections(imported);
        setExpandedIds(new Set(imported.map(s => s.id)));
      } else {
        const maxOrder = sections.reduce((max, s) => Math.max(max, s.order), 0);
        const withOrder = imported.map((s, i) => ({ ...s, order: maxOrder + i + 1 }));
        const updated = [...sections, ...withOrder];
        setSections(updated);
        saveKnowledgeSections(updated);
        setExpandedIds(prev => new Set([...prev, ...withOrder.map(s => s.id)]));
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const filteredSections = sections
    .filter(s => filter === 'all' || s.category === filter)
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase()));

  const customizedCount = sections.filter(s => isSectionCustomized(s)).length;
  const isDefault = (id: string) => DEFAULT_AI_KNOWLEDGE.some(d => d.id === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} accept=".md,.txt" onChange={handleImportMd} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-purple-600 hover:bg-purple-50 border border-purple-200 transition-all">
            <Upload size={14} /> Импорт .md
          </button>
          <button onClick={resetAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all">
            <RotateCcw size={14} /> Сбросить всё
          </button>
        </div>
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
          const canDelete = !isDefault(section.id);

          return (
            <div key={section.id} className={`bg-white rounded-2xl border transition-all ${customized ? 'border-orange-200 shadow-sm shadow-orange-100' : 'border-slate-200'}`}>
              {/* Section header */}
              <button onClick={() => toggleExpand(section.id)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-slate-50/50 transition-colors rounded-2xl">
                {expanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingTitleId === section.id ? (
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <input
                          value={editTitleValue}
                          onChange={e => setEditTitleValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveTitle(section.id); if (e.key === 'Escape') setEditingTitleId(null); }}
                          autoFocus
                          className="text-sm font-bold text-slate-800 border-b-2 border-purple-400 bg-transparent outline-none px-0.5"
                        />
                        <button onClick={() => saveTitle(section.id)} className="text-purple-600 hover:text-purple-800">
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-slate-800">{section.title}</span>
                        {customized && <span className="w-2 h-2 bg-orange-500 rounded-full" title="Изменено" />}
                      </>
                    )}
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
                  {/* Title + Category row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => startEditTitle(section.id, section.title)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-all">
                      <Edit3 size={10} /> Переименовать
                    </button>
                    <select
                      value={section.category}
                      onChange={e => updateCategory(section.id, e.target.value as SectionCategory)}
                      className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
                    >
                      <option value="system">Система</option>
                      <option value="norms">Нормы</option>
                      <option value="rules">Правила</option>
                      <option value="format">Формат</option>
                    </select>
                    {canDelete && (
                      <button onClick={() => deleteSection(section.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all ml-auto">
                        <Trash2 size={10} /> Удалить
                      </button>
                    )}
                  </div>

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
                    {customized && isDefault(section.id) && (
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

      {/* Add section button */}
      <button onClick={addSection}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-400 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/50 transition-all">
        <Plus size={18} /> Добавить секцию
      </button>
    </div>
  );
};
