
import { Project, Resource } from "../types";
import { loadKnowledgeSections, assembleSystemPrompt } from './knowledgeBaseService';

// API-ключ Groq хранится в localStorage
const STORAGE_KEY = 'asphalt_groq_api_key';

export const getApiKey = (): string => localStorage.getItem(STORAGE_KEY) || '';
export const setApiKey = (key: string) => localStorage.setItem(STORAGE_KEY, key);
export const hasApiKey = (): boolean => !!getApiKey();

const GROQ_MODEL = 'meta-llama/llama-4-maverick-17b-128e-instruct';

const callGroq = async (systemPrompt: string, userMessage: string, jsonMode = false, maxTokens = 2048): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API-ключ Groq не настроен. Нажмите шестерёнку вверху.');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt + (jsonMode ? '\nОтвечай СТРОГО в формате JSON, без markdown-обёртки, без пояснений.' : '') },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Неверный API-ключ Groq. Проверьте ключ в настройках.');
    if (response.status === 429) throw new Error('Превышен лимит запросов Groq. Подождите минуту.');
    throw new Error(err.error?.message || `Ошибка Groq API: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
};

export const generateClientSummary = async (project: Project) => {
  try {
    return await callGroq(
      'Ты — персональный помощник клиента строительной компании AsphaltPro. Пиши кратко, понятно, на русском языке.',
      `Проект: ${project.name}, прогресс ${project.progress}%.
Этапы: ${project.milestones.map(m => `${m.title} (${m.status})`).join(', ')}
Напиши 3-4 предложения — резюме для клиента. Объясни, почему текущий этап важен. Тон — профессиональный, но тёплый.`
    );
  } catch (error: any) {
    if (error?.message?.includes('API-ключ') || error?.message?.includes('лимит')) throw error;
    console.error("Groq Client Summary Error:", error);
    return "Мы активно работаем над вашим объектом. Все идет по плану!";
  }
};

export const analyzeProfitability = async (project: Project, resources: Resource[]) => {
  const totalCost = project.items.reduce((acc, item) => acc + item.totalCost, 0);
  const profit = project.contractPrice - totalCost;
  const margin = project.contractPrice > 0 ? (profit / project.contractPrice) * 100 : 0;

  try {
    return await callGroq(
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
  } catch (error: any) {
    if (error?.message?.includes('API-ключ') || error?.message?.includes('лимит')) throw error;
    console.error("Groq Analysis Error:", error);
    return "Ошибка при генерации AI-анализа.";
  }
};

export const generateSmartEstimate = async (description: string, resources: Resource[]) => {
  const sections = loadKnowledgeSections();
  const systemPrompt = assembleSystemPrompt(sections);

  const text = await callGroq(
    systemPrompt,
    `Задача: "${description}"

Доступные ресурсы:
${resources.map(r => `ID: ${r.id} | ${r.name} | ${r.unit} | ${r.costPerUnit} ₽`).join('\n')}

Верни ТОЛЬКО JSON объект.`,
    true
  );

  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
};

// ═══ ИИ-генерация клиентского КП ═══

export const generateClientEstimateAI = async (
  internalItems: Array<{
    resourceName: string;
    category: string;
    unit: string;
    quantity: number;
    costPerUnit: number;
    totalCost: number;
  }>,
  catalogWithPrices: string,
  area: number,
  markupPercent: number
): Promise<Array<{ name: string; unit: string; quantity: number; unitPrice: number; section: string }>> => {

  const systemPrompt = `Ты — система формирования коммерческих предложений (КП) для дорожно-строительной компании.
Задача: преобразовать внутреннюю смету (себестоимость) в клиентское коммерческое предложение.

═══ ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ═══

1. ПОГЛОЩАЕМЫЕ (НЕ показывать в КП — стоимость включена в цену работ):
   • Весь персонал (category: "labor") — работа бригады включена в цену
   • Техника с единицей "м/см" — каток, асфальтоукладчик, экскаватор, виброплита, автогрейдер
   • Доставка а/б смеси автотранспортом (потонная, ед. "т") — включена в цену укладки
   • Доставка дорожной фрезы — включена в цену фрезерования
   • Уплотнение — включено в цену укладки

2. ПРЕОБРАЗОВАНИЕ МАТЕРИАЛОВ → РАБОТЫ:
   Клиент видит РАБОТЫ, а не сырьё. Подбирай точное название из каталога:
   • Смесь а/б (любого типа) → "Устройство покрытия из а/б смеси..." (из каталога)
   • Подгрунтовка / эмульсия → "Устройство подгрунтовки основания..." (из каталога)
   • Щебень → "Устройство основания из щебня..." (из каталога)
   • Песок строительный → "Устройство подстилающего слоя из песка..." (из каталога)
   • Геотекстиль → "Устройство геотекстиля..." (из каталога)
   • Бордюр дорожный → "Установка бортового камня дорожного..." (из каталога)
   • Бордюр садовый → "Установка бортового камня садового..." (из каталога)
   • Плитка тротуарная → "Мощение тротуарной плиткой..." (из каталога)
   • Газон → "Устройство газона..." (из каталога)
   • Трубы ПВХ / дождеприёмники / лотки → "Устройство ливневой канализации..." (из каталога)

3. ТРАНСПОРТ (единица "рейс" — самосвал, доставка самосвалом):
   • Показывать ОТДЕЛЬНО
   • Цена = себестоимость ÷ количество × (1 + наценка%)
   • Количество = из сметы

4. ФРЕЗЕРОВАНИЕ (ед. м²) → работа из каталога с ценой каталога
5. ДЕМОНТАЖ / ГИДРОМОЛОТ → "Демонтаж покрытия" из каталога

6. ЦЕНООБРАЗОВАНИЕ:
   • Работы из каталога: цена из каталога × (1 + наценка / 100)
   • Транспорт: себестоимость_за_ед × (1 + наценка / 100)
   • Площадные работы (м²): количество = площадь объекта
   • Штучные (рейс, шт, п.м, компл., выезд): количество из сметы

7. НЕ ДУБЛИРОВАТЬ позиции. Связанные ресурсы объединять в одну работу.

8. СОРТИРОВКА: Земляные работы → Устройство основания → Асфальтирование → Благоустройство → Озеленение → Инженерные сети → Прочие работы

9. unitPrice — целое число (округлять).`;

  const userPrompt = `ВНУТРЕННЯЯ СМЕТА (себестоимость):
${internalItems.map((item, i) => `${i + 1}. ${item.resourceName} | category: ${item.category} | ${item.unit} | кол-во: ${item.quantity} | цена за ед: ${item.costPerUnit} ₽ | итого: ${item.totalCost} ₽`).join('\n')}

КАТАЛОГ РАБОТ С РЕКОМЕНДОВАННЫМИ ЦЕНАМИ:
${catalogWithPrices}

ПЛОЩАДЬ ОБЪЕКТА: ${area} м²
НАЦЕНКА: ${markupPercent}%

Сформируй КП. Верни JSON объект формата:
{"items":[{"name":"название из каталога","unit":"ед.","quantity":число,"unitPrice":число_с_наценкой,"section":"раздел"}]}`;

  const text = await callGroq(systemPrompt, userPrompt, true, 4096);
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : (parsed.items || parsed.data || []);
};
