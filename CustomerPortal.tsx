import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import JSZip from 'jszip';
const fontBundle: any = (pdfFonts as any).pdfMake?.vfs
  ? (pdfFonts as any).pdfMake
  : (pdfFonts as any).default?.pdfMake;
if (fontBundle?.vfs) {
  (pdfMake as any).vfs = fontBundle.vfs;
}
import { Order, OrderStatus, AssetType, AssetRequirement, OrderRestrictions, CustomerContact, Customer, Message, CompanySettings, formatPrice, formatDateTime, generateId, generateOrderNumber, PriceUnit, DateRange, isOrderInDateRange, getOrderStatusLabel, normalizeOrderStatus, calculateOrderTotals, getUnitsForRequirement, getTripCounts, isTruckType, isLoaderType, toLocalDateTimeInputValue } from './types';
import AddressInput from './AddressInput';

interface CustomerPortalProps {
  orders: Order[];
  customers: Customer[];
  companySettings: CompanySettings | null;
  onAddOrder: (order: Partial<Order>) => void;
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ orders, customers, companySettings, onAddOrder, onUpdateOrder }) => {
  const [view, setView] = useState<'active' | 'form' | 'history' | 'order-detail'>('active');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isProcessingDoc, setIsProcessingDoc] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [quotePreviewOrder, setQuotePreviewOrder] = useState<Order | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [accountantChatModal, setAccountantChatModal] = useState<{ isOpen: boolean; order: Order | null; message: string }>({
    isOpen: false,
    order: null,
    message: '',
  });
  const [managerChatModal, setManagerChatModal] = useState<{ isOpen: boolean; order: Order | null; message: string }>({
    isOpen: false,
    order: null,
    message: '',
  });
  const managerChatRef = useRef<HTMLDivElement>(null);
  const accountantChatRef = useRef<HTMLDivElement>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('snow_customer_phone') || '');
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('snow_customer_name') || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => localStorage.getItem('snow_customer_id') || '');

  useEffect(() => {
    if (selectedCustomerId || customers.length === 0) return;
    const byPhone = customers.find(c => c.phone === customerPhone);
    setSelectedCustomerId(byPhone?.id || customers[0].id);
  }, [customers, selectedCustomerId, customerPhone]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    const selected = customers.find(c => c.id === selectedCustomerId);
    if (!selected) return;
    setCustomerName(selected.name);
    setCustomerPhone(selected.phone);
    localStorage.setItem('snow_customer_id', selected.id);
    localStorage.setItem('snow_customer_name', selected.name);
    localStorage.setItem('snow_customer_phone', selected.phone);
  }, [selectedCustomerId, customers]);

  // Фильтрация заказов по телефону клиента
  const myOrders = useMemo(() => {
    if (!customerPhone && !selectedCustomerId) return [];
    return orders.filter(o =>
      (selectedCustomerId && o.customerId === selectedCustomerId) ||
      (!selectedCustomerId && o.contactInfo?.phone === customerPhone)
    );
  }, [orders, customerPhone, selectedCustomerId]);

  const activeOrders = useMemo(() => {
    return myOrders.filter(o =>
      ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(o.status)
    );
  }, [myOrders]);

  const completedOrders = useMemo(() => {
    return myOrders.filter(o =>
      o.status === OrderStatus.COMPLETED
    );
  }, [myOrders]);

  const dateRange = useMemo<DateRange>(() => ({
    from: dateFrom || undefined,
    to: dateTo || undefined
  }), [dateFrom, dateTo]);

  const filteredActiveOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    const filtered = term
      ? activeOrders.filter(o =>
          o.address.toLowerCase().includes(term) ||
          (o.orderNumber || '').toLowerCase().includes(term)
        )
      : activeOrders;
    return filtered.filter(o => isOrderInDateRange(o, dateRange));
  }, [activeOrders, orderSearch, dateRange]);

  const filteredCompletedOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    const filtered = term
      ? completedOrders.filter(o =>
          o.address.toLowerCase().includes(term) ||
          (o.orderNumber || '').toLowerCase().includes(term)
        )
      : completedOrders;
    return filtered.filter(o => isOrderInDateRange(o, dateRange));
  }, [completedOrders, orderSearch, dateRange]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Данные компании для документов (из настроек или значения по умолчанию)
  const companyData = useMemo(() => {
    if (companySettings) {
      return {
        name: companySettings.name || 'Транском',
        fullName: companySettings.fullName || 'ООО "Транском"',
        inn: companySettings.inn || '',
        kpp: companySettings.kpp || '',
        ogrn: companySettings.ogrn || '',
        legalAddress: companySettings.legalAddress || '',
        bankName: companySettings.bankName || '',
        bankAccount: companySettings.bankAccount || '',
        corrAccount: companySettings.corrAccount || '',
        bik: companySettings.bik || '',
        directorName: companySettings.directorName || '',
        directorPosition: companySettings.directorPosition || 'Генеральный директор',
        phone: companySettings.phone || '',
        email: companySettings.email || '',
      };
    }
    // Значения по умолчанию (Транском)
    return {
      name: 'Транском',
      fullName: 'ООО "Транском"',
      inn: '5001098904',
      kpp: '500101001',
      ogrn: '1145001001530',
      legalAddress: 'Московская область, г. Балашиха',
      bankName: 'Московский филиал ПАО «Промсвязьбанк»',
      bankAccount: '40702810900000035482',
      corrAccount: '30101810400000000555',
      bik: '044525555',
      directorName: 'Терехов Сергей Юрьевич',
      directorPosition: 'Генеральный директор',
      phone: '8-915-019-59-41',
      email: 'Spezavtoteh@gmail.com',
    };
  }, [companySettings]);

  // Расчёт итогов по заказу
  const getConfirmedEvidences = useCallback((order: Order) => {
    return (order.evidences || []).filter(e => e.confirmed);
  }, []);

  const getCustomerEvidences = useCallback((order: Order) => {
    const isFinished = order.status === OrderStatus.COMPLETED;
    return isFinished ? getConfirmedEvidences(order) : (order.evidences || []);
  }, [getConfirmedEvidences]);

  // Для клиента: во время работы показываем ВСЕ рейсы, после завершения — только подтверждённые
  const getCustomerTripsCount = useCallback((order: Order) => {
    const isFinished = order.status === OrderStatus.COMPLETED;
    if (isFinished) {
      // После завершения — только подтверждённые (как у менеджера)
      return getConfirmedEvidences(order).length;
    }
    // Во время работы — все рейсы
    return (order.evidences || []).length;
  }, [getConfirmedEvidences]);

  const calculateOrderTotalsLocal = useCallback((order: Order) => {
    const totals = calculateOrderTotals(order, { mode: 'actual_or_planned', includeCharges: true });
    const plannedTotals = calculateOrderTotals(order, { mode: 'planned', includeCharges: true });
    const actualTotals = calculateOrderTotals(order, { mode: 'actual', includeCharges: true });
    let totalTruckCost = 0;
    let totalLoaderCost = 0;
    (order.assetRequirements || []).forEach(req => {
      const units = getUnitsForRequirement(order, req, { mode: 'actual_or_planned' });
      if (isTruckType(req.type)) {
        totalTruckCost += units * (req.customerPrice || 0);
      } else if (isLoaderType(req.type)) {
        totalLoaderCost += units * (req.customerPrice || 0);
      }
    });
    const tripCounts = getTripCounts(order);
    const totalTrips = order.status === OrderStatus.COMPLETED
      ? tripCounts.confirmed
      : (tripCounts.actual > 0 ? tripCounts.actual : tripCounts.planned);
    return {
      totalTrips,
      totalTruckCost,
      totalLoaderCost,
      grandTotal: totals.customerTotal,
      plannedTotal: plannedTotals.customerTotal,
      actualTotal: actualTotals.customerTotal
    };
  }, []);

  const getAccountantThread = useCallback((order: Order) => {
    return (order.messages || [])
      .filter(msg =>
        (msg.fromRole === 'accountant' && (!msg.toRole || msg.toRole === 'customer')) ||
        (msg.fromRole === 'customer' && (!msg.toRole || msg.toRole === 'accountant'))
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, []);

  const openAccountantChat = useCallback((order: Order) => {
    setAccountantChatModal({ isOpen: true, order, message: '' });
    const updatedMessages = (order.messages || []).map(msg => {
      const shouldMarkRead =
        msg.fromRole === 'accountant' &&
        (!msg.toRole || msg.toRole === 'customer') &&
        !msg.isRead;
      return shouldMarkRead ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg;
    });
    const changed = (order.messages || []).some((msg, idx) => msg !== updatedMessages[idx]);
    if (changed) {
      const unreadCount = updatedMessages.filter(m => !m.isRead).length;
      onUpdateOrder(order.id, { messages: updatedMessages, unreadMessages: unreadCount });
    }
  }, [onUpdateOrder]);

  const sendAccountantMessage = useCallback(() => {
    if (!accountantChatModal.order || !accountantChatModal.message.trim()) return;
    const order = accountantChatModal.order;
    const message: Message = {
      id: generateId(),
      orderId: order.id,
      fromRole: 'customer',
      fromName: customerName || order.contactInfo?.name || 'Клиент',
      fromId: selectedCustomerId || order.customerId,
      toRole: 'accountant',
      text: accountantChatModal.message.trim(),
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    onUpdateOrder(order.id, {
      messages: [...(order.messages || []), message],
      unreadMessages: (order.unreadMessages || 0) + 1,
    });
    setAccountantChatModal(prev => ({ ...prev, message: '' }));
  }, [accountantChatModal, customerName, selectedCustomerId, onUpdateOrder]);

  const chatOrder = accountantChatModal.order;
  const chatMessages = chatOrder ? getAccountantThread(chatOrder) : [];

  // Функции для чата с менеджером
  const getManagerThread = useCallback((order: Order) => {
    return (order.messages || [])
      .filter(msg =>
        (msg.fromRole === 'dispatcher' && (!msg.toRole || msg.toRole === 'customer')) ||
        (msg.fromRole === 'customer' && (!msg.toRole || msg.toRole === 'dispatcher'))
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, []);

  const openManagerChat = useCallback((order: Order) => {
    setManagerChatModal({ isOpen: true, order, message: '' });
    const updatedMessages = (order.messages || []).map(msg => {
      const shouldMarkRead =
        msg.fromRole === 'dispatcher' &&
        (!msg.toRole || msg.toRole === 'customer') &&
        !msg.isRead;
      return shouldMarkRead ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg;
    });
    const changed = (order.messages || []).some((msg, idx) => msg !== updatedMessages[idx]);
    if (changed) {
      const unreadCount = updatedMessages.filter(m => !m.isRead).length;
      onUpdateOrder(order.id, { messages: updatedMessages, unreadMessages: unreadCount });
    }
  }, [onUpdateOrder]);

  const sendManagerMessage = useCallback(() => {
    if (!managerChatModal.order || !managerChatModal.message.trim()) return;
    const order = managerChatModal.order;
    const message: Message = {
      id: generateId(),
      orderId: order.id,
      fromRole: 'customer',
      fromName: customerName || order.contactInfo?.name || 'Клиент',
      fromId: selectedCustomerId || order.customerId,
      toRole: 'dispatcher',
      text: managerChatModal.message.trim(),
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    onUpdateOrder(order.id, {
      messages: [...(order.messages || []), message],
      unreadMessages: (order.unreadMessages || 0) + 1,
    });
    setManagerChatModal(prev => ({ ...prev, message: '' }));
  }, [managerChatModal, customerName, selectedCustomerId, onUpdateOrder]);

  const managerChatOrder = managerChatModal.order;
  const managerChatMessages = managerChatOrder ? getManagerThread(managerChatOrder) : [];

  // Авто-скролл к последнему сообщению в чате с менеджером
  useEffect(() => {
    if (managerChatModal.isOpen && managerChatRef.current) {
      managerChatRef.current.scrollTop = managerChatRef.current.scrollHeight;
    }
  }, [managerChatModal.isOpen, managerChatMessages.length]);

  // Авто-скролл к последнему сообщению в чате с бухгалтером
  useEffect(() => {
    if (accountantChatModal.isOpen && accountantChatRef.current) {
      accountantChatRef.current.scrollTop = accountantChatRef.current.scrollHeight;
    }
  }, [accountantChatModal.isOpen]);

  const buildQuotePreviewData = useCallback((order: Order) => {
    const orderCustomer = customers.find(c => c.id === order.customerId) || customers.find(c => c.phone === order.contactInfo?.phone);
    const vatRate = 0.22;
    const quote = order.currentQuote;

    const items: { label: string; units: number; unitLabel: string; unitPrice: number; total: number }[] = [];
    let subtotal = 0;

    order.assetRequirements.forEach(req => {
      const unitPrice = isTruckType(req.type)
        ? (quote?.truckPricePerTrip ?? req.customerPrice ?? 0)
        : isLoaderType(req.type)
        ? (quote?.loaderPricePerShift ?? req.customerPrice ?? 0)
        : (req.customerPrice ?? 0);
      const units = getUnitsForRequirement(order, req, { mode: 'planned' });
      const unitLabel = req.priceUnit === PriceUnit.PER_HOUR
        ? 'час'
        : req.priceUnit === PriceUnit.PER_SHIFT
        ? 'смена'
        : 'рейс';
      const total = unitPrice * units;
      subtotal += total;
      items.push({ label: req.type, units, unitLabel, unitPrice, total });
    });

    if (quote?.minimalCharge) {
      subtotal += quote.minimalCharge;
      items.push({ label: 'Минималка', units: 1, unitLabel: 'услуга', unitPrice: quote.minimalCharge, total: quote.minimalCharge });
    }
    if (quote?.deliveryCharge) {
      subtotal += quote.deliveryCharge;
      items.push({ label: 'Подача', units: 1, unitLabel: 'услуга', unitPrice: quote.deliveryCharge, total: quote.deliveryCharge });
    }

    const vat = vatRate > 0 ? subtotal * (vatRate / (1 + vatRate)) : 0;
    const total = subtotal;

    return {
      orderCustomer,
      vatRate,
      items,
      subtotal,
      vat,
      total,
      notes: quote?.notes || '',
      vatIncluded: true
    };
  }, [customers]);

  const getCustomerRequisites = useCallback((order: Order) => {
    const orderCustomer = customers.find(c => c.id === order.customerId) || customers.find(c => c.phone === order.contactInfo?.phone);
    return {
      name: order.contactInfo?.companyName || orderCustomer?.name || order.customer || 'Клиент',
      inn: order.contactInfo?.inn || orderCustomer?.inn || '',
      phone: order.contactInfo?.phone || orderCustomer?.phone || '',
      email: order.contactInfo?.email || orderCustomer?.email || '',
      address: orderCustomer?.address || order.address || ''
    };
  }, [customers]);

  const buildInvoicePdf = useCallback((order: Order) => {
    const quoteData = buildQuotePreviewData(order);
    const requisites = getCustomerRequisites(order);
    const issueDate = new Date().toLocaleDateString('ru-RU');
    const tableBody = [
      ['№', 'Наименование', 'Кол-во', 'Цена', 'Сумма'],
      ...quoteData.items.map((item, idx) => ([
        String(idx + 1),
        item.label,
        `${item.units} ${item.unitLabel}`,
        formatPrice(item.unitPrice),
        formatPrice(item.total)
      ]))
    ];

    const docDefinition = {
      content: [
        { text: 'СЧЁТ НА ОПЛАТУ', style: 'header', alignment: 'center' },
        { text: `№ ${order.orderNumber || ''} от ${issueDate}`, style: 'subheader', alignment: 'center', margin: [0, 4, 0, 8] },
        // Реквизиты поставщика (из настроек компании)
        { text: `Поставщик: ${companyData.fullName}`, style: 'bold', margin: [0, 8, 0, 0] },
        { text: `ИНН ${companyData.inn} / КПП ${companyData.kpp}`, margin: [0, 2, 0, 0] },
        { text: `Адрес: ${companyData.legalAddress}`, margin: [0, 2, 0, 0] },
        { text: `Банк: ${companyData.bankName}`, margin: [0, 2, 0, 0] },
        { text: `Р/с: ${companyData.bankAccount}  БИК: ${companyData.bik}`, margin: [0, 2, 0, 0] },
        { text: `К/с: ${companyData.corrAccount}`, margin: [0, 2, 0, 8] },
        // Реквизиты покупателя
        { text: `Покупатель: ${requisites.name}`, style: 'bold', margin: [0, 4, 0, 0] },
        requisites.inn ? { text: `ИНН: ${requisites.inn}`, margin: [0, 2, 0, 0] } : null,
        requisites.phone ? { text: `Телефон: ${requisites.phone}`, margin: [0, 2, 0, 0] } : null,
        requisites.email ? { text: `Email: ${requisites.email}`, margin: [0, 2, 0, 0] } : null,
        requisites.address ? { text: `Адрес: ${requisites.address}`, margin: [0, 2, 0, 6] } : null,
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: tableBody
          },
          layout: 'lightHorizontalLines'
        },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              table: {
                body: [
                  ['Подытог (с НДС)', formatPrice(quoteData.total)],
                  [`НДС ${(quoteData.vatRate * 100).toFixed(0)}% (в т.ч.)`, formatPrice(quoteData.vat)],
                  ['Итого', formatPrice(quoteData.total)]
                ]
              },
              layout: 'noBorders',
              margin: [0, 6, 0, 0]
            }
          ]
        },
        quoteData.notes ? { text: `Комментарий: ${quoteData.notes}`, margin: [0, 8, 0, 0] } : null,
        // Подпись
        { text: `${companyData.directorPosition}: _______________ / ${companyData.directorName} /`, margin: [0, 30, 0, 0] },
      ].filter(Boolean),
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      styles: {
        header: { fontSize: 16, bold: true },
        subheader: { fontSize: 12, bold: true },
        bold: { bold: true }
      }
    };

    pdfMake.createPdf(docDefinition as any).download(`${companyData.name}_Счет_${order.orderNumber || 'заказ'}.pdf`);
  }, [buildQuotePreviewData, getCustomerRequisites, companyData]);

  const buildContractPdf = useCallback((order: Order) => {
    const quoteData = buildQuotePreviewData(order);
    const requisites = getCustomerRequisites(order);
    const issueDate = new Date().toLocaleDateString('ru-RU');

    const docDefinition = {
      content: [
        { text: 'ДОГОВОР НА ОКАЗАНИЕ УСЛУГ', style: 'header', alignment: 'center' },
        { text: `№ ${order.orderNumber || ''} от ${issueDate}`, alignment: 'center', margin: [0, 4, 0, 12] },
        // Данные исполнителя (из настроек компании)
        { text: `Исполнитель: ${companyData.fullName}`, style: 'bold', margin: [0, 6, 0, 0] },
        { text: `ИНН ${companyData.inn} / КПП ${companyData.kpp}, ОГРН ${companyData.ogrn}`, margin: [0, 2, 0, 0] },
        { text: `Адрес: ${companyData.legalAddress}`, margin: [0, 2, 0, 0] },
        { text: `Телефон: ${companyData.phone}, Email: ${companyData.email}`, margin: [0, 2, 0, 0] },
        { text: `Банк: ${companyData.bankName}`, margin: [0, 2, 0, 0] },
        { text: `Р/с: ${companyData.bankAccount}, БИК: ${companyData.bik}`, margin: [0, 2, 0, 0] },
        { text: `в лице ${companyData.directorPosition} ${companyData.directorName}`, margin: [0, 2, 0, 8] },
        // Данные заказчика
        { text: `Заказчик: ${requisites.name}`, style: 'bold', margin: [0, 4, 0, 0] },
        requisites.inn ? { text: `ИНН: ${requisites.inn}`, margin: [0, 2, 0, 0] } : null,
        requisites.phone ? { text: `Телефон: ${requisites.phone}`, margin: [0, 2, 0, 0] } : null,
        requisites.email ? { text: `Email: ${requisites.email}`, margin: [0, 2, 0, 0] } : null,
        requisites.address ? { text: `Адрес: ${requisites.address}`, margin: [0, 2, 0, 8] } : null,
        { text: '1. Предмет договора', style: 'section' },
        { text: `Исполнитель обязуется оказать услуги по вывозу снега по адресу: ${order.address}.` },
        { text: '2. Стоимость и порядок расчетов', style: 'section' },
        { text: `Стоимость услуг формируется согласно коммерческому предложению и счёту. Итоговая сумма: ${formatPrice(quoteData.total)} (с НДС ${(quoteData.vatRate * 100).toFixed(0)}%).` },
        { text: '3. Сроки выполнения', style: 'section' },
        { text: `Сроки оказания услуг согласуются сторонами. Плановая дата начала работ: ${formatDateTime(order.scheduledTime).split(',')[0]}.` },
        { text: '4. Реквизиты и подписи сторон', style: 'section' },
        {
          columns: [
            {
              stack: [
                { text: 'ИСПОЛНИТЕЛЬ:', style: 'bold' },
                { text: companyData.fullName, margin: [0, 4, 0, 0] },
                { text: `ИНН ${companyData.inn}`, margin: [0, 2, 0, 0] },
                { text: `${companyData.directorPosition}`, margin: [0, 12, 0, 0] },
                { text: `_____________ / ${companyData.directorName} /`, margin: [0, 4, 0, 0] },
              ]
            },
            {
              stack: [
                { text: 'ЗАКАЗЧИК:', style: 'bold' },
                { text: requisites.name || '____________________', margin: [0, 4, 0, 0] },
                requisites.inn ? { text: `ИНН ${requisites.inn}`, margin: [0, 2, 0, 0] } : { text: '', margin: [0, 2, 0, 0] },
                { text: '', margin: [0, 12, 0, 0] },
                { text: '_____________ / ____________ /', margin: [0, 4, 0, 0] },
              ]
            }
          ]
        }
      ].filter(Boolean),
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      styles: {
        header: { fontSize: 14, bold: true },
        section: { fontSize: 11, bold: true, margin: [0, 10, 0, 4] },
        bold: { bold: true }
      }
    };

    pdfMake.createPdf(docDefinition as any).download(`${companyData.name}_Договор_${order.orderNumber || 'заказ'}.pdf`);
  }, [buildQuotePreviewData, getCustomerRequisites, companyData]);
  const buildFullReportPdf = useCallback((order: Order) => {
    const evidences = getCustomerEvidences(order);
    const totalTrips = getCustomerTripsCount(order);
    const driverLookup = new Map<string, any>();
    (order.driverDetails || []).forEach(driver => {
      if (driver?.id) driverLookup.set(driver.id, driver);
      if (driver?.driverName) driverLookup.set(driver.driverName, driver);
    });

    const getAssetLabel = (assetType?: AssetType) => {
      if (!assetType) return '—';
      return isLoaderType(assetType) ? 'Погрузчик' : 'Самосвал';
    };

    const photoTypeLabels: Record<string, string> = {
      loading: 'Погрузка',
      full_truck: 'Полный кузов',
      unloading: 'Выгрузка',
      ticket: 'Талон',
      other: 'Фото'
    };

    const tableBody = [
      ['№', 'Дата/время', 'Водитель', 'Техника', 'Госномер', 'Рейс', 'Адрес', 'Фото']
    ];

    evidences.forEach((ev, index) => {
      const driver = ev.assignmentId ? driverLookup.get(ev.assignmentId) : driverLookup.get(ev.driverName);
      const photos = ev.photos && ev.photos.length > 0 ? ev.photos : (ev.photo ? [{ type: 'other' as const }] : []);
      const photoSummary = photos.length
        ? photos.map(p => photoTypeLabels[p.type] || 'Фото').join(', ')
        : '—';
      tableBody.push([
        String(index + 1),
        formatDateTime(ev.timestamp),
        driver?.driverName || ev.driverName || '—',
        getAssetLabel(driver?.assetType),
        driver?.vehicleNumber || driver?.vehicleInfo || '—',
        `#${ev.tripNumber || index + 1}`,
        order.address || '—',
        photoSummary
      ]);
    });

    const docDefinition = {
      content: [
        { text: companyData.name.toUpperCase(), style: 'brand' },
        { text: 'Реестр выполненных рейсов', style: 'title' },
        {
          columns: [
            [
              { text: `Заказ № ${order.orderNumber || order.id}`, style: 'meta' },
              { text: `Заказчик: ${order.customer || '—'}`, style: 'meta' },
              { text: `Адрес: ${order.address || '—'}`, style: 'meta' },
              { text: `Подача: ${formatDateTime(order.scheduledTime)}`, style: 'meta' }
            ],
            [
              { text: `Статус: ${getOrderStatusLabel(order.status)}`, style: 'meta' },
              { text: `Рейсов: ${totalTrips}`, style: 'meta' },
              order.completedAt ? { text: `Завершение: ${formatDateTime(order.completedAt)}`, style: 'meta' } : { text: '' }
            ]
          ],
          columnGap: 20,
          margin: [0, 8, 0, 8]
        },
        {
          table: {
            headerRows: 1,
            widths: [18, 70, 60, 55, 55, 35, '*', 60],
            body: tableBody
          },
          layout: 'lightHorizontalLines'
        },
        { text: `${companyData.fullName}, ИНН ${companyData.inn}, тел: ${companyData.phone}`, style: 'companyFooter' },
        { text: `Сформировано: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}`, style: 'footer' }
      ],
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      styles: {
        brand: { fontSize: 18, bold: true, color: '#0f172a' },
        title: { fontSize: 12, bold: true, margin: [0, 4, 0, 6] },
        meta: { fontSize: 9, color: '#475569' },
        companyFooter: { fontSize: 8, color: '#64748b', margin: [0, 12, 0, 2] },
        footer: { fontSize: 8, color: '#94a3b8', margin: [0, 2, 0, 0] }
      }
    };

    pdfMake.createPdf(docDefinition as any).download(`${companyData.name}_реестр_${order.orderNumber || 'заказ'}.pdf`);
  }, [getCustomerEvidences, getCustomerTripsCount, companyData]);

  // Форма нового заказа
  const [formData, setFormData] = useState<Partial<Order>>({
    customer: customerName,
    customerId: selectedCustomerId || undefined,
    address: '',
    plannedTrips: 10,
    actualTrips: 0,
    scheduledTime: toLocalDateTimeInputValue(new Date(Date.now() + 3600000)),
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

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      customer: customerName,
      customerId: selectedCustomerId || prev.customerId,
      contactInfo: {
        ...(prev.contactInfo || { name: '', phone: '', email: '', companyName: '' }),
        name: customerName,
        phone: customerPhone
      }
    }));
  }, [customerName, customerPhone, selectedCustomerId]);

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
      customerId: selectedCustomerId || formData.customerId,
      orderNumber: generateOrderNumber(),
      status: OrderStatus.NEW_REQUEST,
      isBirzhaOpen: false,
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
    setShareStatus('Заявка успешно отправлена! Менеджер свяжется с вами.');
    setTimeout(() => setShareStatus(null), 5000);
  };

  // Генерация текстового отчёта / счёта / договора (симуляция PDF)
  const generateReport = useCallback(async (order: Order, type: 'act' | 'invoice' | 'full' | 'contract' | 'quote') => {
    setIsProcessingDoc(type);

    if (type === 'invoice') {
      buildInvoicePdf(order);
      setIsProcessingDoc(null);
      return;
    }
    if (type === 'contract') {
      buildContractPdf(order);
      setIsProcessingDoc(null);
      return;
    }
    if (type === 'full') {
      buildFullReportPdf(order);
      setIsProcessingDoc(null);
      return;
    }
    
    // Симуляция генерации документа
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const totals = calculateOrderTotalsLocal(order);
    const vatRate = 0.22;
    const getUnitsForReq = (req: AssetRequirement) => {
      return getUnitsForRequirement(order, req, { mode: 'actual_or_planned' });
    };
    
    // Создаём текстовый отчёт (в реальном приложении - PDF)
    const title =
      type === 'act'
        ? 'АКТ ВЫПОЛНЕННЫХ РАБОТ'
        : type === 'invoice'
        ? 'СЧЁТ НА ОПЛАТУ'
        : type === 'contract'
        ? 'ДОГОВОР НА ОКАЗАНИЕ УСЛУГ ПО ВЫВОЗУ СНЕГА'
        : type === 'quote'
        ? 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ'
        : 'ПОЛНЫЙ ОТЧЁТ';

    const quoteLines = () => {
      const lines: string[] = [];
      const quote = order.currentQuote;
      order.assetRequirements.forEach(req => {
        const units = getUnitsForRequirement(order, req, { mode: 'planned' });
        const price = isTruckType(req.type)
          ? (quote?.truckPricePerTrip ?? req.customerPrice ?? 0)
          : isLoaderType(req.type)
          ? (quote?.loaderPricePerShift ?? req.customerPrice ?? 0)
          : (req.customerPrice ?? 0);
        lines.push(`${req.type}: ${formatPrice(price)} Г— ${units} = ${formatPrice(price * units)}`);
      });
      if (quote?.minimalCharge) {
        lines.push(`Минималка: ${formatPrice(quote.minimalCharge)}`);
      }
      if (quote?.deliveryCharge) {
        lines.push(`Подача: ${formatPrice(quote.deliveryCharge)}`);
      }
      return lines.join('\n');
    };

    const quoteSubtotal = () => {
      const quote = order.currentQuote;
      let sum = 0;
      order.assetRequirements.forEach(req => {
        const units = getUnitsForRequirement(order, req, { mode: 'planned' });
        const price = isTruckType(req.type)
          ? (quote?.truckPricePerTrip ?? req.customerPrice ?? 0)
          : isLoaderType(req.type)
          ? (quote?.loaderPricePerShift ?? req.customerPrice ?? 0)
          : (req.customerPrice ?? 0);
        sum += price * units;
      });
      sum += quote?.minimalCharge || 0;
      sum += quote?.deliveryCharge || 0;
      return sum;
    };

    const reportContent = `
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
                    SNOWFORCE MOSCOW DISPATCH
                       ${title}
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

Заказ №: ${order.orderNumber || order.id}
Дата: ${new Date().toLocaleDateString('ru')}

ЗАКАЗЧИК:
  ${order.customer}
  ${order.contactInfo?.phone || ''}
  ${order.contactInfo?.email || ''}

ОБЪЕКТ:
  ${order.address}
  
ПЕРИОД РАБОТ:
  Начало: ${formatDateTime(order.scheduledTime)}
  ${order.completedAt ? `Завершение: ${formatDateTime(order.completedAt)}` : ''}

${type === 'quote' ? `в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
                         СМЕТА (КП)
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

${quoteLines()}

-----------------------------------------------------------
ПОДЫТОГ (с НДС): ${formatPrice(quoteSubtotal())}
${vatRate > 0 ? `НДС 22% (в т.ч.): ${formatPrice(quoteSubtotal() * (vatRate / (1 + vatRate)))}` : 'НДС: без НДС'}
ИТОГО: ${formatPrice(quoteSubtotal())}
` : `в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
                         ИТОГИ РАБОТ
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

Выполнено рейсов: ${totals.totalTrips}
${order.assetRequirements.map(req => {
  const units = getUnitsForReq(req);
  return `${req.type}: ${formatPrice(req.customerPrice || 0)} Г— ${units} = ${formatPrice((req.customerPrice || 0) * units)}`;
}).join('\n')}

-----------------------------------------------------------
ИТОГО К ОПЛАТЕ: ${formatPrice(totals.grandTotal)}` }
-----------------------------------------------------------

${type === 'full' ? `
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
                       РЕЕСТР РЕЙСОВ
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
${confirmedEvidences.map((ev, i) => 
  `${i + 1}. ${formatDateTime(ev.timestamp)} - ${ev.driverName} ${ev.confirmed ? 'Подтверждён' : 'На проверке'}`
).join('\n')}
` : ''}

в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
           Документ сформирован автоматически
              SnowForce Moscow Dispatch В© 2025
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
    `;

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
    setShareStatus(`Документ "${type}" успешно сформирован и загружен.`);
    setTimeout(() => setShareStatus(null), 3000);
  }, [buildContractPdf, buildInvoicePdf, buildFullReportPdf, calculateOrderTotalsLocal]);

  // Скачивание архива фото
  const downloadPhotos = useCallback(async (order: Order) => {
    setIsProcessingDoc('photos');

    try {
      const evidences = getConfirmedEvidences(order);
      const photos = evidences.flatMap((ev, evIndex) => {
        const list = ev.photos && ev.photos.length > 0
          ? ev.photos
          : (ev.photo ? [{ url: ev.photo, type: 'other' as const, timestamp: ev.timestamp }] : []);
        return list.map((photo, idx) => ({
          url: photo.url,
          type: photo.type,
          tripNumber: ev.tripNumber || evIndex + 1,
          index: idx + 1
        }));
      });

      if (photos.length === 0) {
        setShareStatus('Нет фото для выгрузки.');
        setTimeout(() => setShareStatus(null), 3000);
        return;
      }

      const zip = new JSZip();
      let added = 0;

      for (const photo of photos) {
        if (!photo.url) continue;
        try {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          const type = (blob.type || '').toLowerCase();
          const ext = type.includes('png') ? 'png' : type.includes('jpeg') ? 'jpg' : 'jpg';
          const fileName = `trip_${String(photo.tripNumber).padStart(3, '0')}_${photo.type}_${photo.index}.${ext}`;
          zip.file(fileName, blob);
          added += 1;
        } catch {
          // пропускаем ошибки загрузки отдельных файлов
        }
      }

      if (added === 0) {
        setShareStatus('Не удалось собрать фото для выгрузки.');
        setTimeout(() => setShareStatus(null), 3000);
        return;
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transkom_photos_${order.orderNumber || order.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShareStatus(`Фотоархив (${added} файлов) скачан.`);
      setTimeout(() => setShareStatus(null), 4000);
    } finally {
      setIsProcessingDoc(null);
    }
  }, [getConfirmedEvidences]);

  // Отправка в мессенджеры
  const shareToMessenger = useCallback((order: Order, channel: 'telegram' | 'whatsapp' | 'email') => {
    const totals = calculateOrderTotalsLocal(order);
    const statusLabel = getOrderStatusLabel(order.status);
    const message = encodeURIComponent(
      `Отчёт ${companyData.name}\n\n` +
      `Статус: ${statusLabel}\n` +
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
      window.open(`mailto:?subject=Отчёт ${companyData.name} ${order.orderNumber}&body=${message}`, '_blank');
    }
  }, [buildContractPdf, buildInvoicePdf, calculateOrderTotalsLocal, companyData]);

  const downloadAttachment = useCallback((attachment: { url: string; name?: string }) => {
    if (!attachment?.url) return;
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name || 'document';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const downloadClosingDocs = useCallback(async (order: Order) => {
    setIsProcessingDoc('act');

    try {
      const zip = new JSZip();
      const attachments = order.closingDocs?.attachments || [];
      let addedFiles = 0;

      // Добавляем прикреплённые документы (если есть)
      for (const att of attachments) {
        if (!att.url) continue;
        try {
          const response = await fetch(att.url);
          const blob = await response.blob();
          const fileName = att.name || `document_${addedFiles + 1}`;
          zip.file(fileName, blob);
          addedFiles++;
        } catch {
          // пропускаем ошибки загрузки
        }
      }

      // Генерируем акт выполненных работ в PDF
      const totals = calculateOrderTotalsLocal(order);
      const getUnitsForReq = (req: AssetRequirement) => {
        return getUnitsForRequirement(order, req, { mode: 'actual_or_planned' });
      };

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: { font: 'Roboto', fontSize: 10 },
        content: [
          { text: `АКТ ВЫПОЛНЕННЫХ РАБОТ`, style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
          { text: `Заказ №${order.orderNumber || order.id}`, alignment: 'center', margin: [0, 0, 0, 10] },
          { text: `Дата: ${formatDateTime(new Date().toISOString())}`, alignment: 'center', margin: [0, 0, 0, 20] },

          { text: 'Исполнитель:', bold: true, margin: [0, 10, 0, 5] },
          { text: companyData.name, margin: [0, 0, 0, 2] },
          { text: `ИНН: ${companyData.inn}`, margin: [0, 0, 0, 2] },
          { text: `Адрес: ${companyData.address}`, margin: [0, 0, 0, 10] },

          { text: 'Заказчик:', bold: true, margin: [0, 10, 0, 5] },
          { text: order.customer, margin: [0, 0, 0, 2] },
          { text: `Объект: ${order.address}`, margin: [0, 0, 0, 20] },

          { text: 'Выполненные работы:', bold: true, margin: [0, 10, 0, 10] },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: 'Услуга', bold: true, fillColor: '#f0f0f0' },
                  { text: 'Кол-во', bold: true, fillColor: '#f0f0f0', alignment: 'center' },
                  { text: 'Цена', bold: true, fillColor: '#f0f0f0', alignment: 'right' },
                  { text: 'Сумма', bold: true, fillColor: '#f0f0f0', alignment: 'right' }
                ],
                ...(order.assetRequirements || []).map(req => {
                  const units = getUnitsForReq(req);
                  const unitLabel = req.priceUnit === 'PER_HOUR' ? 'ч' : 'рейс';
                  const lineTotal = (req.customerPrice || 0) * units * (req.quantity || 1);
                  return [
                    { text: `${req.assetType} (${req.quantity || 1} ед.)` },
                    { text: `${units} ${unitLabel}`, alignment: 'center' },
                    { text: formatPrice(req.customerPrice || 0), alignment: 'right' },
                    { text: formatPrice(lineTotal), alignment: 'right' }
                  ];
                })
              ]
            },
            margin: [0, 0, 0, 20]
          },

          { text: `ИТОГО: ${formatPrice(totals.grandTotal)}`, bold: true, fontSize: 14, alignment: 'right', margin: [0, 10, 0, 5] },
          { text: `В т.ч. НДС 20%: ${formatPrice(totals.grandTotal * 0.2 / 1.2)}`, alignment: 'right', margin: [0, 0, 0, 30] },

          {
            columns: [
              { text: 'Исполнитель: _________________', width: '50%' },
              { text: 'Заказчик: _________________', width: '50%', alignment: 'right' }
            ],
            margin: [0, 30, 0, 0]
          }
        ],
        styles: {
          header: { fontSize: 16, bold: true }
        }
      };

      // Создаём PDF как blob и добавляем в архив
      const pdfBlob = await new Promise<Blob>((resolve) => {
        pdfMake.createPdf(docDefinition as any).getBlob((blob: Blob) => {
          resolve(blob);
        });
      });
      zip.file(`Акт_${order.orderNumber || order.id}.pdf`, pdfBlob);
      addedFiles++;

      // Добавляем счёт-фактуру если есть оплаченные счета
      if (order.invoices && order.invoices.length > 0) {
        const paidInvoice = order.invoices.find(inv => inv.status === 'paid') || order.invoices[0];
        const invoiceDoc = {
          pageSize: 'A4',
          pageMargins: [40, 60, 40, 60],
          defaultStyle: { font: 'Roboto', fontSize: 10 },
          content: [
            { text: `СЧЁТ-ФАКТУРА №${paidInvoice.number}`, style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
            { text: `от ${paidInvoice.date}`, alignment: 'center', margin: [0, 0, 0, 20] },
            { text: `Сумма: ${formatPrice(paidInvoice.amount)}`, bold: true, alignment: 'center' },
            { text: `НДС: ${formatPrice(paidInvoice.vatAmount || 0)}`, alignment: 'center' },
          ]
        };
        const invoiceBlob = await new Promise<Blob>((resolve) => {
          pdfMake.createPdf(invoiceDoc as any).getBlob((blob: Blob) => resolve(blob));
        });
        zip.file(`Счёт-фактура_${paidInvoice.number}.pdf`, invoiceBlob);
        addedFiles++;
      }

      // Генерируем и скачиваем ZIP
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Закрывающие_документы_${order.orderNumber || order.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShareStatus(`Архив закрывающих документов (${addedFiles} файлов) скачан.`);
      setTimeout(() => setShareStatus(null), 4000);
    } catch (err) {
      console.error('Ошибка создания архива:', err);
      setShareStatus('Ошибка при создании архива документов.');
      setTimeout(() => setShareStatus(null), 4000);
    } finally {
      setIsProcessingDoc(null);
    }
  }, [calculateOrderTotalsLocal, companyData]);

  // Подтверждение условий
  const handleConfirmOrder = useCallback((orderId: string, urgent: boolean = false) => {
    onUpdateOrder(orderId, {
      status: OrderStatus.SEARCHING_EQUIPMENT,
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
        newValue: OrderStatus.SEARCHING_EQUIPMENT
      }]
    });
    
    setShareStatus(urgent ? 'Заявка запущена СРОЧНО! Техника выезжает.' : 'Условия подтверждены. Начинаем работу!');
    setTimeout(() => setShareStatus(null), 5000);
  }, [orders, customerName, onUpdateOrder]);

  // Загрузка платёжного поручения (платёжки) клиентом
  const handleUploadPayment = useCallback((orderId: string, file: File | null) => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    onUpdateOrder(orderId, {
      paymentReceiptUrl: url
    });

    setShareStatus('Платёжка загружена. Менеджер увидит её в системе.');
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
    setShareStatus('Спасибо за отзыв! Ваше мнение важно для нас.');
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
      // Копируем требования но очищаем назначенную технику и подрядчиков
      assetRequirements: order.assetRequirements.map(req => ({
        id: generateId(),
        assetType: req.assetType,
        type: req.type,
        quantity: req.quantity,
        customerPrice: req.customerPrice,
        contractorPrice: req.contractorPrice,
        priceUnit: req.priceUnit,
        trips: req.trips,
        hours: req.hours,
        // Очищаем назначения - на новый заказ поедет другая техника
        contractorId: undefined,
        contractorName: undefined,
        vehicleId: undefined,
        vehiclePlate: undefined,
        driverId: undefined,
        driverName: undefined,
      })),
      plannedTrips: order.plannedTrips,
      scheduledTime: toLocalDateTimeInputValue(new Date(Date.now() + 3600000)),
      // Очищаем все назначения и статусы
      assignments: [],
      driverDetails: [],
      bids: [],
      applicants: [],
      evidences: [],
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
            priceUnit: isLoaderType(type) ? PriceUnit.PER_SHIFT : PriceUnit.PER_TRIP
          }] 
        };
      }
    });
  };

  const getStatusBadge = (order: Order) => {
    const normalized = normalizeOrderStatus(order.status);
    const isClosingDocs = [
      OrderStatus.AWAITING_CLOSING_DOCS,
      OrderStatus.CLOSING_DOCS_SENT,
      OrderStatus.REPORT_READY,
    ].includes(order.status);
    const isPaymentPending = isClosingDocs && !order.isPaid;
    const displayLabel = order.status === OrderStatus.SEARCHING_EQUIPMENT
      ? 'Назначение техники'
      : getOrderStatusLabel(order.status);
    const styles: Record<OrderStatus, string> = {
      [OrderStatus.NEW_REQUEST]: 'bg-slate-600/20 text-slate-400 border-slate-500/20',
      [OrderStatus.AWAITING_CUSTOMER]: 'bg-blue-600/20 text-blue-400 border-blue-500/20 animate-pulse',
      [OrderStatus.SEARCHING_EQUIPMENT]: 'bg-teal-600/20 text-teal-400 border-teal-500/20',
      [OrderStatus.EQUIPMENT_APPROVED]: 'bg-teal-600/20 text-teal-400 border-teal-500/20',
      [OrderStatus.EN_ROUTE]: 'bg-purple-600/20 text-purple-400 border-purple-500/20',
      [OrderStatus.IN_PROGRESS]: 'bg-green-600/20 text-green-400 border-green-500/20',
      [OrderStatus.EXPORT_COMPLETED]: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
      [OrderStatus.AWAITING_CLOSING_DOCS]: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
      [OrderStatus.CLOSING_DOCS_SENT]: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
      [OrderStatus.REPORT_READY]: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
      [OrderStatus.COMPLETED]: 'bg-green-600/30 text-green-400 border-green-500/40',
      [OrderStatus.CANCELLED]: 'bg-red-600/20 text-red-400 border-red-500/30',
      [OrderStatus.DRAFT]: 'bg-slate-600/20 text-slate-400 border-slate-500/20',
      [OrderStatus.CALCULATING]: 'bg-blue-600/20 text-blue-400 border-blue-500/20 animate-pulse',
      [OrderStatus.CONFIRMED_BY_CUSTOMER]: 'bg-teal-600/20 text-teal-400 border-teal-500/20',
    };
    const statusForStyle = normalized === OrderStatus.COMPLETED && order.status !== OrderStatus.COMPLETED
      ? order.status
      : normalized;

    return (
      <span className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${styles[statusForStyle] || 'bg-slate-800 text-slate-500'} ${isPaymentPending ? 'animate-pulse' : ''}`}>
        {displayLabel}
      </span>
    );
  };

  // Шаги прогресса для заказа
  const getProgressSteps = (order: Order) => {
    const normalized = normalizeOrderStatus(order.status);
    const isClosingDocs = [
      OrderStatus.AWAITING_CLOSING_DOCS,
      OrderStatus.CLOSING_DOCS_SENT,
      OrderStatus.REPORT_READY,
    ].includes(order.status);
    const isConfirmed = [OrderStatus.SEARCHING_EQUIPMENT, OrderStatus.EQUIPMENT_APPROVED, OrderStatus.EN_ROUTE, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED].includes(normalized);
    const isEnRoute = normalized === OrderStatus.EN_ROUTE;
    const isWorking = normalized === OrderStatus.IN_PROGRESS;
    const isExporting = (order.actualTrips || 0) > 0;
    const isFinished = order.status === OrderStatus.COMPLETED;
    const isPostWork = isClosingDocs || isFinished;
    
    // Техника назначена если: есть водители ИЛИ статус уже дошёл до "Техника назначена" или дальше
    const isTechAssigned = (order.driverDetails || []).length > 0 || 
      [OrderStatus.EQUIPMENT_APPROVED, OrderStatus.EN_ROUTE, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED].includes(normalized);

    return [
      { label: 'Условия согласованы', done: isConfirmed, id: 1 },
      { label: 'Техника назначена', done: isTechAssigned, id: 2 },
      { label: 'Техника в пути', done: isEnRoute || isWorking || isExporting || isPostWork, active: !isPostWork && isTechAssigned && !isEnRoute && !isWorking && !isExporting, id: 3 },
      { label: 'Идёт вывоз', done: isWorking || isExporting || isPostWork, active: !isPostWork && isEnRoute, id: 4 },
      { label: 'Завершено', done: isFinished, active: isClosingDocs, pulse: isClosingDocs && !order.isPaid, id: 5 }
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
          <span className="text-3xl">👤</span>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight">Личный кабинет</h1>
            {customerName && <p className="text-[9px] text-blue-400 font-bold">{customerName}</p>}
          </div>
        </div>
        {customers.length > 0 && (
          <select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className="bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        
        <div className="flex bg-[#1c2641] p-1 rounded-full border border-white/5 shadow-2xl">
          <button onClick={() => { setView('active'); setSelectedOrderId(null); }} className={`px-5 py-2 text-[9px] font-bold uppercase rounded-full transition-all whitespace-nowrap ${view === 'active' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            Текущие
          </button>
          <button onClick={() => setView('form')} className={`px-5 py-2 text-[9px] font-bold uppercase rounded-full transition-all whitespace-nowrap ${view === 'form' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            Новый заказ
          </button>
          <button onClick={() => { setView('history'); setSelectedOrderId(null); }} className={`px-5 py-2 text-[9px] font-bold uppercase rounded-full transition-all whitespace-nowrap ${view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            История
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full pb-32">
        <div className="mb-4 space-y-3">
          <input
            type="text"
            value={orderSearch}
            onChange={e => setOrderSearch(e.target.value)}
            placeholder="Поиск по адресу или номеру заказа"
            className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-3 text-sm font-bold outline-none focus:border-blue-500"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black uppercase text-slate-500">С</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
            />
            <span className="text-[9px] font-black uppercase text-slate-500">По</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
            />
            {(orderSearch || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setOrderSearch('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="ml-auto bg-white/10 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        </div>
        
        {/* === АКТИВНЫЕ ЗАКАЗЫ === */}
        {view === 'active' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {filteredActiveOrders.length === 0 ? (
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
              filteredActiveOrders.map(order => {
                const totals = calculateOrderTotalsLocal(order);
                const steps = getProgressSteps(order);
                const needsConfirmation = normalizeOrderStatus(order.status) === OrderStatus.AWAITING_CUSTOMER;
                const isClosingDocsPriority = order.status === OrderStatus.CLOSING_DOCS_SENT;
                const currentQuote = order.currentQuote;
                const accountantMessages = (order.messages || []).filter(m => m.fromRole === 'accountant' && (!m.toRole || m.toRole === 'customer'));
                const unreadAccountantCount = accountantMessages.filter(m => !m.isRead).length;
                const managerMessages = (order.messages || []).filter(m => m.fromRole === 'dispatcher' && (!m.toRole || m.toRole === 'customer'));
                const unreadManagerCount = managerMessages.filter(m => !m.isRead).length;

                return (
                  <div key={order.id} className="bg-[#12192c] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                    {/* Заголовок */}
                    <div className="p-6 border-b border-white/5">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        {getStatusBadge(order)}
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
                              step.active ? `bg-blue-500 text-white ${step.pulse ? 'animate-pulse' : ''}` : 
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

                    {/* Блок подтверждения (если нужно) */}
                    {needsConfirmation && (
                      <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-white/10">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-2">Расчёт готов</h3>
                        
                        {currentQuote && (
                          <div className="bg-white/10 rounded-2xl p-4 mb-4">
                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                              {currentQuote.truckPricePerTrip && (
                                <div>
                                  <span className="text-blue-200">Самосвал:</span>
                                  <span className="font-black ml-2">{formatPrice(currentQuote.truckPricePerTrip)}/рейс</span>
                                </div>
                              )}
                              {currentQuote.loaderPricePerShift && (
                                <div>
                                  <span className="text-blue-200">Погрузчик:</span>
                                  <span className="font-black ml-2">{formatPrice(currentQuote.loaderPricePerShift)}/смена</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                              <span className="text-[10px] uppercase opacity-80">Ориентировочно (с НДС 22%):</span>
                              <span className="text-xl font-black">{formatPrice(currentQuote.estimatedTotal * 1.22)}</span>
                            </div>
                            {currentQuote.notes?.trim() && (
                              <div className="mt-3 pt-3 border-t border-white/20 text-[10px] text-blue-100">
                                <div className="uppercase tracking-widest font-black text-[9px] text-blue-200 mb-1">Примечания</div>
                                <div className="whitespace-pre-wrap">{currentQuote.notes}</div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleConfirmOrder(order.id)}
                            className="flex-1 bg-white text-slate-900 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
                          >
                            Подтвердить условия
                          </button>
                          <button 
                            onClick={() => handleConfirmOrder(order.id, true)}
                            className="bg-orange-500 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-orange-400 transition-all"
                          >
                            СРОЧНО
                          </button>
                        </div>
                        {currentQuote && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setQuotePreviewOrder(order);
                                setShowQuotePreview(true);
                              }}
                              className="w-full bg-white/10 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                            >
                              Предпросмотр КП
                            </button>
                            <button
                              type="button"
                              onClick={() => generateReport(order, 'quote')}
                              disabled={isProcessingDoc === 'quote'}
                              className="w-full bg-white text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all disabled:opacity-50"
                            >
                              {isProcessingDoc === 'quote' ? 'Генерация...' : 'Скачать КП'}
                            </button>
                            <button
                              type="button"
                              onClick={() => generateReport(order, 'invoice')}
                              disabled={isProcessingDoc === 'invoice'}
                              className="w-full bg-white/10 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all disabled:opacity-50"
                            >
                              {isProcessingDoc === 'invoice' ? 'Генерация...' : 'Скачать счёт'}
                            </button>
                            <button
                              type="button"
                              onClick={() => generateReport(order, 'contract')}
                              disabled={isProcessingDoc === 'contract'}
                              className="w-full bg-white/10 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all disabled:opacity-50"
                            >
                              {isProcessingDoc === 'contract' ? 'Генерация...' : 'Скачать договор'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Инфо-блоки */}
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Рейсов</div>
                        <div className="text-2xl font-black">
                          {getCustomerTripsCount(order)} <span className="text-sm text-slate-500">/ {order.plannedTrips}</span>
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
                        <div className="text-xl font-black text-green-400">
                          {formatPrice(totals.actualTotal > 0 ? totals.actualTotal : totals.grandTotal)}
                        </div>
                        <div className="text-[9px] text-slate-500">План: {formatPrice(totals.plannedTotal)}</div>
                        <div className="text-[9px] text-emerald-300">Факт: {formatPrice(totals.actualTotal)}</div>
                      </div>
                    </div>

                    {getCustomerEvidences(order).length > 0 && (
                      <div className="px-6 pb-6">
                        <div className="text-[10px] font-black text-slate-500 uppercase mb-3">Фото рейсов</div>
                        {(() => {
                          const photoTypeLabels: Record<string, string> = {
                            loading: 'Погрузка',
                            full_truck: 'Полный кузов',
                            unloading: 'Выгрузка',
                            ticket: 'Талон',
                            other: 'Фото'
                          };
                          const photos = getCustomerEvidences(order)
                            .slice()
                            .reverse()
                            .flatMap(ev => {
                              const allPhotos = ev.photos && ev.photos.length > 0
                                ? ev.photos
                                : (ev.photo ? [{ url: ev.photo, type: 'other' as const, timestamp: ev.timestamp }] : []);
                              return allPhotos.map((photo, idx) => ({
                                key: `${ev.id}-${idx}`,
                                url: photo.url,
                                type: photo.type,
                                timestamp: photo.timestamp || ev.timestamp,
                                address: ev.address || order.address,
                                tripNumber: ev.tripNumber,
                                driverName: ev.driverName
                              }));
                            });
                          if (photos.length === 0) {
                            return <div className="p-4 text-center text-[9px] text-slate-500">Нет фото</div>;
                          }
                          return (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {photos.map(photo => (
                                <div key={photo.key} className="min-w-[220px] rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                  <div className="relative">
                                    <img
                                      src={photo.url}
                                      className="w-full h-28 object-cover"
                                      alt={`Рейс #${photo.tripNumber} - ${photoTypeLabels[photo.type] || 'Фото'}`}
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-white px-2 py-1 text-center">
                                      {photoTypeLabels[photo.type] || 'Фото'} · Рейс #{photo.tripNumber}
                                    </div>
                                  </div>
                                  <div className="p-2 text-[9px] text-slate-400">
                                    <div className="font-black text-slate-300 truncate">{photo.address || 'Адрес не указан'}</div>
                                    <div>{formatDateTime(photo.timestamp)}</div>
                                    {photo.driverName && (
                                      <div className="text-[8px] text-slate-500 truncate">Водитель: {photo.driverName}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Кнопки действий */}
                    <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-col md:flex-row gap-3">
                      {/* Блок документов после подтверждения клиента */}
                      {[OrderStatus.SEARCHING_EQUIPMENT, OrderStatus.EQUIPMENT_APPROVED, OrderStatus.EN_ROUTE, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED].includes(normalizeOrderStatus(order.status)) && (
                        <div className="flex-1 flex flex-col sm:flex-row gap-3">
                          {[
                            OrderStatus.IN_PROGRESS,
                            OrderStatus.EXPORT_COMPLETED,
                            OrderStatus.AWAITING_CLOSING_DOCS,
                            OrderStatus.CLOSING_DOCS_SENT,
                            OrderStatus.REPORT_READY,
                            OrderStatus.COMPLETED,
                          ].includes(order.status) ? (
                            <>
                              {(order.status === OrderStatus.CLOSING_DOCS_SENT || order.status === OrderStatus.REPORT_READY || order.status === OrderStatus.COMPLETED) && (
                                <button
                                  type="button"
                                  onClick={() => downloadClosingDocs(order)}
                                  disabled={isProcessingDoc === 'act'}
                                  className={`flex-1 ${isClosingDocsPriority ? 'flex-[1.5] bg-amber-400 text-slate-900 border-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.35)] animate-pulse' : 'bg-slate-600/20 text-slate-200 border-slate-500/40 hover:bg-slate-500 hover:text-white'} text-center py-3 rounded-xl text-[10px] font-black uppercase border transition-all disabled:opacity-50`}
                                >
                                  {isProcessingDoc === 'act' ? 'Генерация...' : 'Скачать закрывающие документы'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => shareToMessenger(order, 'telegram')}
                                className="flex-1 bg-blue-600/20 text-blue-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-blue-500/40 hover:bg-blue-500 hover:text-white transition-all"
                              >
                                Telegram
                              </button>
                              <button
                                type="button"
                                onClick={() => shareToMessenger(order, 'whatsapp')}
                                className="flex-1 bg-green-600/20 text-green-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-green-500/40 hover:bg-green-500 hover:text-white transition-all"
                              >
                                WhatsApp
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => generateReport(order, 'invoice')}
                                className="flex-1 bg-green-600/20 text-green-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-green-500/40 hover:bg-green-500 hover:text-white transition-all"
                              >
                                Скачать счёт
                              </button>
                              <button
                                type="button"
                                onClick={() => generateReport(order, 'contract')}
                                className="flex-1 bg-emerald-600/15 text-emerald-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-emerald-500/40 hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                Скачать договор
                              </button>
                            </>
                          )}
                          <label className="flex-1 cursor-pointer bg-blue-600/15 text-blue-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-blue-500/40 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={e => handleUploadPayment(order.id, e.target.files?.[0] || null)}
                            />
                            {order.paymentReceiptUrl ? 'Платёжка загружена' : 'Загрузить платёжку'}
                          </label>
                        </div>
                      )}

                      <div className="flex-1 flex flex-wrap gap-3">
                        <a href={`tel:+70000000000`} className="flex-1 min-w-[100px] bg-white/10 text-white text-center py-3 rounded-xl text-[10px] font-black uppercase hover:bg-white/20 transition-all">
                          Позвонить
                        </a>
                        <button
                          type="button"
                          onClick={() => openManagerChat(order)}
                          className="relative flex-1 min-w-[100px] text-center py-3 rounded-xl text-[10px] font-black uppercase border transition-all bg-emerald-600/20 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600 hover:text-white"
                        >
                          💬 Написать менеджеру
                          {unreadManagerCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full px-1 shadow-lg">
                              {unreadManagerCount}
                            </span>
                          )}
                        </button>
                        {[OrderStatus.AWAITING_CLOSING_DOCS, OrderStatus.CLOSING_DOCS_SENT, OrderStatus.REPORT_READY, OrderStatus.COMPLETED].includes(order.status) && (
                          <button
                            type="button"
                            onClick={() => openAccountantChat(order)}
                            className="relative flex-1 min-w-[100px] text-center py-3 rounded-xl text-[10px] font-black uppercase border transition-all bg-amber-500/20 text-amber-200 border-amber-400/30 hover:bg-amber-500/40"
                          >
                            💬 Написать бухгалтеру
                            {unreadAccountantCount > 0 && (
                              <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full px-1 shadow-lg">
                                {unreadAccountantCount}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Последнее сообщение от менеджера */}
                    {managerMessages.length > 0 && (
                      <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
                            {unreadManagerCount > 0 ? '💬 Новые сообщения от менеджера' : 'Сообщения менеджера'}
                          </div>
                          <button
                            type="button"
                            onClick={() => openManagerChat(order)}
                            className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase border border-emerald-400/30 hover:bg-emerald-500/30 transition-all"
                          >
                            Ответить
                          </button>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                          {(() => {
                            const lastMsg = managerMessages[managerMessages.length - 1];
                            return (
                              <>
                                <div className="text-[9px] text-slate-500 mb-1">
                                  {lastMsg.fromName || 'Диспетчер'} • {formatDateTime(lastMsg.timestamp)}
                                </div>
                                <div className="text-sm text-slate-200 whitespace-pre-wrap line-clamp-2">{lastMsg.text}</div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
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
                <AddressInput
                  value={formData.address}
                  onChange={(address, coords) => {
                    setFormData({
                      ...formData,
                      address,
                      ...(coords ? { coordinates: coords } : {})
                    });
                  }}
                  placeholder="Начните вводить адрес..."
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-lg font-black text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 mb-4"
                  required
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
                  Отправить заявку
                </button>
              </div>
            </div>
          </form>
        )}

        {/* === ИСТОРИЯ ЗАКАЗОВ === */}
        {view === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            {filteredCompletedOrders.length === 0 ? (
              <div className="text-center py-24 bg-[#12192c]/40 rounded-[3rem] border border-white/5 border-dashed">
                <div className="text-6xl mb-6 opacity-20">📁</div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">История пуста</p>
              </div>
            ) : (
              filteredCompletedOrders.map(order => {
                const totals = calculateOrderTotalsLocal(order);
                
                return (
                  <div key={order.id} className="bg-[#12192c] p-6 rounded-[2rem] border border-white/5 shadow-2xl">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-black text-green-400 bg-green-500/10 px-3 py-1 rounded-full uppercase">
                            Выполнено
                          </span>
                          <span className="text-[9px] font-black text-slate-500">
                            #{order.orderNumber || order.id.slice(0, 8)}
                          </span>
                        </div>
                        <h4 className="text-2xl font-black tracking-tight uppercase">{order.address}</h4>
                        <p className="text-[10px] text-slate-500 mt-1">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-green-400">
                          {formatPrice(totals.actualTotal > 0 ? totals.actualTotal : totals.grandTotal)}
                        </div>
                        <div className="text-[9px] text-slate-500">План: {formatPrice(totals.plannedTotal)}</div>
                        <div className="text-[9px] text-emerald-300">Факт: {formatPrice(totals.actualTotal)}</div>
                        <div className="text-[9px] text-slate-500">{totals.totalTrips} рейсов</div>
                      </div>
                    </div>

                    {/* Документы */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                      <button 
                        onClick={() => downloadClosingDocs(order)}
                        disabled={isProcessingDoc === 'act'}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                      >
                        <span className="text-2xl block mb-1">📄</span>
                        <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'act' ? 'Генерация...' : 'Закрывающие'}</span>
                      </button>
                      <button 
                        onClick={() => generateReport(order, 'full')}
                        disabled={isProcessingDoc === 'full'}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                      >
                        <span className="text-2xl block mb-1">📊</span>
                        <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'full' ? 'Генерация...' : 'Полный отчёт'}</span>
                      </button>
                      <button 
                        onClick={() => downloadPhotos(order)}
                        disabled={isProcessingDoc === 'photos'}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                      >
                        <span className="text-2xl block mb-1">📸</span>
                        <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'photos' ? 'Сборка...' : `Фото (${getConfirmedEvidences(order).length})`}</span>
                      </button>
                    </div>

                    {/* Поделиться */}
                    <div className="flex gap-3 mb-6">
                      <button 
                        onClick={() => shareToMessenger(order, 'telegram')}
                        className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        Telegram
                      </button>
                      <button 
                        onClick={() => shareToMessenger(order, 'whatsapp')}
                        className="flex-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        WhatsApp
                      </button>
                      <button 
                        onClick={() => shareToMessenger(order, 'email')}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        Email
                      </button>
                    </div>

                    {getConfirmedEvidences(order).length > 0 && (
                      <div className="mt-6">
                        <div className="text-[10px] font-black text-slate-500 uppercase mb-3">Фото рейсов</div>
                        {(() => {
                          const confirmedPhotos = getConfirmedEvidences(order)
                            .slice()
                            .reverse()
                            .flatMap(ev => {
                              const allPhotos = ev.photos && ev.photos.length > 0
                                ? ev.photos
                                : (ev.photo ? [{ url: ev.photo, type: 'other' as const, timestamp: ev.timestamp }] : []);
                              return allPhotos.map((photo, idx) => ({
                                key: `${ev.id}-${idx}`,
                                url: photo.url,
                                timestamp: photo.timestamp || ev.timestamp,
                                address: ev.address || order.address,
                                tripNumber: ev.tripNumber
                              }));
                            });
                          if (confirmedPhotos.length === 0) {
                            return <div className="p-4 text-center text-[9px] text-slate-500">Нет фото</div>;
                          }
                          return (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {confirmedPhotos.map(photo => (
                                <div key={photo.key} className="min-w-[220px] rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                  <div className="relative">
                                    <img
                                      src={photo.url}
                                      className="w-full h-28 object-cover"
                                      alt={`Рейс #${photo.tripNumber}`}
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white px-2 py-1">
                                      Рейс #{photo.tripNumber}
                                    </div>
                                  </div>
                                  <div className="p-2 text-[9px] text-slate-400">
                                    <div className="font-black text-slate-300 truncate">{photo.address || 'Адрес не указан'}</div>
                                    <div>{formatDateTime(photo.timestamp)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Обратная связь */}
                    <div className="flex gap-3 pt-4 border-t border-white/5">
                      {order.feedback ? (
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className={`text-lg ${star <= order.feedback!.rating ? 'text-yellow-400' : 'text-slate-700'}`}>в…</span>
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-500">Спасибо за отзыв!</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setSelectedOrderId(order.id); setShowFeedbackModal(true); }}
                          className="flex-1 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all"
                        >
                          Оставить отзыв
                        </button>
                      )}
                      <button 
                        onClick={() => repeatOrder(order)}
                        className="bg-white/5 hover:bg-blue-600 text-slate-400 hover:text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all"
                      >
                        Повторить
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
      {showQuotePreview && quotePreviewOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase tracking-tight">Коммерческое предложение</h3>
              <button
                type="button"
                onClick={() => {
                  setShowQuotePreview(false);
                  setQuotePreviewOrder(null);
                }}
                className="text-slate-400 hover:text-slate-900 text-2xl"
              >
                Г—
              </button>
            </div>
            {(() => {
              const preview = buildQuotePreviewData(quotePreviewOrder);
              return (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="text-sm uppercase text-slate-500 font-black">Заказ № {quotePreviewOrder.orderNumber || quotePreviewOrder.id}</div>
                      <div className="text-xs text-slate-400 mt-1">Дата: {new Date().toLocaleDateString('ru')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase text-slate-400">Сумма</div>
                      <div className="text-2xl font-black text-slate-900">{formatPrice(preview.total)}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-500 mb-2">Заказчик</div>
                      <div className="text-sm font-black">{quotePreviewOrder.customer}</div>
                      <div className="text-xs text-slate-500">{quotePreviewOrder.contactInfo?.phone || ''}</div>
                      <div className="text-xs text-slate-500">{quotePreviewOrder.contactInfo?.email || ''}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-500 mb-2">Объект</div>
                      <div className="text-sm font-black">{quotePreviewOrder.address}</div>
                      <div className="text-xs text-slate-500">Подача: {formatDateTime(quotePreviewOrder.scheduledTime)}</div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <div className="text-[10px] font-black uppercase text-slate-500 mb-3">Смета</div>
                    <div className="divide-y divide-slate-200">
                      {preview.items.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-black">{item.label}</div>
                            <div className="text-xs text-slate-500">
                              {item.units} {item.unitLabel} Г— {formatPrice(item.unitPrice)}
                            </div>
                          </div>
                          <div className="text-sm font-black">{formatPrice(item.total)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Подытог</span>
                      <span className="font-black">{formatPrice(preview.subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">НДС</span>
                      <span className="font-black">{preview.vatRate > 0 ? formatPrice(preview.vat) : 'без НДС'}</span>
                    </div>
                    <div className="flex items-center justify-between text-base">
                      <span className="font-black">Итого</span>
                      <span className="font-black">{formatPrice(preview.total)}</span>
                    </div>
                  </div>
                  {preview.notes?.trim() && (
                    <div className="mt-6 border-t border-slate-200 pt-4">
                      <div className="text-[10px] font-black uppercase text-slate-500 mb-2">Примечания</div>
                      <div className="text-sm whitespace-pre-wrap">{preview.notes}</div>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
              <button
                type="button"
                onClick={() => generateReport(quotePreviewOrder, 'quote')}
                disabled={isProcessingDoc === 'quote'}
                className="bg-white text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all disabled:opacity-50"
              >
                {isProcessingDoc === 'quote' ? 'Генерация...' : 'Скачать КП'}
              </button>
              <button
                type="button"
                onClick={() => generateReport(quotePreviewOrder, 'invoice')}
                disabled={isProcessingDoc === 'invoice'}
                className="bg-slate-100 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {isProcessingDoc === 'invoice' ? 'Генерация...' : 'Скачать счёт'}
              </button>
              <button
                type="button"
                onClick={() => generateReport(quotePreviewOrder, 'contract')}
                disabled={isProcessingDoc === 'contract'}
                className="bg-slate-100 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {isProcessingDoc === 'contract' ? 'Генерация...' : 'Скачать договор'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuotePreview(false);
                  setQuotePreviewOrder(null);
                }}
                className="bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {accountantChatModal.isOpen && chatOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#12192c] rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-white/10">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">
              Переписка с бухгалтером
            </h3>
            <p className="text-[10px] text-slate-500 uppercase mb-4">
              Заказ: {chatOrder.address}
            </p>

            <div ref={accountantChatRef} className="space-y-2 max-h-64 overflow-y-auto mb-4 pr-1">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-500 text-[10px] uppercase py-6">
                  Сообщений пока нет
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMine = msg.fromRole === 'customer';
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl p-3 ${isMine ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-200'}`}>
                        <div className={`text-[9px] mb-1 ${isMine ? 'text-blue-100' : 'text-slate-400'}`}>
                          {isMine ? 'Вы' : 'Бухгалтер'} • {formatDateTime(msg.timestamp)}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.attachments.map((att, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => downloadAttachment(att)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold ${
                                  isMine
                                    ? 'bg-blue-500/50 text-blue-100 hover:bg-blue-500/70'
                                    : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                                }`}
                              >
                                📎 {att.name || `Документ ${idx + 1}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <textarea
              value={accountantChatModal.message}
              onChange={e => setAccountantChatModal(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Напишите бухгалтеру..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAccountantChatModal({ isOpen: false, order: null, message: '' })}
                className="flex-1 bg-white/10 text-white py-4 min-h-[48px] rounded-xl text-[11px] font-black uppercase touch-feedback active:scale-95"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={sendAccountantMessage}
                disabled={!accountantChatModal.message.trim()}
                className={`flex-1 py-4 min-h-[48px] rounded-xl text-[11px] font-black uppercase touch-feedback active:scale-95 ${
                  accountantChatModal.message.trim()
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {managerChatModal.isOpen && managerChatOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#12192c] rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-white/10">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">
              Переписка с менеджером
            </h3>
            <p className="text-[10px] text-slate-500 uppercase mb-4">
              Заказ: {managerChatOrder.address}
            </p>

            <div ref={managerChatRef} className="space-y-2 max-h-64 overflow-y-auto mb-4 pr-1">
              {managerChatMessages.length === 0 ? (
                <div className="text-center text-slate-500 text-[10px] uppercase py-6">
                  Сообщений пока нет
                </div>
              ) : (
                managerChatMessages.map(msg => {
                  const isMine = msg.fromRole === 'customer';
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl p-3 ${isMine ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-200'}`}>
                        <div className={`text-[9px] mb-1 ${isMine ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {isMine ? 'Вы' : 'Менеджер'} • {formatDateTime(msg.timestamp)}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <textarea
              value={managerChatModal.message}
              onChange={e => setManagerChatModal(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Напишите менеджеру..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setManagerChatModal({ isOpen: false, order: null, message: '' })}
                className="flex-1 bg-white/10 text-white py-4 min-h-[48px] rounded-xl text-[11px] font-black uppercase touch-feedback active:scale-95"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={sendManagerMessage}
                disabled={!managerChatModal.message.trim()}
                className={`flex-1 py-4 min-h-[48px] rounded-xl text-[11px] font-black uppercase touch-feedback active:scale-95 ${
                  managerChatModal.message.trim()
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#12192c] rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/10">
            <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-center">Оцените работу</h3>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setFeedbackRating(star)}
                  className={`text-4xl transition-all hover:scale-110 ${star <= feedbackRating ? 'text-yellow-400' : 'text-slate-700'}`}
                >
                  в…
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












