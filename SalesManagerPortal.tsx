import React, { useState, useMemo } from 'react';
import {
  Lead,
  LeadStatus,
  Order,
  OrderStatus,
  Customer,
  Contractor,
  ServiceType,
  ExecutionMode,
  LEAD_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  generateId,
  generateOrderNumber,
  formatDateTime,
  formatPrice,
  LEAD_SOURCES,
  MOSCOW_DISTRICTS,
} from './types';

interface SalesManagerPortalProps {
  leads: Lead[];
  orders: Order[];
  customers: Customer[];
  contractors: Contractor[];
  currentManagerId: string;
  currentManagerName: string;
  onAddLead: (lead: Lead) => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
  onConvertLeadToOrder: (lead: Lead) => void;
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
}

export default function SalesManagerPortal({
  leads,
  orders,
  customers,
  contractors,
  currentManagerId,
  currentManagerName,
  onAddLead,
  onUpdateLead,
  onConvertLeadToOrder,
  onUpdateOrder,
}: SalesManagerPortalProps) {
  const [activeTab, setActiveTab] = useState<'leads' | 'my_orders' | 'new_lead'>('leads');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);

  // Фильтрация лидов по менеджеру и статусу
  const myLeads = useMemo(() => {
    return leads.filter(l => {
      if (l.assignedManagerId && l.assignedManagerId !== currentManagerId) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      return true;
    });
  }, [leads, currentManagerId, statusFilter]);

  // Мои заказы (где я менеджер)
  const myOrders = useMemo(() => {
    return orders.filter(o => o.managerId === currentManagerId || o.managerName === currentManagerName);
  }, [orders, currentManagerId, currentManagerName]);

  // Статистика
  const stats = useMemo(() => {
    const newLeads = myLeads.filter(l => l.status === LeadStatus.NEW).length;
    const inProgress = myLeads.filter(l => [LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.ESTIMATING].includes(l.status)).length;
    const offersSent = myLeads.filter(l => l.status === LeadStatus.OFFER_SENT).length;
    const won = myLeads.filter(l => l.status === LeadStatus.WON).length;
    const lost = myLeads.filter(l => l.status === LeadStatus.LOST).length;
    const totalRevenue = myOrders.filter(o => o.status === OrderStatus.COMPLETED).reduce((sum, o) => sum + (o.totalCustomerPrice || 0), 0);
    return { newLeads, inProgress, offersSent, won, lost, totalRevenue };
  }, [myLeads, myOrders]);

  // Форма нового лида
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    source: 'phone',
    serviceType: ServiceType.SNOW,
    status: LeadStatus.NEW,
  });

  const handleCreateLead = () => {
    if (!newLead.customerName || !newLead.customerPhone) {
      alert('Заполните имя и телефон клиента');
      return;
    }
    const lead: Lead = {
      id: generateId(),
      source: newLead.source || 'phone',
      sourceDetails: newLead.sourceDetails,
      customerName: newLead.customerName || '',
      customerPhone: newLead.customerPhone || '',
      customerEmail: newLead.customerEmail,
      address: newLead.address,
      serviceType: newLead.serviceType || ServiceType.SNOW,
      description: newLead.description || '',
      snowVolumeM3: newLead.snowVolumeM3,
      snowAreaM2: newLead.snowAreaM2,
      snowHeightCm: newLead.snowHeightCm,
      needsLoader: newLead.needsLoader,
      needsDisposalTickets: newLead.needsDisposalTickets,
      asphaltAreaM2: newLead.asphaltAreaM2,
      asphaltType: newLead.asphaltType,
      desiredStartDate: newLead.desiredStartDate,
      urgency: newLead.urgency || 'normal',
      assignedManagerId: currentManagerId,
      assignedManagerName: currentManagerName,
      status: LeadStatus.NEW,
      createdAt: new Date().toISOString(),
    };
    onAddLead(lead);
    setNewLead({ source: 'phone', serviceType: ServiceType.SNOW, status: LeadStatus.NEW });
    setShowLeadForm(false);
    setActiveTab('leads');
  };

  const handleLeadStatusChange = (lead: Lead, newStatus: LeadStatus) => {
    const updates: Partial<Lead> = { status: newStatus };
    if (newStatus === LeadStatus.CONTACTED && !lead.contactedAt) {
      updates.contactedAt = new Date().toISOString();
    }
    if (newStatus === LeadStatus.QUALIFIED && !lead.qualifiedAt) {
      updates.qualifiedAt = new Date().toISOString();
    }
    onUpdateLead(lead.id, updates);
  };

  const handleConvertToOrder = (lead: Lead) => {
    if (lead.status !== LeadStatus.OFFER_SENT && lead.status !== LeadStatus.QUALIFIED) {
      alert('Можно конвертировать только квалифицированные лиды или после отправки КП');
      return;
    }
    onConvertLeadToOrder(lead);
    onUpdateLead(lead.id, { status: LeadStatus.WON, convertedOrderId: lead.id });
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.NEW: return 'bg-blue-100 text-blue-800';
      case LeadStatus.CONTACTED: return 'bg-yellow-100 text-yellow-800';
      case LeadStatus.QUALIFIED: return 'bg-purple-100 text-purple-800';
      case LeadStatus.ESTIMATING: return 'bg-orange-100 text-orange-800';
      case LeadStatus.OFFER_SENT: return 'bg-indigo-100 text-indigo-800';
      case LeadStatus.WON: return 'bg-green-100 text-green-800';
      case LeadStatus.LOST: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-blue-600">{stats.newLeads}</div>
          <div className="text-xs font-bold text-blue-800 uppercase">Новые</div>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-yellow-600">{stats.inProgress}</div>
          <div className="text-xs font-bold text-yellow-800 uppercase">В работе</div>
        </div>
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-indigo-600">{stats.offersSent}</div>
          <div className="text-xs font-bold text-indigo-800 uppercase">КП отправлено</div>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-green-600">{stats.won}</div>
          <div className="text-xs font-bold text-green-800 uppercase">Выиграно</div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-red-600">{stats.lost}</div>
          <div className="text-xs font-bold text-red-800 uppercase">Проиграно</div>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-emerald-600">{formatPrice(stats.totalRevenue)}</div>
          <div className="text-xs font-bold text-emerald-800 uppercase">Выручка</div>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'leads' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('leads')}
        >
          Мои лиды ({myLeads.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'my_orders' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('my_orders')}
        >
          Мои заказы ({myOrders.length})
        </button>
        <button
          className="ml-auto px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white"
          onClick={() => setShowLeadForm(true)}
        >
          + Новый лид
        </button>
      </div>

      {/* Список лидов */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">Лиды</h2>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as LeadStatus | 'all')}
            >
              <option value="all">Все статусы</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {myLeads.length === 0 ? (
              <div className="text-center text-slate-400 py-8">Нет лидов</div>
            ) : (
              myLeads.map(lead => (
                <div
                  key={lead.id}
                  className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{lead.customerName}</div>
                      <div className="text-sm text-slate-500">{lead.customerPhone}</div>
                      {lead.address && <div className="text-sm text-slate-400">{lead.address}</div>}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(lead.status)}`}>
                        {LEAD_STATUS_LABELS[lead.status]}
                      </span>
                      <div className="text-xs text-slate-400 mt-1">
                        {SERVICE_TYPE_LABELS[lead.serviceType]}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateTime(lead.createdAt)}
                      </div>
                    </div>
                  </div>
                  {lead.description && (
                    <div className="mt-2 text-sm text-slate-600 line-clamp-2">{lead.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Список заказов */}
      {activeTab === 'my_orders' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
          <h2 className="text-xl font-black mb-4">Мои заказы</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                <tr>
                  <th className="py-2 pr-4">№</th>
                  <th className="py-2 pr-4">Клиент</th>
                  <th className="py-2 pr-4">Услуга</th>
                  <th className="py-2 pr-4">Сумма</th>
                  <th className="py-2 pr-4">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-bold">{order.orderNumber || order.id}</td>
                    <td className="py-3 pr-4">{order.customer}</td>
                    <td className="py-3 pr-4">{SERVICE_TYPE_LABELS[order.serviceType] || 'Снег'}</td>
                    <td className="py-3 pr-4 font-bold">{formatPrice(order.totalCustomerPrice || 0)}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модалка детали лида */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-[2rem] p-6 max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black">Лид: {selectedLead.customerName}</h2>
              <button
                className="text-slate-400 hover:text-slate-600 text-2xl"
                onClick={() => setSelectedLead(null)}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Телефон</div>
                  <div className="font-bold">{selectedLead.customerPhone}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Email</div>
                  <div>{selectedLead.customerEmail || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Источник</div>
                  <div>{LEAD_SOURCES.find(s => s.value === selectedLead.source)?.label || selectedLead.source}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Услуга</div>
                  <div>{SERVICE_TYPE_LABELS[selectedLead.serviceType]}</div>
                </div>
              </div>

              {selectedLead.address && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Адрес</div>
                  <div>{selectedLead.address}</div>
                </div>
              )}

              {selectedLead.description && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Описание</div>
                  <div className="text-sm">{selectedLead.description}</div>
                </div>
              )}

              {selectedLead.serviceType === ServiceType.SNOW && (
                <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400">Объём м³</div>
                    <div className="font-bold">{selectedLead.snowVolumeM3 || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">Площадь м²</div>
                    <div className="font-bold">{selectedLead.snowAreaM2 || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">Высота см</div>
                    <div className="font-bold">{selectedLead.snowHeightCm || '—'}</div>
                  </div>
                </div>
              )}

              {/* Изменение статуса */}
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Изменить статус</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedLead.status === key
                          ? getStatusColor(key as LeadStatus)
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      onClick={() => handleLeadStatusChange(selectedLead, key as LeadStatus)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  className="flex-1 bg-green-600 text-white rounded-xl px-4 py-3 font-bold"
                  onClick={() => {
                    handleConvertToOrder(selectedLead);
                    setSelectedLead(null);
                  }}
                  disabled={![LeadStatus.QUALIFIED, LeadStatus.OFFER_SENT].includes(selectedLead.status)}
                >
                  Конвертировать в заказ
                </button>
                <button
                  className="px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  onClick={() => {
                    handleLeadStatusChange(selectedLead, LeadStatus.LOST);
                    setSelectedLead(null);
                  }}
                >
                  Отклонить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания лида */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLeadForm(false)}>
          <div className="bg-white rounded-[2rem] p-6 max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black">Новый лид</h2>
              <button
                className="text-slate-400 hover:text-slate-600 text-2xl"
                onClick={() => setShowLeadForm(false)}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Имя клиента *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newLead.customerName || ''}
                    onChange={e => setNewLead({ ...newLead, customerName: e.target.value })}
                    placeholder="ООО Компания"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Телефон *</label>
                  <input
                    type="tel"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newLead.customerPhone || ''}
                    onChange={e => setNewLead({ ...newLead, customerPhone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newLead.customerEmail || ''}
                    onChange={e => setNewLead({ ...newLead, customerEmail: e.target.value })}
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Источник</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newLead.source || 'phone'}
                    onChange={e => setNewLead({ ...newLead, source: e.target.value as Lead['source'] })}
                  >
                    {LEAD_SOURCES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Тип услуги</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newLead.serviceType || ServiceType.SNOW}
                    onChange={e => setNewLead({ ...newLead, serviceType: e.target.value as ServiceType })}
                  >
                    {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Срочность</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newLead.urgency || 'normal'}
                    onChange={e => setNewLead({ ...newLead, urgency: e.target.value as Lead['urgency'] })}
                  >
                    <option value="normal">Обычная</option>
                    <option value="urgent">Срочная</option>
                    <option value="very_urgent">Очень срочная</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Адрес</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newLead.address || ''}
                  onChange={e => setNewLead({ ...newLead, address: e.target.value })}
                  placeholder="Москва, ул. Примерная, 1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Описание</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 h-24"
                  value={newLead.description || ''}
                  onChange={e => setNewLead({ ...newLead, description: e.target.value })}
                  placeholder="Что нужно сделать..."
                />
              </div>

              {newLead.serviceType === ServiceType.SNOW && (
                <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Объём м³</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={newLead.snowVolumeM3 || ''}
                      onChange={e => setNewLead({ ...newLead, snowVolumeM3: Number(e.target.value) || undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Площадь м²</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={newLead.snowAreaM2 || ''}
                      onChange={e => setNewLead({ ...newLead, snowAreaM2: Number(e.target.value) || undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Высота см</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={newLead.snowHeightCm || ''}
                      onChange={e => setNewLead({ ...newLead, snowHeightCm: Number(e.target.value) || undefined })}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 font-bold"
                  onClick={handleCreateLead}
                >
                  Создать лид
                </button>
                <button
                  className="px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  onClick={() => setShowLeadForm(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
