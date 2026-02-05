import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Order, OrderStatus, ManagerName, Contractor, AssetRequirement, AssetType, Customer, Bid, Quote, ActionLog, formatPrice, formatDateTime, generateId, PriceUnit, FULL_ORDER_STATUS_FLOW, getOrderStatusLabel, getNormalizedStatusLabel, normalizeOrderStatus, calculateOrderTotals, isTruckType, isLoaderType, toLocalDateTimeInputValue } from './types';

interface OrderFormProps {
  initialData?: Order;
  contractors: Contractor[];
  customers: Customer[];
  allOrders: Order[];
  onSubmit: (data: Partial<Order>, keepOpen?: boolean) => void;
  onDelete: (orderId: string) => void;
  onCancel: () => void;
  onAddContractor: () => void;
  onAddCustomer: () => void;
  currentUser: ManagerName;
}

const OrderForm: React.FC<OrderFormProps> = ({
  initialData,
  contractors,
  customers,
  onSubmit,
  onDelete,
  onCancel,
  currentUser
}) => {
  const [formData, setFormData] = useState<Partial<Order>>(initialData || {
    customer: '',
    address: '',
    assetRequirements: [],
    plannedTrips: 10,
    scheduledTime: toLocalDateTimeInputValue(),
    status: OrderStatus.NEW_REQUEST,
    managerName: currentUser,
    isBirzhaOpen: false,
    isFrozen: false,
    evidences: [],
    assignedDrivers: [],
    driverDetails: [],
    bids: [],
    applicants: [],
    actualTrips: 0,
    actionLog: []
  });

  const [activeSection, setActiveSection] = useState<'info' | 'pricing' | 'trips' | 'history'>('info');
  const [customerSearch, setCustomerSearch] = useState(initialData?.customer || '');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    truckPricePerTrip: 0,
    loaderPricePerShift: 0,
    minimalCharge: 0,
    deliveryCharge: 0,
    notes: ''
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Вычисляемые значения
  const hasDirectOffers = useMemo(() => formData.assetRequirements?.some(r => r.contractorId), [formData.assetRequirements]);
  const hasBirzhaSlots = useMemo(() => formData.assetRequirements?.some(r => !r.contractorId), [formData.assetRequirements]);
  const hasBirzhaPrices = useMemo(
    () => (formData.assetRequirements || []).filter(r => !r.contractorId).every(r => (r.contractorPrice || 0) > 0),
    [formData.assetRequirements]
  );
  const isApprovedByCustomer = [OrderStatus.SEARCHING_EQUIPMENT, OrderStatus.EQUIPMENT_APPROVED, OrderStatus.EN_ROUTE, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED].includes(normalizeOrderStatus(formData.status as OrderStatus));
  const pendingBids = useMemo(() => (formData.bids || []).filter(b => b.status === 'pending'), [formData.bids]);
  const isOrderCompleted = normalizeOrderStatus(formData.status as OrderStatus) === OrderStatus.COMPLETED;
  const allDriversCompleted = (formData.driverDetails || []).length > 0 &&
    (formData.driverDetails || []).every(d => d.status === 'completed');
  const unconfirmedEvidences = useMemo(() => (formData.evidences || []).filter(e => !e.confirmed), [formData.evidences]);
  const confirmedEvidences = useMemo(() => (formData.evidences || []).filter(e => e.confirmed), [formData.evidences]);
  const totalPaid = useMemo(() => {
    return (formData.payments || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [formData.payments]);

  // Расчёт итогов
  const totals = useMemo(() => {
    return calculateOrderTotals(formData as Order, { mode: 'actual_or_planned', includeCharges: true });
  }, [formData.assetRequirements, formData.driverDetails, formData.evidences, formData.plannedTrips, formData.status]);
  const requiredPayment = (formData.totalCustomerPrice || totals.customerTotal || 0);
  const isFullyPaid = requiredPayment > 0 ? totalPaid >= requiredPayment : totalPaid > 0;
  const isPaymentConfirmed = !!formData.isPaid || isFullyPaid;

  // Логирование действий
  const createActionLog = useCallback((action: string, actionType: ActionLog['actionType'], prevValue?: string, newValue?: string) => ({
    id: generateId(),
    orderId: formData.id || '',
    timestamp: new Date().toISOString(),
    action,
    actionType,
    performedBy: currentUser,
    performedByRole: 'manager',
    previousValue: prevValue,
    newValue: newValue
  }), [currentUser, formData.id]);

  const logAction = useCallback((action: string, actionType: ActionLog['actionType'], prevValue?: string, newValue?: string) => {
    const log = createActionLog(action, actionType, prevValue, newValue);
    setFormData(prev => ({
      ...prev,
      actionLog: [...(prev.actionLog || []), log]
    }));
    return log;
  }, [createActionLog]);

  // Обработчики
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleDelete = () => {
    if (!formData.id) return;
    if (!confirm('Удалить заявку? Она исчезнет у всех участников.')) return;
    onDelete(formData.id);
  };

  const handleSelectCustomer = (c: Customer) => {
    setFormData(prev => ({
      ...prev,
      customer: c.name,
      customerId: c.id,
      contactInfo: { name: c.name, phone: c.phone, email: c.email, inn: c.inn }
    }));
    setCustomerSearch(c.name);
    setShowCustomerDropdown(false);
  };

  const updateAsset = (idx: number, field: keyof AssetRequirement, value: any) => {
    const updated = [...(formData.assetRequirements || [])];
    if (field === 'contractorId') {
      const c = contractors.find(item => item.id === value);
      updated[idx] = { ...updated[idx], contractorId: value, contractorName: c ? c.name : 'Биржа' };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setFormData({ ...formData, assetRequirements: updated });
  };

  const addAsset = (type: AssetType) => {
    const priceUnit = isLoaderType(type) ? PriceUnit.PER_SHIFT : PriceUnit.PER_TRIP;
    const newAsset: AssetRequirement = {
      id: generateId(),
      type,
      contractorId: '',
      contractorName: 'Биржа',
      plannedUnits: 1,
      customerPrice: 0,
      contractorPrice: 0,
      priceUnit
    };
    setFormData({ ...formData, assetRequirements: [...(formData.assetRequirements || []), newAsset] });
  };

  const removeAsset = (idx: number) => {
    const updated = [...(formData.assetRequirements || [])];
    updated.splice(idx, 1);
    setFormData({ ...formData, assetRequirements: updated });
  };

  // Утверждение отклика
  const approveBid = (bid: Bid) => {
    const bidsArray = formData.bids || [];
    const bidIndex = bidsArray.findIndex(b => b.id === bid.id);
    if (bidIndex === -1) return;

    const updatedBids = [...bidsArray];
    updatedBids[bidIndex] = { ...bid, status: 'accepted' };

    let requirementUpdated = false;
    const updatedRequirements = (formData.assetRequirements || []).map(req => {
      if (requirementUpdated) return req;
      if (req.type !== bid.assetType) return req;
      if (req.contractorId && req.contractorId !== bid.contractorId) return req;
      requirementUpdated = true;
      return {
        ...req,
        contractorId: bid.contractorId,
        contractorName: bid.contractorName || req.contractorName,
        contractorPrice: bid.proposedPrice,
        priceUnit: bid.priceUnit || req.priceUnit
      };
    });

    const newDriverDetail = {
      id: generateId(),
      orderId: formData.id || '',
      driverName: bid.driverName,
      driverId: bid.driverId,
      contractorId: bid.contractorId,
      contractorName: bid.contractorName,
      assetType: bid.assetType,
      assignedPrice: bid.proposedPrice,
      priceUnit: bid.priceUnit,
      assignedAt: new Date().toISOString(),
      assignedBy: currentUser,
      status: 'assigned' as const
    };

    const updated = {
      ...formData,
      bids: updatedBids,
      assetRequirements: updatedRequirements,
      driverDetails: [...(formData.driverDetails || []), newDriverDetail],
      assignedDrivers: [...(formData.assignedDrivers || []), bid.driverName],
      status: normalizeOrderStatus(formData.status as OrderStatus) === OrderStatus.SEARCHING_EQUIPMENT ? OrderStatus.EQUIPMENT_APPROVED : formData.status,
      actionLog: [...(formData.actionLog || []), {
        id: generateId(),
        orderId: formData.id || '',
        timestamp: new Date().toISOString(),
        action: `Утверждён отклик от ${bid.driverName}`,
        actionType: 'assignment' as const,
        performedBy: currentUser,
        performedByRole: 'manager' as const
      }]
    };

    setFormData(updated);
    onSubmit(updated, true); // keepOpen = true, чтобы форма не закрывалась
  };

  const rejectBid = (bid: Bid) => {
    const bidsArray = formData.bids || [];
    const bidIndex = bidsArray.findIndex(b => b.id === bid.id);
    if (bidIndex === -1) return;

    const updatedBids = [...bidsArray];
    updatedBids[bidIndex] = { ...bid, status: 'rejected' };
    
    const updated = {
      ...formData,
      bids: updatedBids,
      actionLog: [...(formData.actionLog || []), {
        id: generateId(),
        orderId: formData.id || '',
        timestamp: new Date().toISOString(),
        action: `Отклонён отклик от ${bid.driverName}`,
        actionType: 'assignment' as const,
        performedBy: currentUser,
        performedByRole: 'manager' as const
      }]
    };
    
    setFormData(updated);
  };

  // Подтверждение рейса
  const confirmTrip = (evidenceId: string) => {
    const updatedEvidences = (formData.evidences || []).map(e =>
      e.id === evidenceId ? { ...e, confirmed: true, confirmedAt: new Date().toISOString(), confirmedBy: currentUser } : e
    );
    const newActualTrips = updatedEvidences.filter(e => e.confirmed).length;

    const log = createActionLog('Подтверждён рейс', 'trip_confirmed');
    const updated = {
      ...formData,
      evidences: updatedEvidences,
      actualTrips: newActualTrips,
      actionLog: [...(formData.actionLog || []), log]
    };

    setFormData(updated);
    onSubmit(updated, true); // keepOpen = true
  };

  const confirmAllTrips = () => {
    const unconfirmed = (formData.evidences || []).filter(e => !e.confirmed);
    if (unconfirmed.length === 0) return;
    const updatedEvidences = (formData.evidences || []).map(e =>
      e.confirmed ? e : { ...e, confirmed: true, confirmedAt: new Date().toISOString(), confirmedBy: currentUser }
    );
    const newActualTrips = updatedEvidences.filter(e => e.confirmed).length;
    const log = createActionLog(`Подтверждены все рейсы (${unconfirmed.length})`, 'trip_confirmed');
    const updated = {
      ...formData,
      evidences: updatedEvidences,
      actualTrips: newActualTrips,
      actionLog: [...(formData.actionLog || []), log]
    };
    setFormData(updated);
    onSubmit(updated, true); // keepOpen = true
  };

  const rejectTrip = (evidenceId: string, reason: string) => {
    const updatedEvidences = (formData.evidences || []).map(e =>
      e.id === evidenceId ? { ...e, rejectionReason: reason } : e
    );
    const log = createActionLog(`Отклонён рейс: ${reason}`, 'trip_confirmed');
    setFormData({ ...formData, evidences: updatedEvidences, actionLog: [...(formData.actionLog || []), log] });
  };

  // Умные действия
  const smartAction = (action: 'send_quote' | 'open_birzha' | 'close_birzha' | 'send_direct' | 'change_status', newStatus?: OrderStatus) => {
    let updated = { ...formData };

    if (action === 'send_quote') {
      updated.status = OrderStatus.AWAITING_CUSTOMER;
      logAction('КП отправлено заказчику', 'status_change', formData.status, OrderStatus.AWAITING_CUSTOMER);
    } else if (action === 'open_birzha') {
      updated.isBirzhaOpen = true;
      updated.status = OrderStatus.SEARCHING_EQUIPMENT;
      logAction('Заказ размещён на бирже', 'status_change');
    } else if (action === 'close_birzha') {
      updated.isBirzhaOpen = false;
      logAction('Биржа закрыта диспетчером', 'status_change');
    } else if (action === 'send_direct') {
      updated.isBirzhaOpen = true;
      logAction('Отправлены персональные предложения подрядчикам', 'other');
      alert('📨 Уведомления отправлены подрядчикам!');
    } else if (action === 'change_status' && newStatus) {
      if ([OrderStatus.COMPLETED, OrderStatus.AWAITING_CLOSING_DOCS].includes(newStatus) && !allDriversCompleted) {
        alert('Завершить вывоз можно только после того, как вся техника завершила работу.');
        return;
      }
      if (newStatus === OrderStatus.COMPLETED && !isPaymentConfirmed) {
        alert('Завершить сделку можно только после поступления доплаты.');
        return;
      }
      const prevStatus = updated.status;
      updated.status = newStatus;
      if (newStatus === OrderStatus.SEARCHING_EQUIPMENT) {
        updated.isFrozen = true;
      }
      logAction(`Статус изменён`, 'status_change', prevStatus, newStatus);
    }

    setFormData(updated);
    onSubmit(updated, true); // keepOpen = true для статусов и действий
  };

  // Открытие модалки КП с заполнением цен из assetRequirements
  const openQuoteModal = () => {
    // Находим цены из assetRequirements
    let truckPrice = 0;
    let loaderPrice = 0;
    let minimalCharge = 0;
    let deliveryCharge = 0;
    let chargesSet = false;

    (formData.assetRequirements || []).forEach(req => {
      if (isTruckType(req.type) && req.priceUnit === PriceUnit.PER_TRIP) {
        truckPrice = req.customerPrice || 0;
        if (!chargesSet) {
          minimalCharge = req.minimalCharge || 0;
          deliveryCharge = req.deliveryCharge || 0;
          chargesSet = true;
        }
      } else if (isLoaderType(req.type)) {
        loaderPrice = req.customerPrice || 0;
      }
    });

    // Заполняем форму найденными ценами
    setQuoteForm({
      truckPricePerTrip: truckPrice,
      loaderPricePerShift: loaderPrice,
      minimalCharge: minimalCharge,
      deliveryCharge: deliveryCharge,
      notes: ''
    });
    setShowQuoteModal(true);
  };

  // Создание КП
  const createQuote = () => {
    const requirements = formData.assetRequirements || [];
    const firstTruckIndex = requirements.findIndex(req => isTruckType(req.type));
    const quoteOrder: Order = {
      ...(formData as Order),
      assetRequirements: requirements.map((req, idx) => {
        let customerPrice = req.customerPrice;
        if (isTruckType(req.type)) {
          customerPrice = quoteForm.truckPricePerTrip;
        } else if (isLoaderType(req.type)) {
          customerPrice = quoteForm.loaderPricePerShift;
        }
        return {
          ...req,
          customerPrice,
          minimalCharge: idx === firstTruckIndex ? quoteForm.minimalCharge : 0,
          deliveryCharge: idx === firstTruckIndex ? quoteForm.deliveryCharge : 0
        };
      })
    };
    const quoteTotals = calculateOrderTotals(quoteOrder, { mode: 'planned', includeCharges: true });
    const quote: Quote = {
      id: generateId(),
      orderId: formData.id || '',
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      truckPricePerTrip: quoteForm.truckPricePerTrip,
      loaderPricePerShift: quoteForm.loaderPricePerShift,
      minimalCharge: quoteForm.minimalCharge,
      deliveryCharge: quoteForm.deliveryCharge,
      estimatedTotal: quoteTotals.customerTotal,
      notes: quoteForm.notes,
      status: 'sent'
    };

    setFormData(prev => ({
      ...prev,
      quotes: [...(prev.quotes || []), quote],
      currentQuote: quote,
      status: OrderStatus.AWAITING_CUSTOMER
    }));

    logAction('Создано и отправлено КП', 'price_update');
    setShowQuoteModal(false);
    onSubmit({ ...formData, quotes: [...(formData.quotes || []), quote], currentQuote: quote, status: OrderStatus.AWAITING_CUSTOMER }, true); // keepOpen = true
  };

  // Статусы для степпера
  const statusSteps = [
    OrderStatus.NEW_REQUEST,
    OrderStatus.AWAITING_CUSTOMER,
    OrderStatus.SEARCHING_EQUIPMENT,
    OrderStatus.EQUIPMENT_APPROVED,
    OrderStatus.EN_ROUTE,
    OrderStatus.IN_PROGRESS,
    OrderStatus.COMPLETED
  ];

  const normalizedStatus = normalizeOrderStatus(formData.status as OrderStatus);
  const currentStepIndex = statusSteps.indexOf(normalizedStatus);

  const statusActions = [
    { from: [OrderStatus.AWAITING_CUSTOMER], to: OrderStatus.SEARCHING_EQUIPMENT, label: 'Клиент согласовал' },
    { from: [OrderStatus.SEARCHING_EQUIPMENT], to: OrderStatus.EQUIPMENT_APPROVED, label: 'Техника назначена' },
    { from: [OrderStatus.EQUIPMENT_APPROVED], to: OrderStatus.EN_ROUTE, label: 'В пути' },
    { from: [OrderStatus.EN_ROUTE], to: OrderStatus.IN_PROGRESS, label: 'В работе' },
  ];

  return (
    <div className="bg-[#0a0f1d] rounded-[2.5rem] shadow-2xl border border-white/5 max-w-6xl mx-auto max-h-[95vh] overflow-hidden font-['Inter'] text-white flex flex-col">
      {/* HEADER */}
      <div className="p-6 border-b border-white/5 flex justify-between items-start shrink-0">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">
            {initialData ? `Заказ #${initialData.orderNumber || initialData.id?.slice(0, 8)}` : 'Новый заказ'}
          </h2>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-lg">
              👤 {formData.managerName}
            </span>
            {formData.isBirzhaOpen && (
              <span className="text-[10px] font-black text-green-400 bg-green-500/10 px-3 py-1 rounded-lg animate-pulse">
                ● Биржа активна
              </span>
            )}
            {formData.isFrozen && (
              <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-lg">
                🔒 Заморожен
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {formData.id && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 text-2xl transition-colors"
              title="Удалить заявку"
            >
              🗑️
            </button>
          )}
        <button onClick={onCancel} className="text-white/20 hover:text-white text-3xl transition-colors">×</button>
        </div>
      </div>

      {/* PROGRESS STEPPER */}
      <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 shrink-0">
        <div className="flex justify-between items-center relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0"></div>
          {statusSteps.map((s, i) => {
            const isActive = normalizedStatus === s;
            const isDone = currentStepIndex > i;
            return (
              <div key={s} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${
                  isActive ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 
                  isDone ? 'bg-green-500 border-green-400' : 
                  'bg-[#12192c] border-white/10 text-slate-600'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-[7px] font-black uppercase tracking-wider text-center leading-tight max-w-[80px] ${
                  isActive || isDone ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {getNormalizedStatusLabel(s).split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-[#12192c] p-1 mx-6 mt-4 rounded-xl border border-white/5 shrink-0">
        {[
          { id: 'info', label: '📋 Инфо', badge: null },
          { id: 'pricing', label: '💰 Цены', badge: null },
          { id: 'trips', label: '📸 Рейсы', badge: unconfirmedEvidences.length > 0 ? unconfirmedEvidences.length : null },
          { id: 'history', label: '📜 История', badge: null }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all relative ${
              activeSection === tab.id ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ALERTS */}
      <div className="px-6 pt-4 space-y-3 shrink-0">
        {/* Отклики на бирже */}
        {pendingBids.length > 0 && (
          <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
                Новые отклики ({pendingBids.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingBids.map((bid) => {
                const assetLabel = bid.assetType === AssetType.LOADER
                  ? 'Погрузчик'
                  : bid.assetType === AssetType.MINI_LOADER
                    ? 'Мини-погрузчик'
                    : 'Самосвал';
                return (
                  <div key={bid.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{bid.assetType === AssetType.LOADER ? '🚜' : '🚛'}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{assetLabel}</span>
                      </div>
                      <div>
                        <div className="text-sm font-black">{bid.driverName}</div>
                        <div className="text-[14px] text-green-400">{formatPrice(bid.proposedPrice)} • {bid.estimatedArrival}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => rejectBid(bid)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">✕</button>
                      <button type="button" onClick={() => approveBid(bid)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-[14px] font-black uppercase">✓</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Рейсы на проверке */}
        {unconfirmedEvidences.length > 0 && activeSection !== 'trips' && (
          <div className="bg-orange-600/10 border border-orange-500/30 rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-orange-400 uppercase">
                ⚠️ {unconfirmedEvidences.length} рейсов ожидают проверки
              </span>
              <button 
                onClick={() => setActiveSection('trips')}
                className="text-[14px] font-black text-orange-400 hover:text-orange-300"
              >
                Проверить →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* === СЕКЦИЯ ИНФО === */}
          {activeSection === 'info' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Заказчик и адрес */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5 relative" ref={dropdownRef}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Заказчик</label>
                  <input
                    type="text"
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-4 text-sm font-black outline-none focus:border-blue-500"
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Начните вводить..."
                  />
                  {showCustomerDropdown && customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c2641] border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                        <div key={c.id} onClick={() => handleSelectCustomer(c)} className="p-4 hover:bg-blue-600 cursor-pointer text-xs font-black uppercase border-b border-white/5 last:border-0">
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Адрес объекта</label>
                  <input
                    type="text"
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-4 text-sm font-black outline-none focus:border-blue-500"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Улица, дом"
                  />
                </div>
              </div>

              {/* Параметры */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">План рейсов</label>
                  <input
                    type="number"
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-4 text-3xl font-black outline-none focus:border-blue-500 text-center"
                    value={formData.plannedTrips}
                    onChange={e => setFormData({ ...formData, plannedTrips: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Дата/Время</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-500"
                    value={formData.scheduledTime}
                    onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                  />
                </div>
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Статус</label>
                  <select
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-500"
                    value={formData.status}
                    onChange={e => smartAction('change_status', e.target.value as OrderStatus)}
                  >
                    {FULL_ORDER_STATUS_FLOW.map(s => (
                      <option
                        key={s}
                        value={s}
                        disabled={
                          ((s === OrderStatus.COMPLETED || s === OrderStatus.AWAITING_CLOSING_DOCS) && !allDriversCompleted) ||
                          (s === OrderStatus.COMPLETED && !isPaymentConfirmed && normalizedStatus !== OrderStatus.COMPLETED)
                        }
                      >
                        {getOrderStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ограничения объекта */}
              {formData.restrictions && (
                formData.restrictions.hasHeightLimit || 
                formData.restrictions.hasNarrowEntrance || 
                formData.restrictions.hasPermitRegime || 
                formData.restrictions.isNightWorkProhibited ||
                formData.restrictions.comment
              ) && (
                <div className="bg-[#12192c] p-6 rounded-2xl border border-orange-500/30">
                  <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    ⚠️ Ограничения объекта
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.restrictions.hasHeightLimit && (
                      <div className="flex items-center gap-2 bg-orange-500/10 text-orange-400 px-3 py-2 rounded-lg text-xs font-bold">
                        ↕️ Высота {formData.restrictions.heightLimitMeters ? `до ${formData.restrictions.heightLimitMeters}м` : 'ограничена'}
                      </div>
                    )}
                    {formData.restrictions.hasNarrowEntrance && (
                      <div className="flex items-center gap-2 bg-orange-500/10 text-orange-400 px-3 py-2 rounded-lg text-xs font-bold">
                        ↔️ Узкий въезд {formData.restrictions.entranceWidthMeters ? `(${formData.restrictions.entranceWidthMeters}м)` : ''}
                      </div>
                    )}
                    {formData.restrictions.hasPermitRegime && (
                      <div className="flex items-center gap-2 bg-orange-500/10 text-orange-400 px-3 py-2 rounded-lg text-xs font-bold">
                        🎫 Пропуск {formData.restrictions.permitDetails || 'требуется'}
                      </div>
                    )}
                    {formData.restrictions.isNightWorkProhibited && (
                      <div className="flex items-center gap-2 bg-orange-500/10 text-orange-400 px-3 py-2 rounded-lg text-xs font-bold">
                        🌙 Ночью нельзя {formData.restrictions.workingHoursStart && formData.restrictions.workingHoursEnd 
                          ? `(${formData.restrictions.workingHoursStart}-${formData.restrictions.workingHoursEnd})` 
                          : ''}
                      </div>
                    )}
                  </div>
                  {formData.restrictions.comment && (
                    <div className="mt-3 text-xs text-slate-400 bg-white/5 p-3 rounded-lg">
                      💬 {formData.restrictions.comment}
                    </div>
                  )}
                </div>
              )}

              {/* Назначенные водители */}
              {(formData.driverDetails || []).length > 0 && (
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Назначенная техника</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(formData.driverDetails || []).map((driver, i) => {
                    const driverTrips = (formData.evidences || []).filter(ev =>
                      driver.id ? ev.assignmentId === driver.id : ev.driverName === driver.driverName
                    );
                    const confirmedTrips = driverTrips.filter(ev => ev.confirmed);
                    const pricePerUnit = driver.assignedPrice
                      || formData.assetRequirements.find(r => r.type === driver.assetType)?.contractorPrice
                      || 0;
                    const isLoader = [
                      AssetType.LOADER,
                      AssetType.MINI_LOADER,
                      AssetType.LOADER_JCB,
                      AssetType.FRONT_LOADER
                    ].includes(driver.assetType);
                    const tripsLabel = `${driverTrips.length} рейсов`;
                    const confirmedLabel = confirmedTrips.length > 0 ? ` (${confirmedTrips.length} подтверждено)` : '';
                    const tripPriceLabel = pricePerUnit > 0 ? ` • ${formatPrice(pricePerUnit)}/рейс` : '';
                    const formatShiftTime = (value?: string) => {
                      if (!value) return '—';
                      if (/^\d{1,2}:\d{2}/.test(value)) {
                        const [hh, mm] = value.split(':');
                        return `${hh.padStart(2, '0')}:${mm}`;
                      }
                      const parsed = new Date(value);
                      return Number.isNaN(parsed.getTime())
                        ? value
                        : parsed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    };
                    const shiftLabel = `Смена 7+1: ${formatShiftTime(driver.shiftStartTime)}–${formatShiftTime(driver.shiftEndTime)}`;
                    const shiftPriceLabel = pricePerUnit > 0 ? ` • ${formatPrice(pricePerUnit)}/смена` : '';

                    const totalTrips = driverTrips.length;
                    const totalAmount = isLoader ? pricePerUnit : totalTrips * pricePerUnit;
                    const totalLabel = isLoader
                      ? `Итого: ${formatPrice(totalAmount)} (смена${pricePerUnit ? ` × ${formatPrice(pricePerUnit)}` : ''})`
                      : `Итого: ${formatPrice(totalAmount)} (${totalTrips} рейсов${pricePerUnit ? ` × ${formatPrice(pricePerUnit)}` : ''})`;

                    return (
                      <div key={i} className="flex items-center justify-between bg-white/5 p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{driver.assetType === AssetType.LOADER ? '🚜' : '🚛'}</span>
                          <div>
                            <div className="text-sm font-black">{driver.driverName}</div>
                            <div className="text-[14px] text-slate-500">
                              {driver.assetType === AssetType.LOADER ? 'Погрузчик' : driver.assetType === AssetType.MINI_LOADER ? 'Мини-погрузчик' : 'Самосвал'} • {driver.contractorName || 'Частный'}
                              {(driverTrips.length > 0 || driver.shiftStartTime || driver.shiftEndTime) && (
                                <div className="text-[12px] text-slate-400 mt-1">
                                  {isLoader
                                    ? `Водитель: ${shiftLabel}${shiftPriceLabel}`
                                    : `Водитель: ${tripsLabel}${confirmedLabel}${tripPriceLabel}`}
                                </div>
                              )}
                              {isOrderCompleted && (driverTrips.length > 0 || driver.shiftStartTime || driver.shiftEndTime) && (
                                <div className="text-[12px] text-slate-300 mt-1 font-black">
                                  {totalLabel}
                                </div>
                              )}
                          </div>
                        </div>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[14px] font-black uppercase ${
                          driver.status === 'working' ? 'bg-green-500/20 text-green-400' :
                          driver.status === 'en_route' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {driver.status || 'Назначен'}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === СЕКЦИЯ ЦЕН === */}
          {activeSection === 'pricing' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Добавление техники */}
              <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest">🚛 Техника и расценки</h3>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => addAsset(AssetType.TRUCK)} className="text-[14px] font-black bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all">
                      + Самосвал
                    </button>
                    <button type="button" onClick={() => addAsset(AssetType.LOADER)} className="text-[14px] font-black bg-orange-600/20 text-orange-400 px-4 py-2 rounded-xl border border-orange-500/30 hover:bg-orange-600 hover:text-white transition-all">
                      + Погрузчик
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(formData.assetRequirements || []).map((req, idx) => {
                    const unitLabel = req.priceUnit === PriceUnit.PER_HOUR
                      ? 'час'
                      : req.priceUnit === PriceUnit.PER_SHIFT
                      ? 'смена'
                      : 'рейс';
                    return (
                    <div key={idx} className={`bg-white/5 p-4 rounded-xl border ${req.contractorId ? 'border-orange-500/30' : 'border-white/10'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div className="flex items-center gap-3 md:col-span-2">
                          <span className="text-2xl">{req.type === AssetType.LOADER ? '🚜' : '🚛'}</span>
                          <div className="flex flex-col flex-1">
                            <span className="text-[10px] font-black text-white/70">
                              {req.type === AssetType.LOADER ? 'Погрузчик' : req.type === AssetType.MINI_LOADER ? 'Мини-погрузчик' : 'Самосвал'}
                            </span>
                          <select
                              className="bg-transparent text-[10px] font-black uppercase outline-none text-blue-400"
                            value={req.contractorId}
                            onChange={e => updateAsset(idx, 'contractorId', e.target.value)}
                          >
                            <option value="" className="bg-[#12192c]">Биржа</option>
                            {contractors.map(c => (
                              <option key={c.id} value={c.id} className="bg-[#12192c]">{c.name}</option>
                            ))}
                          </select>
                          </div>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Клиенту / {unitLabel}</span>
                          <input
                            type="number"
                            className="w-full bg-transparent border-b border-white/20 text-sm font-black p-1 text-center"
                            value={req.customerPrice || ''}
                            onChange={e => updateAsset(idx, 'customerPrice', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Подрядчику / {unitLabel}</span>
                          <input
                            type="number"
                            className="w-full bg-transparent border-b border-white/20 text-sm font-black p-1 text-center text-green-400"
                            value={req.contractorPrice || ''}
                            onChange={e => updateAsset(idx, 'contractorPrice', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Кол-во / {unitLabel}</span>
                          <input
                            type="number"
                            className="w-full bg-transparent border-b border-white/20 text-sm font-black p-1 text-center"
                            value={req.plannedUnits}
                            onChange={e => updateAsset(idx, 'plannedUnits', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <button type="button" onClick={() => removeAsset(idx)} className="text-red-500 text-[10px] font-black uppercase hover:text-red-400">
                          Удалить
                        </button>
                      </div>
                    </div>
                  )})}
                </div>
              </div>

              {/* Итоги */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                  <div className="text-[10px] font-black text-slate-500 uppercase mb-2">Итого клиенту</div>
                  <div className="text-3xl font-black">{formatPrice(totals.customerTotal)}</div>
                </div>
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                  <div className="text-[10px] font-black text-slate-500 uppercase mb-2">Итого подрядчикам</div>
                  <div className="text-3xl font-black text-green-400">{formatPrice(totals.contractorTotal)}</div>
                </div>
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                  <div className="text-[10px] font-black text-slate-500 uppercase mb-2">Маржа</div>
                  <div className={`text-3xl font-black ${totals.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPrice(totals.margin)}
                  </div>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5 flex flex-wrap gap-3">
                {statusActions
                  .filter(action => action.from.includes(normalizedStatus))
                  .map(action => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => smartAction('change_status', action.to)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg"
                    >
                      {action.label}
                    </button>
                  ))}
                {allDriversCompleted && ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(normalizedStatus) && (
                  <button
                    type="button"
                    onClick={() => smartAction('change_status', OrderStatus.AWAITING_CLOSING_DOCS)}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg"
                  >
                    ✅ Завершить вывоз
                  </button>
                )}
                {[OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(normalizedStatus) || (
                  <button
                    type="button"
                    onClick={() => smartAction('change_status', OrderStatus.CANCELLED)}
                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg"
                  >
                    ❌ Отменить
                  </button>
                )}
                {!isApprovedByCustomer && (
                  <button
                    type="button"
                    onClick={openQuoteModal}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg"
                  >
                    📤 Создать КП
                  </button>
                )}
                {formData.isBirzhaOpen && (
                  <button
                    type="button"
                    onClick={() => smartAction('close_birzha')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg"
                  >
                    🔒 Закрыть поиск техники
                  </button>
                )}
                {hasDirectOffers && !formData.isBirzhaOpen && (
                  <button
                    type="button"
                    onClick={() => smartAction('send_direct')}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg"
                  >
                    📨 Персональные офферы
                  </button>
                )}
                {hasBirzhaSlots && !formData.isBirzhaOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasBirzhaPrices) return;
                      smartAction('open_birzha');
                    }}
                    disabled={!hasBirzhaPrices}
                    title={!hasBirzhaPrices ? 'Сначала укажите цену для подрядчика' : undefined}
                    className={`text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg ${
                      hasBirzhaPrices ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800/60 cursor-not-allowed'
                    }`}
                  >
                    🔍 Поиск техники
                  </button>
                )}
              </div>
            </div>
          )}

          {/* === СЕКЦИЯ РЕЙСОВ === */}
          {activeSection === 'trips' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Статистика */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#12192c] p-5 rounded-2xl border border-white/5 text-center">
                  <div className="text-3xl font-black">{formData.plannedTrips || 0}</div>
                  <div className="text-[14px] text-slate-500 uppercase">План</div>
                </div>
                <div className="bg-[#12192c] p-5 rounded-2xl border border-white/5 text-center">
                  <div className="text-3xl font-black">{(formData.evidences || []).length}</div>
                  <div className="text-[14px] text-slate-500 uppercase">Отправлено</div>
                </div>
                <div className="bg-[#12192c] p-5 rounded-2xl border border-green-500/30 text-center">
                  <div className="text-3xl font-black text-green-400">{confirmedEvidences.length}</div>
                  <div className="text-[14px] text-slate-500 uppercase">Засчитано</div>
                </div>
                <div className="bg-[#12192c] p-5 rounded-2xl border border-orange-500/30 text-center">
                  <div className="text-3xl font-black text-orange-400">{unconfirmedEvidences.length}</div>
                  <div className="text-[14px] text-slate-500 uppercase">На проверке</div>
                </div>
              </div>

              {/* Рейсы на проверке */}
              {unconfirmedEvidences.length > 0 && (
                <div className="bg-orange-600/10 border border-orange-500/30 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                    Требуют проверки
                  </h4>
                    <button
                      type="button"
                      onClick={confirmAllTrips}
                      className="bg-green-600/20 text-green-300 px-4 py-2 rounded-lg text-[14px] font-black uppercase border border-green-500/30 hover:bg-green-600 hover:text-white transition-all"
                    >
                      Подтвердить все
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {unconfirmedEvidences.map(ev => (
                      <div key={ev.id} className="relative bg-black/40 rounded-xl overflow-hidden border border-white/10 group">
                        <img
                          src={ev.photos?.[0]?.url || ev.photo}
                          className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-all"
                          alt={`Рейс #${ev.tripNumber}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <div className="text-[14px] font-black text-white uppercase mb-1">{ev.driverName}</div>
                          <div className="text-[8px] text-slate-400 mb-2">
                            {formatDateTime(ev.timestamp)}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => confirmTrip(ev.id)}
                              className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-[8px] font-black uppercase"
                            >
                              ✅ ОК
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectTrip(ev.id, 'Некачественное фото')}
                              className="bg-red-600/50 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-[8px] font-black"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        {ev.coordinates && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-[7px] px-2 py-0.5 rounded font-bold">
                            📍 GPS
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Подтверждённые рейсы */}
              {confirmedEvidences.length > 0 && (
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
                  <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-4">✓ Засчитанные рейсы</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {confirmedEvidences.map(ev => (
                      <div key={ev.id} className="relative rounded-xl overflow-hidden border border-green-500/30">
                        <img
                          src={ev.photos?.[0]?.url || ev.photo}
                          className="w-full h-20 object-cover"
                          alt={`Рейс #${ev.tripNumber}`}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-[7px] font-black text-center py-0.5">
                          #{ev.tripNumber}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(formData.evidences || []).length === 0 && (
                <div className="text-center py-16 opacity-30">
                  <div className="text-5xl mb-4">📸</div>
                  <div className="text-[10px] font-black uppercase tracking-widest">Рейсы ещё не отправлены</div>
                </div>
              )}
            </div>
          )}

          {/* === СЕКЦИЯ ИСТОРИИ === */}
          {activeSection === 'history' && (
            <div className="space-y-4 animate-in fade-in">
              {(formData.actionLog || []).length === 0 ? (
                <div className="text-center py-16 opacity-30">
                  <div className="text-5xl mb-4">📜</div>
                  <div className="text-[10px] font-black uppercase tracking-widest">История пуста</div>
                </div>
              ) : (
                <div className="bg-[#12192c] rounded-2xl border border-white/5 overflow-hidden">
                  {[...(formData.actionLog || [])].reverse().map((log, i) => (
                    <div key={log.id} className={`p-4 flex items-start gap-4 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                        log.actionType === 'status_change' ? 'bg-blue-500/20 text-blue-400' :
                        log.actionType === 'trip_confirmed' ? 'bg-green-500/20 text-green-400' :
                        log.actionType === 'assignment' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-white/5 text-slate-400'
                      }`}>
                        {log.actionType === 'status_change' ? '📋' :
                         log.actionType === 'trip_confirmed' ? '✅' :
                         log.actionType === 'assignment' ? '👤' :
                         log.actionType === 'price_update' ? '💰' : '📝'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold">{log.action}</div>
                        <div className="text-[14px] text-slate-500 mt-1">
                          {log.performedBy} • {formatDateTime(log.timestamp)}
                        </div>
                        {log.previousValue && log.newValue && (
                          <div className="text-[14px] text-slate-600 mt-1">
                            {log.previousValue} → {log.newValue}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* FOOTER */}
      <div className="p-6 border-t border-white/5 flex justify-between items-center shrink-0 bg-[#0a0f1d]">
        <button type="button" onClick={onCancel} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all">
          Отмена
        </button>
        <button
          onClick={handleSubmit}
          className="bg-white text-slate-900 px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 transition-all"
        >
          {initialData ? 'Сохранить' : 'Создать'}
        </button>
      </div>

      {/* Модалка КП */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#12192c] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/10">
            <h3 className="text-lg font-black uppercase tracking-tight mb-6">📋 Создать КП</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Самосвал (за рейс)</label>
                <input
                  type="number"
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-lg font-black outline-none"
                  value={quoteForm.truckPricePerTrip}
                  onChange={e => setQuoteForm({ ...quoteForm, truckPricePerTrip: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Погрузчик (за смену)</label>
                <input
                  type="number"
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-lg font-black outline-none"
                  value={quoteForm.loaderPricePerShift}
                  onChange={e => setQuoteForm({ ...quoteForm, loaderPricePerShift: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Примечания</label>
                <textarea
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-sm outline-none min-h-[80px]"
                  value={quoteForm.notes}
                  onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  placeholder="Что включено, условия..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowQuoteModal(false)}
                className="flex-1 bg-white/10 text-white py-4 rounded-xl text-[11px] font-black uppercase"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={createQuote}
                className="flex-1 bg-blue-600 text-white py-4 rounded-xl text-[11px] font-black uppercase"
              >
                Отправить КП
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderForm;
