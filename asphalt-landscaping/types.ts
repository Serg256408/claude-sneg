
// ===== Категории ресурсов =====
export enum Category {
  MATERIAL = 'MATERIAL',
  MACHINERY = 'MACHINERY',
  LABOR = 'LABOR'
}

// ===== Категории услуг =====
export enum ServiceCategory {
  ASPHALT = 'ASPHALT',
  LANDSCAPING = 'LANDSCAPING',
  EARTHWORK = 'EARTHWORK'
}

// ===== Виды работ по категориям =====
export enum AsphaltWorkType {
  PAVING = 'PAVING',                   // Укладка асфальта
  PATCHING = 'PATCHING',               // Ямочный ремонт
  MILLING = 'MILLING',                 // Фрезерование
  MARKING = 'MARKING',                 // Разметка
  BASE_LAYER = 'BASE_LAYER',           // Устройство основания
  CURB_INSTALL = 'CURB_INSTALL',       // Установка бордюров
}

export enum LandscapingWorkType {
  GREENING = 'GREENING',               // Озеленение
  TILE_PAVING = 'TILE_PAVING',         // Укладка плитки
  FENCING = 'FENCING',                 // Ограждения
  PLAYGROUND = 'PLAYGROUND',           // Детские площадки
  LIGHTING = 'LIGHTING',               // Освещение
  IRRIGATION = 'IRRIGATION',           // Полив / дренаж
  LAWN = 'LAWN',                       // Устройство газона
}

export enum EarthworkType {
  GRADING = 'GRADING',                 // Планировка территории
  DRAINAGE = 'DRAINAGE',               // Дренаж
  UTILITIES = 'UTILITIES',             // Коммуникации
  EXCAVATION = 'EXCAVATION',           // Выемка грунта
  BACKFILL = 'BACKFILL',               // Подсыпка / обратная засыпка
  DEMOLITION = 'DEMOLITION',           // Демонтаж
}

export type WorkType = AsphaltWorkType | LandscapingWorkType | EarthworkType;

// ===== Роли =====
export type UserRole = 'manager' | 'foreman' | 'client';

// ===== Ресурсы (справочник материалов/техники/персонала) =====
export interface Resource {
  id: string;
  name: string;
  category: Category;
  unit: string;
  costPerUnit: number;
  serviceCategory?: ServiceCategory; // к какому сервису относится
  subGroup?: string; // подгруппа для группировки в справочнике
}

// ===== Позиция сметы =====
export interface EstimateItem {
  resourceId: string;
  category: Category;
  quantity: number;
  totalCost: number;
  customName?: string;   // переопределение названия из справочника
  customPrice?: number;  // переопределение цены за единицу
  customUnit?: string;   // переопределение ед. измерения
}

// ===== Чат =====
export interface ChatMessage {
  id: string;
  sender: string;
  role: UserRole;
  text: string;
  timestamp: number;
  photo?: string;      // URL прикреплённого фото
  isSystem?: boolean;  // системное сообщение (этап завершён и т.д.)
  readBy?: UserRole[]; // кто прочитал
}

// ===== Расходы бригадира =====
export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: number;
  category: 'fuel' | 'food' | 'materials' | 'transport' | 'tools' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  receiptPhoto?: string;   // фото чека
  approvedBy?: string;     // кто одобрил
  approvedAt?: number;     // когда одобрил
  rejectionReason?: string;
}

// ===== Фото проекта =====
export interface ProjectPhoto {
  id: string;
  url: string;
  description: string;
  uploadedBy: UserRole;
  timestamp: number;
  stage: string;
  beforeAfter?: 'before' | 'after' | 'process'; // тип фото для сравнения
  milestoneId?: string; // привязка к этапу
}

// ===== Этапы проекта =====
export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed';
  date?: number;          // дата завершения
  plannedDate?: number;   // плановая дата
  serviceCategory?: ServiceCategory;
  completionPhoto?: string; // фото по завершении
  sortOrder: number;      // порядок отображения
}

// ===== Документы =====
export interface ProjectDocument {
  id: string;
  name: string;
  type: 'contract' | 'act' | 'invoice' | 'certificate' | 'estimate' | 'photo_report';
  date: number;
  url?: string;
  signStatus?: 'draft' | 'sent' | 'signed';
}

// ===== Чек-лист =====
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: number;
  photo?: string; // фото подтверждения
}

export interface DailyChecklist {
  id: string;
  date: number;
  foremanId: string;
  foremanName: string;
  items: ChecklistItem[];
  createdAt: number;
}

// ===== Дневной отчёт бригадира =====
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'foggy';

export interface DailyReport {
  id: string;
  date: number;
  foremanId: string;
  foremanName: string;
  weather: WeatherType;
  temperature?: number;        // °C
  workersCount: number;        // сколько человек на объекте
  workDone: string;            // что сделано за день
  problems?: string;           // проблемы / задержки
  materialsUsed?: string;      // какие материалы использованы
  photos: string[];            // фото за день
  createdAt: number;
}

// ===== График оплаты =====
export interface PaymentScheduleItem {
  id: string;
  stage: string;               // "Предоплата", "После подготовки", "Финальный расчёт"
  amount: number;
  percentage: number;          // % от contractPrice
  dueDate?: number;            // плановая дата оплаты
  status: 'upcoming' | 'invoiced' | 'paid' | 'overdue';
  paidAt?: number;
  paidAmount?: number;
  invoiceNumber?: string;
}

// ===== Допсоглашения к договору =====
export interface ContractAmendment {
  id: string;
  date: number;
  previousPrice: number;
  newPrice: number;
  reason: string;
}

// ===== Поставка материалов =====
export interface MaterialDelivery {
  id: string;
  resourceId: string;
  resourceName: string;
  quantity: number;
  unit: string;
  supplier: string;
  deliveryDate: number;
  invoiceNumber?: string;
  invoicePhoto?: string;
  received: boolean;
  receivedBy?: string;
  receivedAt?: number;
}

// ===== Позиция клиентского КП =====
export interface ClientEstimateItem {
  id: string;
  name: string;          // "Укладка асфальтового покрытия, толщ. 50 мм"
  unit: string;          // "м²", "п.м.", "шт.", "компл."
  quantity: number;
  unitPrice: number;     // цена за единицу (с наценкой)
  totalPrice: number;    // quantity × unitPrice
  section?: string;      // группировка: "Асфальтирование", "Благоустройство"
  sortOrder: number;     // порядок отображения
}

// ===== Проект (главная сущность) =====
export interface Project {
  id: string;
  name: string;
  manager: string;
  client: string;
  clientPhone?: string;
  clientEmail?: string;
  address: string;
  location?: { lat: number; lng: number };
  areaSize: number;
  contractPrice: number;
  items: EstimateItem[];
  status: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number; // 0-100
  createdAt: number;
  updatedAt?: number;

  // Услуги и виды работ
  serviceCategories: ServiceCategory[];
  workTypes: WorkType[];

  // Сроки
  startDate?: number;
  endDate?: number;
  actualStartDate?: number;
  actualEndDate?: number;

  // Этапы, чат, расходы, фото, документы
  milestones: Milestone[];
  chat: ChatMessage[];
  expenses: Expense[];
  photos: ProjectPhoto[];
  documents: ProjectDocument[];

  // Новое: чек-листы, отчёты, оплаты, поставки
  checklists: DailyChecklist[];
  dailyReports: DailyReport[];
  paymentSchedule: PaymentScheduleItem[];
  materialDeliveries: MaterialDelivery[];

  // Договор
  contractSignedAt?: number;          // дата подписания договора
  contractAmendments: ContractAmendment[];  // допсоглашения

  // Внутренняя смета
  estimateIssuedAt?: number;   // когда смета была выставлена клиенту

  // КП для клиента (коммерческое предложение)
  clientEstimateItems: ClientEstimateItem[];
  clientEstimateNote?: string;      // примечание для клиента
  kpPrepayment?: number;            // предоплата в %
  kpWorkDuration?: string;          // срок выполнения работ
  kpWarranty?: number;              // гарантия в месяцах

  // Обратная связь клиента
  clientRating?: number;       // 1-5
  clientFeedback?: string;
}

// ===== Хелперы =====

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  [ServiceCategory.ASPHALT]: 'Асфальтирование',
  [ServiceCategory.LANDSCAPING]: 'Благоустройство',
  [ServiceCategory.EARTHWORK]: 'Земляные работы',
};

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  // Асфальт
  [AsphaltWorkType.PAVING]: 'Укладка асфальта',
  [AsphaltWorkType.PATCHING]: 'Ямочный ремонт',
  [AsphaltWorkType.MILLING]: 'Фрезерование',
  [AsphaltWorkType.MARKING]: 'Разметка',
  [AsphaltWorkType.BASE_LAYER]: 'Устройство основания',
  [AsphaltWorkType.CURB_INSTALL]: 'Установка бордюров',
  // Благоустройство
  [LandscapingWorkType.GREENING]: 'Озеленение',
  [LandscapingWorkType.TILE_PAVING]: 'Укладка плитки',
  [LandscapingWorkType.FENCING]: 'Ограждения',
  [LandscapingWorkType.PLAYGROUND]: 'Детские площадки',
  [LandscapingWorkType.LIGHTING]: 'Освещение',
  [LandscapingWorkType.IRRIGATION]: 'Полив / дренаж',
  [LandscapingWorkType.LAWN]: 'Устройство газона',
  // Земляные работы
  [EarthworkType.GRADING]: 'Планировка территории',
  [EarthworkType.DRAINAGE]: 'Дренаж',
  [EarthworkType.UTILITIES]: 'Коммуникации',
  [EarthworkType.EXCAVATION]: 'Выемка грунта',
  [EarthworkType.BACKFILL]: 'Подсыпка',
  [EarthworkType.DEMOLITION]: 'Демонтаж',
};

export const WEATHER_LABELS: Record<WeatherType, string> = {
  sunny: 'Солнечно',
  cloudy: 'Облачно',
  rainy: 'Дождь',
  snowy: 'Снег',
  windy: 'Ветрено',
  foggy: 'Туман',
};

export const WEATHER_ICONS: Record<WeatherType, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  windy: '💨',
  foggy: '🌫️',
};

export const EXPENSE_CATEGORY_LABELS: Record<Expense['category'], string> = {
  fuel: 'Топливо',
  food: 'Питание',
  materials: 'Материалы',
  transport: 'Транспорт',
  tools: 'Инструменты',
  other: 'Прочее',
};

// ═══════════════════════════════════════════════════════════
// Мастер AI-генерации сметы
// ═══════════════════════════════════════════════════════════
export interface WizardData {
  works: {
    demolition: boolean;
    earthwork: boolean;
    foundation: boolean;
    asphalt: boolean;
    curbs: boolean;
    tiles: boolean;
    landscaping: boolean;
    drainage: boolean;
  };
  area: number;
  perimeterLength: number;
  demolitionCoverType: 'asphalt' | 'concrete';
  demolitionThickness: number;
  demolitionMethod: 'hammer' | 'milling';
  excavatorType: 'loader' | 'tracked';
  sandLayer: number;
  gravelLayer: number;
  gravelType: 'granite' | 'gravel' | 'recycled' | 'limestone';
  geotextileDensity: number;
  asphaltMethod: 'paver' | 'manual';
  asphaltLayers: 1 | 2;              // количество слоёв
  asphaltThickness: number;           // толщина верхнего (или единственного) слоя
  asphaltMixType: 'fine_B2' | 'coarse_A1' | 'SMA15' | 'sand_D';
  asphaltBottomThickness: number;     // толщина нижнего слоя (к/з)
  asphaltBottomMixType: 'fine_B2' | 'coarse_A1' | 'SMA15' | 'sand_D';
  curbType: 'road' | 'garden';
  tileThickness: number;
  lawnType: 'seed' | 'roll';
  drainagePipeLength: number;
  drainageGrateCount: number;
}

export const WIZARD_DEFAULTS: WizardData = {
  works: { demolition: false, earthwork: false, foundation: true, asphalt: true, curbs: false, tiles: false, landscaping: false, drainage: false },
  area: 0, perimeterLength: 0,
  demolitionCoverType: 'asphalt', demolitionThickness: 100, demolitionMethod: 'hammer',
  excavatorType: 'loader',
  sandLayer: 200, gravelLayer: 150, gravelType: 'granite', geotextileDensity: 200,
  asphaltMethod: 'paver', asphaltLayers: 1, asphaltThickness: 50, asphaltMixType: 'fine_B2',
  asphaltBottomThickness: 60, asphaltBottomMixType: 'coarse_A1',
  curbType: 'road', tileThickness: 60, lawnType: 'seed',
  drainagePipeLength: 0, drainageGrateCount: 0,
};

// ═══════════════════════════════════════════════════════════
// База знаний ИИ
// ═══════════════════════════════════════════════════════════
export interface AIKnowledgeSection {
  id: string;
  title: string;
  category: 'system' | 'norms' | 'rules' | 'format';
  content: string;
  order: number;
}

// Генерация ID
export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Форматирование цены
export const formatPrice = (n: number): string =>
  new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';

// Форматирование даты
export const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatDateTime = (ts: number): string =>
  new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
