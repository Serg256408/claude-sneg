// ============================================
// SNOWFORCE MOSCOW DISPATCH - ТИПЫ ДАННЫХ
// Полная реализация согласно ТЗ
// ============================================

// СТАТУСЫ СДЕЛКИ (строго по цепочке из ТЗ)
export enum OrderStatus {
  DRAFT = 'Черновик',
  NEW_REQUEST = 'Новая заявка',
  CALCULATING = 'Расчёт цены',
  AWAITING_CUSTOMER = 'Ожидает согласования клиента',
  CONFIRMED_BY_CUSTOMER = 'Согласовано клиентом',
  SEARCHING_EQUIPMENT = 'Поиск техники',
  EQUIPMENT_APPROVED = 'Техника утверждена',
  EN_ROUTE = 'В пути',
  IN_PROGRESS = 'В работе',
  EXPORT_COMPLETED = 'Вывоз завершён',
  REPORT_READY = 'Отчёт сформирован',
  COMPLETED = 'Закрыто',
  CANCELLED = 'Отменено'
}

// ТИПЫ ТЕХНИКИ
export enum AssetType {
  TRUCK = 'Самосвал',
  LOADER = 'Погрузчик',
  MINI_LOADER = 'Мини-погрузчик'
}

// ТИПЫ ОПЛАТЫ
export enum PaymentType {
  CASH = 'Наличные',
  CARD = 'Безнал без НДС',
  VAT_20 = 'С НДС 20%'
}

// ЕДИНИЦЫ ИЗМЕРЕНИЯ ДЛЯ РАСЧЁТА
export enum PriceUnit {
  PER_TRIP = 'За рейс',
  PER_HOUR = 'За час',
  PER_SHIFT = 'За смену'
}

// ============================================
// БАЗОВЫЕ СУЩНОСТИ
// ============================================

// ЗАКАЗЧИК
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  inn: string;
  paymentType: PaymentType;
  address?: string;
  comment?: string;
  rating?: number; // 1-5
  totalOrders?: number;
  createdAt: string;
}

// ПОДРЯДЧИК (компания/владелец техники)
export interface Contractor {
  id: string;
  name: string;
  phone: string;
  email?: string;
  inn?: string;
  equipment: string[];
  districts: string[]; // Районы работы
  paymentType: PaymentType;
  rating: number; // 1-5
  completedOrders: number;
  comments: string;
  isVerified: boolean;
  createdAt: string;
}

// ВОДИТЕЛЬ
export interface Driver {
  id: string;
  name: string;
  phone: string;
  contractorId?: string; // Привязка к подрядчику (или частный)
  licenseNumber?: string;
  vehicleInfo?: string;
  rating: number;
  completedTrips: number;
  createdAt: string;
}

// ============================================
// КОНТАКТ ЗАКАЗЧИКА НА ОБЪЕКТЕ
// ============================================
export interface CustomerContact {
  name: string;
  phone: string;
  email?: string;
  inn?: string;
  companyName?: string;
}

// ============================================
// ОГРАНИЧЕНИЯ ОБЪЕКТА
// ============================================
export interface OrderRestrictions {
  hasHeightLimit: boolean;
  heightLimitMeters?: number;
  hasNarrowEntrance: boolean;
  entranceWidthMeters?: number;
  hasPermitRegime: boolean;
  permitDetails?: string;
  isNightWorkProhibited: boolean;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  comment: string;
}

// ============================================
// ТРЕБОВАНИЕ К ТЕХНИКЕ
// ============================================
export interface AssetRequirement {
  id: string;
  type: AssetType;
  contractorId: string; // Пусто = Биржа
  contractorName: string;
  plannedUnits: number;
  customerPrice: number; // Цена для заказчика
  contractorPrice: number; // Цена для подрядчика/водителя (не показывать клиенту!)
  priceUnit: PriceUnit;
  minimalCharge?: number; // Минималка
  deliveryCharge?: number; // Подача
}

// ============================================
// КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ (КП)
// ============================================
export interface Quote {
  id: string;
  orderId: string;
  createdBy: string; // Менеджер
  createdAt: string;
  validUntil: string;
  
  // Расценки
  truckPricePerTrip?: number;
  truckPricePerHour?: number;
  loaderPricePerShift?: number;
  loaderPricePerHour?: number;
  minimalCharge?: number;
  deliveryCharge?: number;
  
  // Итого
  estimatedTotal: number;
  
  notes: string;
  status: 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
}

// ============================================
// ПУБЛИКАЦИЯ НА БИРЖУ
// ============================================
export interface MarketPost {
  id: string;
  orderId: string;
  createdAt: string;
  expiresAt: string;
  
  // Параметры
  district: string;
  address: string; // Может быть скрыт/частичный
  showFullAddress: boolean;
  showPhone: boolean;
  
  assetType: AssetType;
  unitsNeeded: number;
  priceOffered: number;
  priceUnit: PriceUnit;
  
  scheduledTime: string;
  paymentTerms: string;
  
  status: 'active' | 'closed' | 'expired';
  viewCount: number;
}

// ============================================
// ОТКЛИК ПОДРЯДЧИКА/ВОДИТЕЛЯ
// ============================================
export interface Bid {
  id: string;
  orderId: string;
  marketPostId?: string;
  
  // Кто откликнулся
  contractorId?: string;
  driverId?: string;
  driverName: string;
  
  assetType: AssetType;
  vehicleInfo?: string;
  
  // Предложение
  proposedPrice: number;
  priceUnit: PriceUnit;
  estimatedArrival: string; // ETA
  comment: string;
  
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  rejectionReason?: string;
}

// ============================================
// НАЗНАЧЕНИЕ ТЕХНИКИ
// ============================================
export interface DriverAssignment {
  id: string;
  orderId: string;
  driverName: string;
  driverId?: string;
  contractorId?: string;
  contractorName?: string;
  
  assetType: AssetType;
  vehicleNumber?: string;
  
  assignedPrice: number;
  priceUnit: PriceUnit;
  
  assignedAt: string;
  assignedBy: string; // Менеджер
  
  status: 'assigned' | 'confirmed' | 'en_route' | 'on_site' | 'working' | 'completed';
  confirmedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  
  // Итоги работы
  totalTrips?: number;
  totalHours?: number;
  earnings?: number;
  confirmedEarnings?: number;
}

// ============================================
// РЕЙС (с полной информацией)
// ============================================
export interface TripEvidence {
  id: string;
  orderId: string;
  tripNumber: number;
  
  // Кто выполнил
  driverName: string;
  driverId?: string;
  assignmentId?: string;
  
  // Время
  timestamp: string;
  
  // Геолокация
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  address?: string; // Reverse geocoded
  
  // Фото (несколько типов)
  photos: {
    type: 'loading' | 'full_truck' | 'unloading' | 'ticket' | 'other';
    url: string; // base64 или URL
    timestamp: string;
  }[];
  
  // Валидация
  photoValidation?: {
    isRecent: boolean; // Проверка EXIF
    isInGeofence: boolean; // В пределах геозоны объекта
    validationErrors: string[];
  };
  
  // Талон утилизации
  disposalTicketNumber?: string;
  disposalTicketPhoto?: string;
  
  // Подтверждение
  confirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  rejectionReason?: string;
  
  comment?: string;
}

// ============================================
// ФИНАНСЫ
// ============================================
export interface Earnings {
  orderId: string;
  driverName: string;
  driverId?: string;
  contractorId?: string;
  
  // Заработок
  preliminaryEarnings: number; // Предварительный (все рейсы)
  confirmedEarnings: number; // Подтверждённый (только засчитанные)
  
  // Детализация
  tripsCompleted: number;
  tripsConfirmed: number;
  pricePerTrip: number;
  
  hoursWorked?: number;
  pricePerHour?: number;
  
  // Бонусы/штрафы
  bonuses: number;
  penalties: number;
  
  // Итого
  totalToPay: number;
  
  // Статус оплаты
  paymentStatus: 'pending' | 'processing' | 'paid';
  paidAt?: string;
  paymentReference?: string;
}

// ============================================
// СООБЩЕНИЯ/ЧАТ
// ============================================
export interface Message {
  id: string;
  orderId: string;
  
  // Участники
  fromRole: 'customer' | 'manager' | 'contractor' | 'driver' | 'system';
  fromName: string;
  fromId?: string;
  
  toRole?: 'customer' | 'manager' | 'contractor' | 'driver';
  toId?: string;
  
  // Контент
  text: string;
  attachments?: {
    type: 'image' | 'document' | 'location';
    url: string;
    name?: string;
  }[];
  
  // Шаблон (для быстрых сообщений)
  templateId?: string;
  
  timestamp: string;
  isRead: boolean;
  readAt?: string;
}

// Шаблоны быстрых сообщений
export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
  forRoles: ('manager' | 'contractor' | 'driver')[];
}

// ============================================
// ИСТОРИЯ ДЕЙСТВИЙ (ЛОГ)
// ============================================
export interface ActionLog {
  id: string;
  orderId: string;
  timestamp: string;
  
  action: string; // Описание действия
  actionType: 'status_change' | 'price_update' | 'assignment' | 'trip_confirmed' | 'message' | 'document' | 'other';
  
  performedBy: string; // Кто сделал
  performedByRole: 'customer' | 'manager' | 'contractor' | 'driver' | 'system';
  
  previousValue?: string;
  newValue?: string;
  
  details?: Record<string, any>;
}

// ============================================
// ЗАКАЗ (СДЕЛКА) - ОСНОВНАЯ СУЩНОСТЬ
// ============================================
export interface Order {
  id: string;
  orderNumber?: string; // Читаемый номер заказа
  
  // Заказчик
  customer: string;
  customerId?: string;
  contactInfo?: CustomerContact;
  
  // Объект
  address: string;
  district?: string;
  coordinates: [number, number];
  
  // Ограничения
  restrictions?: OrderRestrictions;
  
  // Техника
  assetRequirements: AssetRequirement[];
  
  // Биржа
  isBirzhaOpen: boolean;
  marketPosts?: MarketPost[];
  bids: Bid[];
  
  // Назначенная техника
  assignments: DriverAssignment[];
  assignedDrivers: string[]; // Legacy - для совместимости
  driverDetails: DriverAssignment[]; // Legacy
  applicants: Bid[]; // Legacy
  
  // Рейсы
  plannedTrips: number;
  actualTrips: number;
  evidences: TripEvidence[];
  
  // Финансы
  quotes?: Quote[];
  currentQuote?: Quote;
  earnings?: Earnings[];
  isPaid: boolean;
  // Ссылка на платёжное поручение (загруженная клиентом платёжка)
  paymentReceiptUrl?: string;
  totalCustomerPrice?: number;
  totalContractorPrice?: number;
  
  // Сроки
  scheduledTime: string;
  startedAt?: string;
  completedAt?: string;
  
  // Статус
  status: OrderStatus;
  isFrozen?: boolean;
  
  // Ответственные
  managerName: string;
  managerId?: string;
  
  // Коммуникации
  messages?: Message[];
  unreadMessages?: number;
  
  // История
  actionLog?: ActionLog[];
  
  // Мета
  createdAt: string;
  updatedAt?: string;
  
  // Документы
  documents?: {
    type: 'contract' | 'invoice' | 'act' | 'report';
    name: string;
    url: string;
    createdAt: string;
  }[];
  
  // Обратная связь
  feedback?: {
    rating: number;
    comment: string;
    createdAt: string;
  };
}

// ============================================
// СПРАВОЧНИКИ
// ============================================
export type ManagerName = string;

export const DEFAULT_MANAGERS: ManagerName[] = ['АЛЕКСАНДР', 'ДМИТРИЙ', 'ЕКАТЕРИНА', 'СЕРГЕЙ'];

export const MOSCOW_DISTRICTS = [
  'ЦАО', 'САО', 'СВАО', 'ВАО', 'ЮВАО', 'ЮАО', 'ЮЗАО', 'ЗАО', 'СЗАО', 
  'Зеленоград', 'Новомосковский', 'Троицкий'
];

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  { id: '1', name: 'Техника выехала', text: 'Техника выехала на объект, ориентировочное время прибытия 30-40 минут.', forRoles: ['manager'] },
  { id: '2', name: 'Погрузчик на месте', text: 'Погрузчик прибыл на объект и приступает к работе.', forRoles: ['manager', 'driver'] },
  { id: '3', name: 'Запрос уточнения', text: 'Пожалуйста, уточните детали по адресу/проезду на объект.', forRoles: ['manager'] },
  { id: '4', name: 'Работа завершена', text: 'Работы на объекте завершены. Формируем закрывающие документы.', forRoles: ['manager'] }
];

// ============================================
// УТИЛИТЫ
// ============================================

// Генератор ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Генератор номера заказа
export const generateOrderNumber = () => {
  const date = new Date();
  const prefix = 'SF';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
};

// Форматирование даты
export const formatDateTime = (isoString: string) => {
  return new Date(isoString).toLocaleString('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Форматирование цены
export const formatPrice = (price: number) => {
  return price.toLocaleString('ru-RU') + ' ₽';
};
