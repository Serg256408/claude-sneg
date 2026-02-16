import { AIKnowledgeSection } from '../types';
import { DEFAULT_AI_KNOWLEDGE } from '../constants';

const STORAGE_KEY = 'asphalt_ai_knowledge';

export function loadKnowledgeSections(): AIKnowledgeSection[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed: AIKnowledgeSection[] = JSON.parse(saved);
      // Добавляем новые секции из дефолтов, если их нет в сохранённых
      const savedIds = new Set(parsed.map(s => s.id));
      const missing = DEFAULT_AI_KNOWLEDGE.filter(d => !savedIds.has(d.id));
      return [...parsed, ...missing].sort((a, b) => a.order - b.order);
    } catch {
      return [...DEFAULT_AI_KNOWLEDGE];
    }
  }
  return [...DEFAULT_AI_KNOWLEDGE];
}

export function saveKnowledgeSections(sections: AIKnowledgeSection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
}

export function getDefaultSection(sectionId: string): AIKnowledgeSection | undefined {
  return DEFAULT_AI_KNOWLEDGE.find(s => s.id === sectionId);
}

export function isSectionCustomized(section: AIKnowledgeSection): boolean {
  const def = DEFAULT_AI_KNOWLEDGE.find(s => s.id === section.id);
  return def ? def.content !== section.content : true;
}

export function assembleSystemPrompt(sections: AIKnowledgeSection[]): string {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  return sorted.map(s => s.content).join('\n\n');
}
