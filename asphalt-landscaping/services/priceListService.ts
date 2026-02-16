
import { ClientWorkCatalogItem, CLIENT_WORK_CATALOG } from '../constants';

const STORAGE_KEY = 'asphalt_client_pricelist';

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
  // Сначала проверяем пользовательскую цену
  if (overrides.has(itemName)) return overrides.get(itemName);
  // Затем дефолт из каталога
  const catalogItem = CLIENT_WORK_CATALOG.find(c => c.name === itemName);
  return catalogItem?.recommendedPrice;
}

export function getAllPricesWithOverrides(overrides: Map<string, number>): Map<string, number> {
  const result = new Map<string, number>();
  CLIENT_WORK_CATALOG.forEach(item => {
    const override = overrides.get(item.name);
    if (override !== undefined) {
      result.set(item.name, override);
    } else if (item.recommendedPrice !== undefined) {
      result.set(item.name, item.recommendedPrice);
    }
  });
  return result;
}
