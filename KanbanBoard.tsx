import React, { useMemo } from 'react';
import { Order, OrderStatus, normalizeOrderStatus } from './types';
import { KanbanCard } from './KanbanCard';
import { Briefcase, Settings, Truck, FileText, AlertTriangle } from 'lucide-react';

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  statuses: OrderStatus[];
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'sale',
    title: 'Продажа',
    icon: <Briefcase size={14} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
    statuses: [
      OrderStatus.DRAFT,
      OrderStatus.NEW_REQUEST,
      OrderStatus.CALCULATING,
      OrderStatus.AWAITING_CUSTOMER,
      OrderStatus.CONFIRMED_BY_CUSTOMER,
      OrderStatus.CONTRACT_SIGNING,
      OrderStatus.AWAITING_PREPAYMENT,
    ],
  },
  {
    id: 'assignment',
    title: 'Назначение',
    icon: <Settings size={14} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
    statuses: [
      OrderStatus.SEARCHING_EQUIPMENT,
      OrderStatus.SCHEDULING,
      OrderStatus.EQUIPMENT_APPROVED,
    ],
  },
  {
    id: 'execution',
    title: 'Выполнение',
    icon: <Truck size={14} />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500',
    statuses: [
      OrderStatus.EN_ROUTE,
      OrderStatus.IN_PROGRESS,
      OrderStatus.EXPORT_COMPLETED,
    ],
  },
  {
    id: 'closing',
    title: 'Закрытие',
    icon: <FileText size={14} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    dotColor: 'bg-purple-500',
    statuses: [
      OrderStatus.AWAITING_CLOSING_DOCS,
      OrderStatus.CLOSING_DOCS_SENT,
      OrderStatus.REPORT_READY,
      OrderStatus.COMPLETED,
    ],
  },
  {
    id: 'problems',
    title: 'Проблемы',
    icon: <AlertTriangle size={14} />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
    statuses: [
      OrderStatus.CANCELLED,
      OrderStatus.DISPUTE,
    ],
  },
];

interface KanbanBoardProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

export function KanbanBoard({ orders, onSelectOrder }: KanbanBoardProps) {
  const columnOrders = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const col of COLUMNS) {
      map[col.id] = [];
    }
    for (const order of orders) {
      for (const col of COLUMNS) {
        if (col.statuses.includes(order.status as OrderStatus)) {
          map[col.id].push(order);
          break;
        }
      }
    }
    // Sort each column by updatedAt desc
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    }
    return map;
  }, [orders]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {COLUMNS.map(col => (
        <div key={col.id} className={`flex-shrink-0 w-[240px] rounded-2xl border ${col.borderColor} ${col.bgColor} flex flex-col`}>
          {/* Column header */}
          <div className="px-3 py-3 flex items-center gap-2 border-b border-white/50">
            <span className={col.color}>{col.icon}</span>
            <span className={`text-xs font-black uppercase tracking-wider ${col.color}`}>{col.title}</span>
            <span className={`ml-auto text-[10px] font-black ${col.color} bg-white/80 rounded-full w-6 h-6 flex items-center justify-center`}>
              {columnOrders[col.id].length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
            {columnOrders[col.id].length === 0 ? (
              <div className="text-center py-8 text-[10px] text-slate-300 font-bold uppercase">
                Пусто
              </div>
            ) : (
              columnOrders[col.id].map(order => (
                <KanbanCard key={order.id} order={order} onClick={onSelectOrder} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
