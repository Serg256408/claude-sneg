const STORAGE_KEY = 'asphalt_pricing_rules';

export const DEFAULT_PRICING_RULES = `1. Установка бортового камня дорожного — не менее 1800 руб/п.м
2. Установка бортового камня садового — не менее 1000 руб/п.м
3. Вывоз грунта/мусора самосвалом — не более 18000 руб/рейс
4. Фрезерование — не менее 200 руб/м²
5. Мощение тротуарной плиткой — не менее 1500 руб/м²
6. Если цена бордюров или других позиций выросла — разницу компенсировать корректировкой цены асфальтовых работ, сохраняя целевую сумму КП
7. Основная статья для перераспределения — асфальтирование`;

export function loadPricingRules(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_PRICING_RULES;
}

export function savePricingRules(rules: string): void {
  localStorage.setItem(STORAGE_KEY, rules);
}

export function resetPricingRules(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isPricingRulesCustomized(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved !== null && saved !== DEFAULT_PRICING_RULES;
}
