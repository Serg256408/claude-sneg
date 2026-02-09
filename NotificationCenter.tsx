import React, { useState, useRef, useEffect } from 'react';
import { Bell, Package, MessageSquare, FileText, Users, Truck, Calculator, CreditCard, Info, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications, AppNotification } from './NotificationContext';

const ICON_MAP: Record<AppNotification['type'], React.ReactNode> = {
  order_created: <Package size={16} className="text-blue-400" />,
  status_changed: <Truck size={16} className="text-amber-400" />,
  new_message: <MessageSquare size={16} className="text-green-400" />,
  new_bid: <Users size={16} className="text-purple-400" />,
  invoice: <FileText size={16} className="text-indigo-400" />,
  new_lead: <Users size={16} className="text-cyan-400" />,
  assignment: <Truck size={16} className="text-orange-400" />,
  estimate_ready: <Calculator size={16} className="text-emerald-400" />,
  payment: <CreditCard size={16} className="text-green-500" />,
  info: <Info size={16} className="text-slate-400" />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

interface NotificationCenterProps {
  currentRole?: string;
}

export function NotificationCenter({ currentRole }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Filter by role if provided
  const filtered = currentRole
    ? notifications.filter(n => !n.role || n.role === currentRole)
    : notifications;

  const roleUnread = filtered.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
        title="Уведомления"
      >
        <Bell size={20} className={roleUnread > 0 ? 'text-slate-700' : 'text-slate-400'} />
        {roleUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold badge-pop px-1">
            {roleUnread > 99 ? '99+' : roleUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden modal-enter">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm">Уведомления</span>
              {roleUnread > 0 && (
                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{roleUnread} новых</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {roleUnread > 0 && (
                <button onClick={markAllAsRead} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Прочитать все">
                  <CheckCheck size={16} className="text-slate-400" />
                </button>
              )}
              {filtered.length > 0 && (
                <button onClick={clearAll} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Очистить все">
                  <Trash2 size={16} className="text-slate-400" />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px]">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={32} className="mx-auto text-slate-200 mb-3" />
                <div className="text-sm text-slate-400 font-medium">Нет уведомлений</div>
              </div>
            ) : (
              filtered.slice(0, 50).map(n => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${!n.read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {ICON_MAP[n.type] || ICON_MAP.info}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black truncate">{n.title}</span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{n.message}</div>
                    <div className="text-[10px] text-slate-300 mt-1">{timeAgo(n.createdAt)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
