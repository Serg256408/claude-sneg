import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Order, OrderStatus, AssetType, AssetRequirement, OrderRestrictions, CustomerContact, Customer, PaymentType, formatPrice, formatDateTime, generateId, generateOrderNumber, PriceUnit, DateRange, isOrderInDateRange, getOrderStatusLabel, normalizeOrderStatus, calculateOrderTotals, getUnitsForRequirement, getTripCounts, isTruckType, isLoaderType } from './types';

interface CustomerPortalProps {
  orders: Order[];
  customers: Customer[];
  onAddOrder: (order: Partial<Order>) => void;
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ orders, customers, onAddOrder, onUpdateOrder }) => {
  const [view, setView] = useState<'active' | 'form' | 'history' | 'order-detail'>('active');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isProcessingDoc, setIsProcessingDoc] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [quotePreviewOrder, setQuotePreviewOrder] = useState<Order | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
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

  // Р¤РёР»СЊС‚СЂР°С†РёСЏ Р·Р°РєР°Р·РѕРІ РїРѕ С‚РµР»РµС„РѕРЅСѓ РєР»РёРµРЅС‚Р°
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

  // Р Р°СЃС‡С‘С‚ РёС‚РѕРіРѕРІ РїРѕ Р·Р°РєР°Р·Сѓ
  const getConfirmedEvidences = useCallback((order: Order) => {
    return (order.evidences || []).filter(e => e.confirmed);
  }, []);

  const getCustomerEvidences = useCallback((order: Order) => {
    const isFinished = order.status === OrderStatus.COMPLETED;
    return isFinished ? getConfirmedEvidences(order) : (order.evidences || []);
  }, [getConfirmedEvidences]);

  // Р”Р»СЏ РєР»РёРµРЅС‚Р°: РІРѕ РІСЂРµРјСЏ СЂР°Р±РѕС‚С‹ РїРѕРєР°Р·С‹РІР°РµРј Р’РЎР• СЂРµР№СЃС‹, РїРѕСЃР»Рµ Р·Р°РІРµСЂС€РµРЅРёСЏ вЂ” С‚РѕР»СЊРєРѕ РїРѕРґС‚РІРµСЂР¶РґС‘РЅРЅС‹Рµ
  const getCustomerTripsCount = useCallback((order: Order) => {
    const isFinished = order.status === OrderStatus.COMPLETED;
    if (isFinished) {
      // РџРѕСЃР»Рµ Р·Р°РІРµСЂС€РµРЅРёСЏ вЂ” С‚РѕР»СЊРєРѕ РїРѕРґС‚РІРµСЂР¶РґС‘РЅРЅС‹Рµ (РєР°Рє Сѓ РјРµРЅРµРґР¶РµСЂР°)
      return getConfirmedEvidences(order).length;
    }
    // Р’Рѕ РІСЂРµРјСЏ СЂР°Р±РѕС‚С‹ вЂ” РІСЃРµ СЂРµР№СЃС‹
    return (order.evidences || []).length;
  }, [getConfirmedEvidences]);

  const calculateOrderTotalsLocal = useCallback((order: Order) => {
    const totals = calculateOrderTotals(order, { mode: 'actual_or_planned', includeCharges: true });
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
      grandTotal: totals.customerTotal
    };
  }, []);

  const buildQuotePreviewData = useCallback((order: Order) => {
    const orderCustomer = customers.find(c => c.id === order.customerId) || customers.find(c => c.phone === order.contactInfo?.phone);
    const paymentType = orderCustomer?.paymentType;
    const vatRate = paymentType === PaymentType.VAT_20 ? 0.22 : 0;
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
        ? 'С‡Р°СЃ'
        : req.priceUnit === PriceUnit.PER_SHIFT
        ? 'СЃРјРµРЅР°'
        : 'СЂРµР№СЃ';
      const total = unitPrice * units;
      subtotal += total;
      items.push({ label: req.type, units, unitLabel, unitPrice, total });
    });

    if (quote?.minimalCharge) {
      subtotal += quote.minimalCharge;
      items.push({ label: 'РњРёРЅРёРјР°Р»РєР°', units: 1, unitLabel: 'СѓСЃР»СѓРіР°', unitPrice: quote.minimalCharge, total: quote.minimalCharge });
    }
    if (quote?.deliveryCharge) {
      subtotal += quote.deliveryCharge;
      items.push({ label: 'РџРѕРґР°С‡Р°', units: 1, unitLabel: 'СѓСЃР»СѓРіР°', unitPrice: quote.deliveryCharge, total: quote.deliveryCharge });
    }

    const vat = vatRate > 0 ? subtotal * vatRate : 0;
    const total = subtotal + vat;

    return {
      orderCustomer,
      vatRate,
      items,
      subtotal,
      vat,
      total,
      notes: quote?.notes || ''
    };
  }, [customers]);

  // Р¤РѕСЂРјР° РЅРѕРІРѕРіРѕ Р·Р°РєР°Р·Р°
  const [formData, setFormData] = useState<Partial<Order>>({
    customer: customerName,
    customerId: selectedCustomerId || undefined,
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
      contractorName: 'Р‘РёСЂР¶Р°', 
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
        action: 'Р—Р°СЏРІРєР° СЃРѕР·РґР°РЅР° Р·Р°РєР°Р·С‡РёРєРѕРј',
        actionType: 'status_change',
        performedBy: formData.contactInfo?.name || 'Р—Р°РєР°Р·С‡РёРє',
        performedByRole: 'customer',
        newValue: OrderStatus.NEW_REQUEST
      }]
    };
    
    onAddOrder(newOrder);
    setView('active');
    setShareStatus('вњ… Р—Р°СЏРІРєР° СѓСЃРїРµС€РЅРѕ РѕС‚РїСЂР°РІР»РµРЅР°! РњРµРЅРµРґР¶РµСЂ СЃРІСЏР¶РµС‚СЃСЏ СЃ РІР°РјРё.');
    setTimeout(() => setShareStatus(null), 5000);
  };

  // Р“РµРЅРµСЂР°С†РёСЏ С‚РµРєСЃС‚РѕРІРѕРіРѕ РѕС‚С‡С‘С‚Р° / СЃС‡С‘С‚Р° / РґРѕРіРѕРІРѕСЂР° (СЃРёРјСѓР»СЏС†РёСЏ PDF)
  const generateReport = useCallback(async (order: Order, type: 'act' | 'invoice' | 'full' | 'contract' | 'quote') => {
    setIsProcessingDoc(type);
    
    // РЎРёРјСѓР»СЏС†РёСЏ РіРµРЅРµСЂР°С†РёРё РґРѕРєСѓРјРµРЅС‚Р°
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const totals = calculateOrderTotalsLocal(order);
    const orderCustomer = customers.find(c => c.id === order.customerId) || customers.find(c => c.phone === order.contactInfo?.phone);
    const paymentType = orderCustomer?.paymentType;
    const vatRate = paymentType === PaymentType.VAT_20 ? 0.22 : 0;
    const getUnitsForReq = (req: AssetRequirement) => {
      return getUnitsForRequirement(order, req, { mode: 'actual_or_planned' });
    };
    
    // РЎРѕР·РґР°С‘Рј С‚РµРєСЃС‚РѕРІС‹Р№ РѕС‚С‡С‘С‚ (РІ СЂРµР°Р»СЊРЅРѕРј РїСЂРёР»РѕР¶РµРЅРёРё - PDF)
    const title =
      type === 'act'
        ? 'РђРљРў Р’Р«РџРћР›РќР•РќРќР«РҐ Р РђР‘РћРў'
        : type === 'invoice'
        ? 'РЎР§РЃРў РќРђ РћРџР›РђРўРЈ'
        : type === 'contract'
        ? 'Р”РћР“РћР’РћР  РќРђ РћРљРђР—РђРќРР• РЈРЎР›РЈР“ РџРћ Р’Р«Р’РћР—РЈ РЎРќР•Р“Рђ'
        : type === 'quote'
        ? 'РљРћРњРњР•Р Р§Р•РЎРљРћР• РџР Р•Р”Р›РћР–Р•РќРР•'
        : 'РџРћР›РќР«Р™ РћРўР§РЃРў';

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
        lines.push(`РњРёРЅРёРјР°Р»РєР°: ${formatPrice(quote.minimalCharge)}`);
      }
      if (quote?.deliveryCharge) {
        lines.push(`РџРѕРґР°С‡Р°: ${formatPrice(quote.deliveryCharge)}`);
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

Р—Р°РєР°Р· в„–: ${order.orderNumber || order.id}
Р”Р°С‚Р°: ${new Date().toLocaleDateString('ru')}

Р—РђРљРђР—Р§РРљ:
  ${order.customer}
  ${order.contactInfo?.phone || ''}
  ${order.contactInfo?.email || ''}

РћР‘РЄР•РљРў:
  ${order.address}
  
РџР•Р РРћР” Р РђР‘РћРў:
  РќР°С‡Р°Р»Рѕ: ${formatDateTime(order.scheduledTime)}
  ${order.completedAt ? `Р—Р°РІРµСЂС€РµРЅРёРµ: ${formatDateTime(order.completedAt)}` : ''}

${type === 'quote' ? `в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
                         РЎРњР•РўРђ (РљРџ)
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

${quoteLines()}

в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
РџРћР”Р«РўРћР“: ${formatPrice(quoteSubtotal())}
${vatRate > 0 ? `РќР”РЎ 22%: ${formatPrice(quoteSubtotal() * vatRate)}` : 'РќР”РЎ: Р±РµР· РќР”РЎ'}
РРўРћР“Рћ: ${formatPrice(quoteSubtotal() + (quoteSubtotal() * vatRate))}
` : `в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
                         РРўРћР“Р Р РђР‘РћРў
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ

Р’С‹РїРѕР»РЅРµРЅРѕ СЂРµР№СЃРѕРІ: ${totals.totalTrips}
${order.assetRequirements.map(req => {
  const units = getUnitsForReq(req);
  return `${req.type}: ${formatPrice(req.customerPrice || 0)} Г— ${units} = ${formatPrice((req.customerPrice || 0) * units)}`;
}).join('\n')}

в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
РРўРћР“Рћ Рљ РћРџР›РђРўР•: ${formatPrice(totals.grandTotal)}` }
в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

${type === 'full' ? `
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
                       Р Р•Р•РЎРўР  Р Р•Р™РЎРћР’
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
${confirmedEvidences.map((ev, i) => 
  `${i + 1}. ${formatDateTime(ev.timestamp)} - ${ev.driverName} ${ev.confirmed ? 'вњ“ РџРѕРґС‚РІРµСЂР¶РґС‘РЅ' : 'вЏі РќР° РїСЂРѕРІРµСЂРєРµ'}`
).join('\n')}
` : ''}

в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
           Р”РѕРєСѓРјРµРЅС‚ СЃС„РѕСЂРјРёСЂРѕРІР°РЅ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё
              SnowForce Moscow Dispatch В© 2025
в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
    `;

    // РЎРѕР·РґР°С‘Рј Рё СЃРєР°С‡РёРІР°РµРј С„Р°Р№Р»
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
    setShareStatus(`вњ… Р”РѕРєСѓРјРµРЅС‚ "${type}" СѓСЃРїРµС€РЅРѕ СЃС„РѕСЂРјРёСЂРѕРІР°РЅ Рё Р·Р°РіСЂСѓР¶РµРЅ.`);
    setTimeout(() => setShareStatus(null), 3000);
  }, [calculateOrderTotalsLocal]);

  // РЎРєР°С‡РёРІР°РЅРёРµ Р°СЂС…РёРІР° С„РѕС‚Рѕ
  const downloadPhotos = useCallback(async (order: Order) => {
    setIsProcessingDoc('photos');
    
    // Р’ СЂРµР°Р»СЊРЅРѕРј РїСЂРёР»РѕР¶РµРЅРёРё Р·РґРµСЃСЊ Р±С‹Р» Р±С‹ zip-Р°СЂС…РёРІ
    // РџРѕРєР° РїСЂРѕСЃС‚Рѕ РїРѕРєР°Р·С‹РІР°РµРј СѓРІРµРґРѕРјР»РµРЅРёРµ
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsProcessingDoc(null);
    setShareStatus(`рџ“ё Р¤РѕС‚РѕР°СЂС…РёРІ СЃРѕРґРµСЂР¶РёС‚ ${getConfirmedEvidences(order).length} С„РѕС‚Рѕ. Р¤СѓРЅРєС†РёСЏ РІ СЂР°Р·СЂР°Р±РѕС‚РєРµ.`);
    setTimeout(() => setShareStatus(null), 4000);
  }, [getConfirmedEvidences]);

  // РћС‚РїСЂР°РІРєР° РІ РјРµСЃСЃРµРЅРґР¶РµСЂС‹
  const shareToMessenger = useCallback((order: Order, channel: 'telegram' | 'whatsapp' | 'email') => {
    const totals = calculateOrderTotalsLocal(order);
    const statusLabel = getOrderStatusLabel(order.status);
    const message = encodeURIComponent(
      `рџ“Љ РћС‚С‡С‘С‚ SnowForce\n\n` +
      `РЎС‚Р°С‚СѓСЃ: ${statusLabel}\n` +
      `РћР±СЉРµРєС‚: ${order.address}\n` +
      `Р РµР№СЃРѕРІ: ${totals.totalTrips}\n` +
      `РЎСѓРјРјР°: ${formatPrice(totals.grandTotal)}\n\n` +
      `Р—Р°РєР°Р· в„–${order.orderNumber || order.id}`
    );

    if (channel === 'telegram') {
      window.open(`https://t.me/share/url?text=${message}`, '_blank');
    } else if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    } else {
      window.open(`mailto:?subject=РћС‚С‡С‘С‚ SnowForce ${order.orderNumber}&body=${message}`, '_blank');
    }
  }, [calculateOrderTotalsLocal]);

  // РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ СѓСЃР»РѕРІРёР№
  const handleConfirmOrder = useCallback((orderId: string, urgent: boolean = false) => {
    onUpdateOrder(orderId, {
      status: OrderStatus.SEARCHING_EQUIPMENT,
      isFrozen: true,
      actionLog: [...(orders.find(o => o.id === orderId)?.actionLog || []), {
        id: generateId(),
        orderId,
        timestamp: new Date().toISOString(),
        action: urgent ? 'РЎСЂРѕС‡РЅРѕРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ Р·Р°РєР°Р·С‡РёРєРѕРј' : 'РЈСЃР»РѕРІРёСЏ РїРѕРґС‚РІРµСЂР¶РґРµРЅС‹ Р·Р°РєР°Р·С‡РёРєРѕРј',
        actionType: 'status_change',
        performedBy: customerName || 'Р—Р°РєР°Р·С‡РёРє',
        performedByRole: 'customer',
        previousValue: orders.find(o => o.id === orderId)?.status,
        newValue: OrderStatus.SEARCHING_EQUIPMENT
      }]
    });
    
    setShareStatus(urgent ? 'рџљЂ Р—Р°СЏРІРєР° Р·Р°РїСѓС‰РµРЅР° РЎР РћР§РќРћ! РўРµС…РЅРёРєР° РІС‹РµР·Р¶Р°РµС‚.' : 'вњ… РЈСЃР»РѕРІРёСЏ РїРѕРґС‚РІРµСЂР¶РґРµРЅС‹. РќР°С‡РёРЅР°РµРј СЂР°Р±РѕС‚Сѓ!');
    setTimeout(() => setShareStatus(null), 5000);
  }, [orders, customerName, onUpdateOrder]);

  // Р—Р°РіСЂСѓР·РєР° РїР»Р°С‚С‘Р¶РЅРѕРіРѕ РїРѕСЂСѓС‡РµРЅРёСЏ (РїР»Р°С‚С‘Р¶РєРё) РєР»РёРµРЅС‚РѕРј
  const handleUploadPayment = useCallback((orderId: string, file: File | null) => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    onUpdateOrder(orderId, {
      paymentReceiptUrl: url
    });

    setShareStatus('вњ… РџР»Р°С‚С‘Р¶РєР° Р·Р°РіСЂСѓР¶РµРЅР°. РњРµРЅРµРґР¶РµСЂ СѓРІРёРґРёС‚ РµС‘ РІ СЃРёСЃС‚РµРјРµ.');
    setTimeout(() => setShareStatus(null), 5000);
  }, [onUpdateOrder]);

  // РћС‚РїСЂР°РІРєР° РѕР±СЂР°С‚РЅРѕР№ СЃРІСЏР·Рё
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
    setShareStatus('в­ђ РЎРїР°СЃРёР±Рѕ Р·Р° РѕС‚Р·С‹РІ! Р’Р°С€Рµ РјРЅРµРЅРёРµ РІР°Р¶РЅРѕ РґР»СЏ РЅР°СЃ.');
    setTimeout(() => setShareStatus(null), 4000);
  }, [selectedOrderId, feedbackRating, feedbackComment, onUpdateOrder]);

  // РџРѕРІС‚РѕСЂРЅС‹Р№ Р·Р°РєР°Р·
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
            contractorName: 'Р‘РёСЂР¶Р°', 
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

  // РЁР°РіРё РїСЂРѕРіСЂРµСЃСЃР° РґР»СЏ Р·Р°РєР°Р·Р°
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
    
    // РўРµС…РЅРёРєР° РЅР°Р·РЅР°С‡РµРЅР° РµСЃР»Рё: РµСЃС‚СЊ РІРѕРґРёС‚РµР»Рё РР›Р СЃС‚Р°С‚СѓСЃ СѓР¶Рµ РґРѕС€С‘Р» РґРѕ "РўРµС…РЅРёРєР° РЅР°Р·РЅР°С‡РµРЅР°" РёР»Рё РґР°Р»СЊС€Рµ
    const isTechAssigned = (order.driverDetails || []).length > 0 || 
      [OrderStatus.EQUIPMENT_APPROVED, OrderStatus.EN_ROUTE, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED].includes(normalized);

    return [
      { label: 'РЈСЃР»РѕРІРёСЏ СЃРѕРіР»Р°СЃРѕРІР°РЅС‹', done: isConfirmed, id: 1 },
      { label: 'РўРµС…РЅРёРєР° РЅР°Р·РЅР°С‡РµРЅР°', done: isTechAssigned, id: 2 },
      { label: 'РўРµС…РЅРёРєР° РІ РїСѓС‚Рё', done: isEnRoute || isWorking || isExporting || isPostWork, active: !isPostWork && isTechAssigned && !isEnRoute && !isWorking && !isExporting, id: 3 },
      { label: 'РРґС‘С‚ РІС‹РІРѕР·', done: isWorking || isExporting || isPostWork, active: !isPostWork && isEnRoute, id: 4 },
      { label: 'Р—Р°РІРµСЂС€РµРЅРѕ', done: isFinished, active: isClosingDocs, pulse: isClosingDocs && !order.isPaid, id: 5 }
    ];
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-white font-['Inter']">
      {/* РЈРІРµРґРѕРјР»РµРЅРёРµ */}
      {shareStatus && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[11px] font-black uppercase text-center py-3 fixed top-0 left-0 right-0 z-[100] tracking-widest shadow-2xl animate-in slide-in-from-top duration-300">
          {shareStatus}
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-[#12192c] border-b border-white/5 flex flex-col md:flex-row justify-between items-center sticky top-0 z-20 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">вќ„пёЏ</span>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight">Р›РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚</h1>
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
            рџ“‹ РўРµРєСѓС‰РёРµ
          </button>
          <button onClick={() => setView('form')} className={`px-5 py-2 text-[9px] font-bold uppercase rounded-full transition-all whitespace-nowrap ${view === 'form' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            вћ• РќРѕРІС‹Р№ Р·Р°РєР°Р·
          </button>
          <button onClick={() => { setView('history'); setSelectedOrderId(null); }} className={`px-5 py-2 text-[9px] font-bold uppercase rounded-full transition-all whitespace-nowrap ${view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            рџ“њ РСЃС‚РѕСЂРёСЏ
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
            placeholder="РџРѕРёСЃРє РїРѕ Р°РґСЂРµСЃСѓ РёР»Рё РЅРѕРјРµСЂСѓ Р·Р°РєР°Р·Р°"
            className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-3 text-sm font-bold outline-none focus:border-blue-500"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black uppercase text-slate-500">РЎ</span>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
            />
            <span className="text-[9px] font-black uppercase text-slate-500">РџРѕ</span>
            <input
              type="datetime-local"
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
                РЎР±СЂРѕСЃРёС‚СЊ С„РёР»СЊС‚СЂС‹
              </button>
            )}
          </div>
        </div>
        
        {/* === РђРљРўРР’РќР«Р• Р—РђРљРђР—Р« === */}
        {view === 'active' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {filteredActiveOrders.length === 0 ? (
              <div className="text-center py-24 bg-[#12192c]/40 rounded-[3rem] border border-white/5 border-dashed">
                <div className="text-6xl mb-6 opacity-20">рџљњ</div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 mb-6">РќРµС‚ Р°РєС‚РёРІРЅС‹С… Р·Р°РєР°Р·РѕРІ</p>
                <button 
                  onClick={() => setView('form')} 
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-2xl"
                >
                  РЎРѕР·РґР°С‚СЊ Р·Р°СЏРІРєСѓ
                </button>
              </div>
            ) : (
              filteredActiveOrders.map(order => {
                const totals = calculateOrderTotalsLocal(order);
                const steps = getProgressSteps(order);
                const needsConfirmation = normalizeOrderStatus(order.status) === OrderStatus.AWAITING_CUSTOMER;
                const currentQuote = order.currentQuote;

                return (
                  <div key={order.id} className="bg-[#12192c] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                    {/* Р—Р°РіРѕР»РѕРІРѕРє */}
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

                    {/* РџСЂРѕРіСЂРµСЃСЃ-Р±Р°СЂ */}
                    <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
                      <div className="flex justify-between items-center">
                        {steps.map((step, i) => (
                          <div key={step.id} className="flex flex-col items-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black mb-2 transition-all ${
                              step.done ? 'bg-green-500 text-white' : 
                              step.active ? `bg-blue-500 text-white ${step.pulse ? 'animate-pulse' : ''}` : 
                              'bg-white/10 text-slate-600'
                            }`}>
                              {step.done ? 'вњ“' : i + 1}
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

                    {/* Р‘Р»РѕРє РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ (РµСЃР»Рё РЅСѓР¶РЅРѕ) */}
                    {needsConfirmation && (
                      <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-white/10">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-2">рџ’° Р Р°СЃС‡С‘С‚ РіРѕС‚РѕРІ</h3>
                        
                        {currentQuote && (
                          <div className="bg-white/10 rounded-2xl p-4 mb-4">
                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                              {currentQuote.truckPricePerTrip && (
                                <div>
                                  <span className="text-blue-200">РЎР°РјРѕСЃРІР°Р»:</span>
                                  <span className="font-black ml-2">{formatPrice(currentQuote.truckPricePerTrip)}/СЂРµР№СЃ</span>
                                </div>
                              )}
                              {currentQuote.loaderPricePerShift && (
                                <div>
                                  <span className="text-blue-200">РџРѕРіСЂСѓР·С‡РёРє:</span>
                                  <span className="font-black ml-2">{formatPrice(currentQuote.loaderPricePerShift)}/СЃРјРµРЅР°</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                              <span className="text-[10px] uppercase opacity-80">РћСЂРёРµРЅС‚РёСЂРѕРІРѕС‡РЅРѕ:</span>
                              <span className="text-xl font-black">{formatPrice(currentQuote.estimatedTotal)}</span>
                            </div>
                            {currentQuote.notes?.trim() && (
                              <div className="mt-3 pt-3 border-t border-white/20 text-[10px] text-blue-100">
                                <div className="uppercase tracking-widest font-black text-[9px] text-blue-200 mb-1">РџСЂРёРјРµС‡Р°РЅРёСЏ</div>
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
                            вњ… РџРѕРґС‚РІРµСЂРґРёС‚СЊ СѓСЃР»РѕРІРёСЏ
                          </button>
                          <button 
                            onClick={() => handleConfirmOrder(order.id, true)}
                            className="bg-orange-500 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-orange-400 transition-all"
                          >
                            рџљЂ РЎР РћР§РќРћ
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
                              рџ‘Ђ РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ РљРџ
                            </button>
                            <button
                              type="button"
                              onClick={() => generateReport(order, 'quote')}
                              disabled={isProcessingDoc === 'quote'}
                              className="w-full bg-white text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all disabled:opacity-50"
                            >
                              {isProcessingDoc === 'quote' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'в¬‡ РЎРєР°С‡Р°С‚СЊ РљРџ'}
                            </button>
                            <button
                              type="button"
                              onClick={() => generateReport(order, 'invoice')}
                              disabled={isProcessingDoc === 'invoice'}
                              className="w-full bg-white/10 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all disabled:opacity-50"
                            >
                              {isProcessingDoc === 'invoice' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'рџ§ѕ РЎРєР°С‡Р°С‚СЊ СЃС‡С‘С‚'}
                            </button>
                            <button
                              type="button"
                              onClick={() => generateReport(order, 'contract')}
                              disabled={isProcessingDoc === 'contract'}
                              className="w-full bg-white/10 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all disabled:opacity-50"
                            >
                              {isProcessingDoc === 'contract' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'рџ“„ РЎРєР°С‡Р°С‚СЊ РґРѕРіРѕРІРѕСЂ'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* РРЅС„Рѕ-Р±Р»РѕРєРё */}
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Р РµР№СЃРѕРІ</div>
                        <div className="text-2xl font-black">
                          {getCustomerTripsCount(order)} <span className="text-sm text-slate-500">/ {order.plannedTrips}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">РўРµС…РЅРёРєР°</div>
                        <div className="flex gap-2">
                          {order.assetRequirements.map((req, i) => (
                            <span key={i} className="text-lg">{req.type === AssetType.LOADER ? 'рџљњ' : 'рџљ›'}</span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">РњРµРЅРµРґР¶РµСЂ</div>
                        <div className="text-sm font-black">{order.managerName || 'РќР°Р·РЅР°С‡Р°РµС‚СЃСЏ'}</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">РЎСѓРјРјР°</div>
                        <div className="text-xl font-black text-green-400">{formatPrice(totals.grandTotal)}</div>
                      </div>
                    </div>

                    {getCustomerEvidences(order).length > 0 && (
                      <div className="px-6 pb-6">
                        <div className="text-[10px] font-black text-slate-500 uppercase mb-3">Р¤РѕС‚Рѕ СЂРµР№СЃРѕРІ</div>
                        {(() => {
                          const photoTypeLabels: Record<string, string> = {
                            loading: 'рџ“¦ РџРѕРіСЂСѓР·РєР°',
                            full_truck: 'рџљ› РџРѕР»РЅС‹Р№ РєСѓР·РѕРІ',
                            unloading: 'рџ“¤ Р’С‹РіСЂСѓР·РєР°',
                            ticket: 'рџЋ« РўР°Р»РѕРЅ',
                            other: 'рџ“ё Р¤РѕС‚Рѕ'
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
                            return <div className="p-4 text-center text-[9px] text-slate-500">РќРµС‚ С„РѕС‚Рѕ</div>;
                          }
                          return (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {photos.map(photo => (
                                <div key={photo.key} className="min-w-[220px] rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                  <div className="relative">
                                    <img
                                      src={photo.url}
                                      className="w-full h-28 object-cover"
                                      alt={`Р РµР№СЃ #${photo.tripNumber} - ${photoTypeLabels[photo.type] || 'Р¤РѕС‚Рѕ'}`}
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-white px-2 py-1 text-center">
                                      {photoTypeLabels[photo.type] || 'Р¤РѕС‚Рѕ'} В· Р РµР№СЃ #{photo.tripNumber}
                                    </div>
                                  </div>
                                  <div className="p-2 text-[9px] text-slate-400">
                                    <div className="font-black text-slate-300 truncate">{photo.address || 'РђРґСЂРµСЃ РЅРµ СѓРєР°Р·Р°РЅ'}</div>
                                    <div>{formatDateTime(photo.timestamp)}</div>
                                    {photo.driverName && (
                                      <div className="text-[8px] text-slate-500 truncate">Р’РѕРґРёС‚РµР»СЊ: {photo.driverName}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* РљРЅРѕРїРєРё РґРµР№СЃС‚РІРёР№ */}
                    <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-col md:flex-row gap-3">
                      {/* Р‘Р»РѕРє РґРѕРєСѓРјРµРЅС‚РѕРІ РїРѕСЃР»Рµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ РєР»РёРµРЅС‚Р° */}
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
                                  onClick={() => generateReport(order, 'act')}
                                  disabled={isProcessingDoc === 'act'}
                                  className="flex-1 bg-slate-600/20 text-slate-200 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-slate-500/40 hover:bg-slate-500 hover:text-white transition-all disabled:opacity-50"
                                >
                                  {isProcessingDoc === 'act' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'рџ“Ћ РЎРєР°С‡Р°С‚СЊ Р·Р°РєСЂС‹РІР°СЋС‰РёРµ'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => shareToMessenger(order, 'telegram')}
                                className="flex-1 bg-blue-600/20 text-blue-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-blue-500/40 hover:bg-blue-500 hover:text-white transition-all"
                              >
                                рџ“¤ Telegram
                              </button>
                              <button
                                type="button"
                                onClick={() => shareToMessenger(order, 'whatsapp')}
                                className="flex-1 bg-green-600/20 text-green-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-green-500/40 hover:bg-green-500 hover:text-white transition-all"
                              >
                                рџ’¬ WhatsApp
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => generateReport(order, 'invoice')}
                                className="flex-1 bg-green-600/20 text-green-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-green-500/40 hover:bg-green-500 hover:text-white transition-all"
                              >
                                рџ’ѕ РЎРєР°С‡Р°С‚СЊ СЃС‡С‘С‚
                              </button>
                              <button
                                type="button"
                                onClick={() => generateReport(order, 'contract')}
                                className="flex-1 bg-emerald-600/15 text-emerald-300 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-emerald-500/40 hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                рџ“„ РЎРєР°С‡Р°С‚СЊ РґРѕРіРѕРІРѕСЂ
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
                            {order.paymentReceiptUrl ? 'вњ… РџР»Р°С‚С‘Р¶РєР° Р·Р°РіСЂСѓР¶РµРЅР°' : 'в¬† Р—Р°РіСЂСѓР·РёС‚СЊ РїР»Р°С‚С‘Р¶РєСѓ'}
                          </label>
                        </div>
                      )}

                      <div className="flex-1 flex gap-3">
                        <a href={`tel:+70000000000`} className="flex-1 bg-white/10 text-white text-center py-3 rounded-xl text-[10px] font-black uppercase hover:bg-white/20 transition-all">
                          рџ“ћ РџРѕР·РІРѕРЅРёС‚СЊ
                        </a>
                        <button className="flex-1 bg-blue-600/20 text-blue-400 text-center py-3 rounded-xl text-[10px] font-black uppercase border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all">
                          рџ’¬ РќР°РїРёСЃР°С‚СЊ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === Р¤РћР РњРђ РќРћР’РћР“Рћ Р—РђРљРђР—Рђ === */}
        {view === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* РљРѕР»РѕРЅРєР° 1: РђРґСЂРµСЃ */}
              <div className="bg-[#12192c]/60 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                  рџ“Ќ <span className="text-white opacity-80">РђРґСЂРµСЃ РѕР±СЉРµРєС‚Р°</span>
                </h3>
                <input
                  required
                  type="text"
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-lg font-black outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 mb-4"
                  placeholder="РЈР»РёС†Р°, РґРѕРј"
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

              {/* РљРѕР»РѕРЅРєР° 2: РўРµС…РЅРёРєР° */}
              <div className="bg-[#12192c]/60 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-400 mb-6 flex items-center gap-2">
                  рџљ› <span className="text-white opacity-80">РўРµС…РЅРёРєР°</span>
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'РЎР°РјРѕСЃРІР°Р»С‹', type: AssetType.TRUCK, icon: 'рџљ›' },
                    { label: 'РџРѕРіСЂСѓР·С‡РёРє', type: AssetType.LOADER, icon: 'рџљњ' },
                    { label: 'РњРёРЅРё-РїРѕРіСЂСѓР·С‡РёРє', type: AssetType.MINI_LOADER, icon: 'рџљњ' }
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
                        {formData.assetRequirements?.some(r => r.type === item.type) && <span className="text-xs">вњ“</span>}
                      </div>
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-white/5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">РћРіСЂР°РЅРёС‡РµРЅРёСЏ</label>
                  <div className="space-y-2">
                    {[
                      { label: 'РћРіСЂР°РЅРёС‡РµРЅРёРµ РІС‹СЃРѕС‚С‹', field: 'hasHeightLimit', icon: 'в†•пёЏ' },
                      { label: 'РЈР·РєРёР№ РІСЉРµР·Рґ', field: 'hasNarrowEntrance', icon: 'в†”пёЏ' },
                      { label: 'РџСЂРѕРїСѓСЃРєРЅРѕР№ СЂРµР¶РёРј', field: 'hasPermitRegime', icon: 'рџЋ«' },
                      { label: 'РќРѕС‡СЊСЋ РЅРµР»СЊР·СЏ', field: 'isNightWorkProhibited', icon: 'рџЊ™' }
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

              {/* РљРѕР»РѕРЅРєР° 3: РљРѕРЅС‚Р°РєС‚С‹ */}
              <div className="bg-[#12192c]/60 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md flex flex-col">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-green-400 mb-6 flex items-center gap-2">
                  рџ‘¤ <span className="text-white opacity-80">РљРѕРЅС‚Р°РєС‚С‹</span>
                </h3>
                
                <div className="space-y-4 flex-1">
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl p-4 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700" 
                    placeholder="Р’Р°С€Рµ РёРјСЏ" 
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
                    placeholder="Email (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)" 
                    value={formData.contactInfo?.email} 
                    onChange={e => updateContact('email', e.target.value)} 
                  />
                  
                  <div className="pt-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
                      РџСЂРёРјРµСЂРЅС‹Р№ РѕР±СЉС‘Рј (СЂРµР№СЃРѕРІ)
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
                    placeholder="РљРѕРјРјРµРЅС‚Р°СЂРёР№ (РїСЂРѕРµР·Рґ, РѕСЃРѕР±РµРЅРЅРѕСЃС‚Рё)" 
                    value={formData.restrictions?.comment} 
                    onChange={(e) => updateRestriction('comment', e.target.value)} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-2xl border-b-4 border-blue-800 transition-all active:scale-[0.98] mt-6"
                >
                  рџ“¤ РћС‚РїСЂР°РІРёС‚СЊ Р·Р°СЏРІРєСѓ
                </button>
              </div>
            </div>
          </form>
        )}

        {/* === РРЎРўРћР РРЇ Р—РђРљРђР—РћР’ === */}
        {view === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            {filteredCompletedOrders.length === 0 ? (
              <div className="text-center py-24 bg-[#12192c]/40 rounded-[3rem] border border-white/5 border-dashed">
                <div className="text-6xl mb-6 opacity-20">рџ“њ</div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">РСЃС‚РѕСЂРёСЏ РїСѓСЃС‚Р°</p>
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
                            вњ“ Р’С‹РїРѕР»РЅРµРЅРѕ
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
                        <div className="text-[9px] text-slate-500">{totals.totalTrips} СЂРµР№СЃРѕРІ</div>
                      </div>
                    </div>

                    {/* Р”РѕРєСѓРјРµРЅС‚С‹ */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      <button 
                        onClick={() => generateReport(order, 'act')}
                        disabled={isProcessingDoc === 'act'}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                      >
                        <span className="text-2xl block mb-1">рџ“„</span>
                        <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'act' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'РђРєС‚'}</span>
                      </button>
                      <button 
                        onClick={() => generateReport(order, 'invoice')}
                        disabled={isProcessingDoc === 'invoice'}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                      >
                        <span className="text-2xl block mb-1">рџ§ѕ</span>
                        <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'invoice' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'РЎС‡С‘С‚'}</span>
                      </button>
                      <button 
                        onClick={() => generateReport(order, 'full')}
                        disabled={isProcessingDoc === 'full'}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                      >
                        <span className="text-2xl block mb-1">рџ“Љ</span>
                        <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'full' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'РџРѕР»РЅС‹Р№ РѕС‚С‡С‘С‚'}</span>
                      </button>
                      <button 
                        onClick={() => downloadPhotos(order)}
                        disabled={isProcessingDoc === 'photos'}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-xl text-center transition-all border border-white/5 disabled:opacity-50"
                      >
                        <span className="text-2xl block mb-1">рџ“ё</span>
                        <span className="text-[9px] font-black uppercase">{isProcessingDoc === 'photos' ? 'РЎР±РѕСЂРєР°...' : `Р¤РѕС‚Рѕ (${getConfirmedEvidences(order).length})`}</span>
                      </button>
                    </div>

                    {/* РџРѕРґРµР»РёС‚СЊСЃСЏ */}
                    <div className="flex gap-3 mb-6">
                      <button 
                        onClick={() => shareToMessenger(order, 'telegram')}
                        className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        вњ€пёЏ Telegram
                      </button>
                      <button 
                        onClick={() => shareToMessenger(order, 'whatsapp')}
                        className="flex-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        рџ’¬ WhatsApp
                      </button>
                      <button 
                        onClick={() => shareToMessenger(order, 'email')}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        вњ‰пёЏ Email
                      </button>
                    </div>

                    {getConfirmedEvidences(order).length > 0 && (
                      <div className="mt-6">
                        <div className="text-[10px] font-black text-slate-500 uppercase mb-3">Р¤РѕС‚Рѕ СЂРµР№СЃРѕРІ</div>
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
                            return <div className="p-4 text-center text-[9px] text-slate-500">РќРµС‚ С„РѕС‚Рѕ</div>;
                          }
                          return (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                              {confirmedPhotos.map(photo => (
                                <div key={photo.key} className="min-w-[220px] rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                  <div className="relative">
                                    <img
                                      src={photo.url}
                                      className="w-full h-28 object-cover"
                                      alt={`Р РµР№СЃ #${photo.tripNumber}`}
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white px-2 py-1">
                                      Р РµР№СЃ #{photo.tripNumber}
                                    </div>
                                  </div>
                                  <div className="p-2 text-[9px] text-slate-400">
                                    <div className="font-black text-slate-300 truncate">{photo.address || 'РђРґСЂРµСЃ РЅРµ СѓРєР°Р·Р°РЅ'}</div>
                                    <div>{formatDateTime(photo.timestamp)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* РћР±СЂР°С‚РЅР°СЏ СЃРІСЏР·СЊ */}
                    <div className="flex gap-3 pt-4 border-t border-white/5">
                      {order.feedback ? (
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className={`text-lg ${star <= order.feedback!.rating ? 'text-yellow-400' : 'text-slate-700'}`}>в…</span>
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-500">РЎРїР°СЃРёР±Рѕ Р·Р° РѕС‚Р·С‹РІ!</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setSelectedOrderId(order.id); setShowFeedbackModal(true); }}
                          className="flex-1 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all"
                        >
                          в­ђ РћСЃС‚Р°РІРёС‚СЊ РѕС‚Р·С‹РІ
                        </button>
                      )}
                      <button 
                        onClick={() => repeatOrder(order)}
                        className="bg-white/5 hover:bg-blue-600 text-slate-400 hover:text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all"
                      >
                        рџ”„ РџРѕРІС‚РѕСЂРёС‚СЊ
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* РњРѕРґР°Р»РєР° РѕР±СЂР°С‚РЅРѕР№ СЃРІСЏР·Рё */}
      {showQuotePreview && quotePreviewOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase tracking-tight">РљРѕРјРјРµСЂС‡РµСЃРєРѕРµ РїСЂРµРґР»РѕР¶РµРЅРёРµ</h3>
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
                      <div className="text-sm uppercase text-slate-500 font-black">Р—Р°РєР°Р· в„– {quotePreviewOrder.orderNumber || quotePreviewOrder.id}</div>
                      <div className="text-xs text-slate-400 mt-1">Р”Р°С‚Р°: {new Date().toLocaleDateString('ru')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase text-slate-400">РЎСѓРјРјР°</div>
                      <div className="text-2xl font-black text-slate-900">{formatPrice(preview.total)}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-500 mb-2">Р—Р°РєР°Р·С‡РёРє</div>
                      <div className="text-sm font-black">{quotePreviewOrder.customer}</div>
                      <div className="text-xs text-slate-500">{quotePreviewOrder.contactInfo?.phone || ''}</div>
                      <div className="text-xs text-slate-500">{quotePreviewOrder.contactInfo?.email || ''}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-500 mb-2">РћР±СЉРµРєС‚</div>
                      <div className="text-sm font-black">{quotePreviewOrder.address}</div>
                      <div className="text-xs text-slate-500">РџРѕРґР°С‡Р°: {formatDateTime(quotePreviewOrder.scheduledTime)}</div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <div className="text-[10px] font-black uppercase text-slate-500 mb-3">РЎРјРµС‚Р°</div>
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
                      <span className="text-slate-500">РџРѕРґС‹С‚РѕРі</span>
                      <span className="font-black">{formatPrice(preview.subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">РќР”РЎ</span>
                      <span className="font-black">{preview.vatRate > 0 ? formatPrice(preview.vat) : 'Р±РµР· РќР”РЎ'}</span>
                    </div>
                    <div className="flex items-center justify-between text-base">
                      <span className="font-black">РС‚РѕРіРѕ</span>
                      <span className="font-black">{formatPrice(preview.total)}</span>
                    </div>
                  </div>
                  {preview.notes?.trim() && (
                    <div className="mt-6 border-t border-slate-200 pt-4">
                      <div className="text-[10px] font-black uppercase text-slate-500 mb-2">РџСЂРёРјРµС‡Р°РЅРёСЏ</div>
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
                {isProcessingDoc === 'quote' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'в¬‡ РЎРєР°С‡Р°С‚СЊ РљРџ'}
              </button>
              <button
                type="button"
                onClick={() => generateReport(quotePreviewOrder, 'invoice')}
                disabled={isProcessingDoc === 'invoice'}
                className="bg-slate-100 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {isProcessingDoc === 'invoice' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'рџ§ѕ РЎРєР°С‡Р°С‚СЊ СЃС‡С‘С‚'}
              </button>
              <button
                type="button"
                onClick={() => generateReport(quotePreviewOrder, 'contract')}
                disabled={isProcessingDoc === 'contract'}
                className="bg-slate-100 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {isProcessingDoc === 'contract' ? 'Р“РµРЅРµСЂР°С†РёСЏ...' : 'рџ“„ РЎРєР°С‡Р°С‚СЊ РґРѕРіРѕРІРѕСЂ'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuotePreview(false);
                  setQuotePreviewOrder(null);
                }}
                className="bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Р—Р°РєСЂС‹С‚СЊ
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#12192c] rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/10">
            <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-center">в­ђ РћС†РµРЅРёС‚Рµ СЂР°Р±РѕС‚Сѓ</h3>
            
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
              placeholder="Р’Р°С€ РєРѕРјРјРµРЅС‚Р°СЂРёР№ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)"
              value={feedbackComment}
              onChange={e => setFeedbackComment(e.target.value)}
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 bg-white/10 text-white py-4 rounded-xl text-[11px] font-black uppercase"
              >
                РћС‚РјРµРЅР°
              </button>
              <button 
                onClick={submitFeedback}
                className="flex-1 bg-blue-600 text-white py-4 rounded-xl text-[11px] font-black uppercase"
              >
                РћС‚РїСЂР°РІРёС‚СЊ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;

