
import { ClientWorkCatalogItem, CLIENT_WORK_CATALOG } from '../constants';

const STORAGE_KEY = 'asphalt_client_pricelist';
const CUSTOM_ITEMS_KEY = 'asphalt_client_pricelist_custom';
const HIDDEN_KEY = 'asphalt_client_pricelist_hidden';
const RENAMES_KEY = 'asphalt_client_pricelist_renames';

// ═══ Overrides цен ═══

export function loadPriceOverrides(): Map<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed: Record<string, number> = JSON.parse(raw);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export function savePriceOverrides(overrides: Map<string, number>): void {
  const obj: Record<string, number> = {};
  overrides.forEach((value, key) => { obj[key] = value; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

export function getRecommendedPrice(itemName: string, overrides: Map<string, number>): number | undefined {
  if (overrides.has(itemName)) return overrides.get(itemName);
  const catalogItem = CLIENT_WORK_CATALOG.find(c => c.name === itemName);
  return catalogItem?.recommendedPrice;
}

export function getAllPricesWithOverrides(overrides: Map<string, number>): Map<string, number> {
  const result = new Map<string, number>();
  const all = getFullCatalog();
  all.forEach(item => {
    const override = overrides.get(item.name);
    if (override !== undefined) {
      result.set(item.name, override);
    } else if (item.recommendedPrice !== undefined) {
      result.set(item.name, item.recommendedPrice);
    }
  });
  return result;
}

// ═══ Пользовательские позиции ═══

export function loadCustomItems(): ClientWorkCatalogItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ITEMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomItems(items: ClientWorkCatalogItem[]): void {
  localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items));
}

// ═══ Скрытые (удалённые) дефолтные позиции ═══

export function loadHiddenItems(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function saveHiddenItems(hidden: Set<string>): void {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
}

// ═══ Переименования дефолтных позиций ═══

export function loadRenames(): Map<string, string> {
  try {
    const raw = localStorage.getItem(RENAMES_KEY);
    if (!raw) return new Map();
    const parsed: Record<string, string> = JSON.parse(raw);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export function saveRenames(renames: Map<string, string>): void {
  const obj: Record<string, string> = {};
  renames.forEach((value, key) => { obj[key] = value; });
  localStorage.setItem(RENAMES_KEY, JSON.stringify(obj));
}

// ═══ Переопределения единиц измерения ═══

const UNITS_KEY = 'asphalt_client_pricelist_units';

export function loadUnitOverrides(): Map<string, string> {
  try {
    const raw = localStorage.getItem(UNITS_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
}

export function saveUnitOverrides(units: Map<string, string>): void {
  const obj: Record<string, string> = {};
  units.forEach((v, k) => { obj[k] = v; });
  localStorage.setItem(UNITS_KEY, JSON.stringify(obj));
}

// ═══ Полный каталог (с учётом скрытых, переименований, единиц) ═══

export function getFullCatalog(): ClientWorkCatalogItem[] {
  const hidden = loadHiddenItems();
  const renames = loadRenames();
  const unitOv = loadUnitOverrides();
  const base = CLIENT_WORK_CATALOG
    .filter(c => !hidden.has(c.name))
    .map(c => {
      let item = c;
      if (renames.has(c.name)) item = { ...item, name: renames.get(c.name)! };
      if (unitOv.has(c.name)) item = { ...item, unit: unitOv.get(c.name)! };
      return item;
    });
  return [...base, ...loadCustomItems()];
}
