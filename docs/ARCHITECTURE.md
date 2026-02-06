# Архитектура приложения SnowForce Dispatch

## Общая структура

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend SPA                              │
│                (React + Vite + TypeScript)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx                                 │
│  - Роутинг по ролям                                         │
│  - State management (useState)                              │
│  - Persistence (localStorage)                               │
│  - Props drilling в порталы                                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  localStorage │   │    pdfmake   │   │ Google Gemini │
│ (persistence) │   │ (PDF генер.) │   │  (AI анализ)  │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Компоненты

### App.tsx (83KB)
Главный компонент приложения:
- **Роутинг по ролям** - переключение между порталами
- **State management** - глобальное состояние через useState
- **Persistence** - сохранение/загрузка из localStorage
- **Props drilling** - передача данных в дочерние компоненты

### types.ts (65KB)
Все типы и интерфейсы:
- Order, Lead, Customer, Contractor
- Invoice, Payment, Contract
- DriverAssignment, Trip, Shift
- Enum-ы статусов
- Утилитарные функции (generateId, formatPrice, etc.)

### Порталы (по ролям)

| Компонент | Роль | Функции |
|-----------|------|---------|
| CustomerPortal.tsx | Клиент | Создание заказов, просмотр статуса, КП |
| SalesManagerPortal.tsx | Менеджер | Управление лидами, конвертация в заказы |
| EstimatorPortal.tsx | Сметчик | Расчёт стоимости, создание смет |
| OrderForm.tsx | Диспетчер | Управление заказами, назначение техники |
| ContractorPortal.tsx | Подрядчик | Отклики на биржу, управление водителями |
| DriverPortal.tsx | Водитель | Рейсы, фотоотчёты, статусы |
| AccountantPortal.tsx | Бухгалтер | Счета, платежи, документы |
| AdminPanel.tsx | Администратор | Справочники, пользователи, настройки |

## Потоки данных

### 1. Создание заказа (Lead → Order)

```
Клиент отправляет заявку
        │
        ▼
Lead (NEW) ────────────────────► Менеджер квалифицирует
        │
        ▼
Lead (QUALIFIED) ──────────────► Сметчик рассчитывает
        │
        ▼
Lead (OFFER_SENT) ─────────────► КП отправлено клиенту
        │
        ▼ (Клиент подтвердил)
Lead (WON) ────────────────────► Конвертация в Order
        │
        ▼
Order (NEW_REQUEST) ───────────► Начало работы
```

### 2. Выполнение заказа

```
Order (CONFIRMED)
        │
        ▼
DriverAssignment (assigned)
        │
        ▼
Driver принимает работу
        │
        ▼
Trip/Shift ────────────────────► Водитель выполняет
        │
        ▼
Фотоотчёты ────────────────────► Диспетчер проверяет
        │
        ▼
Order (COMPLETED)
```

### 3. Финансовый поток

```
Estimate (смета)
        │
        ▼
Invoice (счёт) ────────────────► Клиент оплачивает
        │
        ▼
Payment (платёж) ──────────────► Распределение:
        │                         - Комиссия платформы
        │                         - Эквайринг
        ▼                         - Payout подрядчику
ClosingDocs ───────────────────► Акты, УПД
```

## Хранилище данных

### localStorage ключи

| Ключ | Тип | Описание |
|------|-----|----------|
| `snowforce_orders_v1` | Order[] | Заказы |
| `snowforce_customers_v1` | Customer[] | Клиенты |
| `snowforce_contractors_v1` | Contractor[] | Подрядчики |
| `snowforce_leads_v1` | Lead[] | Лиды |
| `snowforce_users_v1` | User[] | Пользователи |
| `snowforce_vehicles_v1` | Vehicle[] | Техника |
| `snowforce_pricebook_v1` | PriceBookItem[] | Прайс-лист |
| `snowforce_company_settings_v1` | CompanySettings | Реквизиты |
| `snowforce_commission_v1` | CommissionSettings | Комиссии |

### Пример работы с localStorage

```typescript
// Загрузка
const orders = safeJsonParse<Order[]>(
  localStorage.getItem('snowforce_orders_v1'),
  []
);

// Сохранение
localStorage.setItem(
  'snowforce_orders_v1',
  JSON.stringify(orders)
);
```

## Типы услуг

| Тип | Описание |
|-----|----------|
| SNOW | Вывоз снега |
| ASPHALT | Асфальтирование |
| LANDSCAPING | Благоустройство |
| OTHER | Другое |

## Типы техники

| Группа | Типы |
|--------|------|
| Самосвалы | TRUCK, TRUCK_20, TRUCK_25 |
| Погрузчики | LOADER, LOADER_JCB, FRONT_LOADER, MINI_LOADER |
| Асфальт | ROLLER, ASPHALT_PAVER, GRADER, EXCAVATOR |

## Режимы исполнения

| Режим | Описание |
|-------|----------|
| OWN_FLEET | Своя техника - прямое назначение |
| MARKETPLACE | Биржа - аукцион среди подрядчиков |

## Расчёты

### Заработок водителя

```typescript
// Per trip (самосвал)
earnings = confirmed_trips × price_per_trip

// Per shift (погрузчик)
earnings = max(shift_price, actual_hours × hourly_rate)

// Per hour
earnings = actual_hours × price_per_hour
```

### Маржа заказа

```typescript
grossProfit = customerTotal - contractorTotal
marginPercent = (grossProfit / customerTotal) × 100
```

### Комиссия платформы

```typescript
commission = orderAmount × (commissionPercent / 100)
acquiringFee = orderAmount × (acquiringFeePercent / 100)
netAmount = orderAmount - commission - acquiringFee
```
