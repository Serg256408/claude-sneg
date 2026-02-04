import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Order, OrderStatus, TripEvidence, Contractor, AssetType, DriverAssignment, formatPrice, formatDateTime, generateId, DateRange, isOrderInDateRange, normalizeOrderStatus, getOrderStatusLabel, calculateAssignmentEarnings, PriceUnit } from './types';

interface DriverPortalProps {
  orders: Order[];
  contractors: Contractor[];
  driverName: string;
  driverContractorId: string;
  onReportTrip: (orderId: string, evidence: TripEvidence) => void;
  onAcceptJob: (orderId: string, contractorId: string, assetType: AssetType) => void;
  onFinishWork: (orderId: string) => void;
  onUpdateDriverAssignment?: (orderId: string, driverAssignmentId: string, updates: Partial<DriverAssignment>) => void;
  embedded?: boolean;
}

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const DriverPortal: React.FC<DriverPortalProps> = ({
  orders,
  contractors,
  driverName,
  driverContractorId,
  onReportTrip,
  onAcceptJob,
  onFinishWork,
  onUpdateDriverAssignment,
  embedded = false
}) => {
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; type: AssetType } | null>(null);
  const [activeTab, setActiveTab] = useState<'mine' | 'public' | 'company' | 'earnings'>('mine');
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeoPosition | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<'loading' | 'full_truck' | 'unloading' | 'ticket'>('loading');
  const [capturedPhotos, setCapturedPhotos] = useState<{ type: string; url: string; timestamp: string }[]>([]);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const dateRange = useMemo<DateRange>(() => ({
    from: dateFrom || undefined,
    to: dateTo || undefined
  }), [dateFrom, dateTo]);

  
  // Получаем текущее назначение водителя из выбранного заказа (для погрузчика)
  const currentDriverAssignment = useMemo(() => {
    if (!selectedOrder) return null;
    return (selectedOrder.order.driverDetails || []).find(d => 
      d.assetType === selectedOrder.type && 
      (driverContractorId ? d.contractorId === driverContractorId : d.driverName === driverName)
    );
  }, [selectedOrder, driverContractorId, driverName]);
  
  // Время смены из данных заказа (для погрузчика) — сохранённые значения
  const savedLoaderStartTime = currentDriverAssignment?.shiftStartTime || '';
  const savedLoaderEndTime = currentDriverAssignment?.shiftEndTime || '';
  const loaderShiftStarted = !!savedLoaderStartTime;
  
  // Локальное состояние для ввода времени (пока не сохранено)
  const [inputStartTime, setInputStartTime] = useState<string>('');
  const [inputEndTime, setInputEndTime] = useState<string>('');
  
  // Синхронизация локального ввода с сохранёнными данными при смене заказа
  useEffect(() => {
    setInputStartTime(savedLoaderStartTime);
    setInputEndTime(savedLoaderEndTime);
  }, [savedLoaderStartTime, savedLoaderEndTime, currentDriverAssignment?.id]);
  
  // Отображаемое время: сохранённое или вводимое
  const loaderStartTime = loaderShiftStarted ? savedLoaderStartTime : inputStartTime;
  const loaderEndTime = loaderShiftStarted ? (inputEndTime || savedLoaderEndTime) : '';
  
  // Функция сохранения времени смены погрузчика
  const saveLoaderShiftTime = useCallback((field: 'shiftStartTime' | 'shiftEndTime', value: string) => {
    if (!selectedOrder || !currentDriverAssignment || !onUpdateDriverAssignment) {
      return;
    }
    onUpdateDriverAssignment(selectedOrder.order.id, currentDriverAssignment.id, { [field]: value });
  }, [selectedOrder, currentDriverAssignment, onUpdateDriverAssignment]);

  const markAssignmentStatus = useCallback((status: DriverAssignment['status']) => {
    if (!selectedOrder || !currentDriverAssignment || !onUpdateDriverAssignment) {
      return;
    }
    onUpdateDriverAssignment(selectedOrder.order.id, currentDriverAssignment.id, {
      status,
      ...(status === 'en_route' ? { arrivedAt: new Date().toISOString() } : {}),
      ...(status === 'working' ? { startedAt: new Date().toISOString() } : {}),
      ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {})
    });
  }, [selectedOrder, currentDriverAssignment, onUpdateDriverAssignment]);

  // Получение геолокации
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setGeoError(null);
        },
        (error) => {
          setGeoError(`Ошибка GPS: ${error.message}`);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Мои работы (каждая единица техники отдельно)
  // Фильтруем по contractorId (если есть) или по driverName
  const myJobs = useMemo(() => {
    const jobs: { order: Order; type: AssetType; driverDetail: DriverAssignment }[] = [];
    
    orders.forEach(o => {
      if (normalizeOrderStatus(o.status) === OrderStatus.CANCELLED) return;
      // Получаем все назначения этого подрядчика/водителя на этом заказе
      const myAssignments = (o.driverDetails || []).filter(d => 
        driverContractorId ? d.contractorId === driverContractorId : d.driverName === driverName
      );
      myAssignments.forEach(assignment => {
        jobs.push({ order: o, type: assignment.assetType, driverDetail: assignment });
      });
    });
    return jobs;
  }, [orders, driverName, driverContractorId]);

  // Публичная биржа
  const publicBoard = useMemo(() => {
    const list: { order: Order; type: AssetType }[] = [];
    orders.forEach(o => {
      if (!o.isBirzhaOpen || [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(normalizeOrderStatus(o.status))) return;
      o.assetRequirements.filter(req => !req.contractorId).forEach(req => {
        if (!(o.driverDetails || []).some(d => d.driverName === driverName && d.assetType === req.type)) {
          list.push({ order: o, type: req.type });
        }
      });
    });
    return list;
  }, [orders, driverName]);

  // Прямые предложения от подрядчика
  const companyBoard = useMemo(() => {
    const list: { order: Order; type: AssetType }[] = [];
    if (!driverContractorId) return list;
    orders.forEach(o => {
      if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(normalizeOrderStatus(o.status))) return;
      o.assetRequirements.filter(req => req.contractorId === driverContractorId).forEach(req => {
        const assigned = (o.driverDetails || []).filter(d => d.assetType === req.type && d.contractorId === driverContractorId).length;
        if (assigned < req.plannedUnits && !(o.driverDetails || []).some(d => d.driverName === driverName && d.assetType === req.type)) {
          list.push({ order: o, type: req.type });
        }
      });
    });
    return list;
  }, [orders, driverName, driverContractorId]);

  // Расчёт заработка
  const earningsData = useMemo(() => {
    let totalPreliminary = 0;
    let totalConfirmed = 0;
    let totalTrips = 0;
    let confirmedTrips = 0;

    orders.forEach(o => {
      // Получаем все назначения этого подрядчика/водителя
      const myAssignments = (o.driverDetails || []).filter(d => 
        driverContractorId ? d.contractorId === driverContractorId : d.driverName === driverName
      );
      
      myAssignments.forEach(myAssignment => {
        const earnings = calculateAssignmentEarnings(o, myAssignment);
        totalPreliminary += earnings.confirmedAmount + earnings.pendingAmount;
        totalConfirmed += earnings.confirmedAmount;
        if (myAssignment.priceUnit === PriceUnit.PER_TRIP) {
          totalTrips += earnings.confirmedUnits + earnings.pendingUnits;
          confirmedTrips += earnings.confirmedUnits;
        }
      });
    });

    return { totalPreliminary, totalConfirmed, totalTrips, confirmedTrips };
  }, [orders, driverName, driverContractorId]);

  const filteredMyJobs = useMemo(() => {
    return myJobs.filter(j => isOrderInDateRange(j.order, dateRange));
  }, [myJobs, dateRange]);

  const filteredPublicBoard = useMemo(() => {
    return publicBoard.filter(j => isOrderInDateRange(j.order, dateRange));
  }, [publicBoard, dateRange]);

  const filteredCompanyBoard = useMemo(() => {
    return companyBoard.filter(j => isOrderInDateRange(j.order, dateRange));
  }, [companyBoard, dateRange]);

  const displayJobs = activeTab === 'mine' 
    ? filteredMyJobs.map(j => ({ order: j.order, type: j.type }))  // myJobs содержит { order, type, driverDetail }
    : activeTab === 'public' ? filteredPublicBoard : filteredCompanyBoard;

  // Обработка фото
  const handleFileCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setIsCapturing(true);
    const file = e.target.files[0];
    
    // Проверка даты фото (EXIF) - базовая проверка по lastModified
    const photoDate = new Date(file.lastModified);
    const now = new Date();
    const hoursDiff = (now.getTime() - photoDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      alert('⚠️ Внимание: Фотография сделана более 24 часов назад. Рекомендуется сделать свежее фото.');
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const newPhoto = {
        type: photoType,
        url: reader.result as string,
        timestamp: new Date().toISOString()
      };
      setCapturedPhotos(prev => [...prev, newPhoto]);
      setIsCapturing(false);
    };
    reader.readAsDataURL(file);
    
    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [photoType]);

  // Отправка рейса
  const submitTrip = useCallback(() => {
    if (!selectedOrder || capturedPhotos.length === 0) {
      alert('Необходимо сделать хотя бы одно фото!');
      return;
    }

    const activeOrder = orders.find(o => o.id === selectedOrder.order.id);
    if (!activeOrder) return;

    // Проверка: нельзя отправлять рейсы после завершения работы
    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.CANCELLED];
    const assignmentCompleted = currentDriverAssignment?.status === 'completed';
    if (assignmentCompleted || completedStatuses.includes(normalizeOrderStatus(activeOrder.status))) {
      alert('❌ Работа завершена. Отправка рейсов невозможна.');
      return;
    }

    const tripNumber = (activeOrder.evidences || []).filter(e => e.driverName === driverName).length + 1;

    const evidence: TripEvidence = {
      id: generateId(),
      orderId: activeOrder.id,
      tripNumber,
      driverName,
      timestamp: new Date().toISOString(),
      assignmentId: currentDriverAssignment?.id,
      coordinates: currentPosition || undefined,
      photos: capturedPhotos,
      photoValidation: {
        isRecent: true,
        isInGeofence: true, // Можно добавить реальную проверку геозоны
        validationErrors: []
      },
      confirmed: false
    };

    onReportTrip(activeOrder.id, evidence);
    if (onUpdateDriverAssignment && currentDriverAssignment?.id && currentDriverAssignment.status !== 'working' && currentDriverAssignment.status !== 'completed') {
      onUpdateDriverAssignment(activeOrder.id, currentDriverAssignment.id, {
        status: 'working',
        startedAt: currentDriverAssignment.startedAt || new Date().toISOString(),
      });
    }
    setCapturedPhotos([]);
    setShowPhotoPreview(false);
    alert('✅ Рейс отправлен на проверку!');
  }, [selectedOrder, capturedPhotos, currentPosition, driverName, orders, onReportTrip, onUpdateDriverAssignment, currentDriverAssignment]);

  // Текущий выбранный заказ (обновлённый)
  const activeSelectedOrder = selectedOrder
    ? orders.find(o => o.id === selectedOrder.order.id)
    : null;

  const driverEvidences = activeSelectedOrder
    ? (activeSelectedOrder.evidences || []).filter(e =>
        currentDriverAssignment?.id ? e.assignmentId === currentDriverAssignment.id : e.driverName === driverName
      )
    : [];

  const confirmedCount = driverEvidences.filter(e => e.confirmed).length;
  const pendingCount = driverEvidences.filter(e => !e.confirmed).length;

  // Заработок по текущему заказу
  const currentOrderEarnings = useMemo(() => {
    if (!activeSelectedOrder) return { preliminary: 0, confirmed: 0 };
    
    const myAssignment = (activeSelectedOrder.driverDetails || []).find(d => d.driverName === driverName);
    if (!myAssignment) return { preliminary: 0, confirmed: 0 };
    const earnings = calculateAssignmentEarnings(activeSelectedOrder, myAssignment);
    return {
      preliminary: earnings.confirmedAmount + earnings.pendingAmount,
      confirmed: earnings.confirmedAmount
    };
  }, [activeSelectedOrder, driverName]);

  const photoTypeLabels = {
    loading: '📦 Погрузка',
    full_truck: '🚛 Полный кузов',
    unloading: '📤 Выгрузка',
    ticket: '🎫 Талон'
  };

  const containerClass = embedded
    ? 'flex flex-col h-full text-white font-[\'Inter\'] bg-[#0a0f1d] rounded-3xl border border-white/5 overflow-hidden'
    : 'flex flex-col h-full bg-[#0a0f1d] text-white font-[\'Inter\']';

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="p-4 bg-[#12192c] border-b border-white/5 shadow-2xl sticky top-0 z-30">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
                {driverName.charAt(0)}
              </div>
              <div>
                <h2 className="text-sm font-black uppercase truncate max-w-[180px]">{driverName}</h2>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${currentPosition ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                    {currentPosition ? 'GPS активен' : 'GPS недоступен'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-black text-green-400">{formatPrice(earningsData.totalConfirmed)}</div>
              <div className="text-[8px] text-slate-500 uppercase">Подтверждено</div>
            </div>
          </div>

          <div className="grid grid-cols-4 bg-[#1c2641] p-1 rounded-xl border border-white/5 gap-1">
            <button 
              onClick={() => { setActiveTab('mine'); setSelectedOrder(null); }} 
              className={`py-2.5 text-[8px] font-black uppercase rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === 'mine' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500'}`}
            >
              <span>🚛</span>
              <span>В работе</span>
              {filteredMyJobs.length > 0 && <span className="bg-blue-500 text-white text-[7px] px-1.5 rounded-full">{filteredMyJobs.length}</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('company'); setSelectedOrder(null); }} 
              className={`py-2.5 text-[8px] font-black uppercase rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === 'company' ? 'bg-orange-500 text-white shadow-xl' : 'text-slate-500'}`}
            >
              <span>📨</span>
              <span>Прямые</span>
              {filteredCompanyBoard.length > 0 && <span className="bg-orange-400 text-white text-[7px] px-1.5 rounded-full">{filteredCompanyBoard.length}</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('public'); setSelectedOrder(null); }} 
              className={`py-2.5 text-[8px] font-black uppercase rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === 'public' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500'}`}
            >
              <span>🌐</span>
              <span>Биржа</span>
              {filteredPublicBoard.length > 0 && <span className="bg-blue-400 text-white text-[7px] px-1.5 rounded-full">{filteredPublicBoard.length}</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('earnings'); setSelectedOrder(null); }} 
              className={`py-2.5 text-[8px] font-black uppercase rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === 'earnings' ? 'bg-green-600 text-white shadow-xl' : 'text-slate-500'}`}
            >
              <span>💰</span>
              <span>Заработок</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40 no-scrollbar">
        {!embedded && (
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
        )}
        
        {/* Вкладка заработка */}
        {activeTab === 'earnings' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Общая статистика */}
            <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-3xl shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4">Общий заработок</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-black">{formatPrice(earningsData.totalConfirmed)}</div>
                  <div className="text-[9px] uppercase opacity-70">Подтверждено</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-green-200">{formatPrice(earningsData.totalPreliminary)}</div>
                  <div className="text-[9px] uppercase opacity-70">Предварительно</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 flex justify-between">
                <span className="text-[10px] uppercase">Рейсов: {earningsData.confirmedTrips} / {earningsData.totalTrips}</span>
                <span className="text-[10px] uppercase">На проверке: {earningsData.totalTrips - earningsData.confirmedTrips}</span>
              </div>
            </div>

            {/* История по заказам */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">История по объектам</h4>
              {orders.filter(o => (o.evidences || []).some(e => e.driverName === driverName)).map(order => {
                const myEvs = (order.evidences || []).filter(e => e.driverName === driverName);
                const myAssignment = (order.driverDetails || []).find(d => d.driverName === driverName);
                const earnings = myAssignment ? calculateAssignmentEarnings(order, myAssignment) : null;
                const confirmed = earnings ? earnings.confirmedUnits : myEvs.filter(e => e.confirmed).length;
                const totalUnits = earnings ? earnings.confirmedUnits + earnings.pendingUnits : myEvs.length;
                const confirmedAmount = earnings ? earnings.confirmedAmount : 0;
                
                return (
                  <div key={order.id} className="bg-[#12192c] p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-black text-sm uppercase">{order.address}</div>
                        <div className="text-[9px] text-slate-500">{formatDateTime(order.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-black">{formatPrice(confirmedAmount)}</div>
                        <div className="text-[8px] text-slate-500">{confirmed} / {totalUnits} рейсов</div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all" 
                        style={{ width: `${totalUnits > 0 ? (confirmed / totalUnits) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Список заказов */}
        {activeTab !== 'earnings' && !activeSelectedOrder && (
          displayJobs.length > 0 ? (
              displayJobs.map(({ order: job, type }, idx) => {
              const requirement = job.assetRequirements.find(r => r.type === type);
              const priceForDriver = requirement?.contractorPrice || 0;
              const unitLabel = requirement?.priceUnit === PriceUnit.PER_HOUR
                ? 'за час'
                : requirement?.priceUnit === PriceUnit.PER_SHIFT
                ? 'за смену'
                : 'за рейс';
              const isUrgent = new Date(job.scheduledTime).getTime() - Date.now() < 3600000;
              
              return (
                <button 
                  key={idx} 
                  onClick={() => setSelectedOrder({ order: job, type })} 
                  className={`w-full text-left rounded-3xl border-2 bg-[#12192c] p-5 shadow-xl transition-all active:scale-[0.98] ${
                    activeTab === 'company' ? 'border-orange-500/30' : 
                    isUrgent ? 'border-red-500/30' : 'border-white/5'
                  }`}
                >
                  {isUrgent && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">СРОЧНО</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{job.customer}</span>
                    <span className="text-[8px] font-black uppercase bg-black/20 px-2 py-1 rounded-md">{job.status}</span>
                  </div>
                  <h4 className="text-lg font-black mb-3 leading-tight uppercase">{job.address}</h4>
                  
                  {/* Ограничения */}
                  {job.restrictions && (
                    <div className="flex gap-2 mb-3">
                      {job.restrictions.hasHeightLimit && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">↕️ Высота</span>}
                      {job.restrictions.hasNarrowEntrance && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">↔️ Узкий</span>}
                      {job.restrictions.hasPermitRegime && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">🎫 Пропуск</span>}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-end pt-3 border-t border-white/5">
                    <div>
                      <div className="text-2xl font-black text-green-400">{formatPrice(priceForDriver)}</div>
                      <div className="text-[8px] text-slate-500 uppercase">{unitLabel}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1">
                        {type === AssetType.LOADER ? '🚜' : '🚛'} {type}
                      </span>
                      <div className="text-[8px] text-slate-600">{formatDateTime(job.scheduledTime)}</div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-20 opacity-20">
              <div className="text-6xl mb-4">
                {activeTab === 'mine' ? '🚛' : activeTab === 'company' ? '📨' : '🌐'}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.4em]">
                {activeTab === 'mine' ? 'Нет активных работ' : 'Нет доступных заказов'}
              </div>
            </div>
          )
        )}

        {/* Детали заказа */}
        {activeTab !== 'earnings' && activeSelectedOrder && (
          <div className="animate-in slide-in-from-bottom-8 space-y-4">
            <button 
              onClick={() => { setSelectedOrder(null); setCapturedPhotos([]); }} 
              className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"
            >
              ← Назад к списку
            </button>
            
            <div className="bg-[#12192c] rounded-3xl p-6 border border-blue-500/30 shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black uppercase leading-tight">{activeSelectedOrder.address}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                    {formatDateTime(activeSelectedOrder.scheduledTime)}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                  normalizeOrderStatus(activeSelectedOrder.status) === OrderStatus.IN_PROGRESS ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {getOrderStatusLabel(activeSelectedOrder.status)}
                </div>
              </div>

              {/* Карточка заработка */}
              <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 p-4 rounded-2xl border border-white/10 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-black text-white">{driverEvidences.length}</div>
                    <div className="text-[8px] text-slate-400 uppercase">Рейсов</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-green-400">{confirmedCount}</div>
                    <div className="text-[8px] text-slate-400 uppercase">Засчитано</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-yellow-400">{pendingCount}</div>
                    <div className="text-[8px] text-slate-400 uppercase">На проверке</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                  <div>
                    <div className="text-[8px] text-slate-500 uppercase">Предварительно</div>
                    <div className="text-lg font-black text-slate-300">{formatPrice(currentOrderEarnings.preliminary)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] text-slate-500 uppercase">Подтверждено</div>
                    <div className="text-lg font-black text-green-400">{formatPrice(currentOrderEarnings.confirmed)}</div>
                  </div>
                </div>
              </div>

              {/* Проверка на завершение работы */}
              {(() => {
                const assignmentCompleted = currentDriverAssignment?.status === 'completed';
                const isWorkCompleted =
                  assignmentCompleted ||
                  [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(normalizeOrderStatus(activeSelectedOrder.status));
                // Проверяем назначение по contractorId или driverName
                const isAssigned = (activeSelectedOrder.driverDetails || []).some(d => 
                  driverContractorId ? d.contractorId === driverContractorId : d.driverName === driverName
                );
                
                if (isWorkCompleted) {
                  return (
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-600/30 text-center">
                      <div className="text-4xl mb-3">✅</div>
                      <div className="text-lg font-black text-slate-400 uppercase mb-2">Работа завершена</div>
                      <div className="text-[10px] text-slate-500">Отправка рейсов больше недоступна</div>
                    </div>
                  );
                }
                
                if (isAssigned) {
                  return (
                <div className="space-y-4">
                  {selectedOrder?.type === AssetType.TRUCK ? (
                    <>
                      {/* Выбор типа фото */}
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                          Тип фотографии
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(photoTypeLabels).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setPhotoType(key as any)}
                              className={`py-2 px-2 rounded-xl text-[8px] font-black uppercase transition-all ${
                                photoType === key 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-white/5 text-slate-400 border border-white/10'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Кнопка фото */}
                      <label className="block w-full cursor-pointer">
                        <div className={`bg-blue-600 p-8 rounded-3xl flex flex-col items-center gap-3 border-b-8 border-blue-800 shadow-2xl active:scale-95 transition-all ${isCapturing ? 'opacity-50' : ''}`}>
                          <span className="text-5xl">{isCapturing ? '⏳' : '📸'}</span>
                          <span className="font-black uppercase tracking-widest text-white text-sm">
                            {isCapturing ? 'Обработка...' : 'Сделать фото'}
                          </span>
                          <span className="text-[9px] opacity-70">{photoTypeLabels[photoType]}</span>
                        </div>
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={handleFileCapture}
                          disabled={isCapturing}
                        />
                      </label>

                      {/* Превью сделанных фото */}
                      {capturedPhotos.length > 0 && (
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black uppercase text-slate-400">
                              Фото для рейса ({capturedPhotos.length})
                            </span>
                            <button 
                              onClick={() => setCapturedPhotos([])}
                              className="text-[9px] text-red-400 font-black uppercase"
                            >
                              Очистить
                            </button>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {capturedPhotos.map((photo, i) => (
                              <div key={i} className="relative shrink-0">
                                <img src={photo.url} className="w-16 h-16 object-cover rounded-lg" />
                                <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[7px] text-center py-0.5 rounded-b-lg">
                                  {photoTypeLabels[photo.type as keyof typeof photoTypeLabels] || photo.type}
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={submitTrip}
                            className="w-full mt-3 bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                          >
                            ✅ Отправить рейс на проверку
                          </button>
                        </div>
                      )}

                      {/* GPS статус */}
                      <div className={`p-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-between ${
                        currentPosition ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        <span>{currentPosition ? '📍 Геолокация определена' : '⚠️ GPS недоступен'}</span>
                        {currentPosition && (
                          <span className="text-slate-500">±{Math.round(currentPosition.accuracy)}м</span>
                        )}
                      </div>

                      {/* История рейсов */}
                      {driverEvidences.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                            История смены ({driverEvidences.length} рейсов)
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {driverEvidences.slice().reverse().map((ev, i) => (
                              <div key={ev.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                <div className="w-12 h-12 bg-black rounded-lg overflow-hidden shrink-0">
                                  <img 
                                    src={ev.photos?.[0]?.url || ev.photo} 
                                    className="w-full h-full object-cover" 
                                    alt={`Рейс ${ev.tripNumber || driverEvidences.length - i}`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-black uppercase text-slate-300">
                                    Рейс #{ev.tripNumber || driverEvidences.length - i}
                                  </div>
                                  <div className="text-[8px] text-slate-500">
                                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase ${
                                  ev.confirmed ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {ev.confirmed ? '✅ Принят' : '⏳ Проверка'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Для погрузчика/мини-погрузчика - интерфейс с временем смены */
                    <div className="space-y-4">
                      <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <span className="text-4xl">🚜</span>
                          <span className="text-lg font-black uppercase text-green-400">
                            {selectedOrder?.type === AssetType.MINI_LOADER ? 'Мини-погрузчик' : 'Погрузчик'}
                          </span>
                        </div>
                        
                        {!loaderShiftStarted ? (
                          <>
                            <div className="mb-4">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                                Время начала смены
                              </label>
                              <input
                                type="time"
                                value={inputStartTime}
                                onChange={(e) => setInputStartTime(e.target.value)}
                                className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-lg font-black text-center outline-none focus:border-green-500"
                              />
                            </div>
                            <button
                              onClick={() => {
                                if (!inputStartTime) {
                                  alert('Укажите время начала смены');
                                  return;
                                }
                                saveLoaderShiftTime('shiftStartTime', inputStartTime);
                              }}
                              className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                            >
                              ▶️ Начать смену
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-white/5 p-3 rounded-xl text-center">
                                <div className="text-[8px] text-slate-500 uppercase mb-1">Начало</div>
                                <div className="text-xl font-black text-green-400">{loaderStartTime}</div>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl">
                                <label className="text-[8px] text-slate-500 uppercase mb-1 block text-center">Конец</label>
                                <input
                                  type="time"
                                  value={inputEndTime}
                                  onChange={(e) => {
                                    setInputEndTime(e.target.value);
                                    saveLoaderShiftTime('shiftEndTime', e.target.value);
                                  }}
                                  className="w-full bg-transparent text-xl font-black text-center outline-none text-orange-400"
                                />
                              </div>
                            </div>
                            
                            {loaderEndTime && (
                              <div className="bg-white/5 p-3 rounded-xl text-center mb-4">
                                <div className="text-[8px] text-slate-500 uppercase mb-1">Отработано</div>
                                <div className="text-xl font-black">
                                  {(() => {
                                    const [sh, sm] = loaderStartTime.split(':').map(Number);
                                    const [eh, em] = loaderEndTime.split(':').map(Number);
                                    let hours = eh - sh;
                                    let mins = em - sm;
                                    if (mins < 0) { hours--; mins += 60; }
                                    if (hours < 0) hours += 24;
                                    return `${hours}ч ${mins}м`;
                                  })()}
                                </div>
                              </div>
                            )}
                            
                            <div className="bg-blue-500/10 p-3 rounded-xl text-center border border-blue-500/20">
                              <span className="text-[9px] text-blue-400 font-black uppercase">
                                ⏱️ Смена активна
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {currentDriverAssignment && currentDriverAssignment.status !== 'completed' && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        type="button"
                        onClick={() => markAssignmentStatus('en_route')}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl text-[9px] font-black uppercase"
                      >
                        🚚 В пути
                      </button>
                      <button
                        type="button"
                        onClick={() => markAssignmentStatus('working')}
                        className="bg-green-600 hover:bg-green-500 text-white py-3 rounded-2xl text-[9px] font-black uppercase"
                      >
                        ✅ В работе
                      </button>
                    </div>
                  )}

                  {/* Кнопка завершения */}
                  <button 
                    onClick={() => { 
                      if (confirm('Завершить работу на этом объекте?')) { 
                        if (selectedOrder?.type !== AssetType.TRUCK && loaderShiftStarted && !loaderEndTime) {
                          const endTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                          setInputEndTime(endTime);
                          saveLoaderShiftTime('shiftEndTime', endTime);
                        }
                        if (onUpdateDriverAssignment && currentDriverAssignment) {
                          markAssignmentStatus('completed');
                        } else {
                          onFinishWork(activeSelectedOrder.id);
                        }
                        setSelectedOrder(null);
                        // Время смены сохраняется в данных заказа, локальный ввод сбрасывается автоматически при смене заказа
                        setInputStartTime('');
                        setInputEndTime('');
                      } 
                    }} 
                    className="w-full bg-slate-800 hover:bg-slate-700 p-5 rounded-3xl text-[10px] font-black uppercase text-slate-400 mt-4 transition-all"
                  >
                    🏁 Завершить работу на объекте
                  </button>
                    </div>
                  );
                }
                
                // Если не назначен - кнопка принятия
                return (
                  <button 
                    onClick={() => { 
                      onAcceptJob(activeSelectedOrder.id, driverContractorId, selectedOrder!.type); 
                      alert('✅ Заявка отправлена! Ожидайте подтверждения менеджера.');
                    }} 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 p-10 rounded-3xl text-2xl font-black uppercase tracking-widest border-b-8 border-blue-800 shadow-2xl active:scale-95 active:border-b-0 transition-all"
                  >
                    ✅ ОТКЛИКНУТЬСЯ
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverPortal;
