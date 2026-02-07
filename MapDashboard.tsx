import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Order, OrderStatus, AssetType, getOrderStatusLabel, normalizeOrderStatus, formatDateTime } from './types';

declare global {
  interface Window {
    L: any;
  }
}

interface MapDashboardProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

type StatusFilter = 'all' | 'urgent' | 'waiting' | 'in_progress' | 'completed';

const MapDashboard: React.FC<MapDashboardProps> = ({
  orders,
  onSelectOrder,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Центр Москвы
  const defaultCenter: [number, number] = [55.7512, 37.6184];

  // Проверяем валидность координат
  const isValidCoords = (coords: [number, number] | undefined): boolean => {
    if (!coords || !Array.isArray(coords) || coords.length < 2) return false;
    const [lat, lng] = coords;
    return lat >= 54 && lat <= 57 && lng >= 35 && lng <= 40;
  };

  // Статусы ДО подтверждения клиентом (не показываем на карте)
  const BEFORE_CONFIRMATION_STATUSES = [
    OrderStatus.DRAFT,
    OrderStatus.NEW_REQUEST,
    OrderStatus.CALCULATING,
    OrderStatus.AWAITING_CUSTOMER,
  ];

  // Статусы после завершения (не показываем на карте)
  const AFTER_COMPLETION_STATUSES = [
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ];

  // Проверяем, должен ли заказ отображаться на карте
  const isActiveForMap = (order: Order): boolean => {
    const status = normalizeOrderStatus(order.status);

    // Не показываем заказы до подтверждения клиентом
    if (BEFORE_CONFIRMATION_STATUSES.includes(status)) return false;

    // Не показываем завершённые/отменённые заказы
    if (AFTER_COMPLETION_STATUSES.includes(status)) return false;

    return true;
  };

  // Проверяем, все ли единицы техники назначены
  const isAllEquipmentAssigned = (order: Order): boolean => {
    if (!order.assetRequirements || order.assetRequirements.length === 0) return true;

    for (const req of order.assetRequirements) {
      const requiredCount = req.plannedUnits || 1;
      const assignedCount = (order.driverDetails || []).filter(d => d.assetType === req.type).length;
      if (assignedCount < requiredCount) {
        return false; // Не все единицы назначены
      }
    }
    return true;
  };

  // Определяем категорию статуса
  const getStatusCategory = (order: Order): StatusFilter => {
    const status = normalizeOrderStatus(order.status);
    const hasDrivers = (order.driverDetails?.length || 0) > 0;
    const allEquipmentAssigned = isAllEquipmentAssigned(order);

    if (status === OrderStatus.COMPLETED) return 'completed';
    if (status === OrderStatus.IN_PROGRESS) return 'in_progress';
    // Если нет водителей ИЛИ не вся техника назначена — поиск техники
    if (status === OrderStatus.SEARCHING_EQUIPMENT || !hasDrivers || !allEquipmentAssigned) return 'urgent';
    return 'waiting';
  };

  // Цвет по категории
  const getCategoryColor = (category: StatusFilter) => {
    switch (category) {
      case 'urgent': return '#ef4444'; // Красный - срочно
      case 'waiting': return '#f97316'; // Оранжевый - ожидание
      case 'in_progress': return '#3b82f6'; // Синий - в работе
      case 'completed': return '#22c55e'; // Зелёный - выполнено
      default: return '#64748b';
    }
  };

  // Заказы, которые должны отображаться на карте (подтверждены, но не завершены)
  const activeOrders = useMemo(() => {
    return orders.filter(isActiveForMap);
  }, [orders]);

  // Статистика по категориям (только для активных заказов)
  const stats = useMemo(() => {
    const result = { all: 0, urgent: 0, waiting: 0, in_progress: 0, completed: 0 };
    activeOrders.forEach(order => {
      result.all++;
      result[getStatusCategory(order)]++;
    });
    return result;
  }, [activeOrders]);

  // Фильтрация заказов
  const filteredOrders = useMemo(() => {
    return activeOrders.filter(order => {
      // Фильтр по статусу
      if (statusFilter !== 'all' && getStatusCategory(order) !== statusFilter) return false;

      // Фильтр по поиску
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          order.customer.toLowerCase().includes(q) ||
          order.address.toLowerCase().includes(q) ||
          order.driverDetails?.some(d => d.driverName?.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeOrders, statusFilter, searchQuery]);

  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current, {
        center: defaultCenter,
        zoom: 11,
        zoomControl: true,
      });

      // Используем CartoDB тайлы (более чистый стиль)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CartoDB',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }
  }, []);

  // Обновляем маркеры
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Удаляем старые маркеры
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Добавляем новые маркеры
    filteredOrders.forEach(order => {
      const coords = isValidCoords(order.coordinates) ? order.coordinates : defaultCenter;
      const category = getStatusCategory(order);
      const color = getCategoryColor(category);
      const isHovered = hoveredId === order.id;

      // Собираем информацию о водителях (только актуально назначенные)
      const uniqueDrivers = (order.driverDetails || [])
        .map(d => d.driverName)
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);

      // Количество назначенной техники (из driverDetails)
      const assignedTrucks = (order.driverDetails || []).filter(d => d.assetType === AssetType.TRUCK).length;
      const assignedLoaders = (order.driverDetails || []).filter(d => d.assetType === AssetType.LOADER || d.assetType === AssetType.MINI_LOADER).length;
      // Требуемое количество
      const requiredTrucks = order.assetRequirements?.filter(r => r.type === AssetType.TRUCK).reduce((sum, r) => sum + (r.plannedUnits || 1), 0) || 0;
      const requiredLoaders = order.assetRequirements?.filter(r => r.type === AssetType.LOADER || r.type === AssetType.MINI_LOADER).reduce((sum, r) => sum + (r.plannedUnits || 1), 0) || 0;

      // Создаём кастомную иконку
      const size = isHovered ? 44 : 38;
      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${isHovered ? 16 : 14}px;
            box-shadow: 0 4px 15px ${color}80;
            cursor: pointer;
            transition: all 0.2s;
            ${category === 'urgent' ? 'animation: pulse 1.5s infinite;' : ''}
          ">
            ${order.actualTrips}/${order.plannedTrips}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
      });

      const marker = window.L.marker(coords, { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="min-width: 280px; font-family: system-ui, sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div>
                <div style="font-weight: 800; font-size: 15px; color: #1e293b;">${order.customer}</div>
                <div style="color: #64748b; font-size: 12px; margin-top: 2px;">${order.address}</div>
              </div>
              <span style="
                background: ${color};
                color: white;
                padding: 3px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
                white-space: nowrap;
              ">${getOrderStatusLabel(order.status)}</span>
            </div>

            <div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748b; font-size: 11px;">Прогресс рейсов</span>
                <span style="font-weight: 700; font-size: 12px;">${order.actualTrips} / ${order.plannedTrips}</span>
              </div>
              <div style="background: #e2e8f0; border-radius: 4px; height: 6px; overflow: hidden;">
                <div style="background: ${color}; height: 100%; width: ${Math.min(100, (order.actualTrips / order.plannedTrips) * 100)}%;"></div>
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-bottom: 10px;">
              ${requiredTrucks > 0 ? `<div style="display: flex; align-items: center; gap: 4px;"><span style="font-size: 16px;">🚛</span><span style="font-weight: 600; font-size: 13px; ${assignedTrucks < requiredTrucks ? 'color: #ef4444;' : 'color: #22c55e;'}">${assignedTrucks}/${requiredTrucks}</span></div>` : ''}
              ${requiredLoaders > 0 ? `<div style="display: flex; align-items: center; gap: 4px;"><span style="font-size: 16px;">🚜</span><span style="font-weight: 600; font-size: 13px; ${assignedLoaders < requiredLoaders ? 'color: #ef4444;' : 'color: #22c55e;'}">${assignedLoaders}/${requiredLoaders}</span></div>` : ''}
            </div>

            ${uniqueDrivers.length > 0 ? `
              <div style="border-top: 1px solid #e2e8f0; padding-top: 10px;">
                <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Назначены:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                  ${uniqueDrivers.map(d => `<span style="background: #1e293b; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${d}</span>`).join('')}
                </div>
              </div>
            ` : ''}
            ${(assignedTrucks < requiredTrucks || assignedLoaders < requiredLoaders) ? `
              <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; color: #ef4444; font-weight: 600; font-size: 12px;">
                🔍 Поиск техники: ${requiredTrucks - assignedTrucks > 0 ? `${requiredTrucks - assignedTrucks} самосвал(ов)` : ''} ${requiredLoaders - assignedLoaders > 0 ? `${requiredLoaders - assignedLoaders} погрузчик(ов)` : ''}
              </div>
            ` : ''}

            <div style="margin-top: 10px; color: #94a3b8; font-size: 10px;">
              📅 ${formatDateTime(order.scheduledTime)}
            </div>
          </div>
        `, { maxWidth: 320 });

      marker.on('click', () => {
        // Приближаем карту к заказу при клике на маркер
        if (isValidCoords(order.coordinates)) {
          mapInstanceRef.current.setView(order.coordinates, 15, { animate: true });
        }
        onSelectOrder(order);
      });
      marker.on('mouseover', () => {
        setHoveredId(order.id);
        marker.openPopup();
      });
      marker.on('mouseout', () => setHoveredId(null));

      markersRef.current.push(marker);
    });

    // НЕ центрируем автоматически - только при клике на заказ
  }, [filteredOrders, hoveredId, onSelectOrder]);

  // Функция для приближения к заказу (вызывается при клике на карточку в списке)
  const zoomToOrder = (order: Order) => {
    if (!mapInstanceRef.current) return;
    const coords = isValidCoords(order.coordinates) ? order.coordinates : null;
    if (coords) {
      mapInstanceRef.current.setView(coords, 15, { animate: true });
      // Открываем popup маркера
      markersRef.current.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        if (markerLatLng.lat === coords[0] && markerLatLng.lng === coords[1]) {
          marker.openPopup();
        }
      });
    }
    onSelectOrder(order);
  };

  // Кнопки фильтров (без "Готово" - завершённые заказы не показываются на карте)
  const filterButtons: { key: StatusFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'Все активные', icon: '📍' },
    { key: 'urgent', label: 'Поиск техники', icon: '🔴' },
    { key: 'waiting', label: 'Назначена', icon: '🟠' },
    { key: 'in_progress', label: 'В работе', icon: '🔵' },
  ];

  return (
    <div className="flex flex-col gap-4 h-[85vh]">
      {/* Статистика сверху */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setStatusFilter(btn.key)}
            className={`p-4 rounded-2xl border transition-all ${
              statusFilter === btn.key
                ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{btn.icon}</span>
              <span className={`text-3xl font-black ${statusFilter === btn.key ? 'text-white' : 'text-slate-900'}`}>
                {stats[btn.key]}
              </span>
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${statusFilter === btn.key ? 'text-slate-300' : 'text-slate-500'}`}>
              {btn.label}
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Карта */}
        <div className="flex-1 rounded-2xl border border-slate-200 relative overflow-hidden shadow-xl bg-white">
          {/* Поиск на карте */}
          <div className="absolute top-4 left-4 right-4 z-[1000]">
            <input
              type="text"
              placeholder="Поиск по адресу, клиенту, водителю..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full md:w-80 px-4 py-3 rounded-xl bg-white/95 backdrop-blur border border-slate-200 shadow-lg text-sm font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />

          {/* Легенда */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-lg z-[1000]">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Активные заказы</div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-[10px] font-semibold text-slate-600">Поиск техники</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span className="text-[10px] font-semibold text-slate-600">Техника назначена</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-[10px] font-semibold text-slate-600">В работе</span>
              </div>
            </div>
          </div>

          {/* Кнопка "Показать все" */}
          {filteredOrders.length > 0 && (
            <button
              onClick={() => {
                const validOrders = filteredOrders.filter(o => isValidCoords(o.coordinates));
                if (validOrders.length > 0 && mapInstanceRef.current) {
                  const bounds = window.L.latLngBounds(validOrders.map(o => o.coordinates));
                  mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
                }
              }}
              className="absolute bottom-4 right-4 bg-white/95 backdrop-blur px-4 py-2.5 rounded-xl border border-slate-200 shadow-lg z-[1000] text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              📍 Показать все
            </button>
          )}
        </div>

        {/* Список заказов */}
        <div className="w-full lg:w-96 flex flex-col gap-3 overflow-y-auto no-scrollbar">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">
            Активных: {filteredOrders.length} из {activeOrders.length}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-sm font-medium">Нет заказов</div>
            </div>
          ) : (
            filteredOrders.map(order => {
              const category = getStatusCategory(order);
              const color = getCategoryColor(category);
              const isHovered = hoveredId === order.id;
              // Показываем только актуально назначенных водителей из driverDetails
              const uniqueDrivers = (order.driverDetails || [])
                .map(d => d.driverName)
                .filter(Boolean)
                .filter((v, i, a) => a.indexOf(v) === i); // уникальные
              const progress = order.plannedTrips > 0 ? Math.min(100, (order.actualTrips / order.plannedTrips) * 100) : 0;

              return (
                <div
                  key={order.id}
                  onMouseEnter={() => setHoveredId(order.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => zoomToOrder(order)}
                  className={`relative bg-white p-4 rounded-2xl border transition-all cursor-pointer ${
                    isHovered ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xl -translate-y-0.5' : 'border-slate-200 hover:border-slate-300 shadow-md'
                  }`}
                >
                  {/* Статус badge */}
                  <div
                    className="absolute -top-2 right-4 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase text-white shadow-md"
                    style={{ backgroundColor: color }}
                  >
                    {category === 'urgent' ? 'Поиск техники' : category === 'waiting' ? 'Техника назначена' : category === 'in_progress' ? 'В работе' : 'Готово'}
                  </div>

                  <div className="flex gap-3">
                    {/* Прогресс круг */}
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <svg className="w-14 h-14 -rotate-90">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                        <circle
                          cx="28" cy="28" r="24" fill="none" stroke={color} strokeWidth="4"
                          strokeDasharray={`${progress * 1.51} 151`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-black text-slate-700">{order.actualTrips}/{order.plannedTrips}</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-blue-600 uppercase">{order.customer}</div>
                      <div className="text-sm font-bold text-slate-800 truncate">{order.address}</div>

                      {uniqueDrivers.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {uniqueDrivers.slice(0, 2).map(d => (
                            <span key={d} className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{d}</span>
                          ))}
                          {uniqueDrivers.length > 2 && (
                            <span className="text-[9px] font-bold text-slate-400">+{uniqueDrivers.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-red-500 mt-2">⚠️ Нет водителей</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CSS для анимации пульса */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default MapDashboard;
