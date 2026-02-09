import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ContractorPortal from './ContractorPortal';
import CustomerPortal from './CustomerPortal';
import CustomerFormDispatcher from './CustomerForm_Dispatcher';
import ContractorForm from './ContractorForm';
import MapDashboard from './MapDashboard';
import OrderForm from './OrderForm';
import SalesManagerPortal from './SalesManagerPortal';
import EstimatorPortal from './EstimatorPortal';
import AccountantPortal from './AccountantPortal';
import AdminPanel from './AdminPanel';
import ActivityLogPanel from './ActivityLogPanel';
import {
  AssetType,
  Bid,
  Contractor,
  Customer,
  DEFAULT_MANAGERS,
  Message,
  DriverAssignment,
  DateRange,
  ManagerName,
  Order,
  OrderStatus,
  FULL_ORDER_STATUS_FLOW,
  TripEvidence,
  generateId,
  generateOrderNumber,
  getOrderStatusLabel,
  isOrderInDateRange,
  normalizeOrderStatus,
  calculateOrderTotals,
  isLoaderType,
  isTruckType,
  toLocalDateTimeInputValue,
  PriceUnit,
  PaymentType,
  // Новые типы
  UserRole,
  Lead,
  LeadStatus,
  ServiceType,
  ExecutionMode,
  Estimate,
  Invoice,
  Payment,
  Contract,
  ClosingDocs,
  User,
  Company,
  CompanyType,
  PriceBookItem,
  CommissionSettings,
  CompanySettings,
  Vehicle,
  USER_ROLE_LABELS,
  ActivityLogEntry,
  ActivityLogEntityType,
  ActivityLogAction,
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ENTITY_LABELS,
} from './types';

// Расширенные роли
type Role = 'dispatcher' | 'customer' | 'contractor' | 'sales_manager' | 'estimator' | 'accountant' | 'admin';

const ROLE_LABELS: Record<Role, string> = {
  dispatcher: 'Диспетчер',
  customer: 'Клиент',
  contractor: 'Подрядчики',
  sales_manager: 'Менеджер',
  estimator: 'Сметчик',
  accountant: 'Бухгалтер',
  admin: 'Админ',
};

const LS_KEYS = {
  orders: 'snowforce_orders_v1',
  customers: 'snowforce_customers_v1',
  contractors: 'snowforce_contractors_v1',
  role: 'snowforce_role_v1',
  manager: 'snowforce_manager_v1',
  contractorId: 'snowforce_contractor_id_v1',
  // Новые ключи
  leads: 'snowforce_leads_v1',
  users: 'snowforce_users_v1',
  companies: 'snowforce_companies_v1',
  priceBook: 'snowforce_pricebook_v1',
  commissionSettings: 'snowforce_commission_v1',
  companySettings: 'snowforce_company_settings_v1',
  vehicles: 'snowforce_vehicles_v1',
  activityLog: 'snowforce_activity_log_v1',
} as const;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const trySetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const safeJsonStringify = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

// Сжимает состояние для хранения в логе (убирает большие поля)
const compressState = (state: unknown): unknown => {
  if (!state || typeof state !== 'object') return state;
  const obj = state as Record<string, unknown>;
  // Сохраняем только ключевые поля для возможности отката
  const compressed: Record<string, unknown> = {};
  const allowedKeys = ['id', 'status', 'orderNumber', 'customer', 'customerId', 'name', 'phone', 'email',
    'address', 'totalCustomerPrice', 'totalContractorPrice', 'grossProfit', 'serviceType', 'inn'];
  for (const key of allowedKeys) {
    if (key in obj) compressed[key] = obj[key];
  }
  // Для полного отката храним assetRequirements и driverDetails без фото
  if ('assetRequirements' in obj && Array.isArray(obj.assetRequirements)) {
    compressed.assetRequirements = obj.assetRequirements;
  }
  if ('driverDetails' in obj && Array.isArray(obj.driverDetails)) {
    compressed.driverDetails = (obj.driverDetails as Record<string, unknown>[]).map(d => {
      const { ...rest } = d;
      return rest;
    });
  }
  return compressed;
};

const shouldStoreUrl = (url?: string) => {
  if (!url) return false;
  if (url.startsWith('data:')) return false;
  return url.length < 5000;
};

const sanitizeOrdersForStorage = (orders: Order[]) => {
  return orders.map(order => ({
    ...order,
    evidences: (order.evidences || []).map(ev => ({
      ...ev,
      photos: (ev.photos || []).filter(photo => shouldStoreUrl(photo?.url))
    })),
    closingDocs: order.closingDocs
      ? {
          ...order.closingDocs,
          attachments: (order.closingDocs.attachments || []).filter(att => shouldStoreUrl(att?.url))
        }
      : order.closingDocs,
    messages: (order.messages || []).map(msg => ({
      ...msg,
      attachments: (msg.attachments || []).filter(att => shouldStoreUrl(att?.url))
    }))
  }));
};

function seedCustomers(): Customer[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'cust-1',
      name: 'ООО "СНЕГОСЕРВИС"',
      phone: '+7 (999) 111-22-33',
      email: 'dispatch@snegoservice.ru',
      inn: '7700000000',
      paymentType: PaymentType.CASH,
      address: 'Москва, ул. Тверская, 1',
      comment: '',
      createdAt: now,
    },
    {
      id: 'cust-2',
      name: 'АО "ГородСнег"',
      phone: '+7 (999) 222-33-44',
      email: 'info@gorodsneg.ru',
      inn: '7700000002',
      paymentType: PaymentType.CARD,
      address: 'Москва, пр-т Мира, 25',
      comment: 'Требуются отчёты по каждому рейсу.',
      createdAt: now,
    },
    {
      id: 'cust-3',
      name: 'ИП Орлова',
      phone: '+7 (999) 333-44-55',
      email: 'orlova@example.com',
      inn: '7700000003',
      paymentType: PaymentType.VAT_20,
      address: 'Москва, Ленинградский проспект, 10',
      comment: 'Работы только днём.',
      createdAt: now,
    },
    {
      id: 'cust-4',
      name: 'ООО "СнегПрофи"',
      phone: '+7 (999) 444-55-66',
      email: 'office@snegprofi.ru',
      inn: '7700000006',
      paymentType: PaymentType.CASH,
      address: 'Москва, ул. Новослободская, 12',
      comment: 'Срочные заявки в вечернее время.',
      createdAt: now,
    },
  ];
}

function seedContractors(): Contractor[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'cont-1',
      name: 'ИП Петров',
      phone: '+7 (999) 444-55-66',
      email: 'petrov@example.com',
      inn: '7700000001',
      equipment: ['Самосвал', 'Погрузчик'],
      districts: ['ЦАО', 'САО', 'СВАО'],
      paymentType: PaymentType.CASH,
      rating: 4.7,
      completedOrders: 42,
      comments: 'Работаем круглосуточно.',
      isVerified: true,
      createdAt: now,
    },
    {
      id: 'cont-2',
      name: 'ООО "СнегТранс"',
      phone: '+7 (999) 555-66-77',
      email: 'dispatch@snegtrans.ru',
      inn: '7700000004',
      equipment: ['Самосвал 20м3', 'Самосвал 15м3'],
      districts: ['ЮАО', 'ЮЗАО', 'ЗАО'],
      paymentType: PaymentType.CARD,
      rating: 4.2,
      completedOrders: 18,
      comments: 'Техника 2022 года.',
      isVerified: false,
      createdAt: now,
    },
    {
      id: 'cont-3',
      name: 'ИП Сидоров',
      phone: '+7 (999) 777-88-99',
      email: 'sidorov@example.com',
      inn: '7700000005',
      equipment: ['Погрузчик', 'Мини-погрузчик'],
      districts: ['СЗАО', 'САО'],
      paymentType: PaymentType.VAT_20,
      rating: 4.9,
      completedOrders: 56,
      comments: 'Смены от 6 часов.',
      isVerified: true,
      createdAt: now,
    },
    {
      id: 'cont-4',
      name: 'ООО "СеверТех"',
      phone: '+7 (999) 888-99-00',
      email: 'ops@severtech.ru',
      inn: '7700000007',
      equipment: ['Самосвал 25м3', 'Погрузчик'],
      districts: ['ВАО', 'ЮВАО', 'ЦАО'],
      paymentType: PaymentType.CARD,
      rating: 4.4,
      completedOrders: 27,
      comments: 'Работаем по договору, минимум 5 смен.',
      isVerified: true,
      createdAt: now,
    },
  ];
}

function normalizeCustomer(raw: Partial<Customer>): Customer {
  const now = new Date().toISOString();
  return {
    id: raw.id || generateId(),
    name: raw.name || '',
    phone: raw.phone || '',
    email: raw.email || '',
    inn: raw.inn || '',
    paymentType: raw.paymentType || PaymentType.CASH,
    address: raw.address || '',
    comment: raw.comment || '',
    rating: raw.rating,
    totalOrders: raw.totalOrders,
    createdAt: raw.createdAt || now,
  };
}

function normalizeContractor(raw: Partial<Contractor>): Contractor {
  const now = new Date().toISOString();
  const ratingValue = typeof raw.rating === 'number' ? raw.rating : Number(raw.rating);
  const completedOrdersValue = typeof raw.completedOrders === 'number' ? raw.completedOrders : Number(raw.completedOrders);
  return {
    id: raw.id || generateId(),
    name: raw.name || '',
    phone: raw.phone || '',
    email: raw.email || '',
    inn: raw.inn || '',
    equipment: raw.equipment || [],
    districts: raw.districts || [],
    paymentType: raw.paymentType || PaymentType.CASH,
    rating: Number.isFinite(ratingValue) ? ratingValue : 0,
    completedOrders: Number.isFinite(completedOrdersValue) ? completedOrdersValue : 0,
    comments: raw.comments || '',
    isVerified: raw.isVerified ?? false,
    createdAt: raw.createdAt || now,
  };
}

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function normalizeOrderDates(order: Order): Order {
  const createdAt = order.createdAt || new Date().toISOString();
  const updatedAt = order.updatedAt || createdAt;
  const scheduledTime = order.scheduledTime || toLocalDateTimeInputValue(new Date(createdAt));
  const messages = toArray<Message>(order.messages).map(msg => ({
    ...msg,
    attachments: toArray(msg.attachments)
  }));
  const closingDocs = order.closingDocs && typeof order.closingDocs === 'object'
    ? {
        ...order.closingDocs,
        attachments: toArray(order.closingDocs.attachments)
      }
    : undefined;

  return {
    ...order,
    createdAt,
    updatedAt,
    scheduledTime,
    assetRequirements: toArray(order.assetRequirements),
    bids: toArray(order.bids),
    assignments: toArray(order.assignments),
    assignedDrivers: toArray(order.assignedDrivers),
    driverDetails: toArray(order.driverDetails),
    applicants: toArray(order.applicants),
    evidences: toArray(order.evidences),
    messages,
    invoices: toArray(order.invoices),
    payments: toArray(order.payments),
    closingDocs
  };
}

// Seed данные для лидов
function seedLeads(): Lead[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'lead-1',
      source: 'phone',
      customerName: 'ООО "НовыйКлиент"',
      customerPhone: '+7 (999) 000-11-22',
      customerEmail: 'new@client.ru',
      address: 'Москва, ул. Новая, 10',
      serviceType: ServiceType.SNOW,
      description: 'Нужен вывоз снега со двора, примерно 100м³',
      snowVolumeM3: 100,
      urgency: 'normal',
      assignedManagerId: 'manager-1',
      assignedManagerName: 'АЛЕКСАНДР',
      status: LeadStatus.NEW,
      createdAt: now,
    },
    {
      id: 'lead-2',
      source: 'website',
      customerName: 'ИП Сергеев',
      customerPhone: '+7 (999) 111-22-33',
      address: 'Москва, пр-т Вернадского, 50',
      serviceType: ServiceType.ASPHALT,
      description: 'Асфальтирование парковки 500м²',
      asphaltAreaM2: 500,
      asphaltType: 'parking',
      urgency: 'urgent',
      status: LeadStatus.CONTACTED,
      createdAt: now,
    },
  ];
}

// Seed данные для пользователей
function seedUsers(): User[] {
  const now = new Date().toISOString();
  return [
    { id: 'manager-1', role: UserRole.SALES_MANAGER, phone: '+7 (999) 100-00-01', name: 'АЛЕКСАНДР', status: 'active', createdAt: now },
    { id: 'manager-2', role: UserRole.SALES_MANAGER, phone: '+7 (999) 100-00-02', name: 'ДМИТРИЙ', status: 'active', createdAt: now },
    { id: 'manager-3', role: UserRole.SALES_MANAGER, phone: '+7 (999) 100-00-03', name: 'ЕКАТЕРИНА', status: 'active', createdAt: now },
    { id: 'estimator-1', role: UserRole.ESTIMATOR, phone: '+7 (999) 200-00-01', name: 'Иван Сметчиков', status: 'active', createdAt: now },
    { id: 'dispatcher-1', role: UserRole.DISPATCHER, phone: '+7 (999) 300-00-01', name: 'Диспетчер 1', status: 'active', createdAt: now },
    { id: 'accountant-1', role: UserRole.ACCOUNTANT, phone: '+7 (999) 400-00-01', name: 'Мария Бухгалтерова', status: 'active', createdAt: now },
    { id: 'admin-1', role: UserRole.ADMIN, phone: '+7 (999) 500-00-01', name: 'Администратор', status: 'active', createdAt: now },
  ];
}

// Seed данные для компаний
function seedCompanies(): Company[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'company-transkom',
      type: CompanyType.TRANSKOM,
      name: 'ООО "Транском"',
      inn: '7700000100',
      legalAddress: 'Москва, ул. Центральная, 1',
      phone: '+7 (495) 123-45-67',
      defaultPaymentType: PaymentType.VAT_20,
      isVerified: true,
      createdAt: now,
    },
  ];
}

// Seed данные для прайс-листа
function seedPriceBook(): PriceBookItem[] {
  const now = new Date().toISOString();
  return [
    { id: 'p1', workTypeId: 'snow_trip_20', workTypeName: 'Вывоз снега (самосвал 20м³)', serviceType: ServiceType.SNOW, unit: 'trip', unitLabel: 'рейс', baseCustomerPrice: 3500, baseCostPrice: 2800, isActive: true, createdAt: now },
    { id: 'p2', workTypeId: 'snow_trip_25', workTypeName: 'Вывоз снега (самосвал 25м³)', serviceType: ServiceType.SNOW, unit: 'trip', unitLabel: 'рейс', baseCustomerPrice: 4200, baseCostPrice: 3400, isActive: true, createdAt: now },
    { id: 'p3', workTypeId: 'loader_shift', workTypeName: 'Погрузчик JCB (смена)', serviceType: ServiceType.SNOW, unit: 'shift', unitLabel: 'смена', baseCustomerPrice: 15000, baseCostPrice: 12000, isActive: true, createdAt: now },
    { id: 'p4', workTypeId: 'loader_hour', workTypeName: 'Погрузчик JCB (час)', serviceType: ServiceType.SNOW, unit: 'hour', unitLabel: 'час', baseCustomerPrice: 2500, baseCostPrice: 2000, isActive: true, createdAt: now },
    { id: 'p5', workTypeId: 'asphalt_m2', workTypeName: 'Асфальтирование (1 слой)', serviceType: ServiceType.ASPHALT, unit: 'm2', unitLabel: 'м²', baseCustomerPrice: 450, baseCostPrice: 350, isActive: true, createdAt: now },
    { id: 'p6', workTypeId: 'asphalt_m2_2', workTypeName: 'Асфальтирование (2 слоя)', serviceType: ServiceType.ASPHALT, unit: 'm2', unitLabel: 'м²', baseCustomerPrice: 850, baseCostPrice: 680, isActive: true, createdAt: now },
    { id: 'p7', workTypeId: 'curb_m', workTypeName: 'Бордюр дорожный', serviceType: ServiceType.ASPHALT, unit: 'running_meter', unitLabel: 'п.м.', baseCustomerPrice: 1200, baseCostPrice: 900, isActive: true, createdAt: now },
  ];
}

// Seed данные для техники
function seedVehicles(): Vehicle[] {
  const now = new Date().toISOString();
  return [
    { id: 'v1', ownerCompanyId: 'company-transkom', ownerCompanyName: 'Транском', ownerType: 'transkom', type: AssetType.TRUCK_20, plateNumber: 'А001АА77', capacityM3: 20, gpsEnabled: true, status: 'available', createdAt: now },
    { id: 'v2', ownerCompanyId: 'company-transkom', ownerCompanyName: 'Транском', ownerType: 'transkom', type: AssetType.TRUCK_25, plateNumber: 'А002АА77', capacityM3: 25, gpsEnabled: true, status: 'available', createdAt: now },
    { id: 'v3', ownerCompanyId: 'company-transkom', ownerCompanyName: 'Транском', ownerType: 'transkom', type: AssetType.LOADER_JCB, plateNumber: 'А003АА77', gpsEnabled: true, status: 'available', createdAt: now },
  ];
}

function seedOrders(customers: Customer[]): Order[] {
  const now = new Date().toISOString();
  const nowLocal = toLocalDateTimeInputValue();
  const getCustomer = (index: number) => customers[index] || customers[0];
  const customerOne = getCustomer(0);
  const customerTwo = getCustomer(1);
  const customerThree = getCustomer(2);
  return [
    {
      id: 'ord-1',
      orderNumber: generateOrderNumber(),
      customer: customerOne?.name ?? 'Клиент',
      customerId: customerOne?.id,
      contactInfo: { name: customerOne?.name ?? 'Клиент', phone: customerOne?.phone ?? '' },
      address: 'Москва, ул. Тверская, 1',
      district: 'ЦАО',
      coordinates: [55.7558, 37.6173],
      assetRequirements: [
        {
          id: generateId(),
          type: AssetType.TRUCK,
          contractorId: '',
          contractorName: '',
          plannedUnits: 2,
          customerPrice: 3500,
          contractorPrice: 2800,
          priceUnit: 'За рейс' as any,
          minimalCharge: 0,
          deliveryCharge: 0,
        },
      ],
      isBirzhaOpen: false,
      bids: [],
      assignments: [],
      assignedDrivers: [],
      driverDetails: [],
      applicants: [],
      plannedTrips: 10,
      actualTrips: 0,
      evidences: [],
      isPaid: false,
      scheduledTime: nowLocal,
      status: OrderStatus.NEW_REQUEST,
      managerName: DEFAULT_MANAGERS[0],
      createdAt: now,
      updatedAt: now,
      actionLog: [],
      messages: [],
      unreadMessages: 0,
      // Новые поля
      serviceType: ServiceType.SNOW,
      executionMode: ExecutionMode.MARKETPLACE,
      snowVolumeM3: 200,
    },
    {
      id: 'ord-2',
      orderNumber: generateOrderNumber(),
      customer: customerTwo?.name ?? 'Клиент',
      customerId: customerTwo?.id,
      contactInfo: { name: customerTwo?.name ?? 'Клиент', phone: customerTwo?.phone ?? '' },
      address: 'Москва, пр-т Мира, 25',
      district: 'СВАО',
      coordinates: [55.7812, 37.6341],
      assetRequirements: [
        {
          id: generateId(),
          type: AssetType.TRUCK,
          contractorId: 'cont-2',
          contractorName: 'ООО "СнегТранс"',
          plannedUnits: 1,
          customerPrice: 4200,
          contractorPrice: 3400,
          priceUnit: 'За рейс' as any,
          minimalCharge: 0,
          deliveryCharge: 0,
        },
      ],
      isBirzhaOpen: false,
      bids: [],
      assignments: [],
      assignedDrivers: [],
      driverDetails: [],
      applicants: [],
      plannedTrips: 6,
      actualTrips: 0,
      evidences: [],
      isPaid: false,
      scheduledTime: nowLocal,
      status: OrderStatus.SEARCHING_EQUIPMENT,
      managerName: DEFAULT_MANAGERS[1],
      createdAt: now,
      updatedAt: now,
      actionLog: [],
      messages: [],
      unreadMessages: 0,
      // Новые поля
      serviceType: ServiceType.SNOW,
      executionMode: ExecutionMode.OWN_FLEET,
      snowVolumeM3: 120,
    },
    {
      id: 'ord-3',
      orderNumber: generateOrderNumber(),
      customer: customerThree?.name ?? 'Клиент',
      customerId: customerThree?.id,
      contactInfo: { name: customerThree?.name ?? 'Клиент', phone: customerThree?.phone ?? '' },
      address: 'Москва, Ленинградский проспект, 10',
      district: 'САО',
      coordinates: [55.7815, 37.5777],
      assetRequirements: [
        {
          id: generateId(),
          type: AssetType.LOADER,
          contractorId: 'cont-3',
          contractorName: 'ИП Сидоров',
          plannedUnits: 1,
          customerPrice: 15000,
          contractorPrice: 12000,
          priceUnit: 'За смену' as any,
          minimalCharge: 0,
          deliveryCharge: 0,
        },
        {
          id: generateId(),
          type: AssetType.TRUCK,
          contractorId: '',
          contractorName: '',
          plannedUnits: 1,
          customerPrice: 3800,
          contractorPrice: 3000,
          priceUnit: 'За рейс' as any,
          minimalCharge: 0,
          deliveryCharge: 0,
        },
      ],
      isBirzhaOpen: false,
      bids: [],
      assignments: [],
      assignedDrivers: [],
      driverDetails: [],
      applicants: [],
      plannedTrips: 8,
      actualTrips: 0,
      evidences: [],
      isPaid: false,
      scheduledTime: nowLocal,
      status: OrderStatus.NEW_REQUEST,
      managerName: DEFAULT_MANAGERS[2],
      createdAt: now,
      updatedAt: now,
      actionLog: [],
      messages: [],
      unreadMessages: 0,
      // Новые поля
      serviceType: ServiceType.SNOW,
      executionMode: ExecutionMode.MARKETPLACE,
      snowVolumeM3: 160,
      needsLoader: true,
    },
  ];
}

type StatusTone = 'slate' | 'amber' | 'violet' | 'blue' | 'teal' | 'green' | 'red' | 'rose';

const STATUS_TONE_STYLES: Record<StatusTone, { badge: string; dot: string }> = {
  slate: { badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200', dot: 'bg-slate-400' },
  amber: { badge: 'bg-amber-100/70 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  violet: { badge: 'bg-violet-100/70 text-violet-700 ring-1 ring-violet-200', dot: 'bg-violet-500' },
  blue: { badge: 'bg-blue-100/70 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  teal: { badge: 'bg-teal-100/70 text-teal-700 ring-1 ring-teal-200', dot: 'bg-teal-500' },
  green: { badge: 'bg-emerald-100/70 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  red: { badge: 'bg-red-100/70 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
  rose: { badge: 'bg-rose-100/70 text-rose-700 ring-1 ring-rose-200', dot: 'bg-rose-500' },
};

const getStatusTone = (status: OrderStatus): StatusTone => {
  switch (status) {
    case OrderStatus.DRAFT:
    case OrderStatus.NEW_REQUEST:
    case OrderStatus.CALCULATING:
    case OrderStatus.AWAITING_CUSTOMER:
    case OrderStatus.CONFIRMED_BY_CUSTOMER:
    case OrderStatus.CONTRACT_SIGNING:
    case OrderStatus.AWAITING_PREPAYMENT:
      return 'amber';
    case OrderStatus.SEARCHING_EQUIPMENT:
    case OrderStatus.SCHEDULING:
    case OrderStatus.EQUIPMENT_APPROVED:
      return 'violet';
    case OrderStatus.EN_ROUTE:
    case OrderStatus.IN_PROGRESS:
      return 'blue';
    case OrderStatus.EXPORT_COMPLETED:
    case OrderStatus.AWAITING_CLOSING_DOCS:
    case OrderStatus.CLOSING_DOCS_SENT:
    case OrderStatus.REPORT_READY:
      return 'teal';
    case OrderStatus.COMPLETED:
      return 'green';
    case OrderStatus.CANCELLED:
      return 'red';
    case OrderStatus.DISPUTE:
      return 'rose';
    default:
      return 'slate';
  }
};

const getOrderSortTimestamp = (order: Order) => {
  const value = order.scheduledTime || order.createdAt || order.updatedAt || '';
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
};

export default function App() {
  const [role, setRole] = useState<Role>(() => {
    const stored = localStorage.getItem(LS_KEYS.role) as Role | 'driver' | null;
    if (stored === 'driver') return 'contractor';
    return stored || 'dispatcher';
  });
  const [currentManager, setCurrentManager] = useState<ManagerName>(() => (localStorage.getItem(LS_KEYS.manager) as ManagerName) || DEFAULT_MANAGERS[0]);

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const rawCustomers = safeJsonParse(localStorage.getItem(LS_KEYS.customers), seedCustomers());
    const list = Array.isArray(rawCustomers) ? rawCustomers : seedCustomers();
    return list.map(normalizeCustomer);
  });
  const [contractors, setContractors] = useState<Contractor[]>(() => {
    const rawContractors = safeJsonParse(localStorage.getItem(LS_KEYS.contractors), seedContractors());
    const list = Array.isArray(rawContractors) ? rawContractors : seedContractors();
    return list.map(normalizeContractor);
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const rawOrders = safeJsonParse(localStorage.getItem(LS_KEYS.orders), seedOrders(seedCustomers()));
    const list = Array.isArray(rawOrders) ? rawOrders : seedOrders(seedCustomers());
    return list.map(normalizeOrderDates);
  });

  // Новые состояния
  const [leads, setLeads] = useState<Lead[]>(() => {
    const raw = safeJsonParse(localStorage.getItem(LS_KEYS.leads), seedLeads());
    return Array.isArray(raw) ? raw : seedLeads();
  });
  const [users, setUsers] = useState<User[]>(() => {
    const raw = safeJsonParse(localStorage.getItem(LS_KEYS.users), seedUsers());
    return Array.isArray(raw) ? raw : seedUsers();
  });
  const [companies, setCompanies] = useState<Company[]>(() => {
    const raw = safeJsonParse(localStorage.getItem(LS_KEYS.companies), seedCompanies());
    return Array.isArray(raw) ? raw : seedCompanies();
  });
  const [priceBook, setPriceBook] = useState<PriceBookItem[]>(() => {
    const raw = safeJsonParse(localStorage.getItem(LS_KEYS.priceBook), seedPriceBook());
    return Array.isArray(raw) ? raw : seedPriceBook();
  });
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings | null>(() => safeJsonParse(localStorage.getItem(LS_KEYS.commissionSettings), null));
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(() => safeJsonParse(localStorage.getItem(LS_KEYS.companySettings), null));
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const raw = safeJsonParse(localStorage.getItem(LS_KEYS.vehicles), seedVehicles());
    return Array.isArray(raw) ? raw : seedVehicles();
  });

  // Журнал действий (с проверкой размера при загрузке)
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(() => {
    try {
      const rawStr = localStorage.getItem(LS_KEYS.activityLog);
      // Если размер слишком большой - очищаем
      if (rawStr && rawStr.length > 500000) { // > 500KB
        console.warn('Журнал действий слишком большой, очищаем...');
        localStorage.removeItem(LS_KEYS.activityLog);
        return [];
      }
      const raw = safeJsonParse(rawStr, []);
      return Array.isArray(raw) ? raw.slice(0, 200) : [];
    } catch {
      localStorage.removeItem(LS_KEYS.activityLog);
      return [];
    }
  });
  const [showActivityLog, setShowActivityLog] = useState(false);

  const [view, setView] = useState<'dashboard' | 'order-form' | 'customer-form' | 'contractor-form' | 'customers' | 'contractors'>('dashboard');
  const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [editingContractor, setEditingContractor] = useState<Contractor | undefined>(undefined);
  const [customerReturnView, setCustomerReturnView] = useState<'dashboard' | 'customers' | 'order-form'>('dashboard');
  const [contractorReturnView, setContractorReturnView] = useState<'dashboard' | 'contractors' | 'order-form'>('dashboard');
  const [selectedMapOrder, setSelectedMapOrder] = useState<Order | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilterText, setCustomerFilterText] = useState('');
  const [customerFilterId, setCustomerFilterId] = useState<string | null>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerDirectorySearch, setCustomerDirectorySearch] = useState('');
  const [contractorDirectorySearch, setContractorDirectorySearch] = useState('');

  const [currentContractorId, setCurrentContractorId] = useState<string>(() => localStorage.getItem(LS_KEYS.contractorId) || contractors[0]?.id || '');
  // Очистка переполненного хранилища при старте
  useEffect(() => {
    try {
      const logStr = localStorage.getItem(LS_KEYS.activityLog);
      if (logStr && logStr.length > 300000) { // > 300KB - слишком много
        console.warn('Очистка переполненного журнала действий');
        localStorage.removeItem(LS_KEYS.activityLog);
        setActivityLog([]);
      }
    } catch {
      localStorage.removeItem(LS_KEYS.activityLog);
      setActivityLog([]);
    }
  }, []);

  // Persist
  useEffect(() => localStorage.setItem(LS_KEYS.role, role), [role]);
  useEffect(() => localStorage.setItem(LS_KEYS.manager, currentManager), [currentManager]);
  useEffect(() => localStorage.setItem(LS_KEYS.contractorId, currentContractorId), [currentContractorId]);

  useEffect(() => localStorage.setItem(LS_KEYS.customers, JSON.stringify(customers)), [customers]);
  useEffect(() => localStorage.setItem(LS_KEYS.contractors, JSON.stringify(contractors)), [contractors]);
  useEffect(() => {
    const raw = safeJsonStringify(orders);
    if (raw && trySetLocalStorage(LS_KEYS.orders, raw)) return;
    const sanitized = sanitizeOrdersForStorage(orders);
    const sanitizedRaw = safeJsonStringify(sanitized);
    if (sanitizedRaw) {
      trySetLocalStorage(LS_KEYS.orders, sanitizedRaw);
    }
  }, [orders]);
  // Сохранение новых состояний
  useEffect(() => localStorage.setItem(LS_KEYS.leads, JSON.stringify(leads)), [leads]);
  useEffect(() => localStorage.setItem(LS_KEYS.users, JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem(LS_KEYS.companies, JSON.stringify(companies)), [companies]);
  useEffect(() => localStorage.setItem(LS_KEYS.priceBook, JSON.stringify(priceBook)), [priceBook]);
  useEffect(() => { if (commissionSettings) localStorage.setItem(LS_KEYS.commissionSettings, JSON.stringify(commissionSettings)); }, [commissionSettings]);
  useEffect(() => { if (companySettings) localStorage.setItem(LS_KEYS.companySettings, JSON.stringify(companySettings)); }, [companySettings]);
  useEffect(() => localStorage.setItem(LS_KEYS.vehicles, JSON.stringify(vehicles)), [vehicles]);
  // Сохраняем журнал с обработкой ошибок и ограничением размера
  useEffect(() => {
    try {
      // Ограничиваем prevState/newState для экономии места
      const compressedLog = activityLog.slice(0, 200).map(entry => ({
        ...entry,
        prevState: entry.prevState ? compressState(entry.prevState) : null,
        newState: entry.newState ? compressState(entry.newState) : null,
      }));
      localStorage.setItem(LS_KEYS.activityLog, JSON.stringify(compressedLog));
    } catch (e) {
      console.warn('Не удалось сохранить журнал действий:', e);
      // При ошибке квоты - очищаем старые записи
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        try {
          const minimalLog = activityLog.slice(0, 50).map(entry => ({
            ...entry,
            prevState: null,
            newState: null,
          }));
          localStorage.setItem(LS_KEYS.activityLog, JSON.stringify(minimalLog));
        } catch {
          localStorage.removeItem(LS_KEYS.activityLog);
        }
      }
    }
  }, [activityLog]);

  // Функция для добавления записи в лог
  const addActivityLog = useCallback((
    entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>
  ) => {
    const newEntry: ActivityLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    setActivityLog(prev => [newEntry, ...prev].slice(0, 200)); // Храним последние 200 записей
  }, []);

  // Функция для отката действия
  const revertActivity = useCallback((logEntry: ActivityLogEntry) => {
    if (!logEntry.isReversible || logEntry.isReverted) return;

    const { entityType, entityId, prevState, action } = logEntry;
    const now = new Date().toISOString();

    if (entityType === 'order') {
      if (action === 'delete' && prevState) {
        // Восстановление удалённого заказа
        setOrders(prev => [prevState as Order, ...prev]);
      } else if (action === 'create') {
        // Удаление созданного заказа
        setOrders(prev => prev.filter(o => o.id !== entityId));
      } else if (prevState) {
        // Откат изменений заказа
        setOrders(prev => prev.map(o => o.id === entityId ? { ...(prevState as Order), updatedAt: now } : o));
      }
    } else if (entityType === 'customer') {
      if (action === 'delete' && prevState) {
        setCustomers(prev => [prevState as Customer, ...prev]);
      } else if (action === 'create') {
        setCustomers(prev => prev.filter(c => c.id !== entityId));
      } else if (prevState) {
        setCustomers(prev => prev.map(c => c.id === entityId ? (prevState as Customer) : c));
      }
    } else if (entityType === 'contractor') {
      if (action === 'delete' && prevState) {
        setContractors(prev => [prevState as Contractor, ...prev]);
      } else if (action === 'create') {
        setContractors(prev => prev.filter(c => c.id !== entityId));
      } else if (prevState) {
        setContractors(prev => prev.map(c => c.id === entityId ? (prevState as Contractor) : c));
      }
    } else if (entityType === 'lead') {
      if (action === 'delete' && prevState) {
        setLeads(prev => [prevState as Lead, ...prev]);
      } else if (action === 'create') {
        setLeads(prev => prev.filter(l => l.id !== entityId));
      } else if (prevState) {
        setLeads(prev => prev.map(l => l.id === entityId ? (prevState as Lead) : l));
      }
    }

    // Помечаем запись как откаченную
    setActivityLog(prev => prev.map(e =>
      e.id === logEntry.id
        ? { ...e, isReverted: true, revertedAt: now, revertedBy: ROLE_LABELS[role] }
        : e
    ));
  }, [role]);

  const resetOrdersAndTrips = useCallback(() => {
    const confirmed = window.confirm('Сбросить все заказы и рейсы? Данные будут удалены.');
    if (!confirmed) return;
    setOrders([]);
    trySetLocalStorage(LS_KEYS.orders, JSON.stringify([]));
    setSelectedMapOrder(null);
    setView('dashboard');
  }, []);

  const dateRange = useMemo<DateRange>(() => ({
    from: dateFrom || undefined,
    to: dateTo || undefined
  }), [dateFrom, dateTo]);

  const customerSuggestions = useMemo(() => {
    const term = customerFilterText.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(term));
  }, [customers, customerFilterText]);

  const managerOrders = useMemo(() => {
    if (role !== 'dispatcher') return orders;
    return orders.filter(o => o.managerName === currentManager);
  }, [orders, role, currentManager]);

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    const customerTerm = customerFilterText.trim().toLowerCase();
    const list = managerOrders.filter(o => {
      const isClosed = [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(o.status as OrderStatus);
      // Если явно выбран статус "Завершено" или "Отменено" - показываем эти заказы
      const isFilteringByClosedStatus = [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(statusFilter as OrderStatus);
      if (!showCompleted && isClosed && !isFilteringByClosedStatus) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (customerFilterId && o.customerId !== customerFilterId) return false;
      if (!customerFilterId && customerTerm && !o.customer.toLowerCase().includes(customerTerm)) return false;
      if (!isOrderInDateRange(o, dateRange)) return false;
      if (!term) return true;
      return (
        o.customer.toLowerCase().includes(term) ||
        o.address.toLowerCase().includes(term) ||
        (o.orderNumber || '').toLowerCase().includes(term)
      );
    });

    return [...list].sort((a, b) => {
      const delta = getOrderSortTimestamp(a) - getOrderSortTimestamp(b);
      return sortOrder === 'newest' ? -delta : delta;
    });
  }, [managerOrders, orderSearch, statusFilter, customerFilterId, customerFilterText, dateRange, sortOrder, showCompleted]);

  const hasFilters = Boolean(
    orderSearch.trim() ||
    customerFilterText.trim() ||
    dateFrom ||
    dateTo ||
    statusFilter !== 'all' ||
    sortOrder !== 'newest' ||
    showCompleted
  );

  const filteredCustomers = useMemo(() => {
    const term = customerDirectorySearch.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.inn || '').toLowerCase().includes(term)
    );
  }, [customers, customerDirectorySearch]);

  const filteredContractors = useMemo(() => {
    const term = contractorDirectorySearch.trim().toLowerCase();
    if (!term) return contractors;
    return contractors.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.inn || '').toLowerCase().includes(term)
    );
  }, [contractors, contractorDirectorySearch]);

  useEffect(() => {
    if (!selectedMapOrder) return;
    if (!filteredOrders.some(o => o.id === selectedMapOrder.id)) {
      setSelectedMapOrder(null);
    }
  }, [filteredOrders, selectedMapOrder]);

  // Dispatcher actions
  const addOrder = useCallback(
    (partial: Partial<Order>) => {
      const now = new Date().toISOString();
      const order: Order = {
        id: partial.id || generateId(),
        orderNumber: partial.orderNumber || generateOrderNumber(),
        customer: partial.customer || '',
        customerId: partial.customerId,
        contactInfo: partial.contactInfo,
        address: partial.address || '',
        district: partial.district,
        coordinates: partial.coordinates || [55.7512, 37.6184],
        restrictions: partial.restrictions,
        assetRequirements: partial.assetRequirements || [],
        isBirzhaOpen: partial.isBirzhaOpen ?? true,
        marketPosts: partial.marketPosts,
        bids: partial.bids || [],
        assignments: partial.assignments || [],
        assignedDrivers: partial.assignedDrivers || [],
        driverDetails: partial.driverDetails || [],
        applicants: partial.applicants || [],
        plannedTrips: partial.plannedTrips || 0,
        actualTrips: partial.actualTrips || 0,
        evidences: partial.evidences || [],
        quotes: partial.quotes,
        currentQuote: partial.currentQuote,
        earnings: partial.earnings,
        isPaid: partial.isPaid ?? false,
        totalCustomerPrice: partial.totalCustomerPrice,
        totalContractorPrice: partial.totalContractorPrice,
        scheduledTime: partial.scheduledTime || toLocalDateTimeInputValue(),
        startedAt: partial.startedAt,
        completedAt: partial.completedAt,
        status: (partial.status as OrderStatus) || OrderStatus.NEW_REQUEST,
        isFrozen: partial.isFrozen,
        managerName: (partial.managerName as ManagerName) || currentManager,
        managerId: partial.managerId,
        messages: partial.messages || [],
        unreadMessages: partial.unreadMessages || 0,
        actionLog: partial.actionLog || [],
        createdAt: partial.createdAt || now,
        updatedAt: now,
        documents: partial.documents,
        feedback: partial.feedback,
      };
      setOrders(prev => [order, ...prev]);

      // Логируем создание заказа
      addActivityLog({
        userId: undefined,
        userName: ROLE_LABELS[role],
        userRole: role,
        entityType: 'order',
        entityId: order.id,
        entityName: order.orderNumber || order.customer,
        action: 'create',
        actionLabel: 'Создан заказ',
        description: `Создан заказ ${order.orderNumber} для ${order.customer}`,
        prevState: null,
        newState: order,
        isReversible: true,
        isReverted: false,
      });
    },
    [currentManager, addActivityLog, role]
  );

  const updateOrder = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders(prev => {
      const oldOrder = prev.find(o => o.id === orderId);
      const newOrders = prev.map(o => (o.id === orderId ? ({ ...o, ...updates, updatedAt: new Date().toISOString() } as Order) : o));

      // Логируем изменение заказа (только для значимых изменений)
      if (oldOrder && (updates.status || updates.isPaid !== undefined || updates.totalCustomerPrice !== undefined)) {
        const newOrder = newOrders.find(o => o.id === orderId);
        const action: ActivityLogAction = updates.status && updates.status !== oldOrder.status ? 'status_change' : 'update';
        const description = updates.status && updates.status !== oldOrder.status
          ? `Статус изменён: ${oldOrder.status} → ${updates.status}`
          : 'Обновлён заказ';

        addActivityLog({
          userId: undefined,
          userName: ROLE_LABELS[role],
          userRole: role,
          entityType: 'order',
          entityId: orderId,
          entityName: oldOrder.orderNumber || oldOrder.customer,
          action,
          actionLabel: action === 'status_change' ? 'Смена статуса' : 'Изменение',
          description,
          prevState: oldOrder,
          newState: newOrder,
          isReversible: true,
          isReverted: false,
        });
      }

      return newOrders;
    });
  }, [addActivityLog, role]);

  const onSubmitOrderForm = useCallback(
    (data: Partial<Order>, keepOpen?: boolean) => {
      const merged = editingOrder?.id ? ({ ...editingOrder, ...data } as Order) : (data as Order);
      let totalCustomerPrice: number | undefined;
      let totalContractorPrice: number | undefined;
      let grossProfit: number | undefined;
      if (merged.currentEstimate) {
        totalCustomerPrice = merged.currentEstimate.totalCustomerPrice;
        totalContractorPrice = merged.currentEstimate.totalCost;
        grossProfit = merged.currentEstimate.grossProfit;
      } else {
        const totals = calculateOrderTotals(merged, { mode: 'actual_or_planned', includeCharges: true, contractorMode: 'actual' });
        totalCustomerPrice = totals.customerTotal;
        totalContractorPrice = totals.contractorTotal;
        grossProfit = totals.margin;
      }
      const dataWithTotals = { ...data, totalCustomerPrice, totalContractorPrice, grossProfit };
      if (editingOrder?.id) {
        updateOrder(editingOrder.id, dataWithTotals);
        if (keepOpen) {
          // Обновляем editingOrder, чтобы форма показывала актуальные данные
          setEditingOrder(prev => prev ? { ...prev, ...dataWithTotals } as Order : undefined);
          return;
        }
      } else {
        addOrder(dataWithTotals);
      }
      setEditingOrder(undefined);
      setView('dashboard');
    },
    [addOrder, updateOrder, editingOrder?.id]
  );

  const deleteOrder = useCallback((orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setEditingOrder(undefined);
    setSelectedMapOrder(null);
    setView('dashboard');
  }, []);

  const addCustomer = useCallback((customer: Customer) => {
    const normalized = normalizeCustomer(customer);
    setCustomers(prev => [normalized, ...prev.filter(c => c.id !== normalized.id)]);
  }, []);

  const addContractor = useCallback((contractor: Contractor) => {
    const normalized = normalizeContractor(contractor);
    setContractors(prev => [normalized, ...prev.filter(c => c.id !== normalized.id)]);
  }, []);

  // Contractor actions
  const submitBid = useCallback((orderId: string, bid: Bid) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? ({ ...o, bids: [...(o.bids || []), bid], updatedAt: new Date().toISOString() } as Order) : o))
    );
  }, []);

  const withdrawBid = useCallback((orderId: string, bidId: string) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? (() => {
              const bids = (o.bids || []).map(b => (b.id === bidId ? { ...b, status: 'withdrawn' } : b));
              const withdrawnBid = (o.bids || []).find(b => b.id === bidId);
              if (!withdrawnBid) {
                return { ...o, bids, updatedAt: new Date().toISOString() } as Order;
              }
              const isBeforeWork = (status: DriverAssignment['status']) =>
                ['assigned', 'confirmed'].includes(status);
              const shouldRemove = (assignment: DriverAssignment) => {
                if (!isBeforeWork(assignment.status)) return false;
                if (withdrawnBid.contractorId && assignment.contractorId !== withdrawnBid.contractorId) return false;
                if (withdrawnBid.driverId && assignment.driverId !== withdrawnBid.driverId) return false;
                if (assignment.assetType !== withdrawnBid.assetType) return false;
                if (withdrawnBid.driverName && assignment.driverName !== withdrawnBid.driverName) return false;
                return true;
              };
              const updatedAssignments = (o.assignments || []).filter(a => !shouldRemove(a));
              const updatedDriverDetails = (o.driverDetails || []).filter(a => !shouldRemove(a));
              const assignedDrivers = (o.assignedDrivers || []).filter(name =>
                updatedDriverDetails.some(d => d.driverName === name)
              );
              return {
                ...o,
                bids,
                assignments: updatedAssignments,
                driverDetails: updatedDriverDetails,
                assignedDrivers,
                updatedAt: new Date().toISOString(),
              } as Order;
            })()
          : o
      )
    );
  }, []);

  const onUpdateContractor = useCallback((contractor: Contractor) => {
    setContractors(prev => prev.map(c => (c.id === contractor.id ? contractor : c)));
  }, []);

  const isSameAssetGroup = useCallback((left: AssetType, right: AssetType) => {
    if (left === right) return true;
    if (isLoaderType(left) && isLoaderType(right)) return true;
    if (isTruckType(left) && isTruckType(right)) return true;
    return false;
  }, []);

  // Driver actions
  const reportTrip = useCallback((orderId: string, evidence: TripEvidence) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const evidences = [...(o.evidences || []), evidence];
        return {
          ...o,
          evidences,
          updatedAt: new Date().toISOString(),
        } as Order;
      })
    );
  }, []);

  const acceptJob = useCallback((orderId: string, contractorId: string, assetType: AssetType) => {
    const contractor = contractors.find(c => c.id === contractorId);
    const driverDisplayName = contractor?.name || 'ВОДИТЕЛЬ';

    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? (() => {
              let requirementUpdated = false;
              let matchedRequirement: any;
              let updatedRequirements = (o.assetRequirements || []).map(req => {
                if (requirementUpdated) return req;
                if (!isSameAssetGroup(req.type, assetType)) return req;
                if (req.contractorId && req.contractorId !== contractorId) return req;
                requirementUpdated = true;
                matchedRequirement = req;
                return {
                  ...req,
                  contractorId,
                  contractorName: contractor?.name || req.contractorName || 'Подрядчик'
                };
              });

              if (!requirementUpdated) {
                const baseReq = (o.assetRequirements || []).find(req => isSameAssetGroup(req.type, assetType));
                const priceUnit = baseReq?.priceUnit || (isLoaderType(assetType) ? PriceUnit.PER_SHIFT : PriceUnit.PER_TRIP);
                const newReq = {
                  id: generateId(),
                  type: assetType,
                  contractorId,
                  contractorName: contractor?.name || 'Подрядчик',
                  plannedUnits: 1,
                  customerPrice: baseReq?.customerPrice || 0,
                  contractorPrice: baseReq?.contractorPrice || 0,
                  priceUnit,
                  minimalCharge: baseReq?.minimalCharge || 0,
                  deliveryCharge: baseReq?.deliveryCharge || 0,
                };
                matchedRequirement = newReq;
                updatedRequirements = [...updatedRequirements, newReq];
              }

              const assignment: DriverAssignment = {
                id: generateId(),
                orderId,
                driverName: driverDisplayName,
                driverId: undefined,
                contractorId,
                contractorName: contractor?.name,
                assetType,
                vehicleNumber: '',
                scheduledDate: o.scheduledTime, // Дата когда нужна техника (из заказа)
                assignedPrice: matchedRequirement?.contractorPrice || 0,
                priceUnit: matchedRequirement?.priceUnit || (isLoaderType(assetType) ? PriceUnit.PER_SHIFT : PriceUnit.PER_TRIP),
                assignedAt: new Date().toISOString(),
                assignedBy: 'SYSTEM',
                status: 'assigned',
              };

              return {
                ...o,
                assetRequirements: updatedRequirements,
                assignments: [...(o.assignments || []), assignment],
                driverDetails: [...(o.driverDetails || []), assignment],
                assignedDrivers: [...(o.assignedDrivers || []), driverDisplayName],
                status: normalizeOrderStatus(o.status) === OrderStatus.SEARCHING_EQUIPMENT ? OrderStatus.EQUIPMENT_APPROVED : o.status,
                updatedAt: new Date().toISOString(),
              } as Order;
            })()
          : o
      )
    );
  }, [contractors, isSameAssetGroup]);

  const finishWork = useCallback((orderId: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const now = new Date().toISOString();
        const assignments = (o.assignments || []).map(a =>
          a.status === 'completed' ? a : { ...a, status: 'completed', completedAt: now }
        );
        const driverDetails = (o.driverDetails || []).map(d =>
          d.status === 'completed' ? d : { ...d, status: 'completed', completedAt: now }
        );
        return {
          ...o,
          assignments,
          driverDetails,
          updatedAt: now,
        } as Order;
      })
    );
  }, []);

  // === Новые callbacks для расширенного функционала ===

  // Р›РёРґС‹
  const addLead = useCallback((lead: Lead) => {
    setLeads(prev => [lead, ...prev]);
  }, []);

  const updateLead = useCallback((leadId: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
  }, []);

  const convertLeadToOrder = useCallback((lead: Lead) => {
    const now = new Date().toISOString();
    const newOrder: Order = {
      id: generateId(),
      orderNumber: generateOrderNumber(),
      leadId: lead.id,
      executionMode: ExecutionMode.OWN_FLEET,
      serviceType: lead.serviceType,
      customer: lead.customerName,
      customerId: lead.customerCompanyId,
      contactInfo: { name: lead.customerName, phone: lead.customerPhone, email: lead.customerEmail },
      address: lead.address || '',
      coordinates: [55.7558, 37.6173],
      assetRequirements: [],
      isBirzhaOpen: false,
      bids: [],
      assignments: [],
      assignedDrivers: [],
      driverDetails: [],
      applicants: [],
      plannedTrips: 0,
      actualTrips: 0,
      evidences: [],
      isPaid: false,
      scheduledTime: nowLocal,
      status: OrderStatus.NEW_REQUEST,
      managerName: lead.assignedManagerName || currentManager,
      managerId: lead.assignedManagerId,
      createdAt: now,
      updatedAt: now,
      actionLog: [],
      messages: [],
      snowVolumeM3: lead.snowVolumeM3,
      snowAreaM2: lead.snowAreaM2,
      snowHeightCm: lead.snowHeightCm,
      needsLoader: lead.needsLoader,
      asphaltAreaM2: lead.asphaltAreaM2,
      asphaltType: lead.asphaltType,
      needsCurb: lead.needsCurb,
      curbLengthM: lead.curbLengthM,
      scopeSummary: lead.description,
    };
    setOrders(prev => [newOrder, ...prev]);
  }, [currentManager]);

  // Сметы
  const saveEstimate = useCallback((orderId: string, estimate: Estimate) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      currentEstimate: estimate,
      estimates: [...(o.estimates || []), estimate],
      totalCustomerPrice: estimate.totalCustomerPrice,
      totalContractorPrice: estimate.totalCost,
      grossProfit: estimate.grossProfit,
      updatedAt: new Date().toISOString(),
    } : o));
  }, []);

  // Счета
  const createInvoice = useCallback((orderId: string, invoice: Invoice) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      invoices: [...(o.invoices || []), invoice],
      invoiceIds: [...(o.invoiceIds || []), invoice.id],
      updatedAt: new Date().toISOString(),
    } : o));
  }, []);

  // Платежи
  const recordPayment = useCallback((orderId: string, payment: Payment) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      payments: [...(o.payments || []), payment],
      updatedAt: new Date().toISOString(),
    } : o));
  }, []);

  // Договоры
  const createContract = useCallback((orderId: string, contract: Contract) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      contract,
      contractId: contract.id,
      updatedAt: new Date().toISOString(),
    } : o));
  }, []);

  // Закрывающие документы
  const createClosingDocs = useCallback((orderId: string, docs: ClosingDocs) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      closingDocs: docs,
      updatedAt: new Date().toISOString(),
    } : o));
  }, []);

  // Пользователи
  const addUser = useCallback((user: User) => {
    setUsers(prev => [user, ...prev]);
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
  }, []);

  // Компании
  const addCompany = useCallback((company: Company) => {
    setCompanies(prev => [company, ...prev]);
  }, []);

  const updateCompany = useCallback((companyId: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...updates } : c));
  }, []);

  // Прайс-лист
  const addPriceItem = useCallback((item: PriceBookItem) => {
    setPriceBook(prev => [item, ...prev]);
  }, []);

  const updatePriceItem = useCallback((itemId: string, updates: Partial<PriceBookItem>) => {
    setPriceBook(prev => prev.map(p => p.id === itemId ? { ...p, ...updates } : p));
  }, []);

  const deletePriceItem = useCallback((itemId: string) => {
    setPriceBook(prev => prev.filter(p => p.id !== itemId));
  }, []);

  // Техника
  const addVehicle = useCallback((vehicle: Vehicle) => {
    setVehicles(prev => [vehicle, ...prev]);
  }, []);

  const updateVehicle = useCallback((vehicleId: string, updates: Partial<Vehicle>) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, ...updates } : v));
  }, []);

  // Обновление данных назначения водителя (например, время смены погрузчика)
  const updateDriverAssignment = useCallback((orderId: string, driverAssignmentId: string, updates: Partial<DriverAssignment>) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const driverDetails = (o.driverDetails || []).map(d => 
          d.id === driverAssignmentId ? { ...d, ...updates } : d
        );
        const normalized = normalizeOrderStatus(o.status);
        if ([OrderStatus.CANCELLED, OrderStatus.COMPLETED].includes(normalized)) {
          return { ...o, driverDetails, updatedAt: new Date().toISOString() } as Order;
        }
        const statuses = driverDetails.map(d => d.status);
        const hasWorking = statuses.some(s => s === 'working' || s === 'on_site');
        const hasEnRoute = statuses.some(s => s === 'en_route');
        const nextStatus = hasWorking
          ? OrderStatus.IN_PROGRESS
          : hasEnRoute
          ? OrderStatus.EN_ROUTE
          : normalized;
        return { ...o, status: nextStatus, driverDetails, updatedAt: new Date().toISOString() } as Order;
      })
    );
  }, []);

  // Удаление назначения техники (отзыв подрядчиком или диспетчером)
  const removeDriverAssignment = useCallback((orderId: string, assignmentId: string, reason?: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const assignment = (o.driverDetails || []).find(d => d.id === assignmentId);
        if (!assignment) return o;

        // Удаляем назначение из driverDetails и assignments
        const updatedDriverDetails = (o.driverDetails || []).filter(d => d.id !== assignmentId);
        const updatedAssignments = (o.assignments || []).filter(a => a.id !== assignmentId);

        // Удаляем водителя из assignedDrivers если больше нет его назначений
        const assignedDrivers = (o.assignedDrivers || []).filter(name =>
          updatedDriverDetails.some(d => d.driverName === name)
        );

        // Обновляем статус связанных бидов на 'withdrawn'
        const updatedBids = (o.bids || []).map(b => {
          if (b.contractorId === assignment.contractorId &&
              b.assetType === assignment.assetType &&
              b.status === 'accepted') {
            return { ...b, status: 'withdrawn' as const };
          }
          return b;
        });

        let updatedRequirements = o.assetRequirements || [];
        if (assignment.contractorId) {
          const hasRemainingForContractor = updatedDriverDetails.some(d =>
            d.contractorId === assignment.contractorId && isSameAssetGroup(d.assetType, assignment.assetType)
          );
          if (!hasRemainingForContractor) {
            updatedRequirements = updatedRequirements.map(req => {
              if (req.contractorId !== assignment.contractorId) return req;
              if (!isSameAssetGroup(req.type, assignment.assetType)) return req;
              return { ...req, contractorId: '', contractorName: 'Биржа' };
            });
          }
        }

        // Если больше нет назначенной техники, возвращаем статус на поиск техники
        const normalized = normalizeOrderStatus(o.status);
        let newStatus = o.status;
        if (updatedDriverDetails.length === 0 &&
            [OrderStatus.EQUIPMENT_APPROVED, OrderStatus.SCHEDULING].includes(normalized)) {
          newStatus = OrderStatus.SEARCHING_EQUIPMENT;
        }

        return {
          ...o,
          assetRequirements: updatedRequirements,
          driverDetails: updatedDriverDetails,
          assignments: updatedAssignments,
          assignedDrivers,
          bids: updatedBids,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        } as Order;
      })
    );
  }, []);

  const headerRight = useMemo(() => {
    if (role === 'dispatcher') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
            value={currentManager}
            onChange={e => setCurrentManager(e.target.value as ManagerName)}
          >
            {DEFAULT_MANAGERS.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            className={`rounded-xl border px-4 py-2 text-sm font-black ${
              view === 'customers' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            onClick={() => {
              setView('customers');
              setSelectedMapOrder(null);
            }}
          >
            Клиенты
          </button>
          <button
            className={`rounded-xl border px-4 py-2 text-sm font-black ${
              view === 'contractors' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            onClick={() => {
              setView('contractors');
              setSelectedMapOrder(null);
            }}
          >
            Подрядчики
          </button>
          <button
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100"
            onClick={resetOrdersAndTrips}
          >
            Сбросить заказы
          </button>
          <button
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-black"
            onClick={() => {
              setEditingOrder(undefined);
              setView('order-form');
            }}
          >
            + Заказ
          </button>
        </div>
      );
    }
    if (role === 'contractor') {
      return (
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
          value={currentContractorId}
          onChange={e => setCurrentContractorId(e.target.value)}
        >
          {contractors.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      );
    }
    return null;
  }, [contractors, currentContractorId, currentManager, resetOrdersAndTrips, role, view]);

  const buildTag = `BUILD: ${new Date().toLocaleString()}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="fixed bottom-3 right-3 z-50 rounded-full bg-black/80 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 shadow-lg">
        {buildTag}
      </div>
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="font-black tracking-tight text-lg">SnowForce Dispatch</div>
            <div className="flex items-center gap-1 flex-wrap">
              {(['dispatcher', 'sales_manager', 'estimator', 'accountant', 'customer', 'contractor', 'admin'] as Role[]).map(r => (
                <button
                  key={r}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                    role === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setRole(r);
                    setView('dashboard');
                    setSelectedMapOrder(null);
                  }}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {headerRight}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {role === 'dispatcher' && view === 'dashboard' && (
          <div className="space-y-6">
            <MapDashboard 
              orders={filteredOrders} 
              onSelectOrder={o => setSelectedMapOrder(o)}
            />

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">Заказы</div>
                  <div className="text-2xl font-black tracking-tight">Панель диспетчера</div>
                </div>
                {selectedMapOrder && (
                  <button
                    className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-black"
                    onClick={() => {
                      setEditingOrder(selectedMapOrder);
                      setView('order-form');
                    }}
                  >
                    Редактировать выбранный
                  </button>
                )}
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex min-w-[220px] flex-1 flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Поиск</span>
                    <input
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      placeholder="Номер, клиент, адрес"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
                    />
                  </div>
                  <div className="relative flex w-full max-w-xs flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Клиент</span>
                    <input
                      value={customerFilterText}
                      onChange={e => {
                        setCustomerFilterText(e.target.value);
                        setCustomerFilterId(null);
                        setShowCustomerSuggestions(true);
                      }}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
                      placeholder="Фильтр по клиенту"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
                    />
                    {showCustomerSuggestions && customerSuggestions.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl max-h-52 overflow-auto">
                        {customerSuggestions.map(c => (
                          <button
                            type="button"
                            key={c.id}
                            onMouseDown={() => {
                              setCustomerFilterText(c.name);
                              setCustomerFilterId(c.id);
                              setShowCustomerSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-slate-50"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">С</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">По</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Статус</span>
                    <select
                      value={statusFilter}
                      onChange={e => {
                        const value = e.target.value as OrderStatus | 'all';
                        setStatusFilter(value);
                        if (value === OrderStatus.COMPLETED) {
                          setShowCompleted(true);
                        }
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                    >
                      <option value="all">Все статусы</option>
                      {FULL_ORDER_STATUS_FLOW.map(status => (
                        <option key={status} value={status}>
                          {getOrderStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Завершённые</span>
                    <button
                      type="button"
                      onClick={() => setShowCompleted(prev => !prev)}
                      className={`rounded-xl border px-3 py-2 text-xs font-black uppercase transition-all ${
                        showCompleted
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {showCompleted ? 'Скрыть завершённые' : 'Показать завершённые'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Сортировка</span>
                    <select
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                    >
                      <option value="newest">Сначала новые</option>
                      <option value="oldest">Сначала старые</option>
                    </select>
                  </div>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderSearch('');
                        setStatusFilter('all');
                        setDateFrom('');
                        setDateTo('');
                        setCustomerFilterText('');
                        setCustomerFilterId(null);
                        setSortOrder('newest');
                        setShowCustomerSuggestions(false);
                        setShowCompleted(false);
                      }}
                      className="rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black uppercase tracking-widest self-end"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                    <tr>
                      <th className="py-2 pr-4">№</th>
                      <th className="py-2 pr-4">Клиент</th>
                      <th className="py-2 pr-4">Адрес</th>
                      <th className="py-2 pr-4">Статус</th>
                      <th className="py-2 pr-4">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map(o => {
                      const tone = getStatusTone(o.status);
                      const toneStyle = STATUS_TONE_STYLES[tone];
                      return (
                        <tr key={o.id} className="hover:bg-slate-50">
                          <td className="py-3 pr-4 font-black">{o.orderNumber || o.id}</td>
                          <td className="py-3 pr-4 font-bold">{o.customer}</td>
                          <td className="py-3 pr-4">{o.address}</td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${toneStyle.badge}`}>
                              <span className={`h-2 w-2 rounded-full ${toneStyle.dot}`}></span>
                              {getOrderStatusLabel(o.status)}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <button
                              className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-black"
                              onClick={() => {
                                setEditingOrder(o);
                                setView('order-form');
                              }}
                            >
                              Открыть
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {role === 'dispatcher' && view === 'customers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">Справочник</div>
                  <div className="text-2xl font-black tracking-tight">База клиентов</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-black"
                    onClick={() => {
                      setEditingCustomer(undefined);
                      setCustomerReturnView('customers');
                      setView('customer-form');
                    }}
                  >
                    + Новый клиент
                  </button>
                  <button
                    className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-black"
                    onClick={() => setView('dashboard')}
                  >
                    Назад
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 mb-6">
                <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Поиск</span>
                  <input
                    value={customerDirectorySearch}
                    onChange={e => setCustomerDirectorySearch(e.target.value)}
                    placeholder="Имя, телефон, email, ИНН"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
                  />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Всего: {filteredCustomers.length}</span>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                    <tr>
                      <th className="py-2 pr-4">Клиент</th>
                      <th className="py-2 pr-4">Контакты</th>
                      <th className="py-2 pr-4">ИНН</th>
                      <th className="py-2 pr-4">Комментарий</th>
                      <th className="py-2 pr-4">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 font-black">{c.name}</td>
                        <td className="py-3 pr-4">
                          <div className="font-bold">{c.phone || '—'}</div>
                          <div className="text-xs text-slate-400">{c.email || '—'}</div>
                        </td>
                        <td className="py-3 pr-4">{c.inn || '—'}</td>
                        <td className="py-3 pr-4 max-w-xs truncate text-xs text-slate-500">{c.comment || '—'}</td>
                        <td className="py-3 pr-4">
                          <button
                            className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-black"
                            onClick={() => {
                              setEditingCustomer(c);
                              setCustomerReturnView('customers');
                              setView('customer-form');
                            }}
                          >
                            Редактировать
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td className="py-6 text-center text-sm text-slate-400" colSpan={5}>
                          Клиенты не найдены
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {role === 'dispatcher' && view === 'contractors' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">Справочник</div>
                  <div className="text-2xl font-black tracking-tight">База подрядчиков</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-black"
                    onClick={() => {
                      setEditingContractor(undefined);
                      setContractorReturnView('contractors');
                      setView('contractor-form');
                    }}
                  >
                    + Новый подрядчик
                  </button>
                  <button
                    className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-black"
                    onClick={() => setView('dashboard')}
                  >
                    Назад
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 mb-6">
                <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Поиск</span>
                  <input
                    value={contractorDirectorySearch}
                    onChange={e => setContractorDirectorySearch(e.target.value)}
                    placeholder="Имя, телефон, email, ИНН"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
                  />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Всего: {filteredContractors.length}</span>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                    <tr>
                      <th className="py-2 pr-4">Подрядчик</th>
                      <th className="py-2 pr-4">Контакты</th>
                      <th className="py-2 pr-4">Техника</th>
                      <th className="py-2 pr-4">Комментарий</th>
                      <th className="py-2 pr-4">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredContractors.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 font-black">{c.name}</td>
                        <td className="py-3 pr-4">
                          <div className="font-bold">{c.phone || '—'}</div>
                          <div className="text-xs text-slate-400">{c.email || '—'}</div>
                        </td>
                        <td className="py-3 pr-4 max-w-xs truncate text-xs text-slate-500">
                          {c.equipment && c.equipment.length > 0 ? c.equipment.join(', ') : '—'}
                        </td>
                        <td className="py-3 pr-4 max-w-xs truncate text-xs text-slate-500">{c.comments || '—'}</td>
                        <td className="py-3 pr-4">
                          <button
                            className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-black"
                            onClick={() => {
                              setEditingContractor(c);
                              setContractorReturnView('contractors');
                              setView('contractor-form');
                            }}
                          >
                            Редактировать
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredContractors.length === 0 && (
                      <tr>
                        <td className="py-6 text-center text-sm text-slate-400" colSpan={5}>
                          Подрядчики не найдены
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {role === 'dispatcher' && view === 'order-form' && (
          <OrderForm
            initialData={editingOrder}
            contractors={contractors}
            customers={customers}
            allOrders={orders}
            onSubmit={onSubmitOrderForm}
            onDelete={deleteOrder}
            onCancel={() => {
              setEditingOrder(undefined);
              setView('dashboard');
            }}
            onAddContractor={() => {
              setEditingContractor(undefined);
              setContractorReturnView('order-form');
              setView('contractor-form');
            }}
            onAddCustomer={() => {
              setEditingCustomer(undefined);
              setCustomerReturnView('order-form');
              setView('customer-form');
            }}
            currentUser={currentManager}
            onRemoveAssignment={removeDriverAssignment}
            onUpdateOrder={updateOrder}
          />
        )}

        {role === 'dispatcher' && view === 'customer-form' && (
          <CustomerFormDispatcher
            initialData={editingCustomer}
            onSubmit={data => {
              addCustomer(data);
              setEditingCustomer(undefined);
              setView(customerReturnView);
            }}
            onCancel={() => {
              setEditingCustomer(undefined);
              setView(customerReturnView);
            }}
          />
        )}

        {role === 'dispatcher' && view === 'contractor-form' && (
          <ContractorForm
            initialData={editingContractor}
            onSubmit={data => {
              addContractor(data);
              setEditingContractor(undefined);
              setView(contractorReturnView);
            }}
            onCancel={() => {
              setEditingContractor(undefined);
              setView(contractorReturnView);
            }}
          />
        )}

        {role === 'customer' && <CustomerPortal orders={orders} customers={customers} companySettings={companySettings} onAddOrder={addOrder} onUpdateOrder={updateOrder} />}

        {role === 'contractor' && (
          <ContractorPortal
            orders={orders}
            contractors={contractors}
            currentContractorId={currentContractorId || contractors[0]?.id || ''}
            vehicles={vehicles}
            onSubmitBid={submitBid}
            onWithdrawBid={withdrawBid}
            onUpdateContractor={onUpdateContractor}
            driverName={contractors.find(c => c.id === currentContractorId)?.name || 'ВОДИТЕЛЬ'}
            onReportTrip={reportTrip}
            onAcceptJob={acceptJob}
            onFinishWork={finishWork}
            onUpdateDriverAssignment={updateDriverAssignment}
            onRemoveAssignment={removeDriverAssignment}
            onUpdateOrder={updateOrder}
          />
        )}

        {/* Новые порталы */}
        {role === 'sales_manager' && (
          <SalesManagerPortal
            leads={leads}
            orders={orders}
            customers={customers}
            contractors={contractors}
            currentManagerId="manager-1"
            currentManagerName={currentManager}
            onAddLead={addLead}
            onUpdateLead={updateLead}
            onConvertLeadToOrder={convertLeadToOrder}
            onUpdateOrder={updateOrder}
          />
        )}

        {role === 'estimator' && (
          <EstimatorPortal
            orders={orders}
            priceBook={priceBook}
            currentEstimatorId="estimator-1"
            currentEstimatorName="Сметчик"
            onUpdateOrder={updateOrder}
            onSaveEstimate={saveEstimate}
          />
        )}

        {role === 'accountant' && (
          <AccountantPortal
            orders={orders}
            onUpdateOrder={updateOrder}
            onCreateInvoice={createInvoice}
            onCreateContract={createContract}
            onRecordPayment={recordPayment}
            onCreateClosingDocs={createClosingDocs}
            currentUserId="accountant-1"
            currentUserName="Бухгалтер"
          />
        )}

        {role === 'admin' && (
          <AdminPanel
            users={users}
            companies={companies}
            priceBook={priceBook}
            commissionSettings={commissionSettings}
            companySettings={companySettings}
            vehicles={vehicles}
            onAddUser={addUser}
            onUpdateUser={updateUser}
            onAddCompany={addCompany}
            onUpdateCompany={updateCompany}
            onAddPriceItem={addPriceItem}
            onUpdatePriceItem={updatePriceItem}
            onDeletePriceItem={deletePriceItem}
            onUpdateCommissionSettings={setCommissionSettings}
            onUpdateCompanySettings={setCompanySettings}
            onAddVehicle={addVehicle}
            onUpdateVehicle={updateVehicle}
            activityLog={activityLog}
            onRevertActivity={revertActivity}
            onClearActivityLog={() => setActivityLog([])}
          />
        )}
      </div>
    </div>
  );
}






