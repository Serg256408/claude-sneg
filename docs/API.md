# API Reference - Типы и интерфейсы

## Основные сущности

### Order (Заказ)

```typescript
interface Order {
  id: string;
  orderNumber?: string;           // SF-2402-0001
  leadId?: string;                // Связь с лидом
  serviceType: ServiceType;       // SNOW | ASPHALT | ...
  status: OrderStatus;            // Статус заказа

  // Клиент
  customer: string;
  customerId?: string;
  customerCompanyId?: string;
  contactInfo?: CustomerContact;

  // Объект работ
  siteId?: string;
  address: string;
  coordinates: [number, number];

  // Параметры снега
  snowVolumeM3?: number;
  snowAreaM2?: number;
  snowHeightCm?: number;
  needsLoader?: boolean;

  // Техника
  assetRequirements: AssetRequirement[];

  // Назначения
  assignments: DriverAssignment[];
  driverDetails: DriverAssignment[];

  // Финансы
  totalCustomerPrice?: number;
  totalContractorPrice?: number;
  grossProfit?: number;
  isPaid: boolean;

  // Документы
  contract?: Contract;
  invoices?: Invoice[];
  closingDocs?: ClosingDocs;

  // Мета
  createdAt: string;
  updatedAt?: string;
  scheduledTime: string;
  managerName: string;
}
```

### OrderStatus (Статусы заказа)

```typescript
enum OrderStatus {
  // Начальные
  DRAFT = 'draft',
  NEW_REQUEST = 'new_request',

  // Расчёт
  CALCULATING = 'calculating',
  AWAITING_CUSTOMER = 'awaiting_customer',

  // Подтверждение
  CONFIRMED_BY_CUSTOMER = 'confirmed_by_customer',
  CONTRACT_SIGNING = 'contract_signing',
  AWAITING_PREPAYMENT = 'awaiting_prepayment',

  // Назначение
  SEARCHING_EQUIPMENT = 'searching_equipment',
  SCHEDULING = 'scheduling',
  EQUIPMENT_APPROVED = 'equipment_approved',

  // Выполнение
  EN_ROUTE = 'en_route',
  IN_PROGRESS = 'in_progress',
  EXPORT_COMPLETED = 'export_completed',

  // Закрытие
  AWAITING_CLOSING_DOCS = 'awaiting_closing_docs',
  CLOSING_DOCS_SENT = 'closing_docs_sent',
  REPORT_READY = 'report_ready',
  COMPLETED = 'completed',

  // Специальные
  CANCELLED = 'cancelled',
  DISPUTE = 'dispute'
}
```

### Lead (Лид)

```typescript
interface Lead {
  id: string;
  status: LeadStatus;
  source: LeadSource;

  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  companyName?: string;

  serviceType: ServiceType;
  description: string;
  address?: string;

  assignedManagerId?: string;
  assignedManagerName?: string;

  convertedOrderId?: string;

  createdAt: string;
  updatedAt?: string;
}

type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'estimating'
  | 'offer_sent'
  | 'won'
  | 'lost'
  | 'spam'
  | 'duplicate';

type LeadSource =
  | 'website'
  | 'phone'
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'ads'
  | 'referral'
  | 'other';
```

### Customer (Клиент)

```typescript
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  inn: string;
  kpp?: string;
  ogrn?: string;

  paymentType: PaymentType;
  paymentTerms?: 'prepayment' | 'postpayment' | 'partial';

  legalAddress?: string;
  actualAddress?: string;

  sites?: string[];     // ID объектов
  contacts?: Contact[]; // Контактные лица

  createdAt: string;
  updatedAt?: string;
}

type PaymentType =
  | 'Наличные'
  | 'Безнал без НДС'
  | 'С НДС 20%';
```

### Contractor (Подрядчик)

```typescript
interface Contractor {
  id: string;
  name: string;
  phone: string;
  email?: string;
  inn?: string;

  equipment: AssetType[];  // Типы техники
  districts: string[];      // Районы работы

  paymentType: PaymentType;
  rating: number;           // 1-5
  completedOrders: number;
  isVerified: boolean;

  createdAt: string;
}
```

### DriverAssignment (Назначение водителя)

```typescript
interface DriverAssignment {
  id: string;
  orderId: string;

  driverName: string;
  driverId?: string;
  contractorId?: string;

  assetType: AssetType;
  vehicleId?: string;
  plateNumber?: string;

  assignedPrice: number;
  priceUnit: PriceUnit;

  status: AssignmentStatus;

  // Для погрузчика
  shiftStartTime?: string;
  shiftEndTime?: string;
  shiftId?: string;

  // Итоги
  totalTrips?: number;
  totalHours?: number;
  earnings?: number;
  confirmedEarnings?: number;

  // Оценка
  rating?: number;
  ratingComment?: string;

  assignedAt?: string;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

type AssignmentStatus =
  | 'assigned'
  | 'confirmed'
  | 'en_route'
  | 'on_site'
  | 'working'
  | 'completed'
  | 'cancelled';

type PriceUnit =
  | 'PER_TRIP'
  | 'PER_HOUR'
  | 'PER_SHIFT';
```

## Финансовые сущности

### Invoice (Счёт)

```typescript
interface Invoice {
  id: string;
  orderId: string;
  number: string;           // INV-2402-0001
  date: string;
  dueDate: string;

  type: InvoiceType;
  amount: number;
  vatAmount: number;
  vatRate: number;

  status: InvoiceStatus;
  paidAmount: number;

  createdBy: string;
  createdAt: string;
  paidAt?: string;
}

type InvoiceType =
  | 'prepayment'
  | 'partial'
  | 'final'
  | 'additional';

type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'sent'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled';
```

### Payment (Платёж)

```typescript
interface Payment {
  id: string;
  invoiceId: string;
  orderId: string;

  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;

  transactionId?: string;

  createdAt: string;
  processedAt?: string;
}

type PaymentMethod =
  | 'card'
  | 'bank_transfer'
  | 'cash'
  | 'qr_code';

type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';
```

### Estimate (Смета)

```typescript
interface Estimate {
  id: string;
  orderId: string;
  version: number;

  items: EstimateItem[];

  subtotal: number;
  discount: number;
  vat: number;
  totalCustomerPrice: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;

  status: EstimateStatus;

  createdBy: string;
  createdAt: string;
  sentAt?: string;
  approvedAt?: string;
}

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  costPrice: number;
  total: number;
}
```

## Утилитарные функции

### generateId()

Генерирует уникальный ID (UUID-like).

```typescript
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ...);
}
```

### formatPrice(amount: number)

Форматирует число как цену в рублях.

```typescript
formatPrice(15000) // → "15 000 ₽"
formatPrice(1500.5) // → "1 500,50 ₽"
```

### formatDateTime(date: string)

Форматирует дату и время.

```typescript
formatDateTime('2024-01-15T14:30:00') // → "15 янв 2024, 14:30"
```

### calculateOrderTotals(order: Order)

Рассчитывает суммы заказа.

```typescript
const totals = calculateOrderTotals(order);
// → { customerTotal, contractorTotal, grossProfit }
```

### normalizeOrderStatus(status: string)

Нормализует статус заказа к enum.

```typescript
normalizeOrderStatus('in_progress') // → OrderStatus.IN_PROGRESS
```

### getOrderStatusLabel(status: OrderStatus)

Возвращает человекочитаемое название статуса.

```typescript
getOrderStatusLabel(OrderStatus.IN_PROGRESS) // → "В работе"
```

## Типы техники

```typescript
type AssetType =
  // Самосвалы
  | 'TRUCK'
  | 'TRUCK_20'
  | 'TRUCK_25'
  // Погрузчики
  | 'LOADER'
  | 'LOADER_JCB'
  | 'FRONT_LOADER'
  | 'MINI_LOADER'
  // Асфальт
  | 'ROLLER'
  | 'ASPHALT_PAVER'
  | 'GRADER'
  | 'EXCAVATOR';

// Проверки
function isTruckType(type: AssetType): boolean;
function isLoaderType(type: AssetType): boolean;
```

## Типы услуг

```typescript
type ServiceType =
  | 'SNOW'        // Вывоз снега
  | 'ASPHALT'     // Асфальтирование
  | 'LANDSCAPING' // Благоустройство
  | 'OTHER';      // Другое
```
