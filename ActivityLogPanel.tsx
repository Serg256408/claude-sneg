import React, { useState, useMemo } from 'react';
import {
  ActivityLogEntry,
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ENTITY_LABELS,
  formatDateTime,
} from './types';

interface ActivityLogPanelProps {
  logs: ActivityLogEntry[];
  onRevert: (entry: ActivityLogEntry) => void;
  onClose: () => void;
  onClearLogs: () => void;
}

export default function ActivityLogPanel({
  logs,
  onRevert,
  onClose,
  onClearLogs,
}: ActivityLogPanelProps) {
  const [filter, setFilter] = useState<'all' | 'order' | 'customer' | 'contractor' | 'lead'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyReversible, setShowOnlyReversible] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filter !== 'all' && log.entityType !== filter) return false;
      if (showOnlyReversible && (!log.isReversible || log.isReverted)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          log.entityName.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          log.userName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filter, searchQuery, showOnlyReversible]);

  const getActionColor = (action: string, isReverted: boolean) => {
    if (isReverted) return 'bg-slate-100 text-slate-400';
    switch (action) {
      case 'create':
        return 'bg-emerald-100 text-emerald-700';
      case 'update':
        return 'bg-blue-100 text-blue-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      case 'status_change':
        return 'bg-violet-100 text-violet-700';
      case 'assignment':
        return 'bg-amber-100 text-amber-700';
      case 'payment':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'order':
        return '📦';
      case 'customer':
        return '👤';
      case 'contractor':
        return '🚛';
      case 'lead':
        return '📋';
      case 'invoice':
        return '📄';
      case 'payment':
        return '💳';
      default:
        return '📝';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">Журнал действий</h2>
            <p className="text-sm text-slate-500 mt-1">
              История всех изменений с возможностью отката
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('Очистить весь журнал действий?')) {
                  onClearLogs();
                }
              }}
              className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors"
            >
              Очистить
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Фильтры */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Поиск по названию, описанию..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium focus:outline-none focus:border-blue-500"
            />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
            >
              <option value="all">Все типы</option>
              <option value="order">Заказы</option>
              <option value="customer">Клиенты</option>
              <option value="contractor">Подрядчики</option>
              <option value="lead">Лиды</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyReversible}
                onChange={e => setShowOnlyReversible(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-600">Только откатываемые</span>
            </label>
          </div>
          <div className="text-xs text-slate-500">
            Найдено: {filteredLogs.length} из {logs.length} записей
          </div>
        </div>

        {/* Список логов */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📋</div>
              <div className="text-lg font-bold text-slate-400">Журнал пуст</div>
              <div className="text-sm text-slate-400 mt-1">
                Действия будут записываться автоматически
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    log.isReverted
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Иконка типа */}
                    <div className="text-2xl flex-shrink-0">
                      {getEntityIcon(log.entityType)}
                    </div>

                    {/* Основной контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getActionColor(
                            log.action,
                            log.isReverted
                          )}`}
                        >
                          {ACTIVITY_ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className="text-xs text-slate-400">
                          {ACTIVITY_ENTITY_LABELS[log.entityType] || log.entityType}
                        </span>
                        {log.isReverted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-700">
                            Откачено
                          </span>
                        )}
                      </div>

                      <div className="mt-1 font-bold text-slate-900 truncate">
                        {log.entityName}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        {log.description}
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span>👤 {log.userName}</span>
                        <span>📅 {formatDateTime(log.timestamp)}</span>
                        {log.isReverted && log.revertedAt && (
                          <span>↩️ Откачено: {formatDateTime(log.revertedAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* Кнопка отката */}
                    <div className="flex-shrink-0">
                      {log.isReversible && !log.isReverted ? (
                        <button
                          onClick={() => {
                            if (window.confirm(`Откатить действие "${log.description}"?`)) {
                              onRevert(log);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
                        >
                          ↩️ Откатить
                        </button>
                      ) : log.isReverted ? (
                        <span className="text-xs text-slate-400 italic">Откачено</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Нельзя откатить</span>
                      )}
                    </div>
                  </div>

                  {/* Детали для разработчиков (свернуты) */}
                  <details className="mt-3">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                      Показать детали (JSON)
                    </summary>
                    <div className="mt-2 p-3 bg-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
                      <div className="mb-2">
                        <strong>Было:</strong>
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.prevState, null, 2)?.slice(0, 500) || 'null'}
                          {JSON.stringify(log.prevState)?.length > 500 ? '...' : ''}
                        </pre>
                      </div>
                      <div>
                        <strong>Стало:</strong>
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.newState, null, 2)?.slice(0, 500) || 'null'}
                          {JSON.stringify(log.newState)?.length > 500 ? '...' : ''}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
          <div className="text-xs text-slate-400">
            Хранится последние 500 записей. Откат возможен для создания, изменения и удаления.
          </div>
        </div>
      </div>
    </div>
  );
}
