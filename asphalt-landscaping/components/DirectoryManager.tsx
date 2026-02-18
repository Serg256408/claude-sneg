
import React, { useState, useMemo } from 'react';
import { Resource, Category } from '../types';
import { SUBGROUP_ORDER } from '../constants';
import { Plus, Search, Trash2, Edit3, Save, X, ChevronDown, ChevronRight, Package, Truck, Users, Brain, DollarSign, FileText, RotateCcw } from 'lucide-react';
import { AIKnowledgeBase } from './AIKnowledgeBase';
import { PriceList } from './PriceList';
import { PricingRulesPanel } from './PricingRulesPanel';

interface DirectoryManagerProps {
  resources: Resource[];
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;
}

const categoryConfig: Record<Category, { label: string; color: string; bgColor: string; borderColor: string; badgeBg: string }> = {
  [Category.MATERIAL]: { label: 'Материалы', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', badgeBg: 'bg-purple-100' },
  [Category.MACHINERY]: { label: 'Техника', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', badgeBg: 'bg-orange-100' },
  [Category.LABOR]: { label: 'Персонал', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', badgeBg: 'bg-blue-100' },
};

const CategoryIcon: React.FC<{ category: Category; size?: number }> = ({ category, size = 20 }) => {
  if (category === Category.MATERIAL) return <Package size={size} />;
  if (category === Category.MACHINERY) return <Truck size={size} />;
  return <Users size={size} />;
};

export const DirectoryManager: React.FC<DirectoryManagerProps> = ({ resources, setResources }) => {
  const [subTab, setSubTab] = useState<'resources' | 'knowledge' | 'pricingrules' | 'pricelist'>('resources');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Resource>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filteredResources = resources.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Группировка: Категория → Подгруппа → Ресурсы
  const categoryGroups = useMemo(() => {
    const categoryOrder = [Category.MATERIAL, Category.MACHINERY, Category.LABOR];

    return categoryOrder.map(cat => {
      const catResources = filteredResources.filter(r => r.category === cat);
      const subGroupMap = new Map<string, Resource[]>();

      // Инициализировать все предустановленные подгруппы (пустые тоже, если нет поиска)
      if (!searchTerm) {
        for (const sg of (SUBGROUP_ORDER[cat] || [])) {
          subGroupMap.set(sg, []);
        }
      }

      for (const res of catResources) {
        const sg = res.subGroup || 'Прочее';
        if (!subGroupMap.has(sg)) subGroupMap.set(sg, []);
        subGroupMap.get(sg)!.push(res);
      }

      const order = SUBGROUP_ORDER[cat] || [];
      const subGroups = Array.from(subGroupMap.entries())
        .sort((a, b) => {
          const ia = order.indexOf(a[0]);
          const ib = order.indexOf(b[0]);
          if (ia === -1 && ib === -1) return a[0].localeCompare(b[0], 'ru');
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        })
        .map(([name, resources]) => ({ name, resources }));

      return { category: cat, totalCount: catResources.length, subGroups };
    });
  }, [filteredResources, searchTerm]);

  const startEdit = (resource: Resource) => {
    setEditingId(resource.id);
    setEditForm({ ...resource });
  };

  const cancelEdit = () => {
    if (editingId) {
      const res = resources.find(r => r.id === editingId);
      if (res && !res.name) {
        setResources(prev => prev.filter(r => r.id !== editingId));
      }
    }
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editingId && editForm.name && editForm.name.trim()) {
      setResources(prev => prev.map(r => r.id === editingId ? ({ ...r, ...editForm } as Resource) : r));
      setEditingId(null);
      setEditForm({});
    }
  };

  const deleteResource = (id: string) => {
    if (confirm('Удалить позицию? Это может повлиять на существующие расчёты.')) {
      setResources(prev => prev.filter(r => r.id !== id));
    }
  };

  const addToGroup = (category: Category, subGroup: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const defaultUnit = category === Category.LABOR ? 'чел/см' : category === Category.MACHINERY ? 'м/см' : 'ед.';
    const newRes: Resource = {
      id,
      name: '',
      category,
      unit: defaultUnit,
      costPerUnit: 0,
      subGroup,
    };
    setResources(prev => [...prev, newRes]);
    startEdit(newRes);

    // Раскрыть эту группу
    const groupKey = `${category}::${subGroup}`;
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.delete(groupKey);
      return next;
    });
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div className="space-y-4">
      {/* Вкладки: Ресурсы / База знаний ИИ */}
      <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
        <button onClick={() => setSubTab('resources')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${subTab === 'resources' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <Package size={18} /> Ресурсы
        </button>
        <button onClick={() => setSubTab('knowledge')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${subTab === 'knowledge' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <Brain size={18} /> База знаний ИИ
        </button>
        <button onClick={() => setSubTab('pricingrules')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${subTab === 'pricingrules' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <FileText size={18} /> Правила КП
        </button>
        <button onClick={() => setSubTab('pricelist')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${subTab === 'pricelist' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
          <DollarSign size={18} /> Прайс-лист
        </button>
      </div>

      {subTab === 'knowledge' && <AIKnowledgeBase />}

      {subTab === 'pricingrules' && <PricingRulesPanel />}

      {subTab === 'pricelist' && <PriceList />}

      {subTab === 'resources' && <>
      {/* Поиск */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Поиск по названию..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-xs text-slate-400 whitespace-nowrap self-center">
          Всего: {resources.length} позиций
        </div>
      </div>

      {/* Категории */}
      {categoryGroups.map(catGroup => {
        const config = categoryConfig[catGroup.category];
        const catTotal = catGroup.subGroups.reduce((sum, sg) => sum + sg.resources.length, 0);

        return (
          <div key={catGroup.category} className={`bg-white rounded-xl shadow-sm border ${config.borderColor} overflow-hidden`}>
            {/* Заголовок категории */}
            <div className={`${config.bgColor} px-5 py-3 flex items-center gap-3 border-b ${config.borderColor}`}>
              <span className={config.color}>
                <CategoryIcon category={catGroup.category} />
              </span>
              <span className={`font-bold text-sm uppercase tracking-wider ${config.color}`}>
                {config.label}
              </span>
              <span className={`${config.badgeBg} ${config.color} text-xs font-bold px-2 py-0.5 rounded-full ml-auto`}>
                {catTotal}
              </span>
            </div>

            {/* Подгруппы */}
            <div className="divide-y divide-slate-100">
              {catGroup.subGroups.map(sg => {
                const groupKey = `${catGroup.category}::${sg.name}`;
                const isCollapsed = collapsedGroups.has(groupKey);

                return (
                  <div key={sg.name}>
                    {/* Заголовок подгруппы */}
                    <div
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-50/70 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                      onClick={() => toggleGroup(groupKey)}
                    >
                      {isCollapsed
                        ? <ChevronRight size={16} className="text-slate-400 shrink-0" />
                        : <ChevronDown size={16} className="text-slate-400 shrink-0" />
                      }
                      <span className="font-semibold text-sm text-slate-700">{sg.name}</span>
                      <span className="text-xs text-slate-400">({sg.resources.length})</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); addToGroup(catGroup.category, sg.name); }}
                        className="ml-auto p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title={`Добавить в "${sg.name}"`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {/* Ресурсы */}
                    {!isCollapsed && sg.resources.length > 0 && (
                      <div>
                        {sg.resources.map((res, idx) => (
                          <div
                            key={res.id}
                            className={`flex items-center gap-3 px-5 py-2 hover:bg-blue-50/30 transition-colors group ${
                              idx < sg.resources.length - 1 ? 'border-b border-slate-50' : ''
                            }`}
                          >
                            {editingId === res.id ? (
                              /* Режим редактирования */
                              <div className="flex-1 space-y-2" onKeyDown={handleKeyDown}>
                                <input
                                  className="w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                  value={editForm.name || ''}
                                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                  placeholder="Наименование"
                                  autoFocus
                                />
                                <div className="flex gap-2 items-center flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <label className="text-[10px] text-slate-400 uppercase">Ед.</label>
                                    <input
                                      className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-500 outline-none w-20"
                                      value={editForm.unit || ''}
                                      onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <label className="text-[10px] text-slate-400 uppercase">Цена</label>
                                    <input
                                      type="number"
                                      className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-500 outline-none w-28"
                                      value={editForm.costPerUnit ?? 0}
                                      onChange={e => setEditForm({ ...editForm, costPerUnit: Number(e.target.value) })}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <label className="text-[10px] text-slate-400 uppercase">Группа</label>
                                    <select
                                      className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                      value={editForm.subGroup || ''}
                                      onChange={e => setEditForm({ ...editForm, subGroup: e.target.value })}
                                    >
                                      {(SUBGROUP_ORDER[editForm.category || catGroup.category] || []).map(sg => (
                                        <option key={sg} value={sg}>{sg}</option>
                                      ))}
                                      <option value="Прочее">Прочее</option>
                                    </select>
                                  </div>
                                  <div className="flex gap-1 ml-auto">
                                    <button
                                      onClick={saveEdit}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded flex items-center gap-1 transition-colors"
                                    >
                                      <Save size={14} /> Сохранить
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-medium rounded flex items-center gap-1 transition-colors"
                                    >
                                      <X size={14} /> Отмена
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Режим просмотра */
                              <>
                                <div className="flex-1 min-w-0 pl-4">
                                  <div className="text-sm text-slate-700 leading-snug" title={res.name}>
                                    {res.name}
                                  </div>
                                </div>
                                <div className="text-xs text-slate-400 w-14 text-center shrink-0 font-medium">
                                  {res.unit}
                                </div>
                                <div className="text-sm font-semibold text-slate-800 w-28 text-right shrink-0 tabular-nums">
                                  {res.costPerUnit.toLocaleString('ru-RU')} <span className="text-slate-400 font-normal text-xs">/</span>
                                </div>
                                <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => startEdit(res)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Редактировать"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    onClick={() => deleteResource(res.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Удалить"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Пустая подгруппа */}
                    {!isCollapsed && sg.resources.length === 0 && !searchTerm && (
                      <div className="px-5 py-3 pl-12 text-xs text-slate-300 italic">
                        Нет позиций
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Пустой результат поиска */}
      {searchTerm && filteredResources.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
          <Search size={32} className="text-slate-300 mx-auto mb-3" />
          <div className="text-slate-400 text-sm">Ничего не найдено по запросу "{searchTerm}"</div>
        </div>
      )}
      </>}
    </div>
  );
};
