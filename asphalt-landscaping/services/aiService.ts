
import { Project, Resource, Category } from "../types";

// API-ключ хранится в localStorage
const STORAGE_KEY = 'asphalt_ai_api_key';

export const getApiKey = (): string => localStorage.getItem(STORAGE_KEY) || '';
export const setApiKey = (key: string) => localStorage.setItem(STORAGE_KEY, key);
export const hasApiKey = (): boolean => !!getApiKey();

// Claude API (Anthropic, Sonnet 4.5)
const callClaude = async (system: string, userMessage: string, jsonMode = false): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API-ключ не настроен');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: system + (jsonMode ? '\nОтвечай СТРОГО в формате JSON, без markdown-обёртки.' : ''),
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Неверный API-ключ Anthropic. Проверьте ключ в настройках.');
    if (response.status === 429) throw new Error('Превышен лимит запросов. Подождите минуту.');
    throw new Error(err.error?.message || `Ошибка API: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  return text;
};

export const analyzeProfitability = async (project: Project, resources: Resource[]): Promise<string> => {
  const totalCost = project.items.reduce((acc, item) => acc + item.totalCost, 0);
  const profit = project.contractPrice - totalCost;
  const margin = project.contractPrice > 0 ? (profit / project.contractPrice) * 100 : 0;

  return callClaude(
    'Ты — эксперт по расчёту строительных смет для дорожного строительства и благоустройства в России. Отвечай на русском языке, используй Markdown.',
    `Проанализируй проект:
Название: ${project.name}
Площадь: ${project.areaSize} м²
Себестоимость: ${totalCost} ₽
Цена контракта: ${project.contractPrice} ₽
Прибыль: ${profit} ₽
Маржа: ${margin.toFixed(1)}%

Ресурсы:
${project.items.map(item => {
  const res = resources.find(r => r.id === item.resourceId);
  return `- ${res?.name}: ${item.quantity} ${res?.unit} = ${item.totalCost} ₽`;
}).join('\n')}

Дай:
1. Краткий отчёт о рентабельности
2. Где можно оптимизировать затраты
3. Рекомендации для менеджера`
  );
};

export const generateSmartEstimate = async (description: string, resources: Resource[]) => {
  const text = await callClaude(
    `Ты — эксперт по дорожному строительству и благоустройству. Составь смету на основе описания задачи.
Верни JSON с полями: areaSize (число, м²), projectName (строка), items (массив объектов с resourceId и quantity).
Используй ТОЛЬКО ID из списка ресурсов ниже. Рассчитай количества по нормам расхода для дорожного строительства.`,
    `Задача: "${description}"

Доступные ресурсы:
${resources.map(r => `ID: ${r.id} | ${r.name} | ${r.unit} | ${r.costPerUnit} ₽`).join('\n')}

Верни ТОЛЬКО JSON объект.`,
    true
  );

  // Убираем markdown-обёртку если есть
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
};

export const generateClientSummary = async (project: Project): Promise<string> => {
  return callClaude(
    'Ты — помощник клиента строительной компании. Пиши кратко, понятно, на русском.',
    `Проект: ${project.name}, прогресс ${project.progress}%.
Этапы: ${project.milestones.map(m => `${m.title} (${m.status})`).join(', ')}
Напиши 3-4 предложения — резюме для клиента.`
  );
};
