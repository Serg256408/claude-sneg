import React, { useState, useMemo } from 'react';
import {
  Order,
  OrderStatus,
  InvoiceStatus,
  Contractor,
  formatPrice,
  formatDateTime,
  calculateOrderTotals,
} from './types';
import {
  DollarSign, TrendingUp, CreditCard, Truck, Package,
  Clock, AlertCircle, ChevronDown, ChevronUp,
  Filter, Users, CheckCircle, XCircle, Activity,
  FileText, ArrowUpDown, Snowflake, Calendar, UserCog
} from 'lucide-react';

interface ManagerFinanceDashboardProps {
  orders: Order[];
  contractors: Contractor[];
  currentManagerId: string;
  currentManagerName: string;
}

type PeriodFilter = 'week' | 'month' | 'quarter' | 'all';
type PaymentFilter = 'all' | 'paid' | 'unpaid' | 'overdue';
type SortField = 'orderNumber' | 'customer' | 'totalAmount' | 'totalPaid' | 'outstanding' | 'contractorCost';
type SortDir = 'asc' | 'desc';

interface OrderFinancialRow {
  orderId: string;
  orderNumber: string;
  customer: string;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  contractorNames: string;
  contractorCost: number;
  status: OrderStatus;
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'overdue';
  order: Order;
}

interface ContractorDebtRow {
  contractorId: string;
  contractorName: string;
  ordersCount: number;
  totalOwed: number;
  totalPaid: number;
  outstanding: number;
  paymentType: string;
}

interface FinancialEvent {
  id: string;
  orderId: string;
  orderNumber: string;
  type: 'payment_received' | 'invoice_created' | 'invoice_overdue' | 'order_completed';
  description: string;
  amount?: number;
  timestamp: string;
}

const ACTIVE_STATUSES = [
  OrderStatus.EN_ROUTE,
  OrderStatus.IN_PROGRESS,
  OrderStatus.SEARCHING_EQUIPMENT,
  OrderStatus.SCHEDULING,
  OrderStatus.EQUIPMENT_APPROVED,
];

const CLOSING_STATUSES = [
  OrderStatus.EXPORT_COMPLETED,
  OrderStatus.AWAITING_CLOSING_DOCS,
  OrderStatus.CLOSING_DOCS_SENT,
  OrderStatus.REPORT_READY,
  OrderStatus.COMPLETED,
];

export default function ManagerFinanceDashboard({
  orders,
  contractors,
}: ManagerFinanceDashboardProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [contractorFilter, setContractorFilter] = useState<string>('all');
  const [dispatcherFilter, setDispatcherFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('orderNumber');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // --- Фильтрация по периоду / датам ---
  const periodFiltered = useMemo(() => {
    // Если заданы конкретные даты — они приоритетнее кнопок периода
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
      return orders.filter(o => {
        const d = new Date(o.scheduledTime || o.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }
    if (periodFilter === 'all') return orders;
    const now = new Date();
    let startDate: Date;
    if (periodFilter === 'week') {
      startDate = new Date(now);
      const day = now.getDay();
      startDate.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      startDate.setHours(0, 0, 0, 0);
    } else if (periodFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      const qm = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), qm, 1);
    }
    return orders.filter(o => {
      const d = new Date(o.scheduledTime || o.createdAt);
      return d >= startDate;
    });
  }, [orders, periodFilter, dateFrom, dateTo]);

  // --- Уникальные диспетчеры из заказов ---
  const uniqueDispatchers = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => {
      if (o.dispatcherName) {
        map.set(o.dispatcherId || o.dispatcherName, o.dispatcherName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  // --- Фильтрация по оплате, подрядчику, диспетчеру ---
  const filteredOrders = useMemo(() => {
    let result = periodFiltered;
    if (paymentFilter === 'paid') {
      result = result.filter(o => o.isPaid);
    } else if (paymentFilter === 'unpaid') {
      result = result.filter(o => !o.isPaid && o.status !== OrderStatus.CANCELLED);
    } else if (paymentFilter === 'overdue') {
      result = result.filter(o =>
        o.invoices?.some(inv => inv.status === InvoiceStatus.OVERDUE)
      );
    }
    if (contractorFilter !== 'all') {
      result = result.filter(o =>
        (o.assignments || []).some(a => a.contractorId === contractorFilter) ||
        (o.earnings || []).some(e => e.contractorId === contractorFilter)
      );
    }
    if (dispatcherFilter !== 'all') {
      result = result.filter(o =>
        (o.dispatcherId || o.dispatcherName) === dispatcherFilter
      );
    }
    return result;
  }, [periodFiltered, paymentFilter, contractorFilter, dispatcherFilter]);

  // --- Уникальные подрядчики из заказов ---
  const uniqueContractors = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => {
      (o.assignments || []).forEach(a => {
        if (a.contractorId && a.contractorName) map.set(a.contractorId, a.contractorName);
      });
      (o.earnings || []).forEach(e => {
        if (e.contractorId) {
          const c = contractors.find(c => c.id === e.contractorId);
          map.set(e.contractorId, c?.name || e.driverName);
        }
      });
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders, contractors]);

  // --- Секция 1: Сводные карточки ---
  const summary = useMemo(() => {
    const nonCancelled = filteredOrders.filter(o => o.status !== OrderStatus.CANCELLED);
    const totalRevenue = nonCancelled.reduce((s, o) => s + (o.totalCustomerPrice || 0), 0);
    const totalPaid = nonCancelled.reduce((s, o) =>
      s + (o.payments || []).filter(p => p.status === 'completed').reduce((ps, p) => ps + p.amount, 0), 0);
    const outstanding = totalRevenue - totalPaid;
    const totalContractorCosts = nonCancelled.reduce((s, o) => {
      if (o.totalContractorPrice != null) return s + o.totalContractorPrice;
      return s + calculateOrderTotals(o).contractorTotal;
    }, 0);
    const grossProfit = totalRevenue - totalContractorCosts;
    const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalPaid, outstanding, totalContractorCosts, grossProfit, marginPercent };
  }, [filteredOrders]);

  // --- Секция 2: Операционная статистика ---
  const ops = useMemo(() => {
    const nonCancelled = filteredOrders.filter(o => o.status !== OrderStatus.CANCELLED);
    const totalTrips = nonCancelled.reduce((s, o) =>
      s + (o.trips || []).filter(t => t.status === 'completed').length, 0);
    const totalVolumeM3 = nonCancelled.reduce((s, o) =>
      s + (o.trips || []).filter(t => t.status === 'completed' && t.isConfirmed)
        .reduce((ts, t) => ts + (t.loadedVolumeM3 || 0), 0), 0);
    const activeOrders = nonCancelled.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
    const awaitingPayment = nonCancelled.filter(o => !o.isPaid && CLOSING_STATUSES.includes(o.status)).length;
    return { totalTrips, totalVolumeM3, activeOrders, awaitingPayment };
  }, [filteredOrders]);

  // --- Секция 4: Финансовая таблица ---
  const orderRows = useMemo(() => {
    const rows: OrderFinancialRow[] = filteredOrders
      .filter(o => o.status !== OrderStatus.CANCELLED)
      .map(o => {
        const totalAmount = o.totalCustomerPrice || 0;
        const totalPaid = (o.payments || [])
          .filter(p => p.status === 'completed')
          .reduce((s, p) => s + p.amount, 0);
        const outst = totalAmount - totalPaid;
        const contractorCost = o.totalContractorPrice ?? calculateOrderTotals(o).contractorTotal;
        const cNames = [...new Set((o.assignments || []).map(a => a.contractorName).filter(Boolean))].join(', ') || '-';

        let paymentStatus: OrderFinancialRow['paymentStatus'];
        if (o.invoices?.some(inv => inv.status === InvoiceStatus.OVERDUE)) {
          paymentStatus = 'overdue';
        } else if (o.isPaid || (totalAmount > 0 && totalPaid >= totalAmount)) {
          paymentStatus = 'paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'partial';
        } else {
          paymentStatus = 'unpaid';
        }

        return {
          orderId: o.id,
          orderNumber: o.orderNumber || o.id,
          customer: o.customer,
          totalAmount,
          totalPaid,
          outstanding: outst,
          contractorNames: cNames,
          contractorCost,
          status: o.status,
          paymentStatus,
          order: o,
        };
      });

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'orderNumber') cmp = a.orderNumber.localeCompare(b.orderNumber);
      else if (sortField === 'customer') cmp = a.customer.localeCompare(b.customer);
      else if (sortField === 'totalAmount') cmp = a.totalAmount - b.totalAmount;
      else if (sortField === 'totalPaid') cmp = a.totalPaid - b.totalPaid;
      else if (sortField === 'outstanding') cmp = a.outstanding - b.outstanding;
      else if (sortField === 'contractorCost') cmp = a.contractorCost - b.contractorCost;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [filteredOrders, sortField, sortDir]);

  // --- Секция 5: Задолженность перед подрядчиками ---
  const contractorDebts = useMemo(() => {
    const debtMap = new Map<string, ContractorDebtRow>();

    filteredOrders.forEach(order => {
      if (order.status === OrderStatus.CANCELLED) return;
      const processedContractors = new Set<string>();

      (order.earnings || []).forEach(earning => {
        const cId = earning.contractorId || earning.driverId || earning.driverName;
        if (!cId) return;
        processedContractors.add(cId);
        const existing = debtMap.get(cId) || {
          contractorId: cId,
          contractorName: earning.driverName,
          ordersCount: 0,
          totalOwed: 0,
          totalPaid: 0,
          outstanding: 0,
          paymentType: '',
        };
        existing.ordersCount += 1;
        const owed = earning.totalToPay || earning.confirmedEarnings || 0;
        existing.totalOwed += owed;
        if (earning.paymentStatus === 'paid') {
          existing.totalPaid += owed;
        }
        existing.outstanding = existing.totalOwed - existing.totalPaid;
        debtMap.set(cId, existing);
      });

      (order.assignments || []).forEach(a => {
        if (!a.contractorId || processedContractors.has(a.contractorId)) return;
        const cId = a.contractorId;
        const existing = debtMap.get(cId) || {
          contractorId: cId,
          contractorName: a.contractorName || a.driverName,
          ordersCount: 0,
          totalOwed: 0,
          totalPaid: 0,
          outstanding: 0,
          paymentType: '',
        };
        existing.ordersCount += 1;
        existing.totalOwed += a.confirmedEarnings || a.earnings || 0;
        existing.outstanding = existing.totalOwed - existing.totalPaid;
        debtMap.set(cId, existing);
      });
    });

    return Array.from(debtMap.values())
      .map(row => {
        const c = contractors.find(c => c.id === row.contractorId);
        if (c) {
          row.contractorName = c.name;
          row.paymentType = c.paymentType;
        }
        return row;
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [filteredOrders, contractors]);

  // --- Секция 6: Лента событий ---
  const events = useMemo(() => {
    const list: FinancialEvent[] = [];
    filteredOrders.forEach(order => {
      const num = order.orderNumber || order.id;
      (order.payments || []).forEach(p => {
        if (p.status === 'completed') {
          list.push({
            id: p.id,
            orderId: order.id,
            orderNumber: num,
            type: 'payment_received',
            description: `Получен платеж по ${num}`,
            amount: p.amount,
            timestamp: p.completedAt || p.createdAt,
          });
        }
      });
      (order.invoices || []).forEach(inv => {
        const isOverdue = inv.status === InvoiceStatus.OVERDUE;
        list.push({
          id: inv.id,
          orderId: order.id,
          orderNumber: num,
          type: isOverdue ? 'invoice_overdue' : 'invoice_created',
          description: isOverdue ? `Просрочен счет ${inv.number}` : `Выставлен счет ${inv.number}`,
          amount: inv.amount,
          timestamp: inv.createdAt,
        });
      });
      if (order.status === OrderStatus.COMPLETED) {
        list.push({
          id: `done-${order.id}`,
          orderId: order.id,
          orderNumber: num,
          type: 'order_completed',
          description: `Заказ ${num} завершён`,
          amount: order.totalCustomerPrice,
          timestamp: order.updatedAt || order.createdAt,
        });
      }
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
  }, [filteredOrders]);

  // --- Хелперы ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const paymentBadge = (ps: OrderFinancialRow['paymentStatus']) => {
    switch (ps) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const paymentLabel = (ps: OrderFinancialRow['paymentStatus']) => {
    switch (ps) {
      case 'paid': return 'Оплачено';
      case 'partial': return 'Частично';
      case 'overdue': return 'Просрочено';
      default: return 'Не оплачено';
    }
  };

  const eventDot = (type: FinancialEvent['type']) => {
    switch (type) {
      case 'payment_received': return 'bg-green-500';
      case 'invoice_created': return 'bg-blue-500';
      case 'invoice_overdue': return 'bg-red-500';
      case 'order_completed': return 'bg-purple-500';
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="inline-flex ml-1 opacity-50">
      {sortField === field ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} />}
    </span>
  );

  const periodButtons: { key: PeriodFilter; label: string }[] = [
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'quarter', label: 'Квартал' },
    { key: 'all', label: 'Всё время' },
  ];

  const paymentButtons: { key: PaymentFilter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'paid', label: 'Оплачено' },
    { key: 'unpaid', label: 'Не оплачено' },
    { key: 'overdue', label: 'Просрочено' },
  ];

  return (
    <div className="space-y-6">
      {/* === Секция 1: Сводные карточки === */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <DollarSign className="mx-auto mb-1 text-emerald-500" size={20} />
          <div className="text-xl font-black text-emerald-600">{formatPrice(summary.totalRevenue)}</div>
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Выручка</div>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <CheckCircle className="mx-auto mb-1 text-green-500" size={20} />
          <div className="text-xl font-black text-green-600">{formatPrice(summary.totalPaid)}</div>
          <div className="text-[10px] font-bold text-green-800 uppercase tracking-wide">Оплачено</div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <Clock className="mx-auto mb-1 text-amber-500" size={20} />
          <div className="text-xl font-black text-amber-600">{formatPrice(summary.outstanding)}</div>
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Долг клиентов</div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <Truck className="mx-auto mb-1 text-blue-500" size={20} />
          <div className="text-xl font-black text-blue-600">{formatPrice(summary.totalContractorCosts)}</div>
          <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">Расход подряд.</div>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 text-center">
          <TrendingUp className="mx-auto mb-1 text-purple-500" size={20} />
          <div className="text-xl font-black text-purple-600">{formatPrice(summary.grossProfit)}</div>
          <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wide">Прибыль</div>
        </div>
        <div className="bg-indigo-50 rounded-2xl p-4 text-center">
          <Activity className="mx-auto mb-1 text-indigo-500" size={20} />
          <div className="text-xl font-black text-indigo-600">{summary.marginPercent.toFixed(1)}%</div>
          <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Маржа</div>
        </div>
      </div>

      {/* === Секция 2: Операционная статистика === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <Package className="mx-auto mb-1 text-blue-500" size={20} />
          <div className="text-2xl font-black">{ops.totalTrips}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase">Рейсов выполнено</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <Snowflake className="mx-auto mb-1 text-cyan-500" size={20} />
          <div className="text-2xl font-black">{ops.totalVolumeM3.toFixed(0)} <span className="text-sm font-bold text-slate-400">м³</span></div>
          <div className="text-[10px] font-bold text-slate-500 uppercase">Объём вывезен</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <Activity className="mx-auto mb-1 text-orange-500" size={20} />
          <div className="text-2xl font-black text-orange-600">{ops.activeOrders}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase">Активных заказов</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <AlertCircle className="mx-auto mb-1 text-red-500" size={20} />
          <div className="text-2xl font-black text-red-600">{ops.awaitingPayment}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase">Ожидают оплаты</div>
        </div>
      </div>

      {/* === Секция 3: Фильтры === */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        {/* Строка 1: Период + Даты */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Период:</span>
            {periodButtons.map(b => (
              <button
                key={b.key}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  periodFilter === b.key && !dateFrom && !dateTo ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => { setPeriodFilter(b.key); setDateFrom(''); setDateTo(''); }}
              >{b.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Даты:</span>
            <input
              type="date"
              className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${dateFrom ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); if (e.target.value) setPeriodFilter('all'); }}
            />
            <span className="text-xs text-slate-400">—</span>
            <input
              type="date"
              className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${dateTo ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); if (e.target.value) setPeriodFilter('all'); }}
            />
            {(dateFrom || dateTo) && (
              <button
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-200 text-slate-600 hover:bg-slate-300"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
              >Сброс</button>
            )}
          </div>
        </div>
        {/* Строка 2: Оплата + Подрядчик + Диспетчер */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <CreditCard size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase mr-1">Оплата:</span>
            {paymentButtons.map(b => (
              <button
                key={b.key}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  paymentFilter === b.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setPaymentFilter(b.key)}
              >{b.label}</button>
            ))}
          </div>
          {uniqueContractors.length > 0 && (
            <div className="flex items-center gap-1">
              <Truck size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase mr-1">Подрядчик:</span>
              <select
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold"
                value={contractorFilter}
                onChange={e => setContractorFilter(e.target.value)}
              >
                <option value="all">Все</option>
                {uniqueContractors.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          )}
          {uniqueDispatchers.length > 0 && (
            <div className="flex items-center gap-1">
              <UserCog size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase mr-1">Диспетчер:</span>
              <select
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold"
                value={dispatcherFilter}
                onChange={e => setDispatcherFilter(e.target.value)}
              >
                <option value="all">Все</option>
                {uniqueDispatchers.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* === Секция 4: Финансовая таблица заказов === */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black flex items-center gap-2">
            <FileText size={18} />
            Финансы по заказам
          </h2>
          <div className="text-xs text-slate-400">
            {orderRows.length} заказов
          </div>
        </div>

        {orderRows.length === 0 ? (
          <div className="text-center text-slate-400 py-12">Нет заказов по выбранным фильтрам</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                  <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => handleSort('orderNumber')}>
                    № <SortIcon field="orderNumber" />
                  </th>
                  <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => handleSort('customer')}>
                    Клиент <SortIcon field="customer" />
                  </th>
                  <th className="py-2 pr-3 cursor-pointer select-none text-right" onClick={() => handleSort('totalAmount')}>
                    Сумма <SortIcon field="totalAmount" />
                  </th>
                  <th className="py-2 pr-3 cursor-pointer select-none text-right" onClick={() => handleSort('totalPaid')}>
                    Оплачено <SortIcon field="totalPaid" />
                  </th>
                  <th className="py-2 pr-3 cursor-pointer select-none text-right" onClick={() => handleSort('outstanding')}>
                    Долг <SortIcon field="outstanding" />
                  </th>
                  <th className="py-2 pr-3">Подрядчик</th>
                  <th className="py-2 pr-3 cursor-pointer select-none text-right" onClick={() => handleSort('contractorCost')}>
                    Расход <SortIcon field="contractorCost" />
                  </th>
                  <th className="py-2 pr-3">Оплата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderRows.map(row => (
                  <React.Fragment key={row.orderId}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedOrderId(expandedOrderId === row.orderId ? null : row.orderId)}
                    >
                      <td className="py-3 pr-3 font-bold text-xs">{row.orderNumber}</td>
                      <td className="py-3 pr-3 max-w-[160px] truncate">{row.customer}</td>
                      <td className="py-3 pr-3 text-right font-bold">{formatPrice(row.totalAmount)}</td>
                      <td className="py-3 pr-3 text-right text-green-600 font-bold">{formatPrice(row.totalPaid)}</td>
                      <td className={`py-3 pr-3 text-right font-bold ${row.outstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {formatPrice(row.outstanding)}
                      </td>
                      <td className="py-3 pr-3 text-xs max-w-[120px] truncate text-slate-500">{row.contractorNames}</td>
                      <td className="py-3 pr-3 text-right text-blue-600 font-bold">{formatPrice(row.contractorCost)}</td>
                      <td className="py-3 pr-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${paymentBadge(row.paymentStatus)}`}>
                          {paymentLabel(row.paymentStatus)}
                        </span>
                      </td>
                    </tr>
                    {/* Раскрытая детализация */}
                    {expandedOrderId === row.orderId && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <div className="bg-slate-50 p-4 space-y-3 border-t border-slate-200">
                            {/* Счета */}
                            {(row.order.invoices || []).length > 0 && (
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Счета</div>
                                <div className="space-y-1">
                                  {(row.order.invoices || []).map(inv => (
                                    <div key={inv.id} className="flex items-center gap-3 text-xs">
                                      <span className="font-bold">{inv.number}</span>
                                      <span className="text-slate-400">{formatDateTime(inv.createdAt)}</span>
                                      <span className="font-bold">{formatPrice(inv.amount)}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        inv.status === InvoiceStatus.PAID ? 'bg-green-100 text-green-800' :
                                        inv.status === InvoiceStatus.OVERDUE ? 'bg-red-100 text-red-800' :
                                        inv.status === InvoiceStatus.PARTIALLY_PAID ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {inv.status === InvoiceStatus.PAID ? 'Оплачен' :
                                         inv.status === InvoiceStatus.OVERDUE ? 'Просрочен' :
                                         inv.status === InvoiceStatus.PARTIALLY_PAID ? `Частично (${formatPrice(inv.paidAmount)})` :
                                         inv.status === InvoiceStatus.SENT ? 'Отправлен' :
                                         inv.status === InvoiceStatus.CANCELLED ? 'Отменён' : 'Выставлен'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Платежи */}
                            {(row.order.payments || []).length > 0 && (
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Платежи</div>
                                <div className="space-y-1">
                                  {(row.order.payments || []).map(p => (
                                    <div key={p.id} className="flex items-center gap-3 text-xs">
                                      <span className="font-bold text-green-600">{formatPrice(p.amount)}</span>
                                      <span className="text-slate-400">{formatDateTime(p.completedAt || p.createdAt)}</span>
                                      <span className="text-slate-500">
                                        {p.method === 'bank_transfer' ? 'Безнал' :
                                         p.method === 'card' ? 'Карта' :
                                         p.method === 'cash' ? 'Наличные' : 'QR'}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        p.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        p.status === 'failed' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {p.status === 'completed' ? 'Проведён' :
                                         p.status === 'failed' ? 'Ошибка' :
                                         p.status === 'refunded' ? 'Возврат' : 'В обработке'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Назначения подрядчиков */}
                            {(row.order.assignments || []).length > 0 && (
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Подрядчики / Водители</div>
                                <div className="space-y-1">
                                  {(row.order.assignments || []).map(a => (
                                    <div key={a.id} className="flex items-center gap-3 text-xs">
                                      <span className="font-bold">{a.contractorName || a.driverName}</span>
                                      <span className="text-slate-500">{a.assetType}</span>
                                      <span className="text-blue-600 font-bold">
                                        {formatPrice(a.assignedPrice)} / {a.priceUnit}
                                      </span>
                                      {a.confirmedEarnings != null && (
                                        <span className="text-green-600 font-bold">
                                          Начислено: {formatPrice(a.confirmedEarnings)}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Рейсы */}
                            {(row.order.trips || []).length > 0 && (
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Рейсы</div>
                                <div className="text-xs text-slate-600">
                                  Всего: {(row.order.trips || []).length},
                                  Завершено: {(row.order.trips || []).filter(t => t.status === 'completed').length},
                                  Подтверждено: {(row.order.trips || []).filter(t => t.isConfirmed).length},
                                  Объём: {(row.order.trips || []).filter(t => t.isConfirmed).reduce((s, t) => s + (t.loadedVolumeM3 || 0), 0).toFixed(0)} м³
                                </div>
                              </div>
                            )}
                            {/* Если ничего нет */}
                            {!(row.order.invoices || []).length && !(row.order.payments || []).length && !(row.order.assignments || []).length && (
                              <div className="text-xs text-slate-400">Нет финансовых данных</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Итого под таблицей */}
        {orderRows.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-400 text-xs uppercase font-bold">Итого сумма: </span>
              <span className="font-black">{formatPrice(orderRows.reduce((s, r) => s + r.totalAmount, 0))}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs uppercase font-bold">Оплачено: </span>
              <span className="font-black text-green-600">{formatPrice(orderRows.reduce((s, r) => s + r.totalPaid, 0))}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs uppercase font-bold">Долг: </span>
              <span className="font-black text-amber-600">{formatPrice(orderRows.reduce((s, r) => s + r.outstanding, 0))}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs uppercase font-bold">Расход подряд.: </span>
              <span className="font-black text-blue-600">{formatPrice(orderRows.reduce((s, r) => s + r.contractorCost, 0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* === Секция 5: Задолженность перед подрядчиками === */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
        <h2 className="text-lg font-black flex items-center gap-2 mb-4">
          <Users size={18} />
          Задолженность перед подрядчиками
        </h2>
        {contractorDebts.length === 0 ? (
          <div className="text-center text-slate-400 py-8">Нет данных по подрядчикам</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                  <th className="py-2 pr-4">Подрядчик</th>
                  <th className="py-2 pr-4 text-right">Заказов</th>
                  <th className="py-2 pr-4 text-right">Начислено</th>
                  <th className="py-2 pr-4 text-right">Оплачено</th>
                  <th className="py-2 pr-4 text-right">Долг</th>
                  <th className="py-2 pr-4">Тип оплаты</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractorDebts.map(row => (
                  <tr key={row.contractorId} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-bold">{row.contractorName}</td>
                    <td className="py-3 pr-4 text-right">{row.ordersCount}</td>
                    <td className="py-3 pr-4 text-right font-bold">{formatPrice(row.totalOwed)}</td>
                    <td className="py-3 pr-4 text-right text-green-600 font-bold">{formatPrice(row.totalPaid)}</td>
                    <td className={`py-3 pr-4 text-right font-black ${
                      row.outstanding > 100000 ? 'text-red-600' :
                      row.outstanding > 0 ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {formatPrice(row.outstanding)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">{row.paymentType || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Итого */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex gap-6 text-sm">
              <div>
                <span className="text-slate-400 text-xs uppercase font-bold">Всего начислено: </span>
                <span className="font-black">{formatPrice(contractorDebts.reduce((s, r) => s + r.totalOwed, 0))}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs uppercase font-bold">Оплачено: </span>
                <span className="font-black text-green-600">{formatPrice(contractorDebts.reduce((s, r) => s + r.totalPaid, 0))}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs uppercase font-bold">Общий долг: </span>
                <span className="font-black text-red-600">{formatPrice(contractorDebts.reduce((s, r) => s + r.outstanding, 0))}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === Секция 6: Лента событий === */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
        <h2 className="text-lg font-black flex items-center gap-2 mb-4">
          <Activity size={18} />
          Последние финансовые события
        </h2>
        {events.length === 0 ? (
          <div className="text-center text-slate-400 py-8">Нет финансовых событий</div>
        ) : (
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200" />
            <div className="space-y-3">
              {events.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 relative">
                  <div className={`w-4 h-4 rounded-full ${eventDot(ev.type)} flex-shrink-0 mt-0.5 ring-2 ring-white`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{ev.description}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{formatDateTime(ev.timestamp)}</span>
                      {ev.amount != null && <span className="font-bold text-slate-600">{formatPrice(ev.amount)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
