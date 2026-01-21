import React, { useState, useMemo, useCallback } from 'react';
import { Order, OrderStatus, AssetType, AssetRequirement, OrderRestrictions, CustomerContact, formatPrice, formatDateTime, generateId, generateOrderNumber, PriceUnit } from './types';

interface CustomerPortalProps {
  orders: Order[];
  onAddOrder: (order: Partial<Order>) => void;
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ orders, onAddOrder, onUpdateOrder }) => {
  const [view, setView] = useState<'active' | 'form' | 'history' | 'order-detail'>('active');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isProcessingDoc, setIsProcessingDoc] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('snow_customer_phone') || '');
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('snow_customer_name') || '');

  // Фильтрация заказов по телефону клиента
  const myOrders = useMemo(() => {
    if (!customerPhone) return [];
    return orders.filter(o => o.contactInfo?.phone === customerPhone);
  }, [orders, customerPhone]);

  const activeOrders = useMemo(() => {
    return myOrders.filter(o => 
      ![OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REPORT_READY].includes(o.status as OrderStatus)
    );
  }, [myOrders]);

  const completedOrders = useMemo(() => {
    return myOrders.filter(o => 
      [OrderStatus.COMPLETED, OrderStatus.REPORT_READY, OrderStatus.EXPORT_COMPLETED].includes(o.status as OrderStatus)
    );
  }, [myOrders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Расчёт итогов по заказу
  const calculateOrderTotals = useCallback((order: Order) => {
    let totalTruckCost = 0;
    let totalLoaderCost = 0;
    const totalTrips = order.actualTrips || 0;

    order.assetRequirements.forEach(req => {
      if (req.type === AssetType.TRUCK) {
        totalTruckCost = totalTrips * (req.customerPrice || 0);
      } else {
        const approvedUnits = (order.driverDetails || []).filter(d => d.assetType === req.type).length;
        totalLoaderCost += approvedUnits * (req.customerPrice || 0);
      }
    });

    return {
      totalTrips,
      totalTruckCost,
      totalLoaderCost,
      grandTotal: totalTruckCost + totalLoaderCost
    };
  }, []);

  // Форма нового заказа
  const [formData, setFormData] = useState<Partial<Order>>({
    customer: customerName,
    address: '',
    plannedTrips: 10,
    actualTrips: 0,
    scheduledTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    restrictions: {
      hasHeightLimit: false,
      hasNarrowEntrance: false,
      hasPermitRegime: false,
      isNightWorkProhibited: false,
      comment: ''
    },
    contactInfo: {
      name: customerName,
      phone: customerPhone,
      email: '',
      companyName: ''
    },
    assetRequirements: [{ 
      id: generateId(),
      type: AssetType.TRUCK, 
      contractorId: '', 
      contractorName: 'Биржа', 
      plannedUnits: 1, 
      customerPrice: 0, 
      contractorPrice: 0,
      priceUnit: PriceUnit.PER_TRIP
    }]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.contactInfo?.phone) {
      localStorage.setItem('snow_customer_phone', formData.contactInfo.phone);
      localStorage.setItem('snow_customer_name', formData.contactInfo.name || '');
      setCustomerPhone(formData.contactInfo.phone);
      setCustomerName(formData.contactInfo.name || '');
    }
    
    const newOrder: Partial<Order> = {
      ...formData,
      orderNumber: generateOrderNumber(),
      status: OrderStatus.NEW_REQUEST,
      bids: [],
      assignments: [],
      assignedDrivers: [],
      driverDetails: [],
      applicants: [],
      evidences: [],
      actionLog: [{
        id: generateId(),
        orderId: '',
        timestamp: new Date().toISOString(),
        action: 'Заявка создана заказчиком',
        actionType: 'status_change',
        performedBy: formData.contactInfo?.name || 'Заказчик',
        performedByRole: 'customer',
        newValue: OrderStatus.NEW_REQUEST
      }]
    };
    
    onAddOrder(newOrder);
    setView('active');
    setShareStatus('✅ Заявка успешно отправлена! Менеджер свяжется с вами.');
    setTimeout(() => setShareStatus(null), 5000);
  };

  // Генерация закрывающих документов - улучшенная версия
  const generateReport = useCallback(async (order: Order, type: 'act' | 'invoice' | 'full' | 'contract' | 'upd') => {
    setIsProcessingDoc(type);

    // Симуляция генерации документа
    await new Promise(resolve => setTimeout(resolve, 1500));

    const totals = calculateOrderTotals(order);
    const docDate = new Date().toLocaleDateString('ru');
    const docNumber = `${order.orderNumber || order.id.slice(0, 8)}-${type.toUpperCase()}`;
    const confirmedEvidences = (order.evidences || []).filter(e => e.confirmed);

    let reportContent = '';

    if (type === 'act') {
      // АКТ ВЫПОЛНЕННЫХ РАБОТ
      reportContent = `
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                         АКТ ВЫПОЛНЕННЫХ РАБОТ                                  ║
║                              № ${docNumber.padEnd(20)}                         ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  Дата составления: ${docDate.padEnd(58)}║
╠════════════════════════════════════════════════════════════════════════════════╣

ИСПОЛНИТЕЛЬ:
  ООО "СНОУФОРС"
  ИНН: 7700000000 / КПП: 770001001
  Адрес: г. Москва, ул. Снежная, д. 1

ЗАКАЗЧИК:
  ${order.customer || 'Не указан'}
  ${order.contactInfo?.inn ? `ИНН: ${order.contactInfo.inn}` : ''}
  Тел: ${order.contactInfo?.phone || 'Не указан'}
  Email: ${order.contactInfo?.email || 'Не указан'}

═══════════════════════════════════════════════════════════════════════════════════
                                ОБЪЕКТ РАБОТ
═══════════════════════════════════════════════════════════════════════════════════

  Адрес: ${order.address || 'Не указан'}
  Район: ${order.district || 'Не указан'}

═══════════════════════════════════════════════════════════════════════════════════
                              ПЕРИОД ВЫПОЛНЕНИЯ
═══════════════════════════════════════════════════════════════════════════════════

  Дата начала работ:    ${formatDateTime(order.scheduledTime)}
  Дата окончания работ: ${order.completedAt ? formatDateTime(order.completedAt) : docDate}

═══════════════════════════════════════════════════════════════════════════════════
                            ПЕРЕЧЕНЬ ВЫПОЛНЕННЫХ РАБОТ
═══════════════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────┬────────────┬────────────┬───────────────┐
│ Наименование услуги                  │   Ед.изм.  │  Кол-во    │    Сумма      │
├──────────────────────────────────────┼────────────┼────────────┼───────────────┤
${order.assetRequirements.map(req => {
  const qty = req.type === AssetType.TRUCK ? totals.totalTrips : req.plannedUnits;
  const sum = (req.customerPrice || 0) * qty;
  const name = req.type === AssetType.TRUCK ? 'Вывоз снега самосвалом' :
               req.type === AssetType.LOADER ? 'Работа погрузчика' : 'Работа мини-погрузчика';
  const unit = req.type === AssetType.TRUCK ? 'рейс' : 'смена';
  return `│ ${name.padEnd(36)} │ ${unit.padEnd(10)} │ ${String(qty).padStart(10)} │ ${formatPrice(sum).padStart(13)} │`;
}).join('\n')}
├──────────────────────────────────────┴────────────┴────────────┼───────────────┤
│                                                        ИТОГО:  │ ${formatPrice(totals.grandTotal).padStart(13)} │
└────────────────────────────────────────────────────────────────┴───────────────┘

═══════════════════════════════════════════════════════════════════════════════════
                                РЕЕСТР РЕЙСОВ
═══════════════════════════════════════════════════════════════════════════════════

┌─────┬─────────────────────┬────────────────────┬───────────┬──────────────────┐
│  №  │    Дата/Время       │      Водитель      │   GPS     │     Статус       │
├─────┼─────────────────────┼────────────────────┼───────────┼──────────────────┤
${confirmedEvidences.map((ev, i) => {
  const gps = ev.coordinates ? '✓' : '—';
  return `│ ${String(i + 1).padStart(3)} │ ${formatDateTime(ev.timestamp).padEnd(19)} │ ${(ev.driverName || '').slice(0, 18).padEnd(18)} │ ${gps.padStart(9)} │ ${'Подтверждён'.padEnd(16)} │`;
}).join('\n')}
└─────┴─────────────────────┴────────────────────┴───────────┴──────────────────┘

Всего подтверждённых рейсов: ${confirmedEvidences.length}

═══════════════════════════════════════════════════════════════════════════════════

Вышеперечисленные работы выполнены полностью и в срок.
Заказчик претензий по объёму, качеству и срокам оказания услуг не имеет.

ИСПОЛНИТЕЛЬ:                                    ЗАКАЗЧИК:

___________________ / _______________           ___________________ / _______________
        подпись              ФИО                       подпись              ФИО

М.П.                                            М.П.

═══════════════════════════════════════════════════════════════════════════════════
                    Документ сформирован автоматически
                       SnowForce Moscow Dispatch © 2025
═══════════════════════════════════════════════════════════════════════════════════
`;
    } else if (type === 'invoice') {
      // СЧЁТ НА ОПЛАТУ
      reportContent = `
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                            СЧЁТ НА ОПЛАТУ                                      ║
║                              № ${docNumber.padEnd(20)}                         ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  Дата: ${docDate.padEnd(70)}║
╠════════════════════════════════════════════════════════════════════════════════╣

ПОЛУЧАТЕЛЬ ПЛАТЕЖА:
───────────────────────────────────────────────────────────────────────────────────
  ООО "СНОУФОРС"
  ИНН: 7700000000 / КПП: 770001001

  Банк получателя: ПАО "СБЕРБАНК"
  БИК: 044525225
  Корр. счёт: 30101810400000000225
  Расч. счёт: 40702810938000000001
───────────────────────────────────────────────────────────────────────────────────

ПЛАТЕЛЬЩИК:
───────────────────────────────────────────────────────────────────────────────────
  ${order.customer || 'Не указан'}
  ${order.contactInfo?.inn ? `ИНН: ${order.contactInfo.inn}` : ''}
  Тел: ${order.contactInfo?.phone || 'Не указан'}
───────────────────────────────────────────────────────────────────────────────────

ОСНОВАНИЕ: Услуги по вывозу снега
ОБЪЕКТ: ${order.address || 'Не указан'}
ЗАКАЗ №: ${order.orderNumber || order.id}

═══════════════════════════════════════════════════════════════════════════════════
                                    УСЛУГИ
═══════════════════════════════════════════════════════════════════════════════════

┌────┬────────────────────────────────────┬────────┬──────────┬─────────────────┐
│ №  │ Наименование                       │ Кол-во │   Цена   │      Сумма      │
├────┼────────────────────────────────────┼────────┼──────────┼─────────────────┤
${order.assetRequirements.map((req, i) => {
  const qty = req.type === AssetType.TRUCK ? totals.totalTrips : req.plannedUnits;
  const sum = (req.customerPrice || 0) * qty;
  const name = req.type === AssetType.TRUCK ? 'Вывоз снега (самосвал)' :
               req.type === AssetType.LOADER ? 'Погрузка (погрузчик)' : 'Погрузка (мини-погрузчик)';
  return `│ ${String(i + 1).padStart(2)} │ ${name.padEnd(34)} │ ${String(qty).padStart(6)} │ ${formatPrice(req.customerPrice || 0).padStart(8)} │ ${formatPrice(sum).padStart(15)} │`;
}).join('\n')}
├────┴────────────────────────────────────┴────────┴──────────┼─────────────────┤
│                                                      ИТОГО: │ ${formatPrice(totals.grandTotal).padStart(15)} │
├─────────────────────────────────────────────────────────────┼─────────────────┤
│                                               В т.ч. НДС 0%:│             0 ₽ │
├─────────────────────────────────────────────────────────────┼─────────────────┤
│                                             ВСЕГО К ОПЛАТЕ: │ ${formatPrice(totals.grandTotal).padStart(15)} │
└─────────────────────────────────────────────────────────────┴─────────────────┘

Всего наименований: ${order.assetRequirements.length}
Сумма прописью: ${numberToWords(totals.grandTotal)} рублей 00 копеек.

───────────────────────────────────────────────────────────────────────────────────
ВНИМАНИЕ! Оплата данного счёта означает согласие с условиями оказания услуг.
Срок оплаты: 5 банковских дней с даты выставления счёта.
───────────────────────────────────────────────────────────────────────────────────

Руководитель: ___________________ / Иванов И.И.

Бухгалтер:    ___________________ / Петрова П.П.

                                                                           М.П.

═══════════════════════════════════════════════════════════════════════════════════
                    Документ сформирован автоматически
                       SnowForce Moscow Dispatch © 2025
═══════════════════════════════════════════════════════════════════════════════════
`;
    } else if (type === 'upd') {
      // УПД (Универсальный передаточный документ)
      reportContent = `
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║              УНИВЕРСАЛЬНЫЙ ПЕРЕДАТОЧНЫЙ ДОКУМЕНТ (УПД)                         ║
║                              № ${docNumber.padEnd(20)}                         ║
║                              Статус: 1 (счёт-фактура + акт)                    ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  Дата составления: ${docDate.padEnd(58)}║
╠════════════════════════════════════════════════════════════════════════════════╣

┌───────────────────────────────────────────────────────────────────────────────┐
│ 1. ПРОДАВЕЦ (ИСПОЛНИТЕЛЬ):                                                    │
├───────────────────────────────────────────────────────────────────────────────┤
│ ООО "СНОУФОРС"                                                                │
│ ИНН: 7700000000 / КПП: 770001001                                              │
│ Адрес: 123456, г. Москва, ул. Снежная, д. 1                                   │
└───────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│ 2. ПОКУПАТЕЛЬ (ЗАКАЗЧИК):                                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│ ${(order.customer || 'Не указан').padEnd(75)}│
│ ${order.contactInfo?.inn ? `ИНН: ${order.contactInfo.inn}`.padEnd(75) : ''.padEnd(75)}│
│ Тел: ${(order.contactInfo?.phone || 'Не указан').padEnd(69)}│
└───────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│ 3. ОСНОВАНИЕ ПЕРЕДАЧИ/ПОЛУЧЕНИЯ:                                              │
├───────────────────────────────────────────────────────────────────────────────┤
│ Договор оказания услуг по вывозу снега                                        │
│ Заказ №: ${(order.orderNumber || order.id).padEnd(65)}│
│ Объект: ${(order.address || 'Не указан').slice(0, 65).padEnd(65)}│
└───────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
                              ТАБЛИЦА УСЛУГ
═══════════════════════════════════════════════════════════════════════════════════

┌────┬────────────────────────────┬────────┬────────┬──────────┬─────────────────┐
│ №  │ Наименование товара/услуги │ Ед.изм │ Кол-во │   Цена   │   Стоимость     │
│    │                            │        │        │  без НДС │    без НДС      │
├────┼────────────────────────────┼────────┼────────┼──────────┼─────────────────┤
${order.assetRequirements.map((req, i) => {
  const qty = req.type === AssetType.TRUCK ? totals.totalTrips : req.plannedUnits;
  const sum = (req.customerPrice || 0) * qty;
  const name = req.type === AssetType.TRUCK ? 'Вывоз снега самосвалом' :
               req.type === AssetType.LOADER ? 'Работа погрузчика' : 'Работа мини-погрузчика';
  const unit = req.type === AssetType.TRUCK ? 'рейс' : 'смена';
  return `│ ${String(i + 1).padStart(2)} │ ${name.slice(0, 26).padEnd(26)} │ ${unit.padEnd(6)} │ ${String(qty).padStart(6)} │ ${formatPrice(req.customerPrice || 0).padStart(8)} │ ${formatPrice(sum).padStart(15)} │`;
}).join('\n')}
├────┴────────────────────────────┴────────┴────────┼──────────┼─────────────────┤
│                                           ВСЕГО:  │   Без НДС│ ${formatPrice(totals.grandTotal).padStart(15)} │
├───────────────────────────────────────────────────┼──────────┼─────────────────┤
│                                              НДС: │       0% │             0 ₽ │
├───────────────────────────────────────────────────┼──────────┼─────────────────┤
│                                  ВСЕГО С УЧЁТОМ НДС:         │ ${formatPrice(totals.grandTotal).padStart(15)} │
└───────────────────────────────────────────────────┴──────────┴─────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
                           ПОДПИСИ СТОРОН
═══════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────┬─────────────────────────────────────────┐
│ ПРОДАВЕЦ (ИСПОЛНИТЕЛЬ):             │ ПОКУПАТЕЛЬ (ЗАКАЗЧИК):                  │
├─────────────────────────────────────┼─────────────────────────────────────────┤
│                                     │                                         │
│ Товар (услуги) передал / работы     │ Товар (услуги) получил / работы принял  │
│ сдал:                               │                                         │
│                                     │                                         │
│ _______________ / _______________   │ _______________ / _______________       │
│    подпись          ФИО             │    подпись          ФИО                 │
│                                     │                                         │
│ Дата: ______________                │ Дата: ______________                    │
│                                     │                                         │
│          М.П.                       │          М.П.                           │
└─────────────────────────────────────┴─────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
                    Документ сформирован автоматически
                       SnowForce Moscow Dispatch © 2025
═══════════════════════════════════════════════════════════════════════════════════
`;
    } else if (type === 'contract') {
      // ДОГОВОР
      reportContent = `
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                  ДОГОВОР ОКАЗАНИЯ УСЛУГ ПО ВЫВОЗУ СНЕГА                        ║
║                              № ${docNumber.padEnd(20)}                         ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  г. Москва                                            ${docDate.padEnd(24)}║
╠════════════════════════════════════════════════════════════════════════════════╣

ООО "СНОУФОРС", именуемое в дальнейшем "Исполнитель", в лице Генерального
директора Иванова И.И., действующего на основании Устава, с одной стороны, и

${order.customer || 'Заказчик'}, именуемый в дальнейшем "Заказчик",
${order.contactInfo?.inn ? `ИНН: ${order.contactInfo.inn}, ` : ''}в лице _________________________________,
действующего на основании _________________, с другой стороны,

вместе именуемые "Стороны", заключили настоящий Договор о нижеследующем:

═══════════════════════════════════════════════════════════════════════════════════
                         1. ПРЕДМЕТ ДОГОВОРА
═══════════════════════════════════════════════════════════════════════════════════

1.1. Исполнитель обязуется оказать услуги по механизированной уборке и вывозу
     снега с территории Заказчика, а Заказчик обязуется принять и оплатить
     оказанные услуги.

1.2. Адрес объекта: ${order.address || 'Не указан'}

1.3. Объём работ определяется по факту выполнения согласно реестру рейсов.

═══════════════════════════════════════════════════════════════════════════════════
                         2. СТОИМОСТЬ УСЛУГ
═══════════════════════════════════════════════════════════════════════════════════

${order.assetRequirements.map((req, i) => {
  const name = req.type === AssetType.TRUCK ? 'Вывоз снега самосвалом' :
               req.type === AssetType.LOADER ? 'Работа погрузчика' : 'Работа мини-погрузчика';
  const unit = req.type === AssetType.TRUCK ? 'за рейс' : 'за смену';
  return `2.${i + 2}. ${name}: ${formatPrice(req.customerPrice || 0)} ${unit}`;
}).join('\n')}

2.${order.assetRequirements.length + 2}. НДС не облагается в соответствии с п. 2 ст. 346.11 НК РФ
     (применение УСН).

═══════════════════════════════════════════════════════════════════════════════════
                         3. ПОРЯДОК РАСЧЁТОВ
═══════════════════════════════════════════════════════════════════════════════════

3.1. Оплата производится Заказчиком в течение 5 (пяти) банковских дней с момента
     подписания Акта выполненных работ.

3.2. Оплата производится путём перечисления денежных средств на расчётный счёт
     Исполнителя.

═══════════════════════════════════════════════════════════════════════════════════
                         4. ПОРЯДОК СДАЧИ-ПРИЁМКИ УСЛУГ
═══════════════════════════════════════════════════════════════════════════════════

4.1. По завершении работ Исполнитель предоставляет Заказчику:
     - Акт выполненных работ
     - Реестр рейсов с фотофиксацией
     - Счёт на оплату

4.2. Заказчик обязан подписать Акт выполненных работ или направить мотивированный
     отказ в течение 3 (трёх) рабочих дней.

═══════════════════════════════════════════════════════════════════════════════════
                         5. РЕКВИЗИТЫ СТОРОН
═══════════════════════════════════════════════════════════════════════════════════

ИСПОЛНИТЕЛЬ:                              ЗАКАЗЧИК:

ООО "СНОУФОРС"                            ${order.customer || ''}
ИНН: 7700000000                           ${order.contactInfo?.inn ? `ИНН: ${order.contactInfo.inn}` : ''}
КПП: 770001001
Банк: ПАО "СБЕРБАНК"                      Тел: ${order.contactInfo?.phone || ''}
БИК: 044525225                            Email: ${order.contactInfo?.email || ''}
Р/с: 40702810938000000001

Генеральный директор:                     ___________________________________

_______________ / Иванов И.И.             _______________ / _______________

          М.П.                                        М.П.

═══════════════════════════════════════════════════════════════════════════════════
                    Документ сформирован автоматически
                       SnowForce Moscow Dispatch © 2025
═══════════════════════════════════════════════════════════════════════════════════
`;
    } else {
      // ПОЛНЫЙ ОТЧЁТ
      reportContent = `
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                           ПОЛНЫЙ ОТЧЁТ ПО ЗАКАЗУ                               ║
║                              № ${(order.orderNumber || order.id).padEnd(20)}   ║
║                                                                                ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  Дата формирования: ${docDate.padEnd(57)}║
╠════════════════════════════════════════════════════════════════════════════════╣

═══════════════════════════════════════════════════════════════════════════════════
                              ОБЩАЯ ИНФОРМАЦИЯ
═══════════════════════════════════════════════════════════════════════════════════

  Номер заказа:     ${order.orderNumber || order.id}
  Статус:           ${order.status}
  Менеджер:         ${order.managerName || 'Не назначен'}

═══════════════════════════════════════════════════════════════════════════════════
                                 ЗАКАЗЧИК
═══════════════════════════════════════════════════════════════════════════════════

  Наименование:     ${order.customer || 'Не указан'}
  ${order.contactInfo?.inn ? `ИНН:               ${order.contactInfo.inn}` : ''}
  Телефон:          ${order.contactInfo?.phone || 'Не указан'}
  Email:            ${order.contactInfo?.email || 'Не указан'}

═══════════════════════════════════════════════════════════════════════════════════
                                  ОБЪЕКТ
═══════════════════════════════════════════════════════════════════════════════════

  Адрес:            ${order.address || 'Не указан'}
  Район:            ${order.district || 'Не указан'}
  ${order.coordinates ? `Координаты:        ${order.coordinates[0]}, ${order.coordinates[1]}` : ''}

  Ограничения:
  ${order.restrictions?.hasHeightLimit ? `  - Ограничение высоты: ${order.restrictions.heightLimitMeters || '?'} м` : ''}
  ${order.restrictions?.hasNarrowEntrance ? `  - Узкий проезд: ${order.restrictions.entranceWidthMeters || '?'} м` : ''}
  ${order.restrictions?.hasPermitRegime ? `  - Пропускной режим: ${order.restrictions.permitDetails || 'Да'}` : ''}
  ${order.restrictions?.isNightWorkProhibited ? '  - Ночные работы запрещены' : ''}

═══════════════════════════════════════════════════════════════════════════════════
                              ПЕРИОД РАБОТ
═══════════════════════════════════════════════════════════════════════════════════

  Начало:           ${formatDateTime(order.scheduledTime)}
  ${order.startedAt ? `Фактическое начало: ${formatDateTime(order.startedAt)}` : ''}
  ${order.completedAt ? `Завершение:         ${formatDateTime(order.completedAt)}` : ''}

═══════════════════════════════════════════════════════════════════════════════════
                              ТЕХНИКА И РАСЦЕНКИ
═══════════════════════════════════════════════════════════════════════════════════

┌──────────────────────────┬────────────┬────────────┬────────────┬──────────────┐
│ Тип техники              │   Ед.изм   │  Кол-во    │    Цена    │    Итого     │
├──────────────────────────┼────────────┼────────────┼────────────┼──────────────┤
${order.assetRequirements.map(req => {
  const qty = req.type === AssetType.TRUCK ? totals.totalTrips : req.plannedUnits;
  const sum = (req.customerPrice || 0) * qty;
  const unit = req.type === AssetType.TRUCK ? 'рейс' : 'смена';
  return `│ ${req.type.padEnd(24)} │ ${unit.padEnd(10)} │ ${String(qty).padStart(10)} │ ${formatPrice(req.customerPrice || 0).padStart(10)} │ ${formatPrice(sum).padStart(12)} │`;
}).join('\n')}
├──────────────────────────┴────────────┴────────────┴────────────┼──────────────┤
│                                                          ИТОГО: │ ${formatPrice(totals.grandTotal).padStart(12)} │
└─────────────────────────────────────────────────────────────────┴──────────────┘

═══════════════════════════════════════════════════════════════════════════════════
                               СТАТИСТИКА
═══════════════════════════════════════════════════════════════════════════════════

  Плановых рейсов:        ${order.plannedTrips || 0}
  Выполнено рейсов:       ${(order.evidences || []).length}
  Подтверждено рейсов:    ${confirmedEvidences.length}
  На проверке:            ${(order.evidences || []).length - confirmedEvidences.length}

═══════════════════════════════════════════════════════════════════════════════════
                              РЕЕСТР РЕЙСОВ
═══════════════════════════════════════════════════════════════════════════════════

┌─────┬─────────────────────┬──────────────────────┬────────────┬────────────────┐
│  №  │    Дата/Время       │       Водитель       │    GPS     │     Статус     │
├─────┼─────────────────────┼──────────────────────┼────────────┼────────────────┤
${(order.evidences || []).map((ev, i) => {
  const gps = ev.coordinates ? `${ev.coordinates.latitude.toFixed(4)},${ev.coordinates.longitude.toFixed(4)}` : '—';
  const status = ev.confirmed ? 'Подтверждён' : ev.rejectionReason ? 'Отклонён' : 'На проверке';
  return `│ ${String(i + 1).padStart(3)} │ ${formatDateTime(ev.timestamp).padEnd(19)} │ ${(ev.driverName || '').slice(0, 20).padEnd(20)} │ ${gps.padStart(10)} │ ${status.padEnd(14)} │`;
}).join('\n') || '│                              Рейсы отсутствуют                              │'}
└─────┴─────────────────────┴──────────────────────┴────────────┴────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
                           НАЗНАЧЕННАЯ ТЕХНИКА
═══════════════════════════════════════════════════════════════════════════════════

${(order.driverDetails || []).map((d, i) => `
  ${i + 1}. ${d.driverName || 'Водитель'}
     Тип: ${d.assetType}
     Статус: ${d.status || 'Назначен'}
     ${d.assignedAt ? `Назначен: ${formatDateTime(d.assignedAt)}` : ''}
`).join('') || '  Техника не назначена'}

═══════════════════════════════════════════════════════════════════════════════════
                           ИСТОРИЯ ДЕЙСТВИЙ
═══════════════════════════════════════════════════════════════════════════════════

${(order.actionLog || []).slice(-10).map(log =>
  `  ${formatDateTime(log.timestamp)} | ${log.performedBy} | ${log.action}`
).join('\n') || '  История пуста'}

═══════════════════════════════════════════════════════════════════════════════════
                    Документ сформирован автоматически
                       SnowForce Moscow Dispatch © 2025
═══════════════════════════════════════════════════════════════════════════════════
`;
    }

    // Создаём и скачиваем файл
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snowforce_${type}_${order.orderNumber || order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsProcessingDoc(null);

    const docNames: Record<string, string> = {
      act: 'Акт выполненных работ',
      invoice: 'Счёт на оплату',
      upd: 'УПД',
      contract: 'Договор',
      full: 'Полный отчёт'
    };

    setShareStatus(`✅ ${docNames[type]} успешно сформирован и загружен.`);
    setTimeout(() => setShareStatus(null), 3000);
  }, [calculateOrderTotals]);

  // Вспомогательная функция для преобразования числа в слова
  const numberToWords = (num: number): string => {
    if (num === 0) return 'Ноль';
    const units = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const thousands = ['', 'тысяча', 'тысячи', 'тысяч'];

    if (num >= 1000000) return formatPrice(num).replace(' ₽', '');

    let result = '';
    const th = Math.floor(num / 1000);
    const h = Math.floor((num % 1000) / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (th > 0) {
      if (th === 1) result += 'одна тысяча ';
      else if (th === 2) result += 'две тысячи ';
      else if (th >= 3 && th <= 4) result += units[th] + ' тысячи ';
      else result += units[th] + ' тысяч ';
    }

    if (h > 0) result += hundreds[h] + ' ';

    if (t === 1) {
      result += teens[u] + ' ';
    } else {
      if (t > 1) result += tens[t] + ' ';
      if (u > 0) result += units[u] + ' ';
    }

    return result.trim() || 'Ноль';
  };

  // Скачивание фото - HTML страница с галереей
  const downloadPhotos = useCallback(async (order: Order) => {
    setIsProcessingDoc('photos');

    const evidences = order.evidences || [];
    if (evidences.length === 0) {
      setIsProcessingDoc(null);
      setShareStatus('📸 Нет фотографий для скачивания');
      setTimeout(() => setShareStatus(null), 3000);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Создаём HTML страницу с галереей фото
    const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Фотоотчёт - Заказ ${order.orderNumber || order.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0f1d;
      color: white;
      padding: 20px;
      min-height: 100vh;
    }
    .header {
      text-align: center;
      padding: 40px 20px;
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      border-radius: 20px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.8; font-size: 14px; }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .info-card {
      background: #12192c;
      padding: 20px;
      border-radius: 15px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .info-card label { font-size: 10px; text-transform: uppercase; opacity: 0.5; display: block; margin-bottom: 5px; }
    .info-card span { font-size: 16px; font-weight: bold; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .photo-card {
      background: #12192c;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .photo-card img {
      width: 100%;
      height: 250px;
      object-fit: cover;
      cursor: pointer;
      transition: transform 0.3s;
    }
    .photo-card img:hover { transform: scale(1.02); }
    .photo-info { padding: 15px; }
    .photo-info h3 { font-size: 14px; margin-bottom: 5px; }
    .photo-info p { font-size: 12px; opacity: 0.6; }
    .photo-info .status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 10px;
    }
    .status.confirmed { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .status.pending { background: rgba(249, 115, 22, 0.2); color: #f97316; }
    .footer {
      text-align: center;
      padding: 40px;
      opacity: 0.5;
      font-size: 12px;
    }
    .download-btn {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 10px 20px;
      border-radius: 10px;
      text-decoration: none;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
    }
    @media print {
      body { background: white; color: black; }
      .photo-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ФОТООТЧЁТ</h1>
    <p>SnowForce Moscow Dispatch</p>
  </div>

  <div class="info-grid">
    <div class="info-card">
      <label>Заказ</label>
      <span>#${order.orderNumber || order.id}</span>
    </div>
    <div class="info-card">
      <label>Объект</label>
      <span>${order.address || 'Не указан'}</span>
    </div>
    <div class="info-card">
      <label>Заказчик</label>
      <span>${order.customer || 'Не указан'}</span>
    </div>
    <div class="info-card">
      <label>Всего рейсов</label>
      <span>${evidences.length}</span>
    </div>
  </div>

  <div class="gallery">
    ${evidences.map((ev, i) => {
      const photos = ev.photos || [];
      const mainPhoto = photos[0]?.url || '';
      const status = ev.confirmed ? 'confirmed' : 'pending';
      const statusText = ev.confirmed ? 'Подтверждён' : 'На проверке';

      return `
        <div class="photo-card">
          ${mainPhoto ? `<img src="${mainPhoto}" alt="Рейс ${i + 1}" onclick="window.open(this.src)">` : '<div style="height:250px;background:#1c2641;display:flex;align-items:center;justify-content:center;opacity:0.3;">Нет фото</div>'}
          <div class="photo-info">
            <h3>Рейс #${ev.tripNumber || i + 1}</h3>
            <p>Водитель: ${ev.driverName || 'Не указан'}</p>
            <p>Время: ${new Date(ev.timestamp).toLocaleString('ru')}</p>
            ${ev.coordinates ? `<p>GPS: ${ev.coordinates.latitude.toFixed(5)}, ${ev.coordinates.longitude.toFixed(5)}</p>` : ''}
            <p>Фото в рейсе: ${photos.length}</p>
            <span class="status ${status}">${statusText}</span>
            ${photos.length > 1 ? `<br><small style="opacity:0.5;font-size:10px;">+ ещё ${photos.length - 1} фото</small>` : ''}
          </div>
        </div>
      `;
    }).join('')}
  </div>

  <div class="footer">
    <p>Документ сформирован: ${new Date().toLocaleString('ru')}</p>
    <p>SnowForce Moscow Dispatch © 2025</p>
  </div>
</body>
</html>
    `;

    // Скачиваем HTML файл
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snowforce_photos_${order.orderNumber || order.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsProcessingDoc(null);
    setShareStatus(`📸 Фотоотчёт (${evidences.length} рейсов) успешно скачан!`);
    setTimeout(() => setShareStatus(null), 3000);
  }, []);

  // Скачивание отдельного фото
  const downloadSinglePhoto = useCallback((photoUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = photoUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // Отправка в мессенджеры
  const shareToMessenger = useCallback((order: Order, channel: 'telegram' | 'whatsapp' | 'email') => {
    const totals = calculateOrderTotals(order);
    const message = encodeURIComponent(
      `📊 Отчёт SnowForce\n\n` +
      `Объект: ${order.address}\n` +
      `Рейсов: ${totals.totalTrips}\n` +
      `Сумма: ${formatPrice(totals.grandTotal)}\n\n` +
      `Заказ №${order.orderNumber || order.id}`
    );

    if (channel === 'telegram') {
      window.open(`https://t.me/share/url?text=${message}`, '_blank');
    } else if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    } else {
      window.open(`mailto:?subject=Отчёт SnowForce ${order.orderNumber}&body=${message}`, '_blank');
    }
  }, [calculateOrderTotals]);

  // Подтверждение условий
  const handleConfirmOrder = useCallback((orderId: string, urgent: boolean = false) => {
    onUpdateOrder(orderId, {
      status: OrderStatus.CONFIRMED_BY_CUSTOMER,
      isFrozen: true,
      actionLog: [...(orders.find(o => o.id === orderId)?.actionLog || []), {
        id: generateId(),
        orderId,
        timestamp: new Date().toISOString(),
        action: urgent ? 'Срочное подтверждение заказчиком' : 'Условия подтверждены заказчиком',
        actionType: 'status_change',
        performedBy: customerName || 'Заказчик',
        performedByRole: 'customer',
        previousValue: orders.find(o => o.id === orderId)?.status,
        newValue: OrderStatus.CONFIRMED_BY_CUSTOMER
      }]
    });
    
    setShareStatus(urgent ? '🚀 Заявка запущена СРОЧНО! Техника выезжает.' : '✅ Условия подтверждены. Начинаем работу!');
    setTimeout(() => setShareStatus(null), 5000);
  }, [orders, customerName, onUpdateOrder]);

  // Загрузка платёжного поручения (платёжки) клиентом
  const handleUploadPayment = useCallback((orderId: string, file: File | null) => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    onUpdateOrder(orderId, {
      paymentReceiptUrl: url
    });

    setShareStatus('✅ Платёжка загружена. Менеджер увидит её в системе.');
    setTimeout(() => setShareStatus(null), 5000);
  }, [onUpdateOrder]);

  // Отправка обратной связи
  const submitFeedback = useCallback(() => {
    if (!selectedOrderId) return;
    
    onUpdateOrder(selectedOrderId, {
      feedback: {
        rating: feedbackRating,
        comment: feedbackComment,
        createdAt: new Date().toISOString()
      }
    });
    
    setShowFeedbackModal(false);
    setShareStatus('⭐ Спасибо за отзыв! Ваше мнение важно для нас.');
    setTimeout(() => setShareStatus(null), 4000);
  }, [selectedOrderId, feedbackRating, feedbackComment, onUpdateOrder]);

  // Повторный заказ
  const repeatOrder = useCallback((order: Order) => {
    setFormData({
      ...formData,
      customer: order.customer,
      address: order.address,
      restrictions: order.restrictions,
      contactInfo: order.contactInfo,
      assetRequirements: order.assetRequirements.map(req => ({ ...req, id: generateId() })),
      plannedTrips: order.plannedTrips,
      scheduledTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16)
    });
    setView('form');
  }, [formData]);

  const updateRestriction = (field: keyof OrderRestrictions, value: any) => {
    setFormData(prev => ({
      ...prev,
      restrictions: { ...prev.restrictions!, [field]: value }
    }));
  };

  const updateContact = (field: keyof CustomerContact, value: any) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: { ...prev.contactInfo!, [field]: value }
    }));
  };

  const toggleAssetType = (type: AssetType) => {
    setFormData(prev => {
      const requirements = prev.assetRequirements || [];
      const exists = requirements.some(r => r.type === type);
      if (exists) {
        return { ...prev, assetRequirements: requirements.filter(r => r.type !== type) };
      } else {
        return { 
          ...prev, 
          assetRequirements: [...requirements, { 
            id: generateId(),
            type, 
            contractorId: '', 
            contractorName: 'Биржа', 
            plannedUnits: 1,
            customerPrice: 0,
            contractorPrice: 0,
            priceUnit: PriceUnit.PER_TRIP
          }] 
        };
      }
    });
  };

  const getStatusBadge = (status: OrderStatus) => {
    const styles: Record<string, string> = {
      [OrderStatus.NEW_REQUEST]: 'bg-slate-600/20 text-slate-400 border-slate-500/20',
      [OrderStatus.CALCULATING]: 'bg-orange-600/20 text-orange-400 border-orange-500/20',
      [OrderStatus.AWAITING_CUSTOMER]: 'bg-blue-600/20 text-blue-400 border-blue-500/20 animate-pulse',
      [OrderStatus.CONFIRMED_BY_CUSTOMER]: 'bg-green-600/20 text-green-400 border-green-500/20',
      [OrderStatus.SEARCHING_EQUIPMENT]: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/20',
      [OrderStatus.EQUIPMENT_APPROVED]: 'bg-teal-600/20 text-teal-400 border-teal-500/20',
      [OrderStatus.EN_ROUTE]: 'bg-purple-600/20 text-purple-400 border-purple-500/20',
      [OrderStatus.IN_PROGRESS]: 'bg-green-600/20 text-green-400 border-green-500/20',
      [OrderStatus.EXPORT_COMPLETED]: 'bg-blue-600/20 text-blue-400 border-blue-500/20',
      [OrderStatus.COMPLETED]: 'bg-green-600/30 text-green-400 border-green-500/40',
    };
    
    return (
      <span className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${styles[status] || 'bg-slate-800 text-slate-500'}`}>
        {status}
      </span>
    );
  };

  // Шаги прогресса для заказа
  const getProgressSteps = (order: Order) => {
    const isConfirmed = [OrderStatus.CONFIRMED_BY_CUSTOMER, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED, OrderStatus.EQUIPMENT_APPROVED, OrderStatus.EN_ROUTE, OrderStatus.EXPORT_COMPLETED].includes(order.status as OrderStatus);
    const isTechAssigned = !order.isBirzhaOpen && (order.driverDetails || []).length > 0;
    const isEnRoute = order.status === OrderStatus.EN_ROUTE;
    const isWorking = order.status === OrderStatus.IN_PROGRESS;
    const isExporting = (order.actualTrips || 0) > 0;
    const isFinished = [OrderStatus.COMPLETED, OrderStatus.EXPORT_COMPLETED, OrderStatus.REPORT_READY].includes(order.status as OrderStatus);

    return [
      { label: 'Условия согласованы', done: isConfirmed, id: 1 },
      { label: 'Техника назначена', done: isTechAssigned, id: 2 },
      { label: 'Техника в пути', done: isEnRoute || isWorking || isFinished, active: isTechAssigned && !isEnRoute && !isWorking, id: 3 },
      { label: 'Идёт вывоз', done: isExporting, active: isWorking && !isExporting, id: 4 },
      { label: 'Завершено', done: isFinished, id: 5 }
    ];
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-white font-['Inter']">
      {/* Уведомление */}
      {shareStatus && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[11px] font-black uppercase text-center py-3 fixed top-0 left-0 right-0 z-[100] tracking-widest shadow-2xl animate-in slide-in-from-top duration-300">
          {shareStatus}
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-[#12192c] border-b border-white/5 flex flex-col md:flex-row justify-between items-center sticky top-0 z-20 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">❄️</span>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight">Личный кабинет</h1>
            {customerName && <p className="text-[9px] text-blue-400 font-bold">{customerName}</p>}
          </div>
        </div>
        
        <div className="flex bg-[#1c2641] p-1 rounded-full border border-white/5 shadow-2xl">
          <button onClick={() => { setView('active'); setSelectedOrderId(null); }} className={`px-5 py-2 text-[9px] font-bold uppercase rounded-full transition-all whitespace-nowrap ${view === 'active' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            📋 Текущие
          </button>
          <button onClick={() => setView('form')} className={`px-5 py-2 text-[9px] font-bold uppercase rounded-full transition-all whitespace-nowrap ${view === 'form' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            ➕ Новый заказ
          </button>
          <button onClick={() => { setView('history'); setSelectedOrderId(null); }} className={`px-5 py-2 text-[9px] font-bold uppercase rounded-full transition-all whitespace-nowrap ${view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            📜 История
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full pb-32">
        
        {/* === АКТИВНЫЕ ЗАКАЗЫ === */}
        {view === 'active' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {activeOrders.length === 0 ? (
              <div className="text-center py-24 bg-[#12192c]/40 rounded-[3rem] border border-white/5 border-dashed">
                <div className="text-6xl mb-6 opacity-20">🚜</div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Нет активных заказов</p>
                <button 
                  onClick={() => setView('form')} 
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-2xl"
                >
                  Создать заявку
                </button>
              </div>
            ) : (
              activeOrders.map(order => {
                const totals = calculateOrderTotals(order);
                const steps = getProgressSteps(order);
                const needsConfirmation = order.status === OrderStatus.AWAITING_CUSTOMER;
                const currentQuote = order.currentQuote;

                return (
                  <div key={order.id} className="bg-[#12192c] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                    {/* Заголовок */}
                    <div className="p-6 border-b border-white/5">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        {getStatusBadge(order.status)}
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          #{order.orderNumber || order.id.slice(0, 8)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500">
                          {formatDateTime(order.scheduledTime)}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black tracking-tight uppercase leading-tight">{order.address}</h2>
                    </div>

                    {/* Прогресс-бар */}
                    <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
                      <div className="flex justify-between items-center">
                        {steps.map((step, i) => (
                          <div key={step.id} className="flex flex-col items-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black mb-2 transition-all ${
                              step.done ? 'bg-green-500 text-white' : 
                              step.active ? 'bg-blue-500 text-white animate-pulse' : 
                              'bg-white/10 text-slate-600'
                            }`}>
                              {step.done ? '✓' : i + 1}
                            </div>
                            <span className={`text-[8px] font-bold uppercase text-center leading-tight ${
                              step.done || step.active ? 'text-slate-300' : 'text-slate-600'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Блок подтверждения КП (улучшенный) */}
                    {needsConfirmation && (
                      <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-white/10">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">💰 Коммерческое предложение</h3>
                            <p className="text-[10px] text-blue-200 mt-1">
                              Менеджер: {order.managerName} • Действует до: {currentQuote?.validUntil ? new Date(currentQuote.validUntil).toLocaleDateString('ru') : '7 дней'}
                            </p>
                          </div>
                          <span className="bg-white/20 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">
                            Ожидает ответа
                          </span>
                        </div>

                        {currentQuote && (
                          <div className="bg-white/10 rounded-2xl p-4 mb-4 backdrop-blur">
                            {/* Детализация услуг */}
                            <div className="space-y-2 mb-4">
                              {currentQuote.truckPricePerTrip > 0 && (
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                  <div className="flex items-center gap-2">
                                    <span>🚛</span>
                                    <div>
                                      <div className="text-sm font-bold">Самосвал</div>
                                      <div className="text-[9px] text-blue-200">{formatPrice(currentQuote.truckPricePerTrip)}/рейс × {order.plannedTrips || 0} рейсов</div>
                                    </div>
                                  </div>
                                  <span className="font-black">{formatPrice((currentQuote.truckPricePerTrip || 0) * (order.plannedTrips || 0))}</span>
                                </div>
                              )}
                              {currentQuote.loaderPricePerShift > 0 && (
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                  <div className="flex items-center gap-2">
                                    <span>🚜</span>
                                    <div>
                                      <div className="text-sm font-bold">Погрузчик</div>
                                      <div className="text-[9px] text-blue-200">{formatPrice(currentQuote.loaderPricePerShift)}/смена</div>
                                    </div>
                                  </div>
                                  <span className="font-black">{formatPrice(currentQuote.loaderPricePerShift)}</span>
                                </div>
                              )}
                              {(currentQuote.deliveryCharge || 0) > 0 && (
                                <div className="flex justify-between items-center py-2 border-b border-white/10 text-[11px]">
                                  <span className="text-blue-200">🚚 Подача техники</span>
                                  <span className="font-bold">{formatPrice(currentQuote.deliveryCharge || 0)}</span>
                                </div>
                              )}
                              {(currentQuote.minimalCharge || 0) > 0 && (
                                <div className="flex justify-between items-center py-2 border-b border-white/10 text-[11px]">
                                  <span className="text-blue-200">📋 Минимальный заказ</span>
                                  <span className="font-bold">{formatPrice(currentQuote.minimalCharge || 0)}</span>
                                </div>
                              )}
                            </div>

                            {/* Итого */}
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-sm uppercase font-bold">Итого к оплате:</span>
                              <span className="text-2xl font-black">{formatPrice(currentQuote.estimatedTotal)}</span>
                            </div>

                            {currentQuote.notes && (
                              <div className="mt-3 pt-3 border-t border-white/20 text-[10px] text-blue-100">
                                <span className="font-bold">Примечание:</span> {currentQuote.notes}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleConfirmOrder(order.id)}
                            className="flex-1 bg-white text-slate-900 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
                          >
                            ✅ Подтвердить условия
                          </button>
                          <button
                            onClick={() => handleConfirmOrder(order.id, true)}
                            className="bg-orange-500 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-orange-400 transition-all"
                          >
                            🚀 СРОЧНО
                          </button>
                        </div>

                        <p className="text-[9px] text-blue-200 text-center mt-3 opacity-70">
                          Нажимая "Подтвердить", вы соглашаетесь с условиями оказания услуг
                        </p>
                      </div>
                    )}

                    {/* Галерея фото рейсов (если есть) */}
                    {(order.evidences || []).length > 0 && !needsConfirmation && (
                      <div className="p-4 bg-white/[0.02] border-b border-white/5">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Фото рейсов ({(order.evidences || []).length})
                          </span>
                          <button
                            onClick={() => downloadPhotos(order)}
                            className="text-[9px] font-bold text-blue-400 hover:text-blue-300"
                          >
                            Скачать все →
                          </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          {(order.evidences || []).slice(0, 8).map((ev, i) => (
                            <div key={ev.id} className="relative shrink-0 group">
                              <img
                                src={ev.photos?.[0]?.url || ''}
                                alt={`Рейс ${i + 1}`}
                                className="w-20 h-20 object-cover rounded-xl border border-white/10"
                              />
                              <div className={`absolute bottom-0 left-0 right-0 text-center text-[7px] font-bold py-0.5 rounded-b-xl ${
                                ev.confirmed ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                              }`}>
                                #{ev.tripNumber || i + 1}
                              </div>
                            </div>
                          ))}
                          {(order.evidences || []).length > 8 && (
                            <div className="w-20 h-20 bg-white/5 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                              +{(order.evidences || []).length - 8}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Инфо-блоки */}
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Рейсов</div>
                        <div className="text-2xl font-black">
                          {order.actualTrips || 0} <span className="text-sm text-slate-500">/ {order.plannedTrips}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Техника</div>
                        <div className="flex gap-2">
                          {order.assetRequirements.map((req, i) => (
                            <span key={i} className="text-lg">{req.type === AssetType.LOADER ? '🚜' : '🚛'}</span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Менеджер</div>
                        <div className="text-sm font-black">{order.managerName || 'Назначается'}</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Сумма</div>
                        <div className="text-xl font-black text-green-400">{formatPrice(totals.grandTotal)}</div>
                      </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-col md:flex-row gap-3">
                      {/* Блок документов после подтверждения клиента */}
                      {[OrderStatus.CONFIRMED_BY_CUSTOMER, OrderStatus.SEARCHING_EQUIPMENT, OrderStatus.EQUIPMENT_APPROVED, OrderStatus.EN_ROUTE, OrderStatus.IN_PROGRESS, OrderStatus.EXPORT_COMPLETED, OrderStatus.REPORT_READY, OrderStatus.COMPLETED].includes(order.status as OrderStatus) && (
                        <div className="flex-1 flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => generateReport(order, 'invoice')}
                            className="flex-1 bg-green-600/20 text-green-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-green-500/40 hover:bg-green-500 hover:text-white transition-all"
                          >
                            💾 Скачать счёт
                          </button>
                          <button
                            type="button"
                            onClick={() => generateReport(order, 'contract')}
                            className="flex-1 bg-emerald-600/15 text-emerald-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-emerald-500/40 hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            📄 Скачать договор
                          </button>
                          <label className="flex-1 cursor-pointer bg-blue-600/15 text-blue-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-blue-500/40 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={e => handleUploadPayment(order.id, e.target.files?.[0] || null)}
                            />
                            {order.paymentReceiptUrl ? '✅ Платёжка загружена' : '⬆ Загрузить платёжку'}
                          </label>
                        </div>
                      )}

                      <div className="flex-1 flex gap-3">
                        <a href={`tel:+70000000000`} className="flex-1 bg-white/10 text-white text-center py-3 rounded-xl text-[10px] font-black uppercase hover:bg-white/20 transition-all">
                          📞 Позвонить
                        </a>
                        <button className="flex-1 bg-blue-600/20 text-blue-400 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all">
                          💬 Написать
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === ФОРМА НОВОГО ЗАКАЗА === */}
        {view === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Колонка 1: Адрес */}
              <div className="bg-[#12192c]/60 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                  📍 <span className="text-white opacity-80">Адрес объекта</span>
                </h3>
                <input
                  required
                  type="text"
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-lg font-black outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 mb-4"
                  placeholder="Улица, дом"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
                <input
                  type="datetime-local"
                  required
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                  value={formData.scheduledTime}
                  onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </div>

              {/* Колонка 2: Техника */}
              <div className="bg-[#12192c]/60 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-400 mb-6 flex items-center gap-2">
                  🚛 <span className="text-white opacity-80">Техника</span>
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Самосвалы', type: AssetType.TRUCK, icon: '🚛' },
                    { label: 'Погрузчик', type: AssetType.LOADER, icon: '🚜' },
                    { label: 'Мини-погрузчик', type: AssetType.MINI_LOADER, icon: '🚜' }
                  ].map((item) => (
                    <label key={item.label} className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl hover:bg-white/5 transition-all">
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={formData.assetRequirements?.some(r => r.type === item.type)} 
                        onChange={() => toggleAssetType(item.type)} 
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                        formData.assetRequirements?.some(r => r.type === item.type) 
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-transparent border-white/20'
                      }`}>
                        {formData.assetRequirements?.some(r => r.type === item.type) && <span className="text-xs">✓</span>}
                      </div>
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-white/5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Ограничения</label>
                  <div className="space-y-2">
                    {[
                      { label: 'Ограничение высоты', field: 'hasHeightLimit', icon: '↕️' },
                      { label: 'Узкий въезд', field: 'hasNarrowEntrance', icon: '↔️' },
                      { label: 'Пропускной режим', field: 'hasPermitRegime', icon: '🎫' },
                      { label: 'Ночью нельзя', field: 'isNightWorkProhibited', icon: '🌙' }
                    ].map((item) => (
                      <label key={item.label} className="flex items-center gap-3 cursor-pointer text-[11px]">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded bg-white/10 border-white/20" 
                          checked={(formData.restrictions as any)?.[item.field] || false} 
                          onChange={(e) => updateRestriction(item.field as any, e.target.checked)} 
                        />
                        <span>{item.icon}</span>
                        <span className="text-slate-400">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Колонка 3: Контакты */}
              <div className="bg-[#12192c]/60 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md flex flex-col">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-green-400 mb-6 flex items-center gap-2">
                  👤 <span className="text-white opacity-80">Контакты</span>
                </h3>
                
                <div className="space-y-4 flex-1">
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700" 
                    placeholder="Ваше имя" 
                    value={formData.contactInfo?.name} 
                    onChange={e => updateContact('name', e.target.value)} 
                  />
                  <input 
                    required 
                    type="tel" 
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700" 
                    placeholder="+7 (___) ___-__-__" 
                    value={formData.contactInfo?.phone} 
                    onChange={e => updateContact('phone', e.target.value)} 
                  />
                  <input 
                    type="email" 
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700" 
                    placeholder="Email (необязательно)" 
                    value={formData.contactInfo?.email} 
                    onChange={e => updateContact('email', e.target.value)} 
                  />
                  
                  <div className="pt-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
                      Примерный объём (рейсов)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 20, 50].map(v => (
                        <button 
                          key={v} 
                          type="button" 
                          onClick={() => setFormData({ ...formData, plannedTrips: v })} 
                          className={`py-3 rounded-xl font-bold text-sm border transition-all ${
                            formData.plannedTrips === v 
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                              : 'bg-[#0a0f1d] border-white/10 text-slate-500 hover:text-white'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea 
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-sm focus:border-blue-500 outline-none placeholder:text-slate-700 transition-all flex-1 min-h-[80px]" 
                    placeholder="Комментарий (проезд, особенности)" 
                    value={formData.restrictions?.comment} 
                    onChange={(e) => updateRestriction('comment', e.target.value)} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-2xl border-b-4 border-blue-800 transition-all active:scale-[0.98] mt-6"
                >
                  📤 Отправить заявку
                </button>
              </div>
            </div>
          </form>
        )}

        {/* === ИСТОРИЯ ЗАКАЗОВ === */}
        {view === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            {completedOrders.length === 0 ? (
              <div className="text-center py-24 bg-[#12192c]/40 rounded-[3rem] border border-white/5 border-dashed">
                <div className="text-6xl mb-6 opacity-20">📜</div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">История пуста</p>
              </div>
            ) : (
              completedOrders.map(order => {
                const totals = calculateOrderTotals(order);
                
                return (
                  <div key={order.id} className="bg-[#12192c] p-6 rounded-[2rem] border border-white/5 shadow-2xl">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-black text-green-400 bg-green-500/10 px-3 py-1 rounded-full uppercase">
                            ✓ Выполнено
                          </span>
                          <span className="text-[9px] font-black text-slate-500">
                            #{order.orderNumber || order.id.slice(0, 8)}
                          </span>
                        </div>
                        <h4 className="text-2xl font-black tracking-tight uppercase">{order.address}</h4>
                        <p className="text-[10px] text-slate-500 mt-1">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-green-400">{formatPrice(totals.grandTotal)}</div>
                        <div className="text-[9px] text-slate-500">{totals.totalTrips} рейсов</div>
                      </div>
                    </div>

                    {/* Закрывающие документы - улучшенная версия */}
                    <div className="mb-6">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                        Закрывающие документы
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <button
                          onClick={() => generateReport(order, 'act')}
                          disabled={!!isProcessingDoc}
                          className="bg-white/5 hover:bg-green-500/20 hover:border-green-500/30 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                        >
                          <span className="text-2xl block mb-1">📄</span>
                          <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'act' ? 'Генерация...' : 'Акт'}</span>
                        </button>
                        <button
                          onClick={() => generateReport(order, 'invoice')}
                          disabled={!!isProcessingDoc}
                          className="bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/30 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                        >
                          <span className="text-2xl block mb-1">🧾</span>
                          <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'invoice' ? 'Генерация...' : 'Счёт'}</span>
                        </button>
                        <button
                          onClick={() => generateReport(order, 'upd')}
                          disabled={!!isProcessingDoc}
                          className="bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/30 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                        >
                          <span className="text-2xl block mb-1">📋</span>
                          <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'upd' ? 'Генерация...' : 'УПД'}</span>
                        </button>
                        <button
                          onClick={() => generateReport(order, 'full')}
                          disabled={!!isProcessingDoc}
                          className="bg-white/5 hover:bg-orange-500/20 hover:border-orange-500/30 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                        >
                          <span className="text-2xl block mb-1">📊</span>
                          <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'full' ? 'Генерация...' : 'Отчёт'}</span>
                        </button>
                        <button
                          onClick={() => downloadPhotos(order)}
                          disabled={!!isProcessingDoc}
                          className="bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/30 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50 relative"
                        >
                          <span className="text-2xl block mb-1">📸</span>
                          <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'photos' ? 'Сборка...' : 'Фото'}</span>
                          {(order.evidences || []).length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[8px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                              {(order.evidences || []).length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Поделиться */}
                    <div className="flex gap-3 mb-6">
                      <button 
                        onClick={() => shareToMessenger(order, 'telegram')}
                        className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        ✈️ Telegram
                      </button>
                      <button 
                        onClick={() => shareToMessenger(order, 'whatsapp')}
                        className="flex-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        💬 WhatsApp
                      </button>
                      <button 
                        onClick={() => shareToMessenger(order, 'email')}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        ✉️ Email
                      </button>
                    </div>

                    {/* Обратная связь */}
                    <div className="flex gap-3 pt-4 border-t border-white/5">
                      {order.feedback ? (
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className={`text-lg ${star <= order.feedback!.rating ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-500">Спасибо за отзыв!</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setSelectedOrderId(order.id); setShowFeedbackModal(true); }}
                          className="flex-1 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all"
                        >
                          ⭐ Оставить отзыв
                        </button>
                      )}
                      <button 
                        onClick={() => repeatOrder(order)}
                        className="bg-white/5 hover:bg-blue-600 text-slate-400 hover:text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all"
                      >
                        🔄 Повторить
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Модалка обратной связи */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#12192c] rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/10">
            <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-center">⭐ Оцените работу</h3>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setFeedbackRating(star)}
                  className={`text-4xl transition-all hover:scale-110 ${star <= feedbackRating ? 'text-yellow-400' : 'text-slate-700'}`}
                >
                  ★
                </button>
              ))}
            </div>
            
            <textarea 
              className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-sm focus:border-blue-500 outline-none mb-6 min-h-[100px]"
              placeholder="Ваш комментарий (необязательно)"
              value={feedbackComment}
              onChange={e => setFeedbackComment(e.target.value)}
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 bg-white/10 text-white py-4 rounded-xl text-[11px] font-black uppercase"
              >
                Отмена
              </button>
              <button 
                onClick={submitFeedback}
                className="flex-1 bg-blue-600 text-white py-4 rounded-xl text-[11px] font-black uppercase"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
