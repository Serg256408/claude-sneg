import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Order, OrderStatus, AssetType, Contractor, Bid, DriverAssignment, Message, formatPrice, formatDateTime, generateId, PriceUnit, TripEvidence, DateRange, isOrderInDateRange, getOrderStatusLabel, normalizeOrderStatus, calculateAssignmentEarnings, isLoaderType, getShiftHours, toLocalDateTimeInputValue } from './types';
import DriverPortal from './DriverPortal';
import ConfirmModal from './ConfirmModal';

interface ContractorPortalProps {
  orders: Order[];
  contractors: Contractor[];
  currentContractorId: string;
  onSubmitBid: (orderId: string, bid: Bid) => void;
  onWithdrawBid: (orderId: string, bidId: string) => void;
  onUpdateContractor: (contractor: Contractor) => void;
  onUpdateOrder?: (orderId: string, updates: Partial<Order>) => void;
  driverName: string;
  onReportTrip: (orderId: string, evidence: TripEvidence) => void;
  onAcceptJob: (orderId: string, contractorId: string, assetType: AssetType) => void;
  onFinishWork: (orderId: string) => void;
  onUpdateDriverAssignment?: (orderId: string, driverAssignmentId: string, updates: Partial<DriverAssignment>) => void;
  onRemoveAssignment?: (orderId: string, assignmentId: string, reason?: string) => void;
}

const ContractorPortal: React.FC<ContractorPortalProps> = ({
  orders,
  contractors,
  currentContractorId,
  onSubmitBid,
  onWithdrawBid,
  onUpdateContractor,
  onUpdateOrder,
  driverName,
  onReportTrip,
  onAcceptJob,
  onFinishWork,
  onUpdateDriverAssignment,
  onRemoveAssignment
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'direct' | 'active' | 'earnings' | 'driver'>('available');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const getDefaultArrivalTime = () => toLocalDateTimeInputValue(new Date(Date.now() + 60 * 60 * 1000));
  const [bidForm, setBidForm] = useState({
    price: 0,
    assetType: AssetType.TRUCK,
    vehicleInfo: '',
    estimatedArrival: getDefaultArrivalTime(),
    comment: ''
  });
  const [preBidPrices, setPreBidPrices] = useState<Record<string, string>>({});
  const [counterOfferPrices, setCounterOfferPrices] = useState<Record<string, string>>({});
  const [showBidModal, setShowBidModal] = useState(false);
  const [chatModal, setChatModal] = useState<{ isOpen: boolean; order: Order | null; message: string }>({
    isOpen: false,
    order: null,
    message: ''
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [financeSubTab, setFinanceSubTab] = useState<'active' | 'completed'>('active');
  const dateRange = useMemo<DateRange>(() => ({
    from: dateFrom || undefined,
    to: dateTo || undefined
  }), [dateFrom, dateTo]);

  // Состояние модалки подтверждения
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmColor?: 'red' | 'blue' | 'green';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Реф для авто-скролла чата
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Текущий подрядчик
  const currentContractor = useMemo(() => {
    return contractors.find(c => c.id === currentContractorId);
  }, [contractors, currentContractorId]);
  const contractorRating = currentContractor ? Number(currentContractor.rating) || 0 : 0;

  // Доступные заказы на бирже (зависят от флага биржи)
  const availableOrders = useMemo(() => {
    return orders.filter(o => 
      o.isBirzhaOpen &&
      ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(normalizeOrderStatus(o.status)) &&
      o.assetRequirements.some(req => !req.contractorId) &&
      !(
        (o.driverDetails || []).some(d => d.contractorId === currentContractorId && d.status !== 'cancelled') ||
        (o.assignments || []).some(a => a.contractorId === currentContractorId && a.status !== 'cancelled')
      )
    );
  }, [orders, currentContractorId]);

  // Прямые предложения (только если диспетчер предложил именно этому подрядчику)
  const directOffers = useMemo(() => {
    return orders.filter(o =>
      ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(normalizeOrderStatus(o.status)) &&
      o.assetRequirements.some(req => req.contractorId === currentContractorId)
    );
  }, [orders, currentContractorId]);

  // Активные заказы (где работает техника подрядчика)
  const activeOrders = useMemo(() => {
    return orders.filter(o =>
      [OrderStatus.IN_PROGRESS, OrderStatus.EN_ROUTE, OrderStatus.EQUIPMENT_APPROVED].includes(normalizeOrderStatus(o.status)) &&
      (o.driverDetails || []).some(d => d.contractorId === currentContractorId)
    );
  }, [orders, currentContractorId]);

  // Мои отклики на заказы
  const myBids = useMemo(() => {
    const bids: { order: Order; bid: Bid }[] = [];
    orders.forEach(o => {
      (o.bids || []).forEach(b => {
        if (b.contractorId === currentContractorId) {
          bids.push({ order: o, bid: b });
        }
      });
    });
    return bids;
  }, [orders, currentContractorId]);

  const filteredAvailableOrders = useMemo(() => {
    return availableOrders.filter(order => isOrderInDateRange(order, dateRange));
  }, [availableOrders, dateRange]);

  const filteredDirectOffers = useMemo(() => {
    return directOffers.filter(order => isOrderInDateRange(order, dateRange));
  }, [directOffers, dateRange]);

  const filteredActiveOrders = useMemo(() => {
    return activeOrders.filter(order => isOrderInDateRange(order, dateRange));
  }, [activeOrders, dateRange]);

  const filteredMyBids = useMemo(() => {
    return myBids.filter(entry => isOrderInDateRange(entry.order, dateRange));
  }, [myBids, dateRange]);

  const driverOrdersInWork = useMemo(() => {
    return orders.filter(order => {
      if (normalizeOrderStatus(order.status) === OrderStatus.CANCELLED) return false;
      const myAssignments = (order.driverDetails || []).filter(d => d.contractorId === currentContractorId);
      if (myAssignments.length === 0) return false;
      return myAssignments.some(d => d.status !== 'completed' && d.status !== 'cancelled');
    });
  }, [orders, currentContractorId]);

  const filteredDriverOrdersInWork = useMemo(() => {
    return driverOrdersInWork.filter(order => isOrderInDateRange(order, dateRange));
  }, [driverOrdersInWork, dateRange]);


  const getUnitLabel = (unit: PriceUnit) => {
    if (unit === PriceUnit.PER_SHIFT) return 'смена';
    if (unit === PriceUnit.PER_HOUR) return 'час';
    return 'рейс';
  };

  const getUnitPlural = (unit: PriceUnit) => {
    if (unit === PriceUnit.PER_SHIFT) return 'смен';
    if (unit === PriceUnit.PER_HOUR) return 'часов';
    return 'рейсов';
  };


  const getAssetTypeLabel = (assetType: AssetType) => {
    if (assetType === AssetType.LOADER) return 'Погрузчик';
    if (assetType === AssetType.MINI_LOADER) return 'Мини-погрузчик';
    return 'Самосвал';
  };
  const formatHours = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return '0';
    const rounded = Math.round(value * 10) / 10;
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  };

  const getEffectivePriceUnit = (assignment: DriverAssignment) => {
    if (assignment.priceUnit === PriceUnit.PER_TRIP && isLoaderType(assignment.assetType)) {
      return PriceUnit.PER_SHIFT;
    }
    return assignment.priceUnit;
  };

  const getDriverStatusInfo = (status: DriverAssignment['status']) => {
    if (status === 'completed') return { label: 'Завершено', className: 'bg-green-600/20 text-green-400' };
    if (status === 'working') return { label: 'В работе', className: 'bg-green-500/20 text-green-400' };
    if (status === 'en_route') return { label: 'В пути', className: 'bg-blue-500/20 text-blue-400' };
    if (status === 'on_site') return { label: 'На месте', className: 'bg-indigo-500/20 text-indigo-300' };
    if (status === 'confirmed') return { label: 'Подтверждён', className: 'bg-sky-500/20 text-sky-300' };
    if (status === 'cancelled') return { label: 'Отменён', className: 'bg-red-500/20 text-red-400' };
    return { label: 'Назначен', className: 'bg-slate-500/20 text-slate-300' };
  };

  const getContractorMessages = useCallback((order: Order) => {
    const messages = order.messages || [];
    return messages
      .filter(msg => {
        const toThisContractor = msg.toRole === 'contractor' && (!msg.toId || msg.toId === currentContractorId);
        const fromThisContractor = msg.fromRole === 'contractor' && msg.fromId === currentContractorId;
        return toThisContractor || fromThisContractor;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [currentContractorId]);

  const openChat = useCallback((order: Order) => {
    setChatModal({ isOpen: true, order, message: '' });
    if (!onUpdateOrder) return;

    const updatedMessages = (order.messages || []).map(msg => {
      const shouldMarkRead =
        msg.toRole === 'contractor' &&
        (!msg.toId || msg.toId === currentContractorId) &&
        !msg.isRead;
      return shouldMarkRead ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg;
    });

    const changed = (order.messages || []).some((msg, idx) => msg !== updatedMessages[idx]);
    if (changed) {
      const unreadCount = updatedMessages.filter(m => !m.isRead).length;
      onUpdateOrder(order.id, { messages: updatedMessages, unreadMessages: unreadCount });
    }
  }, [currentContractorId, onUpdateOrder]);

  const sendChatMessage = useCallback(() => {
    if (!chatModal.order || !chatModal.message.trim() || !onUpdateOrder) return;
    const order = chatModal.order;
    const newMessage: Message = {
      id: generateId(),
      orderId: order.id,
      fromRole: 'contractor',
      fromName: currentContractor?.name || 'Подрядчик',
      fromId: currentContractorId,
      toRole: 'manager',
      toId: order.dispatcherId || order.managerId,
      text: chatModal.message.trim(),
      timestamp: new Date().toISOString(),
      isRead: false
    };

    const updatedMessages = [...(order.messages || []), newMessage];
    onUpdateOrder(order.id, {
      messages: updatedMessages,
      unreadMessages: (order.unreadMessages || 0) + 1
    });
    setChatModal(prev => ({ ...prev, message: '' }));
    // Авто-скролл после отправки
    setTimeout(() => {
      chatMessagesRef.current?.scrollTo({ top: chatMessagesRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, [chatModal, currentContractor, currentContractorId, onUpdateOrder]);

  const visibleMyBids = useMemo(() => {
    return filteredMyBids.filter(entry => ['pending', 'rejected'].includes(entry.bid.status));
  }, [filteredMyBids]);

  const latestBidByOrderAndType = useMemo(() => {
    const map = new Map<string, { order: Order; bid: Bid }>();
    filteredMyBids.forEach(entry => {
      const key = `${entry.order.id}::${entry.bid.assetType}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, entry);
        return;
      }
      const existingTime = new Date(existing.bid.createdAt).getTime();
      const entryTime = new Date(entry.bid.createdAt).getTime();
      if (entryTime >= existingTime) {
        map.set(key, entry);
      }
    });
    return map;
  }, [filteredMyBids]);

  const getBidStatusLabel = (status?: Bid['status']) => {
    if (status === 'withdrawn') return 'Отклик отозван';
    if (status === 'accepted') return 'Отклик принят';
    return 'Отклик отправлен';
  };

  const earningsByOrder = useMemo(() => {
    return orders
      .filter(order => (order.driverDetails || []).some(d => d.contractorId === currentContractorId))
      .map(order => {
        const drivers = (order.driverDetails || []).filter(d => d.contractorId === currentContractorId);
        const driverRows = drivers.map(driver => {
          const earnings = calculateAssignmentEarnings(order, driver);
          const effectiveUnit = getEffectivePriceUnit(driver);
          const unitLabel = getUnitLabel(effectiveUnit);
          const unitPlural = getUnitPlural(effectiveUnit);
          return { driver, earnings, unitLabel, unitPlural };
        });

        const totals = driverRows.reduce(
          (acc, row) => {
            acc.confirmed += row.earnings.confirmedAmount;
            acc.pending += row.earnings.pendingAmount;
            return acc;
          },
          { confirmed: 0, pending: 0 }
        );

        const statusCounts = drivers.reduce<Record<string, number>>((acc, driver) => {
          acc[driver.status] = (acc[driver.status] || 0) + 1;
          return acc;
        }, {});

        const statusSummary = [
          statusCounts.working ? `В работе: ${statusCounts.working}` : null,
          statusCounts.en_route ? `В пути: ${statusCounts.en_route}` : null,
          statusCounts.on_site ? `На месте: ${statusCounts.on_site}` : null,
          statusCounts.confirmed ? `Подтверждено: ${statusCounts.confirmed}` : null,
          statusCounts.assigned ? `Назначено: ${statusCounts.assigned}` : null,
          statusCounts.completed ? `Завершено: ${statusCounts.completed}` : null
        ].filter(Boolean).join(' • ') || 'Нет активных назначений';

        const normalizedStatus = normalizeOrderStatus(order.status);
        const statusClass =
          normalizedStatus === OrderStatus.COMPLETED
            ? 'bg-green-600/20 text-green-400'
            : normalizedStatus === OrderStatus.IN_PROGRESS
              ? 'bg-green-500/20 text-green-400'
              : normalizedStatus === OrderStatus.EN_ROUTE
                ? 'bg-blue-500/20 text-blue-400'
                : normalizedStatus === OrderStatus.SEARCHING_EQUIPMENT
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-slate-500/20 text-slate-300';

        return {
          order,
          driverRows,
          totals,
          statusSummary,
          statusClass
        };
      })
      .sort((a, b) => {
        const aTime = new Date(a.order.updatedAt || a.order.createdAt || a.order.scheduledTime).getTime();
        const bTime = new Date(b.order.updatedAt || b.order.createdAt || b.order.scheduledTime).getTime();
        return bTime - aTime;
      });
  }, [orders, currentContractorId]);

  // Заказы "в работе" - статус заказа НЕ завершён
  const activeEarningsByOrder = useMemo(() => {
    return earningsByOrder.filter(entry => {
      const orderStatus = normalizeOrderStatus(entry.order.status);
      return orderStatus !== OrderStatus.COMPLETED && orderStatus !== OrderStatus.CANCELLED;
    });
  }, [earningsByOrder]);

  // Завершённые заказы - статус заказа ЗАВЕРШЁН
  const completedEarningsByOrder = useMemo(() => {
    return earningsByOrder.filter(entry => {
      const orderStatus = normalizeOrderStatus(entry.order.status);
      return orderStatus === OrderStatus.COMPLETED;
    });
  }, [earningsByOrder]);

  const filteredActiveEarningsByOrder = useMemo(() => {
    return activeEarningsByOrder.filter(entry => isOrderInDateRange(entry.order, dateRange));
  }, [activeEarningsByOrder, dateRange]);

  const filteredHistoryByOrder = useMemo(() => {
    return completedEarningsByOrder.filter(entry => isOrderInDateRange(entry.order, dateRange));
  }, [completedEarningsByOrder, dateRange]);

  // Количество единиц техники в работе (всего)
  const activeEquipmentCount = useMemo(() => {
    return filteredActiveOrders.reduce((count, order) => {
      const myDrivers = (order.driverDetails || []).filter(d => d.contractorId === currentContractorId);

      return count + myDrivers.length;
    }, 0);
  }, [filteredActiveOrders, currentContractorId]);

  // Расчёт заработка
  const earningsData = useMemo(() => {
    let totalEarned = 0;
    let totalPending = 0;
    let completedOrders = 0;
    let totalTrips = 0;

    orders.forEach(o => {
      const myDrivers = (o.driverDetails || []).filter(d => d.contractorId === currentContractorId);
      if (myDrivers.length === 0) return;

      myDrivers.forEach(driver => {
        const earnings = calculateAssignmentEarnings(o, driver);
        totalEarned += earnings.confirmedAmount;
        totalPending += earnings.pendingAmount;
        if (driver.priceUnit === PriceUnit.PER_TRIP) {
          totalTrips += earnings.confirmedUnits + earnings.pendingUnits;
        }
      });

      if (normalizeOrderStatus(o.status) === OrderStatus.COMPLETED) {
        completedOrders++;
      }
    });

    return { totalEarned, totalPending, completedOrders, totalTrips };
  }, [orders, currentContractorId]);

  const chatOrder = chatModal.order
    ? orders.find(o => o.id === chatModal.order?.id) || chatModal.order
    : null;
  const chatMessages = chatOrder ? getContractorMessages(chatOrder) : [];

  // Авто-скролл к последнему сообщению при открытии чата или новых сообщениях
  useEffect(() => {
    if (chatModal.isOpen && chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatModal.isOpen, chatMessages.length]);

  // Отправка отклика
  const handleSubmitBid = useCallback(() => {
    if (!selectedOrder || !currentContractor) return;
    if (!bidForm.estimatedArrival) {
      alert('Укажите время подачи техники.');
      return;
    }

    const newBid: Bid = {
      id: generateId(),
      orderId: selectedOrder.id,
      contractorId: currentContractorId,
      driverName: currentContractor.name,
      assetType: bidForm.assetType,
      vehicleInfo: bidForm.vehicleInfo,
      proposedPrice: bidForm.price,
      priceUnit: isLoaderType(bidForm.assetType) ? PriceUnit.PER_SHIFT : PriceUnit.PER_TRIP,
      estimatedArrival: bidForm.estimatedArrival,
      comment: bidForm.comment,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    onSubmitBid(selectedOrder.id, newBid);
    setShowBidModal(false);
    setSelectedOrder(null);
    setBidForm({ price: 0, assetType: AssetType.TRUCK, vehicleInfo: '', estimatedArrival: getDefaultArrivalTime(), comment: '' });
  }, [selectedOrder, currentContractor, currentContractorId, bidForm, onSubmitBid]);

  // Отзыв отклика
  const handleWithdrawBid = useCallback((orderId: string, bidId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Отзыв отклика',
      message: 'Вы уверены, что хотите отозвать свой отклик на этот заказ?',
      confirmText: 'Отозвать',
      confirmColor: 'red',
      onConfirm: () => {
        onWithdrawBid(orderId, bidId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [onWithdrawBid]);

  const submitLowerPriceOffer = (order: Order, bid: Bid, priceInput: string, key: string) => {
    if (!currentContractor) return;
    const proposedPrice = Number(priceInput);
    if (!Number.isFinite(proposedPrice) || proposedPrice <= 0) {
      alert('Укажите корректную цену.');
      return;
    }
    if (proposedPrice >= bid.proposedPrice) {
      alert('Цена должна быть ниже предыдущего предложения.');
      return;
    }

    const newBid: Bid = {
      id: generateId(),
      orderId: order.id,
      contractorId: currentContractorId,
      driverName: currentContractor.name || bid.driverName,
      assetType: bid.assetType,
      vehicleInfo: bid.vehicleInfo,
      proposedPrice,
      priceUnit: bid.priceUnit,
      estimatedArrival: bid.estimatedArrival || getDefaultArrivalTime(),
      comment: bid.comment ? `${bid.comment} | Предложение меньшей цены` : 'Предложение меньшей цены',
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    onSubmitBid(order.id, newBid);
    setCounterOfferPrices(prev => ({ ...prev, [key]: '' }));
  };

  // Открытие модалки отклика
  const openBidModal = (order: Order, assetType: AssetType, priceOverride?: number, priceKey?: string) => {
    const requirement = order.assetRequirements.find(r => r.type === assetType);
    setSelectedOrder(order);
    const basePrice = requirement?.contractorPrice || 0;
    const nextPrice = typeof priceOverride === 'number' ? priceOverride : basePrice;
    setBidForm(prev => ({
      ...prev,
      assetType,
      price: nextPrice,
      estimatedArrival: getDefaultArrivalTime()
    }));
    setShowBidModal(true);
    if (priceKey) {
      setPreBidPrices(prev => ({ ...prev, [priceKey]: '' }));
    }
  };

  if (!currentContractor) {
    return (
      <div className="h-full bg-[#0a0f1d] text-white flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-6 opacity-20">🏢</div>
          <p className="text-sm font-black uppercase tracking-widest text-slate-500">Подрядчик не найден</p>
          <p className="text-[10px] text-slate-600 mt-2">Выберите организацию в настройках</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-white font-['Inter']">
      {/* Header */}
      <div className="p-4 bg-[#12192c] border-b border-white/5 shadow-2xl sticky top-0 z-30">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
              {currentContractor.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase truncate max-w-[200px]">{currentContractor.name}</h2>
              <div className="flex items-center gap-2">
                {currentContractor.isVerified && (
                  <span className="text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ Верифицирован</span>
                )}
                <span className="text-[8px] text-yellow-400">★ {contractorRating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-black text-green-400">{formatPrice(earningsData.totalEarned)}</div>
            <div className="text-[8px] text-slate-500 uppercase">Заработано</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#1c2641] p-1 rounded-xl border border-white/5 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-shrink-0 py-3 min-h-[44px] text-[9px] font-black uppercase rounded-lg transition-all whitespace-nowrap px-4 touch-feedback ${
              activeTab === 'available' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500'
            }`}
          >
            🌐 Биржа {filteredAvailableOrders.length > 0 && `(${filteredAvailableOrders.length})`}
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-shrink-0 py-3 min-h-[44px] text-[9px] font-black uppercase rounded-lg transition-all whitespace-nowrap px-4 touch-feedback ${
              activeTab === 'direct' ? 'bg-orange-500 text-white shadow-xl' : 'text-slate-500'
            }`}
          >
            📨 Прямые {filteredDirectOffers.length > 0 && `(${filteredDirectOffers.length})`}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-shrink-0 py-3 min-h-[44px] text-[9px] font-black uppercase rounded-lg transition-all whitespace-nowrap px-4 touch-feedback ${
              activeTab === 'active' ? 'bg-green-600 text-white shadow-xl' : 'text-slate-500'
            }`}
          >
            🚛 В работе {activeEquipmentCount > 0 && `(${activeEquipmentCount})`}
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex-shrink-0 py-3 min-h-[44px] text-[9px] font-black uppercase rounded-lg transition-all whitespace-nowrap px-4 touch-feedback ${
              activeTab === 'earnings' ? 'bg-green-600 text-white shadow-xl' : 'text-slate-500'
            }`}
          >
            💰 Финансы
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`flex-shrink-0 py-3 min-h-[44px] text-[9px] font-black uppercase rounded-lg transition-all whitespace-nowrap px-4 touch-feedback ${
              activeTab === 'driver' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500'
            }`}
          >
            🚛 Рейсы {filteredDriverOrdersInWork.length > 0 && `(${filteredDriverOrdersInWork.length})`}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 no-scrollbar">
        <div className="flex flex-wrap items-center gap-2 bg-[#12192c] border border-white/5 rounded-2xl p-3">
          <span className="text-[9px] font-black uppercase text-slate-500">С</span>
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
          />
          <span className="text-[9px] font-black uppercase text-slate-500">По</span>
          <input
            type="datetime-local"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="ml-auto bg-white/10 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
        
        {/* === БИРЖА === */}
        {activeTab === 'available' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Мои отклики */}
            {visibleMyBids.length > 0 && (
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                  Ваши отклики ({visibleMyBids.length})
                </h4>
                <div className="space-y-2">
                  {visibleMyBids.map(({ order, bid }) => {
                    const normalizedStatus = normalizeOrderStatus(order.status);
                    const canWithdraw = normalizedStatus !== OrderStatus.COMPLETED && normalizedStatus !== OrderStatus.CANCELLED;

                    return (
                      <div key={bid.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                        <div>
                          <div className="text-sm font-black">{order.address}</div>
                          <div className="text-[9px] text-slate-500">{formatPrice(bid.proposedPrice)} • {bid.assetType}</div>
                        </div>
                        {canWithdraw && (
                          <button 
                            onClick={() => handleWithdrawBid(order.id, bid.id)}
                            className="text-[9px] text-red-400 font-black uppercase hover:text-red-300"
                          >
                            Отозвать
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Доступные заказы */}
            {filteredAvailableOrders.length === 0 ? (
              <div className="text-center py-20 opacity-20">
                <div className="text-6xl mb-4">🌐</div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em]">Нет доступных заказов</div>
              </div>
            ) : (
              filteredAvailableOrders.map(order => {
                const birzhaRequirements = order.assetRequirements.filter(r => !r.contractorId);
                const hasAnyMyBid = filteredMyBids.some(b => b.order.id === order.id);
                
                return (
                  <div key={order.id} className={`bg-[#12192c] rounded-2xl border ${hasAnyMyBid ? 'border-blue-500/50' : 'border-white/5'} overflow-hidden shadow-xl`}>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">{order.customer}</div>
                          <h4 className="text-lg font-black uppercase leading-tight">{order.address}</h4>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-slate-500 uppercase">{formatDateTime(order.scheduledTime)}</div>
                        </div>
                      </div>

                      {/* Ограничения */}
                      {order.restrictions && (
                        <div className="flex gap-2 mb-4">
                          {order.restrictions.hasHeightLimit && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">↕️ Высота</span>}
                          {order.restrictions.hasNarrowEntrance && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">↔️ Узкий</span>}
                          {order.restrictions.hasPermitRegime && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">🎫 Пропуск</span>}
                        </div>
                      )}

                      {/* Требуемая техника */}
                      <div className="space-y-2">
                        {birzhaRequirements.map((req, i) => {
                          const assignedCount = (order.driverDetails || []).filter(d => d.assetType === req.type).length;
                          const remaining = Math.max(0, req.plannedUnits - assignedCount);
                          const bidKey = `${order.id}::${req.type}`;
                          const myBidForType = latestBidByOrderAndType.get(bidKey);
                          const hasMyBidForType = Boolean(myBidForType);
                          
                          const isTruck = req.type === AssetType.TRUCK;
                          const typeName = req.type === AssetType.LOADER ? 'Погрузчик' : req.type === AssetType.MINI_LOADER ? 'Мини-погрузчик' : 'Самосвал';
                          const bidStatusLabel = getBidStatusLabel(myBidForType?.bid.status);
                          const basePrice = req.contractorPrice || 0;
                          
                          return (
                            <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{req.type === AssetType.LOADER ? '🚜' : '🚛'}</span>
                                <div>
                                  <div className="text-sm font-black">{typeName}</div>
                                  <div className="text-[9px] text-slate-500">
                                    Нужно: {remaining} ед. • Подача: {formatDateTime(order.scheduledTime)}
                                    {isTruck && ` • ${order.plannedTrips || 0} рейсов`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-lg font-black text-green-400">{formatPrice(req.contractorPrice)}</div>
                                  <div className="text-[8px] text-slate-500">{isTruck ? 'за рейс' : 'за смену'}</div>
                                </div>
                                {!hasMyBidForType ? (
                                  <div className="flex flex-col items-end gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      step={100}
                                      placeholder="Цена меньше"
                                      value={preBidPrices[bidKey] || ''}
                                      onChange={e =>
                                        setPreBidPrices(prev => ({ ...prev, [bidKey]: e.target.value }))
                                      }
                                      className="w-28 bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
                                    />
                                    <button 
                                      onClick={() => {
                                        const rawPrice = (preBidPrices[bidKey] || '').trim();
                                        if (rawPrice) {
                                          const proposed = Number(rawPrice);
                                          if (!Number.isFinite(proposed) || proposed <= 0) {
                                            alert('Укажите корректную цену.');
                                            return;
                                          }
                                          if (basePrice > 0 && proposed >= basePrice) {
                                            alert('Цена должна быть ниже предложенной.');
                                            return;
                                          }
                                          openBidModal(order, req.type, proposed, bidKey);
                                          return;
                                        }
                                        openBidModal(order, req.type, undefined, bidKey);
                                      }}
                                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                                    >
                                      Откликнуться
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end gap-2">
                                    <div className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-blue-600/20 text-blue-300 border border-blue-500/30">
                                      ✓ {bidStatusLabel}
                                    </div>
                                    {myBidForType?.bid.status === 'rejected' && (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min={0}
                                          step={100}
                                          placeholder="Цена меньше"
                                          value={counterOfferPrices[bidKey] || ''}
                                          onChange={e =>
                                            setCounterOfferPrices(prev => ({ ...prev, [bidKey]: e.target.value }))
                                          }
                                          className="w-28 bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            submitLowerPriceOffer(order, myBidForType.bid, counterOfferPrices[bidKey] || '', bidKey)
                                          }
                                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase"
                                        >
                                          Предложить меньше
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === ПРЯМЫЕ ПРЕДЛОЖЕНИЯ === */}
        {activeTab === 'direct' && (
          <div className="space-y-4 animate-in fade-in">
            {filteredDirectOffers.length === 0 ? (
              <div className="text-center py-20 opacity-20">
                <div className="text-6xl mb-4">📨</div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em]">Нет прямых предложений</div>
              </div>
            ) : (
              filteredDirectOffers.map(order => {
                const directRequirements = order.assetRequirements.filter(r => r.contractorId === currentContractorId);
                
                return (
                  <div key={order.id} className="bg-[#12192c] rounded-2xl border-2 border-orange-500/30 overflow-hidden shadow-xl">
                    <div className="bg-orange-500/10 px-5 py-2 border-b border-orange-500/20">
                      <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">⭐ Персональное предложение</span>
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{order.customer}</div>
                          <h4 className="text-lg font-black uppercase leading-tight">{order.address}</h4>
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase">{formatDateTime(order.scheduledTime)}</div>
                      </div>

                      <div className="space-y-2">
                        {directRequirements.map((req, i) => {
                          const assigned = (order.driverDetails || []).filter(d => d.assetType === req.type).length;
                          const remaining = (req.plannedUnits || 0) - assigned;
                          if (remaining <= 0) return null;
                          const bidKey = `${order.id}::${req.type}`;
                          const myBidForType = latestBidByOrderAndType.get(bidKey);
                          const hasMyBidForType = Boolean(myBidForType);
                          const bidStatusLabel = getBidStatusLabel(myBidForType?.bid.status);
                          const basePrice = req.contractorPrice || 0;
                          return (
                            <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{req.type === AssetType.LOADER ? '🚜' : '🚛'}</span>
                                <div>
                                  <div className="text-sm font-black">{req.type} × {remaining}</div>
                                  <div className="text-[9px] text-slate-500">
                                    Предложение для: {req.contractorName || 'Подрядчиков'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-lg font-black text-green-400">{formatPrice(req.contractorPrice)}</div>
                                {!hasMyBidForType ? (
                                  <div className="flex flex-col items-end gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      step={100}
                                      placeholder="Цена меньше"
                                      value={preBidPrices[bidKey] || ''}
                                      onChange={e =>
                                        setPreBidPrices(prev => ({ ...prev, [bidKey]: e.target.value }))
                                      }
                                      className="w-28 bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
                                    />
                                    <button
                                      onClick={() => {
                                        const rawPrice = (preBidPrices[bidKey] || '').trim();
                                        if (rawPrice) {
                                          const proposed = Number(rawPrice);
                                          if (!Number.isFinite(proposed) || proposed <= 0) {
                                            alert('Укажите корректную цену.');
                                            return;
                                          }
                                          if (basePrice > 0 && proposed >= basePrice) {
                                            alert('Цена должна быть ниже предложенной.');
                                            return;
                                          }
                                          openBidModal(order, req.type, proposed, bidKey);
                                          return;
                                        }
                                        openBidModal(order, req.type, undefined, bidKey);
                                      }}
                                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                                    >
                                      Откликнуться
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end gap-2">
                                    <div className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-blue-600/20 text-blue-300 border border-blue-500/30">
                                      ✓ {bidStatusLabel}
                                    </div>
                                    {myBidForType?.bid.status === 'rejected' && (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min={0}
                                          step={100}
                                          placeholder="Цена меньше"
                                          value={counterOfferPrices[bidKey] || ''}
                                          onChange={e =>
                                            setCounterOfferPrices(prev => ({ ...prev, [bidKey]: e.target.value }))
                                          }
                                          className="w-28 bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            submitLowerPriceOffer(order, myBidForType.bid, counterOfferPrices[bidKey] || '', bidKey)
                                          }
                                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase"
                                        >
                                          Предложить меньше
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === АКТИВНЫЕ ЗАКАЗЫ === */}
        {activeTab === 'active' && (
          <div className="space-y-4 animate-in fade-in">
            {filteredActiveOrders.length === 0 ? (
              <div className="text-center py-20 opacity-20">
                <div className="text-6xl mb-4">🚛</div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em]">Нет активных работ</div>
              </div>
            ) : (
              filteredActiveOrders.map(order => {
                const myDrivers = (order.driverDetails || []).filter(d => d.contractorId === currentContractorId);
                const totalTrips = (order.evidences || []).filter(e => myDrivers.some(d => d.driverName === e.driverName)).length;
                const confirmedTrips = (order.evidences || []).filter(e => myDrivers.some(d => d.driverName === e.driverName) && e.confirmed).length;

                return (
                  <div key={order.id} className="bg-[#12192c] rounded-2xl border border-green-500/30 overflow-hidden shadow-xl">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[9px] font-black text-green-400 uppercase">{getOrderStatusLabel(order.status)}</span>
                          </div>
                          <h4 className="text-lg font-black uppercase">{order.address}</h4>
                        </div>
                      </div>

                      {/* Водители */}
                      <div className="space-y-2 mb-4">
                        {myDrivers.map((driver, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{driver.assetType === AssetType.LOADER ? '🚜' : '🚛'}</span>
                              <div>
                                <div className="text-sm font-black">{driver.driverName}</div>
                                <div className="text-[9px] text-slate-500">
                                  {driver.assetType === AssetType.LOADER ? 'Погрузчик' : driver.assetType === AssetType.MINI_LOADER ? 'Мини-погрузчик' : 'Самосвал'}
                                </div>
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  📍 {order.address}
                                </div>
                                <div className="text-[9px] text-blue-400 mt-0.5">
                                  🕐 Подача: {formatDateTime(order.scheduledTime)}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase text-center ${
                                driver.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                                driver.status === 'working' ? 'bg-green-500/20 text-green-400' :
                                driver.status === 'en_route' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-slate-500/20 text-slate-400'
                              }`}>
                                {driver.status === 'completed' ? '✓ Завершено' :
                                 driver.status === 'working' ? '⚡ В работе' :
                                 driver.status === 'en_route' ? '🚚 В пути' :
                                 '📋 Назначен'}
                              </div>
                              {driver.status !== 'completed' && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!onUpdateDriverAssignment) return;
                                      onUpdateDriverAssignment(order.id, driver.id, {
                                        status: 'en_route',
                                        arrivedAt: new Date().toISOString()
                                      });
                                    }}
                                    disabled={!onUpdateDriverAssignment}
                                    className={`flex-shrink-0 px-4 py-2.5 min-h-[44px] rounded-xl text-[9px] font-black uppercase touch-feedback ${
                                      onUpdateDriverAssignment
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                                    }`}
                                  >
                                    🚚 В пути
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!onUpdateDriverAssignment) return;
                                      onUpdateDriverAssignment(order.id, driver.id, {
                                        status: 'working',
                                        startedAt: new Date().toISOString()
                                      });
                                    }}
                                    disabled={!onUpdateDriverAssignment}
                                    className={`flex-shrink-0 px-4 py-2.5 min-h-[44px] rounded-xl text-[9px] font-black uppercase touch-feedback ${
                                      onUpdateDriverAssignment
                                        ? 'bg-green-600 hover:bg-green-500 text-white active:scale-95'
                                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                                    }`}
                                  >
                                    ✅ В работе
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!onUpdateDriverAssignment) return;
                                      const orderId = order.id;
                                      const driverId = driver.id;
                                      setConfirmModal({
                                        isOpen: true,
                                        title: 'Завершение работы',
                                        message: `Отметить завершение работы для ${driver.driverName}?`,
                                        confirmText: 'Завершить',
                                        confirmColor: 'green',
                                        onConfirm: () => {
                                          onUpdateDriverAssignment(orderId, driverId, {
                                            status: 'completed',
                                            completedAt: new Date().toISOString()
                                          });
                                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                        }
                                      });
                                    }}
                                    disabled={!onUpdateDriverAssignment}
                                    className={`flex-shrink-0 px-4 py-2.5 min-h-[44px] rounded-xl text-[9px] font-black uppercase touch-feedback ${
                                      onUpdateDriverAssignment
                                        ? 'bg-slate-700 hover:bg-slate-600 text-white active:scale-95'
                                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                                    }`}
                                  >
                                    🏁 Завершить
                                  </button>
                                  {/* Кнопка отзыва техники - только если статус assigned или confirmed */}
                                  {['assigned', 'confirmed'].includes(driver.status) && onRemoveAssignment && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const orderId = order.id;
                                        const assignmentId = driver.id;
                                        setConfirmModal({
                                          isOpen: true,
                                          title: 'Отзыв техники',
                                          message: `Вы уверены, что хотите отозвать технику "${driver.driverName}" с этого заказа? Заказ снова появится на бирже.`,
                                          confirmText: 'Отозвать',
                                          confirmColor: 'red',
                                          onConfirm: () => {
                                            onRemoveAssignment(orderId, assignmentId, 'Отозвано подрядчиком');
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                          }
                                        });
                                      }}
                                      className="flex-shrink-0 px-4 py-2.5 min-h-[44px] rounded-xl text-[9px] font-black uppercase touch-feedback bg-red-600/20 hover:bg-red-600/40 text-red-400 active:scale-95"
                                    >
                                      ❌ Отозвать
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {(() => {
                        const contractorMessages = getContractorMessages(order);
                        const lastMessage = contractorMessages[contractorMessages.length - 1];
                        const unreadCount = contractorMessages.filter(msg =>
                          msg.toRole === 'contractor' &&
                          (!msg.toId || msg.toId === currentContractorId) &&
                          !msg.isRead
                        ).length;
                        return (
                          <div className="bg-white/5 p-3 rounded-xl mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-[9px] font-black uppercase text-slate-500 mb-1">
                                Переписка с диспетчером
                              </div>
                              <div className="text-sm text-slate-200">
                                {lastMessage ? lastMessage.text : 'Сообщений пока нет'}
                              </div>
                              {lastMessage && (
                                <div className="text-[9px] text-slate-500 mt-1">
                                  {lastMessage.fromRole === 'contractor' ? 'Вы' : 'Диспетчер'} • {formatDateTime(lastMessage.timestamp)}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => openChat(order)}
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-blue-600/20 text-blue-200 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
                            >
                              💬 Написать {unreadCount > 0 && <span className="ml-1 text-amber-300">({unreadCount})</span>}
                            </button>
                          </div>
                        );
                      })()}

                      {/* Статистика */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/5 p-3 rounded-xl text-center">
                          <div className="text-xl font-black">{totalTrips}</div>
                          <div className="text-[8px] text-slate-500 uppercase">Рейсов</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl text-center">
                          <div className="text-xl font-black text-green-400">{confirmedTrips}</div>
                          <div className="text-[8px] text-slate-500 uppercase">Засчитано</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl text-center">
                          <div className="text-xl font-black text-yellow-400">{totalTrips - confirmedTrips}</div>
                          <div className="text-[8px] text-slate-500 uppercase">На проверке</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === ФИНАНСЫ === */}
        {activeTab === 'earnings' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Общая статистика - компактная */}
            <div className="bg-gradient-to-br from-green-600 to-green-800 p-5 rounded-2xl shadow-2xl">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <div className="text-2xl font-black">{formatPrice(earningsData.totalEarned)}</div>
                  <div className="text-[8px] uppercase opacity-70">Подтверждено</div>
                </div>
                <div>
                  <div className="text-xl font-black text-green-200">{formatPrice(earningsData.totalPending)}</div>
                  <div className="text-[8px] uppercase opacity-70">На проверке</div>
                </div>
                <div>
                  <div className="text-xl font-black">{earningsData.completedOrders}</div>
                  <div className="text-[8px] uppercase opacity-70">Заказов</div>
                </div>
                <div>
                  <div className="text-xl font-black">{earningsData.totalTrips}</div>
                  <div className="text-[8px] uppercase opacity-70">Рейсов</div>
                </div>
              </div>
            </div>

            {/* Суб-табы: В работе / Завершённые */}
            <div className="flex gap-2 bg-[#12192c] p-1.5 rounded-xl">
              <button
                onClick={() => setFinanceSubTab('active')}
                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${
                  financeSubTab === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                В работе ({filteredActiveEarningsByOrder.length})
              </button>
              <button
                onClick={() => setFinanceSubTab('completed')}
                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${
                  financeSubTab === 'completed'
                    ? 'bg-green-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Завершённые ({filteredHistoryByOrder.length})
              </button>
            </div>

            {/* Список заказов - В РАБОТЕ */}
            {financeSubTab === 'active' && (
              <div className="space-y-3">
              {filteredActiveEarningsByOrder.length === 0 ? (
                <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5 text-center text-slate-500 text-[10px] uppercase">
                  Нет данных для отображения
                </div>
              ) : (
                filteredActiveEarningsByOrder.map(entry => (
                  <div key={entry.order.id} className="bg-[#12192c] p-5 rounded-2xl border border-white/5">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">{entry.order.customer}</div>
                        <div className="text-lg font-black">{entry.order.address}</div>
                        <div className="text-[9px] text-slate-500">Подача: {formatDateTime(entry.order.scheduledTime)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${entry.statusClass}`}>
                          {getOrderStatusLabel(entry.order.status)}
                        </div>
                        <div className="text-[9px] text-slate-400">{entry.statusSummary}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/5 p-3 rounded-xl">
                        <div className="text-[8px] uppercase text-slate-500">Подтверждено</div>
                        <div className="text-lg font-black text-green-400">{formatPrice(entry.totals.confirmed)}</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl">
                        <div className="text-[8px] uppercase text-slate-500">На проверке</div>
                        <div className="text-lg font-black text-yellow-300">{formatPrice(entry.totals.pending)}</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl">
                        <div className="text-[8px] uppercase text-slate-500">Всего</div>
                        <div className="text-lg font-black">{formatPrice(entry.totals.confirmed + entry.totals.pending)}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {entry.driverRows.map(row => {
                        const statusInfo = getDriverStatusInfo(row.driver.status);
                        const totalUnits = row.earnings.confirmedUnits + row.earnings.pendingUnits;
                        const isLoaderAssignment = isLoaderType(row.driver.assetType);
                        const shiftHours = isLoaderAssignment
                          ? getShiftHours(row.driver.shiftStartTime, row.driver.shiftEndTime, 'confirmed')
                          : 0;
                        const hourlyRate = isLoaderAssignment
                          ? (row.driver.priceUnit === PriceUnit.PER_HOUR ? row.earnings.pricePerUnit : row.earnings.pricePerUnit / 8)
                          : 0;
                        const hoursLabel = row.driver.shiftEndTime
                          ? `${formatHours(shiftHours)} ч`
                          : row.driver.shiftStartTime
                            ? 'смена в процессе'
                            : '—';
                        const hourlyRateLabel = isLoaderAssignment ? `${formatPrice(hourlyRate)}/ч` : '';
                        const shiftRateLabel =
                          isLoaderAssignment && row.driver.priceUnit !== PriceUnit.PER_HOUR
                            ? `${formatPrice(row.earnings.pricePerUnit)}/смена`
                            : '';
                        const calcLabel = isLoaderAssignment
                          ? row.driver.shiftEndTime
                            ? row.driver.priceUnit === PriceUnit.PER_HOUR
                              ? `${hourlyRateLabel} × ${hoursLabel} = ${formatPrice(row.earnings.confirmedAmount)}`
                              : `max(${shiftRateLabel}, ${hourlyRateLabel} × ${hoursLabel}) = ${formatPrice(row.earnings.confirmedAmount)}`
                            : row.driver.shiftStartTime
                              ? 'Смена в процессе, итог после завершения'
                              : ''
                          : '';
                        return (
                          <div key={row.driver.id} className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-xl">
                            <div>
                              <div className="text-sm font-black">{row.driver.driverName}</div>
                              <div className="text-[9px] text-slate-500">
                                {row.driver.assetType} • {formatPrice(row.earnings.pricePerUnit)} / {row.unitLabel}
                              </div>
                              {isLoaderAssignment && (
                                <>
                                  <div className="text-[9px] text-slate-400 mt-0.5">
                                    Часы: {hoursLabel} • Цена часа: {hourlyRateLabel}
                                    {shiftRateLabel && ` • База: ${shiftRateLabel}`}
                                  </div>
                                  {calcLabel && (
                                    <div className="text-[9px] text-slate-500 mt-0.5">
                                      Расчёт: {calcLabel}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              Подтверждено: {row.earnings.confirmedUnits} {row.unitPlural} • На проверке: {row.earnings.pendingUnits} {row.unitPlural} • Всего: {totalUnits} {row.unitPlural}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-black text-green-400">{formatPrice(row.earnings.confirmedAmount)}</div>
                                <div className="text-[9px] text-yellow-300">{formatPrice(row.earnings.pendingAmount)}</div>
                              </div>
                              <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${statusInfo.className}`}>
                                {statusInfo.label}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              </div>
            )}

            {/* Список заказов - ЗАВЕРШЁННЫЕ */}
            {financeSubTab === 'completed' && (
              <div className="space-y-3">
              {filteredHistoryByOrder.length === 0 ? (
                <div className="bg-[#12192c] p-10 rounded-2xl border border-white/5 text-center">
                  <div className="text-4xl mb-3 opacity-30">🕘</div>
                  <div className="text-slate-500 text-[10px] uppercase">Нет завершённых заказов</div>
                </div>
              ) : (
                filteredHistoryByOrder.map(entry => {
                  const totalAmount = entry.totals.confirmed + entry.totals.pending;
                  return (
                    <div key={entry.order.id} className="bg-[#12192c] p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-black text-green-400 uppercase tracking-widest">{entry.order.customer}</div>
                          <div className="text-sm font-black truncate">{entry.order.address}</div>
                          <div className="text-[9px] text-slate-500">{formatDateTime(entry.order.scheduledTime)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-green-400">{formatPrice(totalAmount)}</div>
                          <div className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-green-600/20 text-green-400 inline-block">
                            ✓ Завершено
                          </div>
                        </div>
                      </div>

                      {/* Детали по технике */}
                      <div className="bg-white/5 p-3 rounded-xl space-y-2">
                        {entry.driverRows.map((row, index) => {
                          const units = row.earnings.confirmedUnits + row.earnings.pendingUnits;
                          const amount = row.earnings.confirmedAmount + row.earnings.pendingAmount;
                          return (
                            <div key={`${row.driver.id}-${index}`} className="flex items-center justify-between text-[10px]">
                              <div>
                                <span className="font-black">{row.driver.driverName}</span>
                                <span className="text-slate-500 ml-2">{row.driver.assetType}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400">{units} {row.unitPlural} × {formatPrice(row.earnings.pricePerUnit)} = </span>
                                <span className="font-black text-green-400">{formatPrice(amount)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            )}

            {/* Рейтинг - компактный */}
            <div className="bg-[#12192c] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={`text-lg ${star <= contractorRating ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
                  ))}
                </div>
                <div className="text-lg font-black">{contractorRating.toFixed(1)}</div>
              </div>
              <div className="text-[9px] text-slate-500">
                Выполнено заказов: <span className="font-black text-white">{currentContractor.completedOrders}</span>
              </div>
            </div>
          </div>
        )}

        {/* === РЕЙСЫ (ВОДИТЕЛЬ) === */}
        {activeTab === 'driver' && (
          <div className="animate-in fade-in">
            <DriverPortal
              key={`driver-${currentContractorId}`}
              orders={filteredDriverOrdersInWork}
              contractors={contractors}
              driverName={driverName}
              driverContractorId={currentContractorId}
              onReportTrip={onReportTrip}
              onAcceptJob={onAcceptJob}
              onFinishWork={onFinishWork}
              onUpdateDriverAssignment={onUpdateDriverAssignment}
              embedded
              hideCompletedAssignments
            />
          </div>
        )}
      </div>

      {chatModal.isOpen && chatOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#12192c] rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-white/10">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">
              💬 Переписка с диспетчером
            </h3>
            <p className="text-[10px] text-slate-500 uppercase mb-4">
              Заказ: {chatOrder.address}
            </p>

            <div ref={chatMessagesRef} className="space-y-2 max-h-64 overflow-y-auto mb-4 pr-1">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-500 text-[10px] uppercase py-6">
                  Сообщений пока нет
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMine = msg.fromRole === 'contractor' && msg.fromId === currentContractorId;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl p-3 ${isMine ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-200'}`}>
                        <div className={`text-[9px] mb-1 ${isMine ? 'text-blue-100' : 'text-slate-400'}`}>
                          {isMine ? 'Вы' : 'Диспетчер'} • {formatDateTime(msg.timestamp)}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <textarea
              value={chatModal.message}
              onChange={e => setChatModal(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Напишите диспетчеру..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setChatModal({ isOpen: false, order: null, message: '' })}
                className="flex-1 bg-white/10 text-white py-4 min-h-[48px] rounded-xl text-[11px] font-black uppercase touch-feedback active:scale-95"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={sendChatMessage}
                disabled={!chatModal.message.trim()}
                className={`flex-1 py-4 min-h-[48px] rounded-xl text-[11px] font-black uppercase touch-feedback active:scale-95 ${
                  chatModal.message.trim()
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

      {/* Модалка отклика */}
      {showBidModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-[#12192c] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/10">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Отклик на заказ</h3>
            <p className="text-[10px] text-slate-500 uppercase mb-6">{selectedOrder.address}</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Ваша цена за рейс</label>
                <input
                  type="number"
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-4 text-2xl font-black outline-none focus:border-blue-500"
                  value={bidForm.price}
                  onChange={e => setBidForm({ ...bidForm, price: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Информация о технике</label>
                <input
                  type="text"
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Марка, гос.номер"
                  value={bidForm.vehicleInfo}
                  onChange={e => setBidForm({ ...bidForm, vehicleInfo: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Время подачи</label>
                <input
                  type="datetime-local"
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-blue-500 text-white"
                  value={bidForm.estimatedArrival}
                  min={toLocalDateTimeInputValue()}
                  onChange={e => setBidForm({ ...bidForm, estimatedArrival: e.target.value })}
                />
                <div className="text-[9px] text-slate-500 mt-2">Можно выбрать дату и время, включая завтра.</div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Комментарий</label>
                <textarea
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-blue-500 min-h-[80px]"
                  placeholder="Дополнительная информация"
                  value={bidForm.comment}
                  onChange={e => setBidForm({ ...bidForm, comment: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBidModal(false)}
                className="flex-1 bg-white/10 text-white py-4 min-h-[48px] rounded-xl text-[11px] font-black uppercase touch-feedback active:scale-95"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmitBid}
                className="flex-1 bg-blue-600 text-white py-4 min-h-[48px] rounded-xl text-[11px] font-black uppercase touch-feedback active:scale-95"
              >
                Отправить отклик
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка подтверждения */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmColor={confirmModal.confirmColor}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ContractorPortal;



