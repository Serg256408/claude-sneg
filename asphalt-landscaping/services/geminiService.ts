
import { Project, Resource } from "../types";
import { loadKnowledgeSections, assembleSystemPrompt } from './knowledgeBaseService';
import {
  PROMPT_PROFITABILITY_SYSTEM, buildProfitabilityUserPrompt,
  PROMPT_CLIENT_SUMMARY_SYSTEM, buildClientSummaryUserPrompt,
  PROMPT_CLIENT_ESTIMATE_SYSTEM, buildClientEstimateUserPrompt,
  PROMPT_MILESTONES_SYSTEM, buildMilestonesUserPrompt,
} from './prompts';

// ═══ Мульти-провайдер AI: xAI Grok + Groq ═══

export type AIProvider = 'grok' | 'groq';

const PROVIDER_KEY = 'asphalt_ai_provider';
const GROK_KEY_STORAGE = 'asphalt_grok_api_key';
const GROQ_KEY_STORAGE = 'asphalt_groq_api_key';

// Провайдер
export const getProvider = (): AIProvider => (localStorage.getItem(PROVIDER_KEY) as AIProvider) || 'grok';
export const setProvider = (p: AIProvider) => localStorage.setItem(PROVIDER_KEY, p);

// API-ключи: localStorage → .env (зашитый при сборке)
export const getGrokKey = (): string => localStorage.getItem(GROK_KEY_STORAGE) || process.env.GROK_API_KEY || '';
export const setGrokKey = (key: string) => localStorage.setItem(GROK_KEY_STORAGE, key);

export const getGroqKey = (): string => localStorage.getItem(GROQ_KEY_STORAGE) || '';
export const setGroqKey = (key: string) => localStorage.setItem(GROQ_KEY_STORAGE, key);

// Общие геттеры для текущего провайдера
export const getApiKey = (): string => getProvider() === 'grok' ? getGrokKey() : getGroqKey();
export const setApiKey = (key: string) => getProvider() === 'grok' ? setGrokKey(key) : setGroqKey(key);
export const hasApiKey = (): boolean => !!getApiKey();

const PROVIDERS = {
  grok: {
    url: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-3-mini',
    name: 'xAI Grok',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    name: 'Groq',
  },
};

const callAI = async (systemPrompt: string, userMessage: string, jsonMode = false, maxTokens = 2048): Promise<string> => {
  const provider = getProvider();
  const apiKey = getApiKey();
  const config = PROVIDERS[provider];

  if (!apiKey) throw new Error(`API-ключ ${config.name} не настроен. Нажмите шестерёнку вверху.`);

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
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
    if (response.status === 401) throw new Error(`Неверный API-ключ ${config.name}. Проверьте ключ в настройках.`);
    if (response.status === 403) throw new Error(`Нет доступа к ${config.name} API. Проверьте баланс/лицензию на аккаунте.`);
    if (response.status === 429) throw new Error(`Превышен лимит запросов ${config.name}. Подождите минуту.`);
    throw new Error(err.error?.message || `Ошибка ${config.name} API: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
};

export const generateClientSummary = async (project: Project) => {
  try {
    return await callAI(
      PROMPT_CLIENT_SUMMARY_SYSTEM,
      buildClientSummaryUserPrompt({
        projectName: project.name,
        progress: project.progress,
        milestonesText: project.milestones.map(m => `${m.title} (${m.status})`).join(', '),
      })
    );
  } catch (error: any) {
    if (error?.message?.includes('API-ключ') || error?.message?.includes('лимит') || error?.message?.includes('доступ')) throw error;
    console.error("AI Client Summary Error:", error);
    return "Мы активно работаем над вашим объектом. Все идет по плану!";
  }
};

export const analyzeProfitability = async (project: Project, resources: Resource[]) => {
  const totalCost = project.items.reduce((acc, item) => acc + item.totalCost, 0);
  const profit = project.contractPrice - totalCost;
  const margin = project.contractPrice > 0 ? (profit / project.contractPrice) * 100 : 0;

  try {
    return await callAI(
      PROMPT_PROFITABILITY_SYSTEM,
      buildProfitabilityUserPrompt({
        projectName: project.name,
        areaSize: project.areaSize,
        totalCost,
        contractPrice: project.contractPrice,
        profit,
        margin: margin.toFixed(1),
        resourceLines: project.items.map(item => {
          const res = resources.find(r => r.id === item.resourceId);
          return `- ${res?.name}: ${item.quantity} ${res?.unit} = ${item.totalCost} ₽`;
        }).join('\n'),
      })
    );
  } catch (error: any) {
    if (error?.message?.includes('API-ключ') || error?.message?.includes('лимит') || error?.message?.includes('доступ')) throw error;
    console.error("AI Analysis Error:", error);
    return "Ошибка при генерации AI-анализа.";
  }
};

export const generateSmartEstimate = async (description: string, resources: Resource[]) => {
  const sections = loadKnowledgeSections();
  const systemPrompt = assembleSystemPrompt(sections);

  const text = await callAI(
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
  markupPercent: number,
  pricingRules?: string
): Promise<Array<{ name: string; unit: string; quantity: number; unitPrice: number; section: string }>> => {

  const totalInternalCost = internalItems.reduce((s, i) => s + i.totalCost, 0);
  const targetTotal = Math.round(totalInternalCost * (1 + markupPercent / 100));

  const text = await callAI(
    PROMPT_CLIENT_ESTIMATE_SYSTEM,
    buildClientEstimateUserPrompt({
      internalItemsText: internalItems.map((item, i) =>
        `${i + 1}. ${item.resourceName} | category: ${item.category} | ${item.unit} | кол-во: ${item.quantity} | цена за ед: ${item.costPerUnit} ₽ | итого: ${item.totalCost} ₽`
      ).join('\n'),
      catalogWithPrices,
      area,
      markupPercent,
      totalInternalCost,
      targetTotal,
      pricingRules,
    }),
    true,
    4096
  );

  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : (parsed.items || parsed.data || []);
};

// ═══ ИИ-генерация этапов работ на основе КП ═══

export const generateMilestonesAI = async (
  kpItems: Array<{ name: string; unit: string; quantity: number; section?: string }>,
  area: number,
  projectName: string,
): Promise<Array<{ title: string; description: string }>> => {

  const kpItemsText = kpItems.map((item, i) =>
    `${i + 1}. ${item.name} | ${item.unit} | кол-во: ${item.quantity}${item.section ? ` | раздел: ${item.section}` : ''}`
  ).join('\n');

  const text = await callAI(
    PROMPT_MILESTONES_SYSTEM,
    buildMilestonesUserPrompt({ kpItemsText, area, projectName }),
    true,
    2048
  );

  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : (parsed.milestones || parsed.data || []);
};
