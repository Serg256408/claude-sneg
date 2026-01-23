// ============================================
// SNOWFORCE MOSCOW DISPATCH - ТИПЫ ДАННЫХ
// Полная реализация согласно ТЗ v2.0
// ============================================

// ============================================
// РОЛИ ПОЛЬЗОВАТЕЛЕЙ
// ============================================
export enum UserRole {
  CUSTOMER = 'customer',           // Клиент
  SALES_MANAGER = 'sales_manager', // Менеджер продаж
  ESTIMATOR = 'estimator',         // Сметчик/Инженер
  DISPATCHER = 'dispatcher',       // Диспетчер
  CONTRACTOR = 'contractor',       // Исполнитель-партнёр (компания)
  DRIVER = 'driver',               // Водитель/Оператор
  ACCOUNTANT = 'accountant',       // Бухгалтер/Финансист
  ADMIN = 'admin'                  // Администратор
}

// ============================================
// ТИП УСЛУГИ
// ============================================
export enum ServiceType {
  SNOW = 'snow',                   // Вывоз снега
  ASPHALT = 'asphalt',             // Асфальтирование
  LANDSCAPING = 'landscaping',     // Благоустройство
  OTHER = 'other'                  // Другое
}

// ============================================
// РЕЖИМ ИСПОЛНЕНИЯ
// ============================================
export enum ExecutionMode {
  OWN_FLEET = 'own_fleet',         // Своя техника
  MARKETPLACE = 'marketplace'      // Биржа
}

// ============================================
// СТАТУСЫ ЛИДА
// ============================================
export enum LeadStatus {
  NEW = 'new',                     // Новый
  CONTACTED = 'contacted',         // Связались
  QUALIFIED = 'qualified',         // Квалифицирован
  ESTIMATING = 'estimating',       // В расчёте
  OFFER_SENT = 'offer_sent',       // КП отправлено
  WON = 'won',                     // Выигран → создаём Order
  LOST = 'lost',                   // Проигран
  SPAM = 'spam',                   // Спам/дубль
  DUPLICATE = 'duplicate'
}

// СТАТУСЫ ЗАКАЗА (расширенные по ТЗ)
export enum OrderStatus {
  DRAFT = 'Черновик',
  NEW_REQUEST = 'Новая заявка',
  CALCULATING = 'Расчёт цены',
  AWAITING_CUSTOMER = 'Ожидает согласования клиента',
  CONFIRMED_BY_CUSTOMER = 'Согласовано клиентом',
  CONTRACT_SIGNING = 'Договор на подписи',
  AWAITING_PREPAYMENT = 'Ожидание предоплаты',
  SEARCHING_EQUIPMENT = 'Поиск техники',
  SCHEDULING = 'Планирование',
  EQUIPMENT_APPROVED = 'Техника утверждена',
  EN_ROUTE = 'В пути',
  IN_PROGRESS = 'В работе',
  EXPORT_COMPLETED = 'Вывоз завершён',
  AWAITING_CLOSING_DOCS = 'Подготовка документов',
  CLOSING_DOCS_SENT = 'Документы отправлены',
  REPORT_READY = 'Отчёт сформирован',
  COMPLETED = 'Закрыто',
  CANCELLED = 'Отменено',
  DISPUTE = 'Претензия'
}

// СТАТУСЫ БИРЖИ (для marketplace режима)
export enum MarketplaceStatus {
  POSTED = 'posted_to_market',
  BIDDING = 'bidding',
  CONTRACTOR_SELECTED = 'contractor_selected',
  CONTRACTOR_ACCEPTED = 'contractor_accepted',
  WORK_IN_PROGRESS = 'work_in_progress',
  CONTRACTOR_COMPLETED = 'contractor_completed',
  QUALITY_CHECK = 'quality_check',
  PAYOUT_DONE = 'payout_done'
}

// ТИПЫ ТЕХНИКИ (расширенные)
export enum AssetType {
  TRUCK = 'Самосвал',
  TRUCK_20 = 'Самосвал 20м³',
  TRUCK_25 = 'Самосвал 25м³',
  LOADER = 'Погрузчик',
  LOADER_JCB = 'JCB 4CX',
  FRONT_LOADER = 'Фронтальный погрузчик',
  MINI_LOADER = 'Мини-погрузчик',
  // Для асфальта
  ROLLER = 'Каток',
  ASPHALT_PAVER = 'Асфальтоукладчик',
  GRADER = 'Грейдер',
  EXCAVATOR = 'Экскаватор'
}

// ТИП КОМПАНИИ
export enum CompanyType {
  CUSTOMER = 'customer_company',
  TRANSKOM = 'transkom',
  CONTRACTOR = 'contractor_company'
}

// СТАТУС ДОКУМЕНТА
export enum DocumentSignStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  SIGNED = 'signed',
  REJECTED = 'rejected'
}

// СТАТУС СЧЁТА
export enum InvoiceStatus {
  ISSUED = 'issued',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  PARTIALLY_PAID = 'partially_paid'
}

// ТИП ТРАНЗАКЦИИ
export enum TransactionType {
  DEPOSIT = 'deposit',
  HOLD = 'hold',
  RELEASE = 'release',
  COMMISSION = 'commission',
  ACQUIRING_FEE = 'acquiring_fee',
  PAYOUT = 'payout',
  REFUND = 'refund',
  BONUS = 'bonus',
  PENALTY = 'penalty'
}

// ЭТАПЫ РАБОТ (для асфальта)
export enum WorkStageType {
  PREPARATION = 'preparation',     // Подготовка
  BASE = 'base',                   // Основание
  GEOTEXTILE = 'geotextile',       // Геотекстиль
  GRAVEL = 'gravel',               // Щебень
  SAND = 'sand',                   // Песок
  CURB = 'curb',                   // Бордюр
  ASPHALT_LAYER_1 = 'asphalt_1',   // Асфальт слой 1
  ASPHALT_LAYER_2 = 'asphalt_2',   // Асфальт слой 2
  MARKING = 'marking',             // Разметка
  HANDOVER = 'handover'            // Сдача
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

// ПОЛЬЗОВАТЕЛЬ (User)
export interface User {
  id: string;
  role: UserRole;
  phone: string;
  email?: string;
  name: string;
  companyName?: string;
  companyId?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  status: 'active' | 'blocked' | 'pending';
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// КОМПАНИЯ (Company)
export interface Company {
  id: string;
  type: CompanyType;
  name: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  legalAddress: string;
  actualAddress?: string;
  bankName?: string;
  bankBik?: string;
  bankAccount?: string;
  corrAccount?: string;
  directorName?: string;
  // Договорные условия по умолчанию
  defaultPaymentType: PaymentType;
  defaultPaymentTerms?: 'prepayment' | 'postpayment' | 'partial';
  prepaymentPercent?: number;
  creditLimit?: number;
  // Контакты
  phone: string;
  email?: string;
  website?: string;
  // Мета
  isVerified: boolean;
  rating?: number;
  createdAt: string;
  updatedAt?: string;
}

// ОБЪЕКТ/ПЛОЩАДКА (Site)
export interface Site {
  id: string;
  companyId: string; // Клиент-владелец
  name: string;
  address: string;
  coordinates?: [number, number];
  district?: string;
  // Контакт на объекте
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  // Ограничения доступа
  hasGate: boolean;
  gateCode?: string;
  hasHeightLimit: boolean;
  heightLimitMeters?: number;
  hasWeightLimit: boolean;
  weightLimitTons?: number;
  requiresPass: boolean;
  passDetails?: string;
  // Режим работы
  workMode: 'day' | 'night' | 'round_the_clock';
  workingHoursStart?: string;
  workingHoursEnd?: string;
  // Документы
  attachments?: {
    type: 'photo' | 'scheme' | 'pass' | 'other';
    name: string;
    url: string;
  }[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ЛИД (Lead)
export interface Lead {
  id: string;
  source: 'website' | 'phone' | 'whatsapp' | 'telegram' | 'email' | 'ads' | 'referral' | 'other';
  sourceDetails?: string;
  // Клиент
  customerCompanyId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  // Объект
  siteId?: string;
  address?: string;
  // Услуга
  serviceType: ServiceType;
  description: string;
  // Параметры для снега
  snowVolumeM3?: number;
  snowAreaM2?: number;
  snowHeightCm?: number;
  needsLoader?: boolean;
  needsDisposalTickets?: boolean;
  // Параметры для асфальта
  asphaltAreaM2?: number;
  asphaltType?: 'repair' | 'new' | 'parking' | 'road';
  needsCurb?: boolean;
  curbLengthM?: number;
  needsDrainage?: boolean;
  // Сроки
  desiredStartDate?: string;
  desiredEndDate?: string;
  urgency?: 'normal' | 'urgent' | 'very_urgent';
  // Файлы
  attachments?: {
    type: 'photo' | 'video' | 'document' | 'scheme';
    name: string;
    url: string;
  }[];
  // Обработка
  assignedManagerId?: string;
  assignedManagerName?: string;
  status: LeadStatus;
  qualificationNotes?: string;
  lostReason?: string;
  // Связь с заказом
  convertedOrderId?: string;
  // Мета
  createdAt: string;
  updatedAt?: string;
  contactedAt?: string;
  qualifiedAt?: string;
}

// ЗАКАЗЧИК (расширенный)
export interface Customer {
  id: string;
  companyId?: string; // Ссылка на Company
  name: string;
  phone: string;
  email: string;
  inn: string;
  kpp?: string;
  paymentType: PaymentType;
  paymentTerms?: 'prepayment' | 'postpayment' | 'partial';
  address?: string;
  comment?: string;
  rating?: number; // 1-5
  totalOrders?: number;
  sites?: string[]; // ID объектов
  contactPersons?: {
    name: string;
    phone: string;
    email?: string;
    position?: string;
  }[];
  createdAt: string;
  updatedAt?: string;
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
// СПРАВОЧНИК ЦЕН (PriceBook)
// ============================================
export interface PriceBookItem {
  id: string;
  workTypeId: string;
  workTypeName: string;
  serviceType: ServiceType;
  unit: 'trip' | 'hour' | 'shift' | 'm2' | 'm3' | 'ton' | 'running_meter' | 'piece';
  unitLabel: string;
  baseCustomerPrice: number;
  baseCostPrice: number;
  // Правила
  minimalCharge?: number;
  roundingStep?: number;
  // Коэффициенты (ключ - название, значение - множитель)
  coefficients?: Record<string, number>;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// РАСЧЁТ/СМЕТА (Estimate) - детальная
// ============================================
export interface EstimateItem {
  id: string;
  workTypeId: string;
  workTypeName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  costPrice: number;
  marginType: 'percent' | 'fixed';
  marginValue: number;
  lineTotal: number;
  lineCost: number;
  lineProfit: number;
  notes?: string;
}

export interface Estimate {
  id: string;
  orderId: string;
  leadId?: string;
  version: number;
  // Позиции
  items: EstimateItem[];
  // Коэффициенты
  coefficients: {
    name: string;
    value: number;
    description?: string;
  }[];
  // Итоги
  subtotal: number;
  discount: number;
  discountType?: 'percent' | 'fixed';
  discountReason?: string;
  vat: number;
  vatRate: number; // 0, 10, 20
  totalCustomerPrice: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  // Автор
  estimatorId?: string;
  estimatorName?: string;
  // Статус
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// ПРЕДЛОЖЕНИЕ/КП (Offer) - расширенное
// ============================================
export interface Offer {
  id: string;
  orderId: string;
  leadId?: string;
  estimateId: string;
  estimateVersion: number;
  // Условия
  validityDays: number;
  validUntil: string;
  paymentTerms: 'prepayment' | 'postpayment' | 'partial';
  prepaymentPercent?: number;
  // SLA
  equipmentArrivalTime?: string; // Время подачи техники
  workDeadline?: string;
  guaranteePeriod?: string;
  // Документ
  documentUrl?: string;
  // Статус
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired' | 'superseded';
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
  rejectionReason?: string;
  // Автор
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// Legacy Quote (для совместимости)
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
// ДОГОВОР (Contract)
// ============================================
export interface Contract {
  id: string;
  orderId: string;
  customerCompanyId: string;
  // Шаблон
  templateId?: string;
  templateName?: string;
  // Номер и дата
  number: string;
  date: string;
  // Суммы
  totalAmount: number;
  vatAmount: number;
  // Условия
  paymentTerms: string;
  workDeadline?: string;
  warrantyPeriod?: string;
  // Подписание
  signStatus: DocumentSignStatus;
  signMethod?: 'simple_ep' | 'sms_code' | 'scan' | 'qualified_ep';
  customerSignedAt?: string;
  contractorSignedAt?: string;
  // Файлы
  draftUrl?: string;
  signedUrl?: string;
  // Мета
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// СЧЁТ (Invoice)
// ============================================
export interface Invoice {
  id: string;
  orderId: string;
  contractId?: string;
  customerCompanyId: string;
  // Номер и даты
  number: string;
  date: string;
  dueDate: string;
  // Тип
  type: 'prepayment' | 'partial' | 'final' | 'additional';
  // Суммы
  amount: number;
  vatAmount: number;
  vatRate: number;
  // Статус
  status: InvoiceStatus;
  paidAmount: number;
  // Файл
  documentUrl?: string;
  // Мета
  createdBy: string;
  createdAt: string;
  paidAt?: string;
}

// ============================================
// ПЛАТЁЖ (Payment)
// ============================================
export interface Payment {
  id: string;
  invoiceId: string;
  orderId: string;
  // Сумма
  amount: number;
  // Метод
  method: 'card' | 'bank_transfer' | 'cash' | 'qr_code';
  // Статус
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  // Данные платежа
  transactionId?: string;
  paymentGateway?: string;
  receiptUrl?: string;
  // Время
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
}

// ============================================
// КОШЕЛЁК И ТРАНЗАКЦИИ (для биржи)
// ============================================
export interface Wallet {
  id: string;
  ownerType: 'contractor_company' | 'platform' | 'customer_company';
  ownerId: string;
  ownerName: string;
  balanceAvailable: number;
  balanceReserved: number;
  currency: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  orderId?: string;
  description: string;
  // Связи
  relatedTransactionId?: string;
  // Мета
  createdAt: string;
  processedAt?: string;
}

// ============================================
// ЗАКРЫВАЮЩИЕ ДОКУМЕНТЫ (ClosingDocs)
// ============================================
export interface ClosingDocs {
  id: string;
  orderId: string;
  // Документы
  actUrl?: string;
  actNumber?: string;
  actDate?: string;
  updUrl?: string; // УПД
  ks2Url?: string; // КС-2
  ks3Url?: string; // КС-3
  photoReportUrl?: string;
  // Статус
  status: 'draft' | 'ready' | 'sent' | 'accepted' | 'disputed';
  sentAt?: string;
  acceptedAt?: string;
  // Мета
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
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
  contractorName?: string;
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
// ТЕХНИКА (Vehicle/Equipment)
// ============================================
export interface Vehicle {
  id: string;
  ownerCompanyId: string;
  ownerCompanyName: string;
  ownerType: 'transkom' | 'contractor';
  // Тип
  type: AssetType;
  // Идентификация
  plateNumber: string; // Госномер
  inventoryNumber?: string;
  brand?: string;
  model?: string;
  year?: number;
  // Характеристики
  capacityM3?: number;
  capacityTons?: number;
  // GPS
  gpsEnabled: boolean;
  gpsDeviceId?: string;
  lastKnownLocation?: [number, number];
  lastLocationUpdate?: string;
  // Статус
  status: 'available' | 'busy' | 'maintenance' | 'inactive';
  currentOrderId?: string;
  // Мета
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// СМЕНА (Shift)
// ============================================
export interface Shift {
  id: string;
  orderId: string;
  date: string;
  // Исполнитель
  driverId?: string;
  driverName: string;
  vehicleId?: string;
  vehiclePlateNumber?: string;
  assetType: AssetType;
  // Время
  plannedStartTime?: string;
  plannedEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  plannedHours: number;
  actualHours?: number;
  // Статус
  status: 'planned' | 'started' | 'completed' | 'cancelled';
  // Связь с рейсами (для самосвалов)
  tripIds?: string[];
  // Мета
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// РЕЙС (Trip) - для снега
// ============================================
export interface Trip {
  id: string;
  shiftId: string;
  orderId: string;
  tripNumber: number;
  // Исполнитель
  driverId?: string;
  driverName: string;
  vehicleId?: string;
  // Время
  startTime?: string;
  loadingTime?: string;
  departureTime?: string;
  arrivalAtDisposalTime?: string;
  endTime?: string;
  // Объём
  loadedVolumeM3?: number;
  loadedTons?: number;
  // Утилизация
  disposalPointId?: string;
  disposalPointName?: string;
  disposalTicketNumber?: string;
  disposalTicketPhoto?: string;
  // Фото
  photoBefore?: string;
  photoLoading?: string;
  photoFullTruck?: string;
  photoUnloading?: string;
  photoAfter?: string;
  // Геолокация
  loadingLocation?: [number, number];
  unloadingLocation?: [number, number];
  // Статус
  status: 'planned' | 'loading' | 'en_route' | 'unloading' | 'returning' | 'completed' | 'cancelled';
  // Подтверждение
  isConfirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  rejectionReason?: string;
  // Мета
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// ЭТАП РАБОТ (WorkStage) - для асфальта
// ============================================
export interface WorkStage {
  id: string;
  orderId: string;
  stageType: WorkStageType;
  stageName: string;
  sequenceNumber: number;
  // Планирование
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  // Объёмы (зависит от типа)
  plannedQuantity?: number;
  actualQuantity?: number;
  unit?: string;
  // Материалы
  materials?: {
    name: string;
    brand?: string;
    quantity: number;
    unit: string;
  }[];
  // Приёмка
  isAccepted: boolean;
  acceptedBy?: string;
  acceptedAt?: string;
  acceptanceNotes?: string;
  // Фото
  photos?: {
    type: 'before' | 'during' | 'after' | 'material' | 'measurement';
    url: string;
    timestamp: string;
    description?: string;
  }[];
  // Чек-лист
  checklist?: {
    item: string;
    isCompleted: boolean;
    completedAt?: string;
    notes?: string;
  }[];
  // Статус
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  // Мета
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// НАЗНАЧЕНИЕ ТЕХНИКИ (расширенное)
// ============================================
export interface DriverAssignment {
  id: string;
  orderId: string;
  driverName: string;
  driverId?: string;
  contractorId?: string;
  contractorName?: string;

  assetType: AssetType;
  vehicleId?: string;
  vehicleNumber?: string;

  assignedPrice: number;
  priceUnit: PriceUnit;

  assignedAt: string;
  assignedBy: string; // Менеджер

  status: 'assigned' | 'confirmed' | 'en_route' | 'on_site' | 'working' | 'completed' | 'cancelled';
  confirmedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;

  // Для погрузчика - время смены (HH:MM формат)
  shiftStartTime?: string;
  shiftEndTime?: string;
  shiftId?: string;

  // Итоги работы
  totalTrips?: number;
  totalHours?: number;
  earnings?: number;
  confirmedEarnings?: number;

  // Оценка
  rating?: number;
  ratingComment?: string;
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
// ЗАКАЗ (СДЕЛКА) - ОСНОВНАЯ СУЩНОСТЬ (расширенная)
// ============================================
export interface Order {
  id: string;
  orderNumber?: string; // Читаемый номер заказа

  // Связь с лидом
  leadId?: string;

  // Режим исполнения
  executionMode: ExecutionMode;
  marketplaceStatus?: MarketplaceStatus;

  // Тип услуги
  serviceType: ServiceType;

  // Заказчик
  customer: string;
  customerId?: string;
  customerCompanyId?: string;
  contactInfo?: CustomerContact;

  // Объект
  siteId?: string;
  address: string;
  district?: string;
  coordinates: [number, number];

  // Ограничения
  restrictions?: OrderRestrictions;

  // Параметры для СНЕГА
  snowVolumeM3?: number;
  snowAreaM2?: number;
  snowHeightCm?: number;
  needsLoader?: boolean;
  needsDisposalTickets?: boolean;
  disposalPointId?: string;
  disposalPointName?: string;

  // Параметры для АСФАЛЬТА
  asphaltAreaM2?: number;
  asphaltType?: 'repair' | 'new' | 'parking' | 'road';
  asphaltLayers?: number;
  needsCurb?: boolean;
  curbLengthM?: number;
  needsDrainage?: boolean;
  workStages?: WorkStage[];

  // Краткое описание объёма работ
  scopeSummary?: string;

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

  // Смены и рейсы
  shifts?: Shift[];
  trips?: Trip[];
  plannedTrips: number;
  actualTrips: number;
  evidences: TripEvidence[];

  // Расчёт и КП
  estimates?: Estimate[];
  currentEstimate?: Estimate;
  offers?: Offer[];
  currentOffer?: Offer;

  // Legacy финансы (для совместимости)
  quotes?: Quote[];
  currentQuote?: Quote;

  // Договор
  contractId?: string;
  contract?: Contract;

  // Счета и оплаты
  invoiceIds?: string[];
  invoices?: Invoice[];
  payments?: Payment[];

  // Закрывающие документы
  closingDocs?: ClosingDocs;

  // Финансовые итоги
  earnings?: Earnings[];
  isPaid: boolean;
  paymentReceiptUrl?: string;
  totalCustomerPrice?: number;
  totalContractorPrice?: number;
  grossProfit?: number;

  // Комиссия платформы (для биржи)
  platformCommission?: number;
  platformCommissionRate?: number;

  // Сроки
  plannedStart?: string;
  plannedEnd?: string;
  scheduledTime: string;
  startedAt?: string;
  completedAt?: string;

  // Статус
  status: OrderStatus;
  isFrozen?: boolean;

  // Ответственные
  managerName: string;
  managerId?: string;
  dispatcherId?: string;
  dispatcherName?: string;
  estimatorId?: string;
  estimatorName?: string;

  // Исполнитель (для биржи)
  selectedContractorId?: string;
  selectedContractorName?: string;
  contractorAgreedPrice?: number;

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
    type: 'contract' | 'invoice' | 'act' | 'report' | 'estimate' | 'offer' | 'photo_report';
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

  // Претензия
  dispute?: {
    reason: string;
    description: string;
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    resolution?: string;
    createdAt: string;
    resolvedAt?: string;
  };
}

// ============================================
// НАЧИСЛЕНИЕ МЕНЕДЖЕРУ
// ============================================
export interface ManagerBonus {
  id: string;
  orderId: string;
  managerId: string;
  managerName: string;
  // Тип начисления
  bonusType: 'gross_profit_percent' | 'revenue_percent' | 'fixed';
  bonusRate: number;
  // Суммы
  baseAmount: number; // От чего считается (прибыль или выручка)
  bonusAmount: number;
  // Статус
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  // Условия
  calculatedAfter: 'payment' | 'closing';
  // Мета
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
}

// ============================================
// НАСТРОЙКИ КОМИССИЙ
// ============================================
export interface CommissionSettings {
  id: string;
  name: string;
  // Комиссия платформы
  platformCommissionType: 'percent' | 'fixed' | 'percent_plus_fixed';
  platformCommissionPercent?: number;
  platformCommissionFixed?: number;
  // Эквайринг
  acquiringFeePercent: number;
  // Бонусы менеджерам
  managerBonusType: 'gross_profit_percent' | 'revenue_percent' | 'fixed';
  managerBonusRate: number;
  // Штрафы
  cancellationPenaltyPercent?: number;
  latePenaltyPercent?: number;
  // Активность
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// УВЕДОМЛЕНИЕ
// ============================================
export interface Notification {
  id: string;
  userId: string;
  userRole: UserRole;
  // Тип
  type: 'new_lead' | 'offer_sent' | 'customer_approved' | 'invoice_overdue' |
        'equipment_assigned' | 'shift_started' | 'shift_ended' | 'ticket_uploaded' |
        'docs_ready' | 'dispute_opened' | 'bid_received' | 'payment_received';
  // Контент
  title: string;
  message: string;
  // Связи
  orderId?: string;
  leadId?: string;
  // Статус
  isRead: boolean;
  readAt?: string;
  // Каналы
  channels: ('app' | 'email' | 'sms' | 'push')[];
  sentVia?: ('app' | 'email' | 'sms' | 'push')[];
  // Мета
  createdAt: string;
}

// ============================================
// СПРАВОЧНИКИ
// ============================================
export type ManagerName = string;

export const DEFAULT_MANAGERS: ManagerName[] = ['АЛЕКСАНДР', 'ДМИТРИЙ', 'ЕКАТЕРИНА', 'СЕРГЕЙ'];

export const SIMPLIFIED_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.NEW_REQUEST,
  OrderStatus.AWAITING_CUSTOMER,
  OrderStatus.SEARCHING_EQUIPMENT,
  OrderStatus.EQUIPMENT_APPROVED,
  OrderStatus.EN_ROUTE,
  OrderStatus.IN_PROGRESS,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.DRAFT]: 'Черновик',
  [OrderStatus.NEW_REQUEST]: 'Новая заявка',
  [OrderStatus.CALCULATING]: 'Расчёт',
  [OrderStatus.AWAITING_CUSTOMER]: 'Ожидает клиента',
  [OrderStatus.CONFIRMED_BY_CUSTOMER]: 'Подтверждено',
  [OrderStatus.CONTRACT_SIGNING]: 'Подписание договора',
  [OrderStatus.AWAITING_PREPAYMENT]: 'Ожидание оплаты',
  [OrderStatus.SEARCHING_EQUIPMENT]: 'Поиск техники',
  [OrderStatus.SCHEDULING]: 'Планирование',
  [OrderStatus.EQUIPMENT_APPROVED]: 'Техника назначена',
  [OrderStatus.EN_ROUTE]: 'В пути',
  [OrderStatus.IN_PROGRESS]: 'В работе',
  [OrderStatus.EXPORT_COMPLETED]: 'Вывоз завершён',
  [OrderStatus.AWAITING_CLOSING_DOCS]: 'Подготовка документов',
  [OrderStatus.CLOSING_DOCS_SENT]: 'Документы отправлены',
  [OrderStatus.REPORT_READY]: 'Отчёт готов',
  [OrderStatus.COMPLETED]: 'Завершено',
  [OrderStatus.CANCELLED]: 'Отменено',
  [OrderStatus.DISPUTE]: 'Претензия'
};

// Метки статусов лида
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'Новый',
  [LeadStatus.CONTACTED]: 'Связались',
  [LeadStatus.QUALIFIED]: 'Квалифицирован',
  [LeadStatus.ESTIMATING]: 'В расчёте',
  [LeadStatus.OFFER_SENT]: 'КП отправлено',
  [LeadStatus.WON]: 'Выигран',
  [LeadStatus.LOST]: 'Проигран',
  [LeadStatus.SPAM]: 'Спам',
  [LeadStatus.DUPLICATE]: 'Дубль'
};

// Метки типов услуг
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.SNOW]: 'Вывоз снега',
  [ServiceType.ASPHALT]: 'Асфальтирование',
  [ServiceType.LANDSCAPING]: 'Благоустройство',
  [ServiceType.OTHER]: 'Другое'
};

// Метки режимов исполнения
export const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
  [ExecutionMode.OWN_FLEET]: 'Своя техника',
  [ExecutionMode.MARKETPLACE]: 'Биржа'
};

// Метки ролей
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: 'Клиент',
  [UserRole.SALES_MANAGER]: 'Менеджер продаж',
  [UserRole.ESTIMATOR]: 'Сметчик',
  [UserRole.DISPATCHER]: 'Диспетчер',
  [UserRole.CONTRACTOR]: 'Подрядчик',
  [UserRole.DRIVER]: 'Водитель',
  [UserRole.ACCOUNTANT]: 'Бухгалтер',
  [UserRole.ADMIN]: 'Администратор'
};

// Полный поток статусов заказа
export const FULL_ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.NEW_REQUEST,
  OrderStatus.CALCULATING,
  OrderStatus.AWAITING_CUSTOMER,
  OrderStatus.CONFIRMED_BY_CUSTOMER,
  OrderStatus.CONTRACT_SIGNING,
  OrderStatus.AWAITING_PREPAYMENT,
  OrderStatus.SCHEDULING,
  OrderStatus.SEARCHING_EQUIPMENT,
  OrderStatus.EQUIPMENT_APPROVED,
  OrderStatus.EN_ROUTE,
  OrderStatus.IN_PROGRESS,
  OrderStatus.EXPORT_COMPLETED,
  OrderStatus.AWAITING_CLOSING_DOCS,
  OrderStatus.CLOSING_DOCS_SENT,
  OrderStatus.REPORT_READY,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.DISPUTE
];

export const normalizeOrderStatus = (status?: OrderStatus) => {
  switch (status) {
    case OrderStatus.DRAFT:
      return OrderStatus.NEW_REQUEST;
    case OrderStatus.CALCULATING:
    case OrderStatus.AWAITING_CUSTOMER:
      return OrderStatus.AWAITING_CUSTOMER;
    case OrderStatus.CONFIRMED_BY_CUSTOMER:
    case OrderStatus.SEARCHING_EQUIPMENT:
      return OrderStatus.SEARCHING_EQUIPMENT;
    case OrderStatus.EQUIPMENT_APPROVED:
      return OrderStatus.EQUIPMENT_APPROVED;
    case OrderStatus.EN_ROUTE:
      return OrderStatus.EN_ROUTE;
    case OrderStatus.IN_PROGRESS:
      return OrderStatus.IN_PROGRESS;
    case OrderStatus.EXPORT_COMPLETED:
    case OrderStatus.REPORT_READY:
    case OrderStatus.COMPLETED:
      return OrderStatus.COMPLETED;
    case OrderStatus.CANCELLED:
      return OrderStatus.CANCELLED;
    default:
      return OrderStatus.NEW_REQUEST;
  }
};

export const getOrderStatusLabel = (status?: OrderStatus) => {
  const normalized = normalizeOrderStatus(status);
  return STATUS_LABELS[normalized];
};

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

export type DateRange = {
  from?: string;
  to?: string;
};

const parseDateValue = (value?: string) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

export const isWithinDateRange = (value: string | undefined, range: DateRange) => {
  if (!range.from && !range.to) return true;
  if (!value) return true;
  const time = parseDateValue(value);
  if (time === null) return true;

  const fromTime = parseDateValue(range.from);
  if (fromTime !== null && time < fromTime) return false;

  const toTime = parseDateValue(range.to);
  if (toTime !== null && time > toTime) return false;

  return true;
};

export const isOrderInDateRange = (order: Order, range: DateRange, field: 'scheduledTime' | 'createdAt' | 'updatedAt' = 'scheduledTime') => {
  const value = order[field] || order.scheduledTime || order.createdAt;
  return isWithinDateRange(value, range);
};

export const filterOrdersByDate = (orders: Order[], range: DateRange, field: 'scheduledTime' | 'createdAt' | 'updatedAt' = 'scheduledTime') => {
  if (!range.from && !range.to) return orders;
  return orders.filter(order => isOrderInDateRange(order, range, field));
};

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

// Генератор номера лида
export const generateLeadNumber = () => {
  const date = new Date();
  const prefix = 'L';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
};

// Генератор номера счёта
export const generateInvoiceNumber = () => {
  const date = new Date();
  const prefix = 'INV';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
};

// Генератор номера договора
export const generateContractNumber = () => {
  const date = new Date();
  const prefix = 'D';
  const year = date.getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}-${random}`;
};

// Расчёт комиссии платформы
export const calculatePlatformCommission = (
  orderAmount: number,
  settings: CommissionSettings
): { commission: number; acquiringFee: number; netAmount: number } => {
  let commission = 0;

  if (settings.platformCommissionType === 'percent' && settings.platformCommissionPercent) {
    commission = orderAmount * (settings.platformCommissionPercent / 100);
  } else if (settings.platformCommissionType === 'fixed' && settings.platformCommissionFixed) {
    commission = settings.platformCommissionFixed;
  } else if (settings.platformCommissionType === 'percent_plus_fixed') {
    commission = (orderAmount * ((settings.platformCommissionPercent || 0) / 100)) + (settings.platformCommissionFixed || 0);
  }

  const acquiringFee = orderAmount * (settings.acquiringFeePercent / 100);
  const netAmount = orderAmount - commission - acquiringFee;

  return { commission, acquiringFee, netAmount };
};

// Расчёт бонуса менеджера
export const calculateManagerBonus = (
  grossProfit: number,
  revenue: number,
  settings: CommissionSettings
): number => {
  if (settings.managerBonusType === 'gross_profit_percent') {
    return grossProfit * (settings.managerBonusRate / 100);
  } else if (settings.managerBonusType === 'revenue_percent') {
    return revenue * (settings.managerBonusRate / 100);
  } else {
    return settings.managerBonusRate;
  }
};

// Расчёт сметы
export const calculateEstimateTotals = (items: EstimateItem[], vatRate: number = 20, discount: number = 0): {
  subtotal: number;
  totalCost: number;
  grossProfit: number;
  vat: number;
  total: number;
  marginPercent: number;
} => {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalCost = items.reduce((sum, item) => sum + item.lineCost, 0);
  const grossProfit = subtotal - totalCost;
  const subtotalAfterDiscount = subtotal - discount;
  const vat = subtotalAfterDiscount * (vatRate / 100);
  const total = subtotalAfterDiscount + vat;
  const marginPercent = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0;

  return { subtotal, totalCost, grossProfit, vat, total, marginPercent };
};

// Рекомендованное количество рейсов по объёму
export const calculateRecommendedTrips = (volumeM3: number, truckCapacityM3: number = 20): number => {
  return Math.ceil(volumeM3 / truckCapacityM3);
};

// Расчёт объёма снега по площади и высоте
export const calculateSnowVolume = (areaM2: number, heightCm: number): number => {
  return areaM2 * (heightCm / 100);
};

// Справочник единиц измерения
export const UNIT_LABELS: Record<string, string> = {
  'trip': 'рейс',
  'hour': 'час',
  'shift': 'смена',
  'm2': 'м²',
  'm3': 'м³',
  'ton': 'тонна',
  'running_meter': 'п.м.',
  'piece': 'шт.'
};

// Справочник этапов работ для асфальта
export const WORK_STAGE_LABELS: Record<WorkStageType, string> = {
  [WorkStageType.PREPARATION]: 'Подготовка основания',
  [WorkStageType.BASE]: 'Устройство основания',
  [WorkStageType.GEOTEXTILE]: 'Укладка геотекстиля',
  [WorkStageType.GRAVEL]: 'Отсыпка щебнем',
  [WorkStageType.SAND]: 'Отсыпка песком',
  [WorkStageType.CURB]: 'Установка бордюров',
  [WorkStageType.ASPHALT_LAYER_1]: 'Асфальт (слой 1)',
  [WorkStageType.ASPHALT_LAYER_2]: 'Асфальт (слой 2)',
  [WorkStageType.MARKING]: 'Разметка',
  [WorkStageType.HANDOVER]: 'Сдача работ'
};

// Типы территории для снега
export const TERRITORY_TYPES = [
  'Двор',
  'Бизнес-центр',
  'Торговый центр',
  'Склад',
  'Парковка',
  'Дорога',
  'Частный дом',
  'Другое'
];

// Типы асфальтовых работ
export const ASPHALT_WORK_TYPES = [
  { value: 'repair', label: 'Ямочный ремонт' },
  { value: 'new', label: 'Новое покрытие' },
  { value: 'parking', label: 'Парковка' },
  { value: 'road', label: 'Дорога' }
];

// Источники лидов
export const LEAD_SOURCES = [
  { value: 'website', label: 'Сайт' },
  { value: 'phone', label: 'Телефон' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
  { value: 'ads', label: 'Реклама' },
  { value: 'referral', label: 'Рекомендация' },
  { value: 'other', label: 'Другое' }
];
