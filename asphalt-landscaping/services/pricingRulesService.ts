const STORAGE_KEY = 'asphalt_pricing_rules';

export const DEFAULT_PRICING_RULES = `1. Установка бортового камня дорожного — не менее 1800 руб/п.м
2. Установка бортового камня садового — не менее 1000 руб/п.м
3. Вывоз грунта/мусора самосвалом — не более 18000 руб/рейс
4. Фрезерование — не менее 200 руб/м²
5. Мощение тротуарной плиткой — не менее 1500 руб/м²
6. Если цена бордюров или других позиций выросла — разницу компенсировать корректировкой цены асфальтовых работ, сохраняя целевую сумму КП
7. Основная статья для перераспределения — асфальтирование
8. При выемке грунта — ВСЕГДА включать в КП строку «Разработка грунта с вывозом на утилизацию» в раздел «Земляные работы». Цена выемки + вывоз самосвалами — от 1000 руб/м³ (включает работу экскаватора, погрузку и вывоз самосвалами 20 м³)
9. Объём вывоза грунта = площадь × глубина выемки(м) × коэфф. разрыхления 1.25
10. Доставку а/б смеси самосвалами НЕ выделять отдельной строкой в КП — стоимость доставки включается в цену укладки асфальта (руб/м²)`;

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
