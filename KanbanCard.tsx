import React from 'react';
import { MapPin, User, Clock } from 'lucide-react';
import { Order, getOrderStatusLabel } from './types';

interface KanbanCardProps {
  order: Order;
  onClick: (order: Order) => void;
}

export function KanbanCard({ order, onClick }: KanbanCardProps) {
  const hasDrivers = (order.driverDetails || []).length > 0;
  const tripProgress = order.plannedTrips ? Math.round((order.actualTrips / order.plannedTrips) * 100) : 0;

  return (
    <div
      onClick={() => onClick(order)}
      className="bg-white rounded-xl border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
          {order.orderNumber || order.id.slice(0, 8)}
        </span>
        {order.unreadMessages > 0 && (
          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
            {order.unreadMessages}
          </span>
        )}
      </div>

      <div className="text-xs font-bold truncate mb-1">{order.customer}</div>

      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-2">
        <MapPin size={10} />
        <span className="truncate">{order.address || 'Без адреса'}</span>
      </div>

      {order.managerName && (
        <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold mb-2">
          <User size={10} />
          <span>{order.managerName}</span>
        </div>
      )}

      {order.scheduledTime && (
        <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-2">
          <Clock size={10} />
          <span>{new Date(order.scheduledTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      {/* Progress bar for trips */}
      {order.plannedTrips > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-1">
            <span>Рейсы: {order.actualTrips}/{order.plannedTrips}</span>
            <span>{tripProgress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(tripProgress, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Drivers */}
      {hasDrivers && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {(order.driverDetails || []).slice(0, 3).map((d, i) => (
            <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold truncate max-w-[80px]">
              {d.driverName}
            </span>
          ))}
          {(order.driverDetails || []).length > 3 && (
            <span className="text-[9px] text-slate-400 font-bold">+{(order.driverDetails || []).length - 3}</span>
          )}
        </div>
      )}

      {/* Price */}
      {order.totalCustomerPrice != null && order.totalCustomerPrice > 0 && (
        <div className="text-[10px] font-black text-slate-600 mt-2">
          {order.totalCustomerPrice.toLocaleString('ru-RU')} ₽
        </div>
      )}
    </div>
  );
}
