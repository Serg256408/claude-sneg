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
import {
  AssetType,
  Bid,
  Contractor,
  Customer,
  DEFAULT_MANAGERS,
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
  PaymentType,
  // РќРѕРІС‹Рµ С‚РёРїС‹
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
  Vehicle,
  USER_ROLE_LABELS,
} from './types';

// Р Р°СЃС€РёСЂРµРЅРЅС‹Рµ СЂРѕР»Рё
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
  // РќРѕРІС‹Рµ РєР»СЋС‡Рё
  leads: 'snowforce_leads_v1',
  users: 'snowforce_users_v1',
  companies: 'snowforce_companies_v1',
  priceBook: 'snowforce_pricebook_v1',
  commissionSettings: 'snowforce_commission_v1',
  vehicles: 'snowforce_vehicles_v1',
} as const;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function seedCustomers(): Customer[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'cust-1',
      name: 'РћРћРћ "РЎРќР•Р“РћРЎР•Р Р’РРЎ"',
      phone: '+7 (999) 111-22-33',
      email: 'dispatch@snegoservice.ru',
      inn: '7700000000',
      paymentType: 'РќР°Р»РёС‡РЅС‹Рµ' as any,
      address: 'РњРѕСЃРєРІР°, СѓР». РўРІРµСЂСЃРєР°СЏ, 1',
      comment: '',
      createdAt: now,
    },
    {
      id: 'cust-2',
      name: 'РђРћ "Р“РѕСЂРѕРґРЎРЅРµРі"',
      phone: '+7 (999) 222-33-44',
      email: 'info@gorodsneg.ru',
      inn: '7700000002',
      paymentType: 'Р‘РµР·РЅР°Р» Р±РµР· РќР”РЎ' as any,
      address: 'РњРѕСЃРєРІР°, РїСЂ-С‚ РњРёСЂР°, 25',
      comment: 'РўСЂРµР±СѓСЋС‚СЃСЏ РѕС‚С‡С‘С‚С‹ РїРѕ РєР°Р¶РґРѕРјСѓ СЂРµР№СЃСѓ.',
      createdAt: now,
    },
    {
      id: 'cust-3',
      name: 'РРџ РћСЂР»РѕРІР°',
      phone: '+7 (999) 333-44-55',
      email: 'orlova@example.com',
      inn: '7700000003',
      paymentType: 'РЎ РќР”РЎ 20%' as any,
      address: 'РњРѕСЃРєРІР°, Р›РµРЅРёРЅРіСЂР°РґСЃРєРёР№ РїСЂРѕСЃРїРµРєС‚, 10',
      comment: 'Р Р°Р±РѕС‚С‹ С‚РѕР»СЊРєРѕ РґРЅС‘Рј.',
      createdAt: now,
    },
    {
      id: 'cust-4',
      name: 'РћРћРћ "РЎРЅРµРіРџСЂРѕС„Рё"',
      phone: '+7 (999) 444-55-66',
      email: 'office@snegprofi.ru',
      inn: '7700000006',
      paymentType: 'РќР°Р»РёС‡РЅС‹Рµ' as any,
      address: 'РњРѕСЃРєРІР°, СѓР». РќРѕРІРѕСЃР»РѕР±РѕРґСЃРєР°СЏ, 12',
      comment: 'РЎСЂРѕС‡РЅС‹Рµ Р·Р°СЏРІРєРё РІ РІРµС‡РµСЂРЅРµРµ РІСЂРµРјСЏ.',
      createdAt: now,
    },
  ];
}

function seedContractors(): Contractor[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'cont-1',
      name: 'РРџ РџРµС‚СЂРѕРІ',
      phone: '+7 (999) 444-55-66',
      email: 'petrov@example.com',
      inn: '7700000001',
      equipment: ['РЎР°РјРѕСЃРІР°Р»', 'РџРѕРіСЂСѓР·С‡РёРє'],
      districts: ['Р¦РђРћ', 'РЎРђРћ', 'РЎР’РђРћ'],
      paymentType: 'РќР°Р»РёС‡РЅС‹Рµ' as any,
      rating: 4.7,
      completedOrders: 42,
      comments: 'Р Р°Р±РѕС‚Р°РµРј РєСЂСѓРіР»РѕСЃСѓС‚РѕС‡РЅРѕ.',
      isVerified: true,
      createdAt: now,
    },
    {
      id: 'cont-2',
      name: 'РћРћРћ "РЎРЅРµРіРўСЂР°РЅСЃ"',
      phone: '+7 (999) 555-66-77',
      email: 'dispatch@snegtrans.ru',
      inn: '7700000004',
      equipment: ['РЎР°РјРѕСЃРІР°Р» 20Рј3', 'РЎР°РјРѕСЃРІР°Р» 15Рј3'],
      districts: ['Р®РђРћ', 'Р®Р—РђРћ', 'Р—РђРћ'],
      paymentType: 'Р‘РµР·РЅР°Р» Р±РµР· РќР”РЎ' as any,
      rating: 4.2,
      completedOrders: 18,
      comments: 'РўРµС…РЅРёРєР° 2022 РіРѕРґР°.',
      isVerified: false,
      createdAt: now,
    },
    {
      id: 'cont-3',
      name: 'РРџ РЎРёРґРѕСЂРѕРІ',
      phone: '+7 (999) 777-88-99',
      email: 'sidorov@example.com',
      inn: '7700000005',
      equipment: ['РџРѕРіСЂСѓР·С‡РёРє', 'РњРёРЅРё-РїРѕРіСЂСѓР·С‡РёРє'],
      districts: ['РЎР—РђРћ', 'РЎРђРћ'],
      paymentType: 'РЎ РќР”РЎ 20%' as any,
      rating: 4.9,
      completedOrders: 56,
      comments: 'РЎРјРµРЅС‹ РѕС‚ 6 С‡Р°СЃРѕРІ.',
      isVerified: true,
      createdAt: now,
    },
    {
      id: 'cont-4',
      name: 'РћРћРћ "РЎРµРІРµСЂРўРµС…"',
      phone: '+7 (999) 888-99-00',
      email: 'ops@severtech.ru',
      inn: '7700000007',
      equipment: ['РЎР°РјРѕСЃРІР°Р» 25Рј3', 'РџРѕРіСЂСѓР·С‡РёРє'],
      districts: ['Р’РђРћ', 'Р®Р’РђРћ', 'Р¦РђРћ'],
      paymentType: 'Р‘РµР·РЅР°Р» Р±РµР· РќР”РЎ' as any,
      rating: 4.4,
      completedOrders: 27,
      comments: 'Р Р°Р±РѕС‚Р°РµРј РїРѕ РґРѕРіРѕРІРѕСЂСѓ, РјРёРЅРёРјСѓРј 5 СЃРјРµРЅ.',
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

// Seed РґР°РЅРЅС‹Рµ РґР»СЏ Р»РёРґРѕРІ
function seedLeads(): Lead[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'lead-1',
      source: 'phone',
      customerName: 'РћРћРћ "РќРѕРІС‹Р№РљР»РёРµРЅС‚"',
      customerPhone: '+7 (999) 000-11-22',
      customerEmail: 'new@client.ru',
      address: 'РњРѕСЃРєРІР°, СѓР». РќРѕРІР°СЏ, 10',
      serviceType: ServiceType.SNOW,
      description: 'РќСѓР¶РµРЅ РІС‹РІРѕР· СЃРЅРµРіР° СЃРѕ РґРІРѕСЂР°, РїСЂРёРјРµСЂРЅРѕ 100РјВі',
      snowVolumeM3: 100,
      urgency: 'normal',
      assignedManagerId: 'manager-1',
      assignedManagerName: 'РђР›Р•РљРЎРђРќР”Р ',
      status: LeadStatus.NEW,
      createdAt: now,
    },
    {
      id: 'lead-2',
      source: 'website',
      customerName: 'РРџ РЎРµСЂРіРµРµРІ',
      customerPhone: '+7 (999) 111-22-33',
      address: 'РњРѕСЃРєРІР°, РїСЂ-С‚ Р’РµСЂРЅР°РґСЃРєРѕРіРѕ, 50',
      serviceType: ServiceType.ASPHALT,
      description: 'РђСЃС„Р°Р»СЊС‚РёСЂРѕРІР°РЅРёРµ РїР°СЂРєРѕРІРєРё 500РјВІ',
      asphaltAreaM2: 500,
      asphaltType: 'parking',
      urgency: 'urgent',
      status: LeadStatus.CONTACTED,
      createdAt: now,
    },
  ];
}

// Seed РґР°РЅРЅС‹Рµ РґР»СЏ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
function seedUsers(): User[] {
  const now = new Date().toISOString();
  return [
    { id: 'manager-1', role: UserRole.SALES_MANAGER, phone: '+7 (999) 100-00-01', name: 'РђР›Р•РљРЎРђРќР”Р ', status: 'active', createdAt: now },
    { id: 'manager-2', role: UserRole.SALES_MANAGER, phone: '+7 (999) 100-00-02', name: 'Р”РњРРўР РР™', status: 'active', createdAt: now },
    { id: 'manager-3', role: UserRole.SALES_MANAGER, phone: '+7 (999) 100-00-03', name: 'Р•РљРђРўР•Р РРќРђ', status: 'active', createdAt: now },
    { id: 'estimator-1', role: UserRole.ESTIMATOR, phone: '+7 (999) 200-00-01', name: 'РРІР°РЅ РЎРјРµС‚С‡РёРєРѕРІ', status: 'active', createdAt: now },
    { id: 'dispatcher-1', role: UserRole.DISPATCHER, phone: '+7 (999) 300-00-01', name: 'Р”РёСЃРїРµС‚С‡РµСЂ 1', status: 'active', createdAt: now },
    { id: 'accountant-1', role: UserRole.ACCOUNTANT, phone: '+7 (999) 400-00-01', name: 'РњР°СЂРёСЏ Р‘СѓС…РіР°Р»С‚РµСЂРѕРІР°', status: 'active', createdAt: now },
    { id: 'admin-1', role: UserRole.ADMIN, phone: '+7 (999) 500-00-01', name: 'РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ', status: 'active', createdAt: now },
  ];
}

// Seed РґР°РЅРЅС‹Рµ РґР»СЏ РєРѕРјРїР°РЅРёР№
function seedCompanies(): Company[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'company-transkom',
      type: CompanyType.TRANSKOM,
      name: 'РћРћРћ "РўСЂР°РЅСЃРєРѕРј"',
      inn: '7700000100',
      legalAddress: 'РњРѕСЃРєРІР°, СѓР». Р¦РµРЅС‚СЂР°Р»СЊРЅР°СЏ, 1',
      phone: '+7 (495) 123-45-67',
      defaultPaymentType: PaymentType.VAT_20,
      isVerified: true,
      createdAt: now,
    },
  ];
}

// Seed РґР°РЅРЅС‹Рµ РґР»СЏ РїСЂР°Р№СЃ-Р»РёСЃС‚Р°
function seedPriceBook(): PriceBookItem[] {
  const now = new Date().toISOString();
  return [
    { id: 'p1', workTypeId: 'snow_trip_20', workTypeName: 'Р’С‹РІРѕР· СЃРЅРµРіР° (СЃР°РјРѕСЃРІР°Р» 20РјВі)', serviceType: ServiceType.SNOW, unit: 'trip', unitLabel: 'СЂРµР№СЃ', baseCustomerPrice: 3500, baseCostPrice: 2800, isActive: true, createdAt: now },
    { id: 'p2', workTypeId: 'snow_trip_25', workTypeName: 'Р’С‹РІРѕР· СЃРЅРµРіР° (СЃР°РјРѕСЃРІР°Р» 25РјВі)', serviceType: ServiceType.SNOW, unit: 'trip', unitLabel: 'СЂРµР№СЃ', baseCustomerPrice: 4200, baseCostPrice: 3400, isActive: true, createdAt: now },
    { id: 'p3', workTypeId: 'loader_shift', workTypeName: 'РџРѕРіСЂСѓР·С‡РёРє JCB (СЃРјРµРЅР°)', serviceType: ServiceType.SNOW, unit: 'shift', unitLabel: 'СЃРјРµРЅР°', baseCustomerPrice: 15000, baseCostPrice: 12000, isActive: true, createdAt: now },
    { id: 'p4', workTypeId: 'loader_hour', workTypeName: 'РџРѕРіСЂСѓР·С‡РёРє JCB (С‡Р°СЃ)', serviceType: ServiceType.SNOW, unit: 'hour', unitLabel: 'С‡Р°СЃ', baseCustomerPrice: 2500, baseCostPrice: 2000, isActive: true, createdAt: now },
    { id: 'p5', workTypeId: 'asphalt_m2', workTypeName: 'РђСЃС„Р°Р»СЊС‚РёСЂРѕРІР°РЅРёРµ (1 СЃР»РѕР№)', serviceType: ServiceType.ASPHALT, unit: 'm2', unitLabel: 'РјВІ', baseCustomerPrice: 450, baseCostPrice: 350, isActive: true, createdAt: now },
    { id: 'p6', workTypeId: 'asphalt_m2_2', workTypeName: 'РђСЃС„Р°Р»СЊС‚РёСЂРѕРІР°РЅРёРµ (2 СЃР»РѕСЏ)', serviceType: ServiceType.ASPHALT, unit: 'm2', unitLabel: 'РјВІ', baseCustomerPrice: 850, baseCostPrice: 680, isActive: true, createdAt: now },
    { id: 'p7', workTypeId: 'curb_m', workTypeName: 'Р‘РѕСЂРґСЋСЂ РґРѕСЂРѕР¶РЅС‹Р№', serviceType: ServiceType.ASPHALT, unit: 'running_meter', unitLabel: 'Рї.Рј.', baseCustomerPrice: 1200, baseCostPrice: 900, isActive: true, createdAt: now },
  ];
}

// Seed РґР°РЅРЅС‹Рµ РґР»СЏ С‚РµС…РЅРёРєРё
function seedVehicles(): Vehicle[] {
  const now = new Date().toISOString();
  return [
    { id: 'v1', ownerCompanyId: 'company-transkom', ownerCompanyName: 'РўСЂР°РЅСЃРєРѕРј', ownerType: 'transkom', type: AssetType.TRUCK_20, plateNumber: 'Рђ001РђРђ77', capacityM3: 20, gpsEnabled: true, status: 'available', createdAt: now },
    { id: 'v2', ownerCompanyId: 'company-transkom', ownerCompanyName: 'РўСЂР°РЅСЃРєРѕРј', ownerType: 'transkom', type: AssetType.TRUCK_25, plateNumber: 'Рђ002РђРђ77', capacityM3: 25, gpsEnabled: true, status: 'available', createdAt: now },
    { id: 'v3', ownerCompanyId: 'company-transkom', ownerCompanyName: 'РўСЂР°РЅСЃРєРѕРј', ownerType: 'transkom', type: AssetType.LOADER_JCB, plateNumber: 'Рђ003РђРђ77', gpsEnabled: true, status: 'available', createdAt: now },
  ];
}

function seedOrders(customers: Customer[]): Order[] {
  const now = new Date().toISOString();
  const getCustomer = (index: number) => customers[index] || customers[0];
  const customerOne = getCustomer(0);
  const customerTwo = getCustomer(1);
  const customerThree = getCustomer(2);
  return [
    {
      id: 'ord-1',
      orderNumber: generateOrderNumber(),
      customer: customerOne?.name ?? 'РљР»РёРµРЅС‚',
      customerId: customerOne?.id,
      contactInfo: { name: customerOne?.name ?? 'РљР»РёРµРЅС‚', phone: customerOne?.phone ?? '' },
      address: 'РњРѕСЃРєРІР°, СѓР». РўРІРµСЂСЃРєР°СЏ, 1',
      district: 'Р¦РђРћ',
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
          priceUnit: 'Р—Р° СЂРµР№СЃ' as any,
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
      scheduledTime: now.slice(0, 16),
      status: OrderStatus.NEW_REQUEST,
      managerName: DEFAULT_MANAGERS[0],
      createdAt: now,
      updatedAt: now,
      actionLog: [],
      messages: [],
      unreadMessages: 0,
      // РќРѕРІС‹Рµ РїРѕР»СЏ
      serviceType: ServiceType.SNOW,
      executionMode: ExecutionMode.MARKETPLACE,
      snowVolumeM3: 200,
    },
    {
      id: 'ord-2',
      orderNumber: generateOrderNumber(),
      customer: customerTwo?.name ?? 'РљР»РёРµРЅС‚',
      customerId: customerTwo?.id,
      contactInfo: { name: customerTwo?.name ?? 'РљР»РёРµРЅС‚', phone: customerTwo?.phone ?? '' },
      address: 'РњРѕСЃРєРІР°, РїСЂ-С‚ РњРёСЂР°, 25',
      district: 'РЎР’РђРћ',
      coordinates: [55.7812, 37.6341],
      assetRequirements: [
        {
          id: generateId(),
          type: AssetType.TRUCK,
          contractorId: 'cont-2',
          contractorName: 'РћРћРћ "РЎРЅРµРіРўСЂР°РЅСЃ"',
          plannedUnits: 1,
          customerPrice: 4200,
          contractorPrice: 3400,
          priceUnit: 'Р—Р° СЂРµР№СЃ' as any,
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
      scheduledTime: now.slice(0, 16),
      status: OrderStatus.SEARCHING_EQUIPMENT,
      managerName: DEFAULT_MANAGERS[1],
      createdAt: now,
      updatedAt: now,
      actionLog: [],
      messages: [],
      unreadMessages: 0,
      // РќРѕРІС‹Рµ РїРѕР»СЏ
      serviceType: ServiceType.SNOW,
      executionMode: ExecutionMode.OWN_FLEET,
      snowVolumeM3: 120,
    },
    {
      id: 'ord-3',
      orderNumber: generateOrderNumber(),
      customer: customerThree?.name ?? 'РљР»РёРµРЅС‚',
      customerId: customerThree?.id,
      contactInfo: { name: customerThree?.name ?? 'РљР»РёРµРЅС‚', phone: customerThree?.phone ?? '' },
      address: 'РњРѕСЃРєРІР°, Р›РµРЅРёРЅРіСЂР°РґСЃРєРёР№ РїСЂРѕСЃРїРµРєС‚, 10',
      district: 'РЎРђРћ',
      coordinates: [55.7815, 37.5777],
      assetRequirements: [
        {
          id: generateId(),
          type: AssetType.LOADER,
          contractorId: 'cont-3',
          contractorName: 'РРџ РЎРёРґРѕСЂРѕРІ',
          plannedUnits: 1,
          customerPrice: 15000,
          contractorPrice: 12000,
          priceUnit: 'Р—Р° СЃРјРµРЅСѓ' as any,
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
          priceUnit: 'Р—Р° СЂРµР№СЃ' as any,
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
      scheduledTime: now.slice(0, 16),
      status: OrderStatus.NEW_REQUEST,
      managerName: DEFAULT_MANAGERS[2],
      createdAt: now,
      updatedAt: now,
      actionLog: [],
      messages: [],
      unreadMessages: 0,
      // РќРѕРІС‹Рµ РїРѕР»СЏ
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

  const [customers, setCustomers] = useState<Customer[]>(() =>
    safeJsonParse(localStorage.getItem(LS_KEYS.customers), seedCustomers()).map(normalizeCustomer)
  );
  const [contractors, setContractors] = useState<Contractor[]>(() =>
    safeJsonParse(localStorage.getItem(LS_KEYS.contractors), seedContractors()).map(normalizeContractor)
  );
  const [orders, setOrders] = useState<Order[]>(() => safeJsonParse(localStorage.getItem(LS_KEYS.orders), seedOrders(seedCustomers())));

  // РќРѕРІС‹Рµ СЃРѕСЃС‚РѕСЏРЅРёСЏ
  const [leads, setLeads] = useState<Lead[]>(() => safeJsonParse(localStorage.getItem(LS_KEYS.leads), seedLeads()));
  const [users, setUsers] = useState<User[]>(() => safeJsonParse(localStorage.getItem(LS_KEYS.users), seedUsers()));
  const [companies, setCompanies] = useState<Company[]>(() => safeJsonParse(localStorage.getItem(LS_KEYS.companies), seedCompanies()));
  const [priceBook, setPriceBook] = useState<PriceBookItem[]>(() => safeJsonParse(localStorage.getItem(LS_KEYS.priceBook), seedPriceBook()));
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings | null>(() => safeJsonParse(localStorage.getItem(LS_KEYS.commissionSettings), null));
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => safeJsonParse(localStorage.getItem(LS_KEYS.vehicles), seedVehicles()));

  const [view, setView] = useState<'dashboard' | 'order-form' | 'customer-form' | 'contractor-form' | 'customers' | 'contractors'>('dashboard');
  const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [editingContractor, setEditingContractor] = useState<Contractor | undefined>(undefined);
  const [customerReturnView, setCustomerReturnView] = useState<'dashboard' | 'customers' | 'order-form'>('dashboard');
  const [contractorReturnView, setContractorReturnView] = useState<'dashboard' | 'contractors' | 'order-form'>('dashboard');
  const [selectedMapOrder, setSelectedMapOrder] = useState<Order | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilterText, setCustomerFilterText] = useState('');
  const [customerFilterId, setCustomerFilterId] = useState<string | null>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerDirectorySearch, setCustomerDirectorySearch] = useState('');
  const [contractorDirectorySearch, setContractorDirectorySearch] = useState('');

  const [currentContractorId, setCurrentContractorId] = useState<string>(() => localStorage.getItem(LS_KEYS.contractorId) || contractors[0]?.id || '');
  // Persist
  useEffect(() => localStorage.setItem(LS_KEYS.role, role), [role]);
  useEffect(() => localStorage.setItem(LS_KEYS.manager, currentManager), [currentManager]);
  useEffect(() => localStorage.setItem(LS_KEYS.contractorId, currentContractorId), [currentContractorId]);

  useEffect(() => localStorage.setItem(LS_KEYS.customers, JSON.stringify(customers)), [customers]);
  useEffect(() => localStorage.setItem(LS_KEYS.contractors, JSON.stringify(contractors)), [contractors]);
  useEffect(() => localStorage.setItem(LS_KEYS.orders, JSON.stringify(orders)), [orders]);
  // РЎРѕС…СЂР°РЅРµРЅРёРµ РЅРѕРІС‹С… СЃРѕСЃС‚РѕСЏРЅРёР№
  useEffect(() => localStorage.setItem(LS_KEYS.leads, JSON.stringify(leads)), [leads]);
  useEffect(() => localStorage.setItem(LS_KEYS.users, JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem(LS_KEYS.companies, JSON.stringify(companies)), [companies]);
  useEffect(() => localStorage.setItem(LS_KEYS.priceBook, JSON.stringify(priceBook)), [priceBook]);
  useEffect(() => { if (commissionSettings) localStorage.setItem(LS_KEYS.commissionSettings, JSON.stringify(commissionSettings)); }, [commissionSettings]);
  useEffect(() => localStorage.setItem(LS_KEYS.vehicles, JSON.stringify(vehicles)), [vehicles]);

  const dateRange = useMemo<DateRange>(() => ({
    from: dateFrom || undefined,
    to: dateTo || undefined
  }), [dateFrom, dateTo]);

  const customerSuggestions = useMemo(() => {
    const term = customerFilterText.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(term));
  }, [customers, customerFilterText]);

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    const customerTerm = customerFilterText.trim().toLowerCase();
    const list = orders.filter(o => {
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
  }, [orders, orderSearch, statusFilter, customerFilterId, customerFilterText, dateRange, sortOrder]);

  const hasFilters = Boolean(
    orderSearch.trim() ||
    customerFilterText.trim() ||
    dateFrom ||
    dateTo ||
    statusFilter !== 'all' ||
    sortOrder !== 'newest'
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
        scheduledTime: partial.scheduledTime || now.slice(0, 16),
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
    },
    [currentManager]
  );

  const updateOrder = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? ({ ...o, ...updates, updatedAt: new Date().toISOString() } as Order) : o))
    );
  }, []);

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
        const totals = calculateOrderTotals(merged, { mode: 'actual_or_planned', includeCharges: true });
        totalCustomerPrice = totals.customerTotal;
        totalContractorPrice = totals.contractorTotal;
        grossProfit = totals.margin;
      }
      const dataWithTotals = { ...data, totalCustomerPrice, totalContractorPrice, grossProfit };
      if (editingOrder?.id) {
        updateOrder(editingOrder.id, dataWithTotals);
        if (keepOpen) {
          // РћР±РЅРѕРІР»СЏРµРј editingOrder, С‡С‚РѕР±С‹ С„РѕСЂРјР° РїРѕРєР°Р·С‹РІР°Р»Р° Р°РєС‚СѓР°Р»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ
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
    const driverDisplayName = contractor?.name || 'Р’РћР”РРўР•Р›Р¬';
    const assignment: DriverAssignment = {
      id: generateId(),
      orderId,
      driverName: driverDisplayName,
      driverId: undefined,
      contractorId,
      contractorName: contractor?.name,
      assetType,
      vehicleNumber: '',
      assignedPrice: 0,
      priceUnit: 'Р—Р° СЂРµР№СЃ' as any,
      assignedAt: new Date().toISOString(),
      assignedBy: 'SYSTEM',
      status: 'assigned',
    };

    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? ({
              ...o,
              assignments: [...(o.assignments || []), assignment],
              driverDetails: [...(o.driverDetails || []), assignment],
              status: normalizeOrderStatus(o.status) === OrderStatus.SEARCHING_EQUIPMENT ? OrderStatus.EQUIPMENT_APPROVED : o.status,
              updatedAt: new Date().toISOString(),
            } as Order)
          : o
      )
    );
  }, [contractors]);

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

  // === РќРѕРІС‹Рµ callbacks РґР»СЏ СЂР°СЃС€РёСЂРµРЅРЅРѕРіРѕ С„СѓРЅРєС†РёРѕРЅР°Р»Р° ===

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
      scheduledTime: now.slice(0, 16),
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

  // РЎРјРµС‚С‹
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

  // РЎС‡РµС‚Р°
  const createInvoice = useCallback((orderId: string, invoice: Invoice) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      invoices: [...(o.invoices || []), invoice],
      invoiceIds: [...(o.invoiceIds || []), invoice.id],
      updatedAt: new Date().toISOString(),
    } : o));
  }, []);

  // РџР»Р°С‚РµР¶Рё
  const recordPayment = useCallback((orderId: string, payment: Payment) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      payments: [...(o.payments || []), payment],
      updatedAt: new Date().toISOString(),
    } : o));
  }, []);

  // Р”РѕРіРѕРІРѕСЂС‹
  const createContract = useCallback((orderId: string, contract: Contract) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      contract,
      contractId: contract.id,
      updatedAt: new Date().toISOString(),
    } : o));
  }, []);

  // Р—Р°РєСЂС‹РІР°СЋС‰РёРµ РґРѕРєСѓРјРµРЅС‚С‹
  const createClosingDocs = useCallback((orderId: string, docs: ClosingDocs) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      closingDocs: docs,
      updatedAt: new Date().toISOString(),
    } : o));
  }, []);

  // РџРѕР»СЊР·РѕРІР°С‚РµР»Рё
  const addUser = useCallback((user: User) => {
    setUsers(prev => [user, ...prev]);
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
  }, []);

  // РљРѕРјРїР°РЅРёРё
  const addCompany = useCallback((company: Company) => {
    setCompanies(prev => [company, ...prev]);
  }, []);

  const updateCompany = useCallback((companyId: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...updates } : c));
  }, []);

  // РџСЂР°Р№СЃ-Р»РёСЃС‚
  const addPriceItem = useCallback((item: PriceBookItem) => {
    setPriceBook(prev => [item, ...prev]);
  }, []);

  const updatePriceItem = useCallback((itemId: string, updates: Partial<PriceBookItem>) => {
    setPriceBook(prev => prev.map(p => p.id === itemId ? { ...p, ...updates } : p));
  }, []);

  const deletePriceItem = useCallback((itemId: string) => {
    setPriceBook(prev => prev.filter(p => p.id !== itemId));
  }, []);

  // РўРµС…РЅРёРєР°
  const addVehicle = useCallback((vehicle: Vehicle) => {
    setVehicles(prev => [vehicle, ...prev]);
  }, []);

  const updateVehicle = useCallback((vehicleId: string, updates: Partial<Vehicle>) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, ...updates } : v));
  }, []);

  // РћР±РЅРѕРІР»РµРЅРёРµ РґР°РЅРЅС‹С… РЅР°Р·РЅР°С‡РµРЅРёСЏ РІРѕРґРёС‚РµР»СЏ (РЅР°РїСЂРёРјРµСЂ, РІСЂРµРјСЏ СЃРјРµРЅС‹ РїРѕРіСЂСѓР·С‡РёРєР°)
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
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-black"
            onClick={() => {
              setEditingOrder(undefined);
              setView('order-form');
            }}
          >
            + Заказ
          </button>
          <button
            className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-black"
            onClick={() => {
              setEditingCustomer(undefined);
              setCustomerReturnView(view === 'customers' ? 'customers' : view === 'order-form' ? 'order-form' : 'dashboard');
              setView('customer-form');
            }}
          >
            + Клиент
          </button>
          <button
            className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-black"
            onClick={() => {
              setEditingContractor(undefined);
              setContractorReturnView(view === 'contractors' ? 'contractors' : view === 'order-form' ? 'order-form' : 'dashboard');
              setView('contractor-form');
            }}
          >
            + Подрядчик
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
  }, [contractors, currentContractorId, currentManager, role, view]);

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
                      type="datetime-local"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">По</span>
                    <input
                      type="datetime-local"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Статус</span>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
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
                      <th className="py-2 pr-4">РљР»РёРµРЅС‚</th>
                      <th className="py-2 pr-4">РђРґСЂРµСЃ</th>
                      <th className="py-2 pr-4">РЎС‚Р°С‚СѓСЃ</th>
                      <th className="py-2 pr-4">Р”РµР№СЃС‚РІРёСЏ</th>
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

        {role === 'customer' && <CustomerPortal orders={orders} customers={customers} onAddOrder={addOrder} onUpdateOrder={updateOrder} />}

        {role === 'contractor' && (
          <ContractorPortal
            orders={orders}
            contractors={contractors}
            currentContractorId={currentContractorId || contractors[0]?.id || ''}
            onSubmitBid={submitBid}
            onWithdrawBid={withdrawBid}
            onUpdateContractor={onUpdateContractor}
            driverName={contractors.find(c => c.id === currentContractorId)?.name || 'Р’РћР”РРўР•Р›Р¬'}
            onReportTrip={reportTrip}
            onAcceptJob={acceptJob}
            onFinishWork={finishWork}
            onUpdateDriverAssignment={updateDriverAssignment}
          />
        )}

        {/* РќРѕРІС‹Рµ РїРѕСЂС‚Р°Р»С‹ */}
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
            currentEstimatorName="РЎРјРµС‚С‡РёРє"
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
            currentUserName="Р‘СѓС…РіР°Р»С‚РµСЂ"
          />
        )}

        {role === 'admin' && (
          <AdminPanel
            users={users}
            companies={companies}
            priceBook={priceBook}
            commissionSettings={commissionSettings}
            vehicles={vehicles}
            onAddUser={addUser}
            onUpdateUser={updateUser}
            onAddCompany={addCompany}
            onUpdateCompany={updateCompany}
            onAddPriceItem={addPriceItem}
            onUpdatePriceItem={updatePriceItem}
            onDeletePriceItem={deletePriceItem}
            onUpdateCommissionSettings={setCommissionSettings}
            onAddVehicle={addVehicle}
            onUpdateVehicle={updateVehicle}
          />
        )}
      </div>
    </div>
  );
}






