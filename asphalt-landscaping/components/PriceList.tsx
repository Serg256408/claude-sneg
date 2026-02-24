
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CLIENT_WORK_CATALOG, ClientWorkCatalogItem } from '../constants';
import {
  loadPriceOverrides, savePriceOverrides,
  loadCustomItems, saveCustomItems,
  loadHiddenItems, saveHiddenItems,
  loadRenames, saveRenames,
  loadUnitOverrides, saveUnitOverrides,
} from '../services/priceListService';
import { Search, ChevronDown, ChevronRight, RotateCcw, Plus, Trash2, FolderPlus, Edit3, Check, X, Save } from 'lucide-react';

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

const DEFAULT_COLORS = { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', badge: 'bg-teal-200' };

export const PriceList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, number>>(() => loadPriceOverrides());
  const [customItems, setCustomItems] = useState<ClientWorkCatalogItem[]>(() => loadCustomItems());
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(() => loadHiddenItems());
  const [renames, setRenames] = useState<Map<string, string>>(() => loadRenames());
  const [unitOverrides, setUnitOverrides] = useState<Map<string, string>>(() => loadUnitOverrides());
  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('м²');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [dirty, setDirty] = useState(false);
  const newItemRef = useRef<HTMLInputElement>(null);
  const newSectionRef = useRef<HTMLInputElement>(null);
  const editNameRef = useRef<HTMLInputElement>(null);

  const defaultItemNames = useMemo(() => new Set(CLIENT_WORK_CATALOG.map(c => c.name)), []);

  useEffect(() => {
    if (addingToSection && newItemRef.current) newItemRef.current.focus();
  }, [addingToSection]);

  useEffect(() => {
    if (showNewSection && newSectionRef.current) newSectionRef.current.focus();
  }, [showNewSection]);

  useEffect(() => {
    if (editingName && editNameRef.current) editNameRef.current.focus();
  }, [editingName]);

  // Полный каталог с учётом скрытых и переименований
  const allItems = useMemo(() => {
    const base = CLIENT_WORK_CATALOG
      .filter(c => !hiddenItems.has(c.name))
      .map(c => {
        let item = c;
        if (renames.has(c.name)) item = { ...item, name: renames.get(c.name)! };
        if (unitOverrides.has(c.name)) item = { ...item, unit: unitOverrides.get(c.name)! };
        return item;
      });
    return [...base, ...customItems];
  }, [customItems, hiddenItems, renames, unitOverrides]);

  // Найти оригинальное имя (для дефолтных — ключ в renames, для кастомных — name)
  const getOriginalName = (displayName: string): string | undefined => {
    for (const [orig, renamed] of renames.entries()) {
      if (renamed === displayName) return orig;
    }
    return undefined;
  };

  const handlePriceChange = (itemName: string, value: string) => {
    const num = parseFloat(value);
    const catalogItem = allItems.find(c => c.name === itemName);
    const defaultPrice = catalogItem?.recommendedPrice;

    const newOverrides = new Map(overrides);
    if (value === '' || (defaultPrice !== undefined && num === defaultPrice)) {
      newOverrides.delete(itemName);
    } else if (!isNaN(num) && num >= 0) {
      newOverrides.set(itemName, num);
    }
    setOverrides(newOverrides);
    setDirty(true);
  };

  const handleResetPrice = (itemName: string) => {
    const newOverrides = new Map(overrides);
    newOverrides.delete(itemName);
    setOverrides(newOverrides);
    setDirty(true);
  };

  const handleSaveAll = () => {
    savePriceOverrides(overrides);
    saveCustomItems(customItems);
    saveHiddenItems(hiddenItems);
    saveRenames(renames);
    saveUnitOverrides(unitOverrides);
    setDirty(false);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // ═══ Удаление позиции ═══
  const handleDeleteItem = (displayName: string) => {
    const origName = getOriginalName(displayName);
    const isDefault = origName ? defaultItemNames.has(origName) : defaultItemNames.has(displayName);

    if (isDefault) {
      const realName = origName || displayName;
      const newHidden = new Set(hiddenItems);
      newHidden.add(realName);
      setHiddenItems(newHidden);
      if (origName) {
        const newRenames = new Map(renames);
        newRenames.delete(origName);
        setRenames(newRenames);
      }
      const newOverrides = new Map(overrides);
      newOverrides.delete(displayName);
      if (origName) newOverrides.delete(origName);
      setOverrides(newOverrides);
    } else {
      const updated = customItems.filter(c => c.name !== displayName);
      setCustomItems(updated);
      const newOverrides = new Map(overrides);
      newOverrides.delete(displayName);
      setOverrides(newOverrides);
    }
    setDirty(true);
  };

  // ═══ Редактирование имени ═══
  const startEditName = (displayName: string) => {
    setEditingName(displayName);
    setEditNameValue(displayName);
  };

  const saveEditName = () => {
    if (!editingName || !editNameValue.trim() || editNameValue.trim() === editingName) {
      setEditingName(null);
      return;
    }
    const newName = editNameValue.trim();
    const origName = getOriginalName(editingName);
    const isDefault = origName ? defaultItemNames.has(origName) : defaultItemNames.has(editingName);

    if (isDefault) {
      const realOrigName = origName || editingName;
      const newRenames = new Map(renames);
      newRenames.set(realOrigName, newName);
      setRenames(newRenames);
      const newOverrides = new Map(overrides);
      const oldPrice = newOverrides.get(editingName);
      if (oldPrice !== undefined) {
        newOverrides.delete(editingName);
        newOverrides.set(newName, oldPrice);
        setOverrides(newOverrides);
      }
    } else {
      const updated = customItems.map(c => c.name === editingName ? { ...c, name: newName } : c);
      setCustomItems(updated);
      const newOverrides = new Map(overrides);
      const oldPrice = newOverrides.get(editingName);
      if (oldPrice !== undefined) {
        newOverrides.delete(editingName);
        newOverrides.set(newName, oldPrice);
        setOverrides(newOverrides);
      }
    }
    setDirty(true);
    setEditingName(null);
  };

  // ═══ Добавление позиции ═══
  const handleAddItem = (section: string) => {
    if (!newItemName.trim()) return;
    const item: ClientWorkCatalogItem = {
      name: newItemName.trim(),
      unit: newItemUnit,
      section,
      recommendedPrice: newItemPrice ? parseFloat(newItemPrice) : undefined,
    };
    const updated = [...customItems, item];
    setCustomItems(updated);
    setDirty(true);
    setNewItemName('');
    setNewItemUnit('м²');
    setNewItemPrice('');
    setAddingToSection(null);
  };

  // ═══ Добавление раздела ═══
  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    setShowNewSection(false);
    setNewSectionName('');
    setAddingToSection(newSectionName.trim());
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.delete(newSectionName.trim());
      return next;
    });
  };

  // ═══ Восстановление удалённых ═══
  // ═══ Изменение единицы измерения ═══
  const handleUnitChange = (displayName: string, newUnit: string) => {
    const origName = getOriginalName(displayName);
    const isDefault = origName ? defaultItemNames.has(origName) : defaultItemNames.has(displayName);

    if (isDefault) {
      const realName = origName || displayName;
      const newUnits = new Map(unitOverrides);
      const catalogItem = CLIENT_WORK_CATALOG.find(c => c.name === realName);
      if (catalogItem && catalogItem.unit === newUnit) {
        newUnits.delete(realName);
      } else {
        newUnits.set(realName, newUnit);
      }
      setUnitOverrides(newUnits);
    } else {
      const updated = customItems.map(c => c.name === displayName ? { ...c, unit: newUnit } : c);
      setCustomItems(updated);
    }
    setDirty(true);
  };

  const handleRestoreAll = () => {
    setHiddenItems(new Set());
    setRenames(new Map());
    setUnitOverrides(new Map());
    setDirty(true);
  };

  const filteredCatalog = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return allItems.filter(item =>
      !term || item.name.toLowerCase().includes(term)
    );
  }, [searchTerm, allItems]);

  const groupedBySection = useMemo(() => {
    const map = new Map<string, typeof filteredCatalog>();
    filteredCatalog.forEach(item => {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    });
    if (addingToSection && !map.has(addingToSection)) {
      map.set(addingToSection, []);
    }
    const sorted: { section: string; items: typeof filteredCatalog }[] = [];
    SECTION_ORDER.forEach(s => {
      if (map.has(s)) sorted.push({ section: s, items: map.get(s)! });
    });
    map.forEach((items, section) => {
      if (!SECTION_ORDER.includes(section)) sorted.push({ section, items });
    });
    return sorted;
  }, [filteredCatalog, addingToSection]);

  const totalWithPrices = allItems.filter(c => c.recommendedPrice !== undefined || overrides.has(c.name)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Прайс-лист клиентских цен</h3>
            <p className="text-xs text-slate-400 mt-0.5">С ценой: {totalWithPrices} из {allItems.length}{hiddenItems.size > 0 && <span className="text-red-400 ml-1">({hiddenItems.size} скрыто)</span>}</p>
          </div>
          <div className="flex items-center gap-2">
            {hiddenItems.size > 0 && (
              <button onClick={handleRestoreAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50 border border-slate-200 rounded-lg transition-colors">
                <RotateCcw size={12} /> Восстановить удалённые
              </button>
            )}
            <button
              onClick={handleSaveAll}
              disabled={!dirty}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                dirty
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-default'
              }`}
            >
              <Save size={14} /> Сохранить
            </button>
          </div>
        </div>
        {/* Search + Add buttons */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по названию работы..."
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setShowNewSection(true); setNewSectionName(''); }}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold hover:bg-teal-100 transition-colors whitespace-nowrap"
          >
            <FolderPlus size={14} /> Раздел
          </button>
        </div>
        {/* New section input */}
        {showNewSection && (
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg p-3">
            <input
              ref={newSectionRef}
              type="text"
              className="flex-1 text-sm border border-teal-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Название нового раздела..."
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setShowNewSection(false); }}
            />
            <button onClick={handleAddSection} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition-colors">Создать</button>
            <button onClick={() => setShowNewSection(false)} className="px-3 py-2 text-slate-500 text-xs font-bold hover:bg-slate-100 rounded-lg transition-colors">Отмена</button>
          </div>
        )}
      </div>

      {/* Sections */}
      {groupedBySection.map(({ section, items }) => {
        const isCollapsed = collapsedSections.has(section);
        const colors = SECTION_COLORS[section] || DEFAULT_COLORS;
        const sectionCustomCount = items.filter(i => !defaultItemNames.has(i.name) && !getOriginalName(i.name)).length;

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
              {sectionCustomCount > 0 && (
                <span className="text-[10px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded">+{sectionCustomCount}</span>
              )}
            </div>

            {/* Items */}
            {!isCollapsed && (
              <div className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const hasOverride = overrides.has(item.name);
                  const currentPrice = hasOverride ? overrides.get(item.name) : item.recommendedPrice;
                  const origName = getOriginalName(item.name);
                  const isCustom = !defaultItemNames.has(item.name) && !origName;
                  const isRenamed = !!origName;
                  const isEditing = editingName === item.name;

                  return (
                    <div key={idx} className={`px-5 py-2.5 flex items-center gap-2 hover:bg-slate-50/50 transition-colors ${isCustom ? 'bg-teal-50/20' : ''}`}>
                      {/* Name — editable */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={editNameRef}
                              type="text"
                              className="flex-1 text-sm border border-blue-400 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                              value={editNameValue}
                              onChange={e => setEditNameValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveEditName(); if (e.key === 'Escape') setEditingName(null); }}
                            />
                            <button onClick={saveEditName} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Check size={14} /></button>
                            <button onClick={() => setEditingName(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button>
                          </div>
                        ) : (
                          <div
                            className="text-sm text-slate-700 leading-snug truncate cursor-pointer hover:text-blue-600 group flex items-center gap-1"
                            title={`${item.name} — кликни для редактирования`}
                            onClick={() => startEditName(item.name)}
                          >
                            <span className="truncate">{item.name}</span>
                            <Edit3 size={11} className="text-slate-300 group-hover:text-blue-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isRenamed && <span className="text-[9px] text-blue-500 shrink-0">изм.</span>}
                          </div>
                        )}
                      </div>
                      {/* Unit */}
                      <select
                        className="text-xs text-slate-500 w-16 text-center shrink-0 font-medium border border-transparent hover:border-slate-300 rounded-lg py-1 outline-none focus:ring-2 focus:ring-orange-500 bg-transparent cursor-pointer appearance-none"
                        value={item.unit}
                        onChange={(e) => handleUnitChange(item.name, e.target.value)}
                      >
                        {['м²', 'м³', 'п.м', 'шт', 'т', 'компл.', 'рейс', 'м/см'].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                        {!['м²', 'м³', 'п.м', 'шт', 'т', 'компл.', 'рейс', 'м/см'].includes(item.unit) && (
                          <option value={item.unit}>{item.unit}</option>
                        )}
                      </select>
                      {/* Price input */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          className={`w-24 text-right text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                            currentPrice === undefined ? 'text-slate-300' : 'text-slate-800 font-medium'
                          }`}
                          value={currentPrice ?? ''}
                          onChange={(e) => handlePriceChange(item.name, e.target.value)}
                          placeholder="—"
                          min={0}
                        />
                        <span className="text-xs text-slate-400 w-4">₽</span>
                        {hasOverride && (
                          <button
                            onClick={() => handleResetPrice(item.name)}
                            className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title={`Сбросить (${item.recommendedPrice ?? '—'} ₽)`}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.name)}
                          className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Удалить позицию"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add item form */}
                {addingToSection === section ? (
                  <div className="px-5 py-3 bg-teal-50/50 border-t border-teal-200">
                    <div className="flex items-center gap-2">
                      <input
                        ref={newItemRef}
                        type="text"
                        className="flex-1 text-sm border border-teal-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Наименование работы..."
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddItem(section); if (e.key === 'Escape') setAddingToSection(null); }}
                      />
                      <select
                        className="text-sm border border-teal-300 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-teal-500 w-20"
                        value={newItemUnit}
                        onChange={e => setNewItemUnit(e.target.value)}
                      >
                        <option value="м²">м²</option>
                        <option value="м³">м³</option>
                        <option value="п.м">п.м</option>
                        <option value="шт">шт</option>
                        <option value="т">т</option>
                        <option value="компл.">компл.</option>
                        <option value="рейс">рейс</option>
                        <option value="м/см">м/см</option>
                      </select>
                      <input
                        type="number"
                        className="w-24 text-right text-sm border border-teal-300 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Цена"
                        value={newItemPrice}
                        onChange={e => setNewItemPrice(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddItem(section); }}
                        min={0}
                      />
                      <span className="text-xs text-slate-400">₽</span>
                      <button onClick={() => handleAddItem(section)} className="px-3 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition-colors">Добавить</button>
                      <button onClick={() => setAddingToSection(null)} className="px-2 py-2 text-slate-500 text-xs font-bold hover:bg-slate-100 rounded-lg transition-colors">✕</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingToSection(section); setNewItemName(''); setNewItemUnit('м²'); setNewItemPrice(''); }}
                    className="w-full px-5 py-2 text-xs font-bold text-teal-600 hover:bg-teal-50 transition-colors flex items-center gap-1.5 justify-center"
                  >
                    <Plus size={12} /> Добавить позицию
                  </button>
                )}
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
