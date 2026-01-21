import React, { useState, useMemo, useCallback } from 'react';
import { Order, OrderStatus, AssetType, Contractor, Bid, DriverAssignment, formatPrice, formatDateTime, generateId, PriceUnit } from '../types';

interface ContractorPortalProps {
  orders: Order[];
  contractors: Contractor[];
  currentContractorId: string;
  onSubmitBid: (orderId: string, bid: Bid) => void;
  onWithdrawBid: (orderId: string, bidId: string) => void;
  onUpdateContractor: (contractor: Contractor) => void;
}

const ContractorPortal: React.FC<ContractorPortalProps> = ({
  orders,
  contractors,
  currentContractorId,
  onSubmitBid,
  onWithdrawBid,
  onUpdateContractor
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'direct' | 'active' | 'earnings' | 'settings'>('available');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [bidForm, setBidForm] = useState({
    price: 0,
    assetType: AssetType.TRUCK,
    vehicleInfo: '',
    estimatedArrival: '30',
    comment: ''
  });
  const [showBidModal, setShowBidModal] = useState(false);

  // Текущий подрядчик
  const currentContractor = useMemo(() => {
    return contractors.find(c => c.id === currentContractorId);
  }, [contractors, currentContractorId]);

  // Доступные заказы на бирже
  const availableOrders = useMemo(() => {
    return orders.filter(o => 
      o.isBirzhaOpen && 
      o.status !== OrderStatus.COMPLETED && 
      o.status !== OrderStatus.CANCELLED &&
      o.assetRequirements.some(req => !req.contractorId)
    );
  }, [orders]);

  // Прямые предложения (где указан этот подрядчик)
  const directOffers = useMemo(() => {
    return orders.filter(o =>
      o.status !== OrderStatus.COMPLETED &&
      o.status !== OrderStatus.CANCELLED &&
      o.assetRequirements.some(req => req.contractorId === currentContractorId)
    );
  }, [orders, currentContractorId]);

  // Активные заказы (где работает техника подрядчика)
  const activeOrders = useMemo(() => {
    return orders.filter(o =>
      [OrderStatus.IN_PROGRESS, OrderStatus.EN_ROUTE, OrderStatus.EQUIPMENT_APPROVED].includes(o.status as OrderStatus) &&
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
        const driverTrips = (o.evidences || []).filter(e => e.driverName === driver.driverName);
        const confirmedTrips = driverTrips.filter(e => e.confirmed).length;
        const pendingTrips = driverTrips.filter(e => !e.confirmed).length;
        
        const pricePerTrip = driver.assignedPrice || 
          o.assetRequirements.find(r => r.type === driver.assetType)?.contractorPrice || 0;
        
        totalEarned += confirmedTrips * pricePerTrip;
        totalPending += pendingTrips * pricePerTrip;
        totalTrips += driverTrips.length;
      });

      if (o.status === OrderStatus.COMPLETED) {
        completedOrders++;
      }
    });

    return { totalEarned, totalPending, completedOrders, totalTrips };
  }, [orders, currentContractorId]);

  // Отправка отклика
  const handleSubmitBid = useCallback(() => {
    if (!selectedOrder || !currentContractor) return;

    const newBid: Bid = {
      id: generateId(),
      orderId: selectedOrder.id,
      contractorId: currentContractorId,
      driverName: currentContractor.name,
      assetType: bidForm.assetType,
      vehicleInfo: bidForm.vehicleInfo,
      proposedPrice: bidForm.price,
      priceUnit: PriceUnit.PER_TRIP,
      estimatedArrival: `${bidForm.estimatedArrival} мин`,
      comment: bidForm.comment,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    onSubmitBid(selectedOrder.id, newBid);
    setShowBidModal(false);
    setSelectedOrder(null);
    setBidForm({ price: 0, assetType: AssetType.TRUCK, vehicleInfo: '', estimatedArrival: '30', comment: '' });
  }, [selectedOrder, currentContractor, currentContractorId, bidForm, onSubmitBid]);

  // Отзыв отклика
  const handleWithdrawBid = useCallback((orderId: string, bidId: string) => {
    if (confirm('Отозвать отклик?')) {
      onWithdrawBid(orderId, bidId);
    }
  }, [onWithdrawBid]);

  // Открытие модалки отклика
  const openBidModal = (order: Order, assetType: AssetType) => {
    const requirement = order.assetRequirements.find(r => r.type === assetType);
    setSelectedOrder(order);
    setBidForm(prev => ({
      ...prev,
      assetType,
      price: requirement?.contractorPrice || 0
    }));
    setShowBidModal(true);
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
                <span className="text-[8px] text-yellow-400">★ {currentContractor.rating.toFixed(1)}</span>
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
            className={`flex-1 py-2.5 text-[8px] font-black uppercase rounded-lg transition-all whitespace-nowrap px-3 ${
              activeTab === 'available' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500'
            }`}
          >
            🌐 Биржа {availableOrders.length > 0 && `(${availableOrders.length})`}
          </button>
          <button 
            onClick={() => setActiveTab('direct')} 
            className={`flex-1 py-2.5 text-[8px] font-black uppercase rounded-lg transition-all whitespace-nowrap px-3 ${
              activeTab === 'direct' ? 'bg-orange-500 text-white shadow-xl' : 'text-slate-500'
            }`}
          >
            📨 Прямые {directOffers.length > 0 && `(${directOffers.length})`}
          </button>
          <button 
            onClick={() => setActiveTab('active')} 
            className={`flex-1 py-2.5 text-[8px] font-black uppercase rounded-lg transition-all whitespace-nowrap px-3 ${
              activeTab === 'active' ? 'bg-green-600 text-white shadow-xl' : 'text-slate-500'
            }`}
          >
            🚛 В работе {activeOrders.length > 0 && `(${activeOrders.length})`}
          </button>
          <button 
            onClick={() => setActiveTab('earnings')} 
            className={`flex-1 py-2.5 text-[8px] font-black uppercase rounded-lg transition-all whitespace-nowrap px-3 ${
              activeTab === 'earnings' ? 'bg-green-600 text-white shadow-xl' : 'text-slate-500'
            }`}
          >
            💰 Финансы
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 no-scrollbar">
        
        {/* === БИРЖА === */}
        {activeTab === 'available' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Мои отклики */}
            {myBids.filter(b => b.bid.status === 'pending').length > 0 && (
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                  Ваши отклики ({myBids.filter(b => b.bid.status === 'pending').length})
                </h4>
                <div className="space-y-2">
                  {myBids.filter(b => b.bid.status === 'pending').map(({ order, bid }) => (
                    <div key={bid.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                      <div>
                        <div className="text-sm font-black">{order.address}</div>
                        <div className="text-[9px] text-slate-500">{formatPrice(bid.proposedPrice)} • {bid.assetType}</div>
                      </div>
                      <button 
                        onClick={() => handleWithdrawBid(order.id, bid.id)}
                        className="text-[9px] text-red-400 font-black uppercase hover:text-red-300"
                      >
                        Отозвать
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Доступные заказы */}
            {availableOrders.length === 0 ? (
              <div className="text-center py-20 opacity-20">
                <div className="text-6xl mb-4">🌐</div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em]">Нет доступных заказов</div>
              </div>
            ) : (
              availableOrders.map(order => {
                const birzhaRequirements = order.assetRequirements.filter(r => !r.contractorId);
                const hasAnyMyPendingBid = myBids.some(b => b.order.id === order.id && b.bid.status === 'pending');
                
                return (
                  <div key={order.id} className={`bg-[#12192c] rounded-2xl border ${hasAnyMyPendingBid ? 'border-blue-500/50' : 'border-white/5'} overflow-hidden shadow-xl`}>
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
                          const remaining = req.plannedUnits - assignedCount;
                          const hasMyPendingBidForType = myBids.some(
                            b => b.order.id === order.id && b.bid.status === 'pending' && b.bid.assetType === req.type
                          );
                          
                          if (remaining <= 0) return null;
                          
                          return (
                            <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{req.type === AssetType.LOADER ? '🚜' : '🚛'}</span>
                                <div>
                                  <div className="text-sm font-black">{req.type}</div>
                                  <div className="text-[9px] text-slate-500">Нужно: {remaining} ед.</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-lg font-black text-green-400">{formatPrice(req.contractorPrice)}</div>
                                  <div className="text-[8px] text-slate-500">за рейс</div>
                                </div>
                                {!hasMyPendingBidForType ? (
                                  <button 
                                    onClick={() => openBidModal(order, req.type)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                                  >
                                    Откликнуться
                                  </button>
                                ) : (
                                  <div className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-blue-600/20 text-blue-300 border border-blue-500/30">
                                    ✓ Отклик отправлен
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
            {directOffers.length === 0 ? (
              <div className="text-center py-20 opacity-20">
                <div className="text-6xl mb-4">📨</div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em]">Нет прямых предложений</div>
              </div>
            ) : (
              directOffers.map(order => {
                const myRequirements = order.assetRequirements.filter(r => r.contractorId === currentContractorId);
                
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
                        {myRequirements.map((req, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{req.type === AssetType.LOADER ? '🚜' : '🚛'}</span>
                              <div>
                                <div className="text-sm font-black">{req.type} × {req.plannedUnits}</div>
                              </div>
                            </div>
                            <div className="text-lg font-black text-green-400">{formatPrice(req.contractorPrice)}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl text-[11px] font-black uppercase">
                          ✅ Принять
                        </button>
                        <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-[11px] font-black uppercase">
                          💬 Обсудить
                        </button>
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
            {activeOrders.length === 0 ? (
              <div className="text-center py-20 opacity-20">
                <div className="text-6xl mb-4">🚛</div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em]">Нет активных работ</div>
              </div>
            ) : (
              activeOrders.map(order => {
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
                            <span className="text-[9px] font-black text-green-400 uppercase">{order.status}</span>
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
                                <div className="text-[9px] text-slate-500">{driver.assetType}</div>
                              </div>
                            </div>
                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                              driver.status === 'working' ? 'bg-green-500/20 text-green-400' :
                              driver.status === 'en_route' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {driver.status || 'assigned'}
                            </div>
                          </div>
                        ))}
                      </div>

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
            {/* Общая статистика */}
            <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-3xl shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4">Финансовый отчёт</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-3xl font-black">{formatPrice(earningsData.totalEarned)}</div>
                  <div className="text-[9px] uppercase opacity-70">Подтверждено</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-green-200">{formatPrice(earningsData.totalPending)}</div>
                  <div className="text-[9px] uppercase opacity-70">На проверке</div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <span className="opacity-70">Выполнено заказов:</span>
                  <span className="font-black ml-2">{earningsData.completedOrders}</span>
                </div>
                <div>
                  <span className="opacity-70">Всего рейсов:</span>
                  <span className="font-black ml-2">{earningsData.totalTrips}</span>
                </div>
              </div>
            </div>

            {/* Рейтинг */}
            <div className="bg-[#12192c] p-6 rounded-2xl border border-white/5">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Рейтинг компании</h4>
              <div className="flex items-center gap-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={`text-2xl ${star <= currentContractor.rating ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
                  ))}
                </div>
                <div>
                  <div className="text-xl font-black">{currentContractor.rating.toFixed(1)}</div>
                  <div className="text-[9px] text-slate-500">из 5.0</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-slate-400">
                Выполнено заказов: {currentContractor.completedOrders}
              </div>
            </div>
          </div>
        )}
      </div>

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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Время подачи (минут)</label>
                <div className="grid grid-cols-4 gap-2">
                  {['15', '30', '45', '60'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBidForm({ ...bidForm, estimatedArrival: t })}
                      className={`py-2 rounded-xl text-sm font-black ${
                        bidForm.estimatedArrival === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
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
                className="flex-1 bg-white/10 text-white py-4 rounded-xl text-[11px] font-black uppercase"
              >
                Отмена
              </button>
              <button 
                onClick={handleSubmitBid}
                className="flex-1 bg-blue-600 text-white py-4 rounded-xl text-[11px] font-black uppercase"
              >
                Отправить отклик
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractorPortal;
