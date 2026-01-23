import React, { useState, useMemo } from 'react';
import {
  Order,
  OrderStatus,
  Estimate,
  EstimateItem,
  ServiceType,
  PriceBookItem,
  generateId,
  formatPrice,
  calculateEstimateTotals,
  SERVICE_TYPE_LABELS,
  UNIT_LABELS,
} from './types';

interface EstimatorPortalProps {
  orders: Order[];
  priceBook: PriceBookItem[];
  currentEstimatorId: string;
  currentEstimatorName: string;
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
  onSaveEstimate: (orderId: string, estimate: Estimate) => void;
}

// Дефолтный прайс-лист для демо
const DEFAULT_PRICE_BOOK: PriceBookItem[] = [
  // Снег
  { id: '1', workTypeId: 'snow_trip_20', workTypeName: 'Вывоз снега (самосвал 20м³)', serviceType: ServiceType.SNOW, unit: 'trip', unitLabel: 'рейс', baseCustomerPrice: 3500, baseCostPrice: 2800, isActive: true, createdAt: new Date().toISOString() },
  { id: '2', workTypeId: 'snow_trip_25', workTypeName: 'Вывоз снега (самосвал 25м³)', serviceType: ServiceType.SNOW, unit: 'trip', unitLabel: 'рейс', baseCustomerPrice: 4200, baseCostPrice: 3400, isActive: true, createdAt: new Date().toISOString() },
  { id: '3', workTypeId: 'loader_shift', workTypeName: 'Погрузчик JCB (смена)', serviceType: ServiceType.SNOW, unit: 'shift', unitLabel: 'смена', baseCustomerPrice: 15000, baseCostPrice: 12000, isActive: true, createdAt: new Date().toISOString() },
  { id: '4', workTypeId: 'loader_hour', workTypeName: 'Погрузчик JCB (час)', serviceType: ServiceType.SNOW, unit: 'hour', unitLabel: 'час', baseCustomerPrice: 2500, baseCostPrice: 2000, isActive: true, createdAt: new Date().toISOString() },
  { id: '5', workTypeId: 'mini_loader', workTypeName: 'Мини-погрузчик (смена)', serviceType: ServiceType.SNOW, unit: 'shift', unitLabel: 'смена', baseCustomerPrice: 12000, baseCostPrice: 9500, isActive: true, createdAt: new Date().toISOString() },
  // Асфальт
  { id: '10', workTypeId: 'asphalt_m2', workTypeName: 'Асфальтирование (1 слой)', serviceType: ServiceType.ASPHALT, unit: 'm2', unitLabel: 'м²', baseCustomerPrice: 450, baseCostPrice: 350, isActive: true, createdAt: new Date().toISOString() },
  { id: '11', workTypeId: 'asphalt_m2_2', workTypeName: 'Асфальтирование (2 слоя)', serviceType: ServiceType.ASPHALT, unit: 'm2', unitLabel: 'м²', baseCustomerPrice: 850, baseCostPrice: 680, isActive: true, createdAt: new Date().toISOString() },
  { id: '12', workTypeId: 'curb_m', workTypeName: 'Бордюр дорожный', serviceType: ServiceType.ASPHALT, unit: 'running_meter', unitLabel: 'п.м.', baseCustomerPrice: 1200, baseCostPrice: 900, isActive: true, createdAt: new Date().toISOString() },
  { id: '13', workTypeId: 'gravel_m3', workTypeName: 'Отсыпка щебнем', serviceType: ServiceType.ASPHALT, unit: 'm3', unitLabel: 'м³', baseCustomerPrice: 1800, baseCostPrice: 1400, isActive: true, createdAt: new Date().toISOString() },
  { id: '14', workTypeId: 'sand_m3', workTypeName: 'Отсыпка песком', serviceType: ServiceType.ASPHALT, unit: 'm3', unitLabel: 'м³', baseCustomerPrice: 1200, baseCostPrice: 950, isActive: true, createdAt: new Date().toISOString() },
  { id: '15', workTypeId: 'demolition_m2', workTypeName: 'Демонтаж покрытия', serviceType: ServiceType.ASPHALT, unit: 'm2', unitLabel: 'м²', baseCustomerPrice: 350, baseCostPrice: 250, isActive: true, createdAt: new Date().toISOString() },
];

export default function EstimatorPortal({
  orders,
  priceBook = DEFAULT_PRICE_BOOK,
  currentEstimatorId,
  currentEstimatorName,
  onUpdateOrder,
  onSaveEstimate,
}: EstimatorPortalProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | 'all'>('all');

  // Заказы, требующие расчёта
  const ordersForEstimation = useMemo(() => {
    return orders.filter(o => {
      if (o.status !== OrderStatus.CALCULATING && o.status !== OrderStatus.NEW_REQUEST) return false;
      if (serviceTypeFilter !== 'all' && o.serviceType !== serviceTypeFilter) return false;
      return true;
    });
  }, [orders, serviceTypeFilter]);

  // Создание новой сметы
  const createNewEstimate = (order: Order): Estimate => {
    const items: EstimateItem[] = [];

    // Автоматическое добавление позиций на основе параметров заказа
    if (order.serviceType === ServiceType.SNOW) {
      if (order.snowVolumeM3) {
        const tripsNeeded = Math.ceil(order.snowVolumeM3 / 20);
        const priceItem = priceBook.find(p => p.workTypeId === 'snow_trip_20');
        if (priceItem) {
          items.push({
            id: generateId(),
            workTypeId: priceItem.workTypeId,
            workTypeName: priceItem.workTypeName,
            quantity: tripsNeeded,
            unit: priceItem.unitLabel,
            unitPrice: priceItem.baseCustomerPrice,
            costPrice: priceItem.baseCostPrice,
            marginType: 'percent',
            marginValue: ((priceItem.baseCustomerPrice - priceItem.baseCostPrice) / priceItem.baseCustomerPrice) * 100,
            lineTotal: tripsNeeded * priceItem.baseCustomerPrice,
            lineCost: tripsNeeded * priceItem.baseCostPrice,
            lineProfit: tripsNeeded * (priceItem.baseCustomerPrice - priceItem.baseCostPrice),
          });
        }
      }
      if (order.needsLoader) {
        const priceItem = priceBook.find(p => p.workTypeId === 'loader_shift');
        if (priceItem) {
          items.push({
            id: generateId(),
            workTypeId: priceItem.workTypeId,
            workTypeName: priceItem.workTypeName,
            quantity: 1,
            unit: priceItem.unitLabel,
            unitPrice: priceItem.baseCustomerPrice,
            costPrice: priceItem.baseCostPrice,
            marginType: 'percent',
            marginValue: ((priceItem.baseCustomerPrice - priceItem.baseCostPrice) / priceItem.baseCustomerPrice) * 100,
            lineTotal: priceItem.baseCustomerPrice,
            lineCost: priceItem.baseCostPrice,
            lineProfit: priceItem.baseCustomerPrice - priceItem.baseCostPrice,
          });
        }
      }
    } else if (order.serviceType === ServiceType.ASPHALT) {
      if (order.asphaltAreaM2) {
        const priceItem = priceBook.find(p => p.workTypeId === (order.asphaltLayers === 2 ? 'asphalt_m2_2' : 'asphalt_m2'));
        if (priceItem) {
          items.push({
            id: generateId(),
            workTypeId: priceItem.workTypeId,
            workTypeName: priceItem.workTypeName,
            quantity: order.asphaltAreaM2,
            unit: priceItem.unitLabel,
            unitPrice: priceItem.baseCustomerPrice,
            costPrice: priceItem.baseCostPrice,
            marginType: 'percent',
            marginValue: ((priceItem.baseCustomerPrice - priceItem.baseCostPrice) / priceItem.baseCustomerPrice) * 100,
            lineTotal: order.asphaltAreaM2 * priceItem.baseCustomerPrice,
            lineCost: order.asphaltAreaM2 * priceItem.baseCostPrice,
            lineProfit: order.asphaltAreaM2 * (priceItem.baseCustomerPrice - priceItem.baseCostPrice),
          });
        }
      }
      if (order.needsCurb && order.curbLengthM) {
        const priceItem = priceBook.find(p => p.workTypeId === 'curb_m');
        if (priceItem) {
          items.push({
            id: generateId(),
            workTypeId: priceItem.workTypeId,
            workTypeName: priceItem.workTypeName,
            quantity: order.curbLengthM,
            unit: priceItem.unitLabel,
            unitPrice: priceItem.baseCustomerPrice,
            costPrice: priceItem.baseCostPrice,
            marginType: 'percent',
            marginValue: ((priceItem.baseCustomerPrice - priceItem.baseCostPrice) / priceItem.baseCustomerPrice) * 100,
            lineTotal: order.curbLengthM * priceItem.baseCustomerPrice,
            lineCost: order.curbLengthM * priceItem.baseCostPrice,
            lineProfit: order.curbLengthM * (priceItem.baseCustomerPrice - priceItem.baseCostPrice),
          });
        }
      }
    }

    const totals = calculateEstimateTotals(items, 20, 0);

    return {
      id: generateId(),
      orderId: order.id,
      version: (order.estimates?.length || 0) + 1,
      items,
      coefficients: [],
      subtotal: totals.subtotal,
      discount: 0,
      vat: totals.vat,
      vatRate: 20,
      totalCustomerPrice: totals.total,
      totalCost: totals.totalCost,
      grossProfit: totals.grossProfit,
      marginPercent: totals.marginPercent,
      estimatorId: currentEstimatorId,
      estimatorName: currentEstimatorName,
      isApproved: false,
      createdAt: new Date().toISOString(),
    };
  };

  const handleOpenEstimate = (order: Order) => {
    setSelectedOrder(order);
    const estimate = order.currentEstimate || createNewEstimate(order);
    setEditingEstimate(estimate);
  };

  const handleAddItem = () => {
    if (!editingEstimate) return;
    setEditingEstimate({
      ...editingEstimate,
      items: [
        ...editingEstimate.items,
        {
          id: generateId(),
          workTypeId: '',
          workTypeName: '',
          quantity: 1,
          unit: 'шт.',
          unitPrice: 0,
          costPrice: 0,
          marginType: 'percent',
          marginValue: 0,
          lineTotal: 0,
          lineCost: 0,
          lineProfit: 0,
        },
      ],
    });
  };

  const handleItemChange = (index: number, field: keyof EstimateItem, value: any) => {
    if (!editingEstimate) return;
    const items = [...editingEstimate.items];
    const item = { ...items[index], [field]: value };

    // Пересчёт строки
    if (['quantity', 'unitPrice', 'costPrice'].includes(field)) {
      item.lineTotal = item.quantity * item.unitPrice;
      item.lineCost = item.quantity * item.costPrice;
      item.lineProfit = item.lineTotal - item.lineCost;
      item.marginValue = item.lineTotal > 0 ? (item.lineProfit / item.lineTotal) * 100 : 0;
    }

    items[index] = item;

    // Пересчёт итогов
    const totals = calculateEstimateTotals(items, editingEstimate.vatRate, editingEstimate.discount);

    setEditingEstimate({
      ...editingEstimate,
      items,
      subtotal: totals.subtotal,
      totalCost: totals.totalCost,
      grossProfit: totals.grossProfit,
      marginPercent: totals.marginPercent,
      vat: totals.vat,
      totalCustomerPrice: totals.total,
    });
  };

  const handleSelectPriceItem = (index: number, priceItemId: string) => {
    const priceItem = priceBook.find(p => p.id === priceItemId);
    if (!priceItem || !editingEstimate) return;

    const items = [...editingEstimate.items];
    const item = items[index];
    item.workTypeId = priceItem.workTypeId;
    item.workTypeName = priceItem.workTypeName;
    item.unit = priceItem.unitLabel;
    item.unitPrice = priceItem.baseCustomerPrice;
    item.costPrice = priceItem.baseCostPrice;
    item.lineTotal = item.quantity * item.unitPrice;
    item.lineCost = item.quantity * item.costPrice;
    item.lineProfit = item.lineTotal - item.lineCost;
    item.marginValue = item.lineTotal > 0 ? (item.lineProfit / item.lineTotal) * 100 : 0;

    const totals = calculateEstimateTotals(items, editingEstimate.vatRate, editingEstimate.discount);

    setEditingEstimate({
      ...editingEstimate,
      items,
      subtotal: totals.subtotal,
      totalCost: totals.totalCost,
      grossProfit: totals.grossProfit,
      marginPercent: totals.marginPercent,
      vat: totals.vat,
      totalCustomerPrice: totals.total,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editingEstimate) return;
    const items = editingEstimate.items.filter((_, i) => i !== index);
    const totals = calculateEstimateTotals(items, editingEstimate.vatRate, editingEstimate.discount);

    setEditingEstimate({
      ...editingEstimate,
      items,
      subtotal: totals.subtotal,
      totalCost: totals.totalCost,
      grossProfit: totals.grossProfit,
      marginPercent: totals.marginPercent,
      vat: totals.vat,
      totalCustomerPrice: totals.total,
    });
  };

  const handleSaveEstimate = () => {
    if (!editingEstimate || !selectedOrder) return;
    onSaveEstimate(selectedOrder.id, editingEstimate);
    onUpdateOrder(selectedOrder.id, {
      currentEstimate: editingEstimate,
      estimates: [...(selectedOrder.estimates || []), editingEstimate],
      totalCustomerPrice: editingEstimate.totalCustomerPrice,
      totalContractorPrice: editingEstimate.totalCost,
      grossProfit: editingEstimate.grossProfit,
      status: OrderStatus.AWAITING_CUSTOMER,
    });
    setSelectedOrder(null);
    setEditingEstimate(null);
  };

  const filteredPriceBook = useMemo(() => {
    if (!selectedOrder) return priceBook;
    return priceBook.filter(p => p.serviceType === selectedOrder.serviceType || p.serviceType === ServiceType.OTHER);
  }, [priceBook, selectedOrder]);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Сметы и расчёты</h1>
          <p className="text-slate-500">Заказы, требующие расчёта: {ordersForEstimation.length}</p>
        </div>
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={serviceTypeFilter}
          onChange={e => setServiceTypeFilter(e.target.value as ServiceType | 'all')}
        >
          <option value="all">Все услуги</option>
          {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Список заказов */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
        <h2 className="text-xl font-black mb-4">Очередь на расчёт</h2>
        {ordersForEstimation.length === 0 ? (
          <div className="text-center text-slate-400 py-8">Нет заказов для расчёта</div>
        ) : (
          <div className="space-y-3">
            {ordersForEstimation.map(order => (
              <div
                key={order.id}
                className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                onClick={() => handleOpenEstimate(order)}
              >
                <div>
                  <div className="font-bold">{order.orderNumber || order.id}</div>
                  <div className="text-sm text-slate-500">{order.customer}</div>
                  <div className="text-sm text-slate-400">{order.address}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{SERVICE_TYPE_LABELS[order.serviceType] || 'Снег'}</div>
                  {order.serviceType === ServiceType.SNOW && order.snowVolumeM3 && (
                    <div className="text-xs text-slate-400">{order.snowVolumeM3} м³</div>
                  )}
                  {order.serviceType === ServiceType.ASPHALT && order.asphaltAreaM2 && (
                    <div className="text-xs text-slate-400">{order.asphaltAreaM2} м²</div>
                  )}
                  <button className="mt-2 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold">
                    Открыть расчёт
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модалка редактирования сметы */}
      {selectedOrder && editingEstimate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedOrder(null); setEditingEstimate(null); }}>
          <div className="bg-white rounded-[2rem] p-6 max-w-5xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black">Смета: {selectedOrder.orderNumber}</h2>
                <p className="text-slate-500">{selectedOrder.customer} — {selectedOrder.address}</p>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600 text-2xl"
                onClick={() => { setSelectedOrder(null); setEditingEstimate(null); }}
              >
                ×
              </button>
            </div>

            {/* Позиции сметы */}
            <div className="overflow-auto mb-6">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                  <tr>
                    <th className="py-2 pr-2 w-[300px]">Наименование</th>
                    <th className="py-2 pr-2 w-20">Кол-во</th>
                    <th className="py-2 pr-2 w-16">Ед.</th>
                    <th className="py-2 pr-2 w-24">Цена</th>
                    <th className="py-2 pr-2 w-24">Себест.</th>
                    <th className="py-2 pr-2 w-24">Сумма</th>
                    <th className="py-2 pr-2 w-24">Маржа</th>
                    <th className="py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editingEstimate.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-2">
                        <select
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          value={filteredPriceBook.find(p => p.workTypeId === item.workTypeId)?.id || ''}
                          onChange={e => handleSelectPriceItem(index, e.target.value)}
                        >
                          <option value="">— Выбрать —</option>
                          {filteredPriceBook.map(p => (
                            <option key={p.id} value={p.id}>{p.workTypeName}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2 text-slate-500">{item.unit}</td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          value={item.unitPrice}
                          onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          value={item.costPrice}
                          onChange={e => handleItemChange(index, 'costPrice', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2 font-bold">{formatPrice(item.lineTotal)}</td>
                      <td className="py-2 pr-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.marginValue > 20 ? 'bg-green-100 text-green-800' : item.marginValue > 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {item.marginValue.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveItem(index)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              className="mb-6 px-4 py-2 border border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 w-full"
              onClick={handleAddItem}
            >
              + Добавить позицию
            </button>

            {/* Итоги */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Подитог</div>
                  <div className="text-xl font-black">{formatPrice(editingEstimate.subtotal)}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Себестоимость</div>
                  <div className="text-xl font-black text-slate-600">{formatPrice(editingEstimate.totalCost)}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Валовая прибыль</div>
                  <div className={`text-xl font-black ${editingEstimate.grossProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPrice(editingEstimate.grossProfit)} ({editingEstimate.marginPercent.toFixed(1)}%)
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">НДС {editingEstimate.vatRate}%</div>
                  <div className="text-xl font-black text-slate-600">{formatPrice(editingEstimate.vat)}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 uppercase">Итого для клиента</div>
                <div className="text-3xl font-black text-slate-900">{formatPrice(editingEstimate.totalCustomerPrice)}</div>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3">
              <button
                className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 font-bold"
                onClick={handleSaveEstimate}
              >
                Сохранить и отправить на согласование
              </button>
              <button
                className="px-4 py-3 rounded-xl border border-slate-200 font-bold"
                onClick={() => { setSelectedOrder(null); setEditingEstimate(null); }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
