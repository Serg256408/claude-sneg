import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Order, OrderStatus, getOrderStatusLabel } from './types';

interface OrderCalendarProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onCreateOrder?: (date: string) => void;
}

function getStatusColor(status: string): string {
  const s = status as OrderStatus;
  if ([OrderStatus.COMPLETED].includes(s)) return 'bg-green-500';
  if ([OrderStatus.EN_ROUTE, OrderStatus.IN_PROGRESS, OrderStatus.EXPORT_COMPLETED].includes(s)) return 'bg-blue-500';
  if ([OrderStatus.SEARCHING_EQUIPMENT, OrderStatus.SCHEDULING, OrderStatus.EQUIPMENT_APPROVED].includes(s)) return 'bg-amber-500';
  if ([OrderStatus.CANCELLED, OrderStatus.DISPUTE].includes(s)) return 'bg-red-500';
  return 'bg-slate-400';
}

function getStatusDotClass(status: string): string {
  const s = status as OrderStatus;
  if ([OrderStatus.COMPLETED].includes(s)) return 'border-green-200 bg-green-50';
  if ([OrderStatus.EN_ROUTE, OrderStatus.IN_PROGRESS, OrderStatus.EXPORT_COMPLETED].includes(s)) return 'border-blue-200 bg-blue-50';
  if ([OrderStatus.SEARCHING_EQUIPMENT, OrderStatus.SCHEDULING, OrderStatus.EQUIPMENT_APPROVED].includes(s)) return 'border-amber-200 bg-amber-50';
  if ([OrderStatus.CANCELLED, OrderStatus.DISPUTE].includes(s)) return 'border-red-200 bg-red-50';
  return 'border-slate-200 bg-slate-50';
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getOrderDate(order: Order): Date | null {
  const dateStr = order.scheduledTime || order.createdAt;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function OrderCalendar({ orders, onSelectOrder, onCreateOrder }: OrderCalendarProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const navigate = (dir: -1 | 1) => {
    setCurrentDate(prev => {
      if (viewMode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      } else {
        const d = new Date(prev);
        d.setDate(d.getDate() + dir * 7);
        return d;
      }
    });
  };

  const goToday = () => setCurrentDate(new Date());

  // Group orders by date string
  const ordersByDate = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const o of orders) {
      const d = getOrderDate(o);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(o);
    }
    return map;
  }, [orders]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    if (viewMode === 'week') {
      const monday = getMonday(currentDate);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
      });
    }
    // Month view
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Monday of the week containing the 1st
    const startDay = getMonday(firstDay);
    const days: Date[] = [];

    let d = new Date(startDay);
    // Fill until we cover at least until end of month and complete the week
    while (d <= lastDay || d.getDay() !== 1) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
      if (days.length > 42) break; // safety
    }
    return days;
  }, [currentDate, viewMode]);

  const headerText = viewMode === 'month'
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const monday = getMonday(currentDate);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return `${monday.getDate()} ${MONTHS[monday.getMonth()].slice(0, 3)} — ${sunday.getDate()} ${MONTHS[sunday.getMonth()].slice(0, 3)} ${sunday.getFullYear()}`;
      })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <CalendarIcon size={18} className="text-slate-400" />
          <span className="font-black text-sm">{headerText}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="text-[10px] font-black uppercase tracking-wider text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            Сегодня
          </button>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('week')}
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md transition-all ${viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md transition-all ${viewMode === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              Месяц
            </button>
          </div>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest py-2 ${i >= 5 ? 'text-red-400' : 'text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className={`grid grid-cols-7 ${viewMode === 'week' ? 'min-h-[200px]' : ''}`}>
        {calendarDays.map((day, idx) => {
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const dayOrders = ordersByDate[key] || [];
          const isToday = isSameDay(day, today);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={idx}
              onClick={() => {
                if (dayOrders.length === 0 && onCreateOrder) {
                  onCreateOrder(key);
                }
              }}
              className={`border-b border-r border-slate-100 p-1.5 ${viewMode === 'week' ? 'min-h-[180px]' : 'min-h-[90px]'} ${
                !isCurrentMonth && viewMode === 'month' ? 'opacity-30' : ''
              } ${isWeekend ? 'bg-slate-50/50' : ''} ${dayOrders.length === 0 && onCreateOrder ? 'cursor-pointer hover:bg-blue-50/30' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : isWeekend ? 'text-red-400' : 'text-slate-500'}`}>
                  {day.getDate()}
                </span>
                {dayOrders.length > 0 && (
                  <span className="text-[9px] font-bold text-slate-300">{dayOrders.length}</span>
                )}
              </div>

              <div className="space-y-0.5">
                {dayOrders.slice(0, viewMode === 'week' ? 8 : 3).map(o => (
                  <div
                    key={o.id}
                    onClick={(e) => { e.stopPropagation(); onSelectOrder(o); }}
                    className={`text-[9px] font-bold truncate px-1.5 py-0.5 rounded cursor-pointer border hover:opacity-80 transition-opacity ${getStatusDotClass(o.status)}`}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${getStatusColor(o.status)}`} />
                    {o.customer}
                  </div>
                ))}
                {dayOrders.length > (viewMode === 'week' ? 8 : 3) && (
                  <div className="text-[9px] text-slate-400 font-bold px-1.5">
                    +{dayOrders.length - (viewMode === 'week' ? 8 : 3)} ещё
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
