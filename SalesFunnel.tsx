import React, { useMemo } from 'react';
import { Lead, LeadStatus } from './types';
import { Users, Phone, CheckCircle, Send, Trophy, XCircle } from 'lucide-react';

interface SalesFunnelProps {
  leads: Lead[];
  onFilterByStatus?: (status: LeadStatus | null) => void;
  activeFilter?: LeadStatus | null;
}

interface FunnelStage {
  status: LeadStatus | LeadStatus[];
  label: string;
  icon: React.ReactNode;
  color: string;
  bgFrom: string;
  bgTo: string;
}

const STAGES: FunnelStage[] = [
  { status: LeadStatus.NEW, label: 'Новые', icon: <Users size={16} />, color: 'text-blue-600', bgFrom: 'from-blue-500', bgTo: 'to-blue-400' },
  { status: LeadStatus.CONTACTED, label: 'Контакт', icon: <Phone size={16} />, color: 'text-cyan-600', bgFrom: 'from-cyan-500', bgTo: 'to-cyan-400' },
  { status: [LeadStatus.QUALIFIED, LeadStatus.ESTIMATING], label: 'Квалификация', icon: <CheckCircle size={16} />, color: 'text-indigo-600', bgFrom: 'from-indigo-500', bgTo: 'to-indigo-400' },
  { status: LeadStatus.OFFER_SENT, label: 'КП отправлено', icon: <Send size={16} />, color: 'text-amber-600', bgFrom: 'from-amber-500', bgTo: 'to-amber-400' },
  { status: LeadStatus.WON, label: 'Выиграно', icon: <Trophy size={16} />, color: 'text-green-600', bgFrom: 'from-green-500', bgTo: 'to-green-400' },
];

export function SalesFunnel({ leads, onFilterByStatus, activeFilter }: SalesFunnelProps) {
  const stageData = useMemo(() => {
    return STAGES.map(stage => {
      const statuses = Array.isArray(stage.status) ? stage.status : [stage.status];
      const stageLeads = leads.filter(l => statuses.includes(l.status));
      return {
        ...stage,
        count: stageLeads.length,
        statuses,
      };
    });
  }, [leads]);

  const lostCount = leads.filter(l => l.status === LeadStatus.LOST).length;
  const totalActive = leads.filter(l => ![LeadStatus.LOST, LeadStatus.SPAM, LeadStatus.DUPLICATE].includes(l.status)).length;
  const maxCount = Math.max(...stageData.map(s => s.count), 1);

  // Conversion rates
  const conversions = stageData.map((stage, i) => {
    if (i === 0) return null;
    const prevCount = stageData[i - 1].count;
    if (prevCount === 0) return null;
    return Math.round((stage.count / prevCount) * 100);
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Воронка продаж</div>
          <div className="text-lg font-black tracking-tight">
            {totalActive} активных лидов
          </div>
        </div>
        {activeFilter && (
          <button
            onClick={() => onFilterByStatus?.(null)}
            className="text-[10px] font-black uppercase tracking-wider text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Сбросить фильтр
          </button>
        )}
      </div>

      {/* Funnel bars */}
      <div className="space-y-2">
        {stageData.map((stage, i) => {
          const widthPct = Math.max(20, (stage.count / maxCount) * 100);
          const isActive = activeFilter != null && stage.statuses.includes(activeFilter);

          return (
            <div key={stage.label}>
              {/* Conversion arrow */}
              {conversions[i] !== null && conversions[i] !== undefined && (
                <div className="flex items-center gap-2 py-1 pl-4">
                  <div className="w-4 h-4 flex items-center justify-center text-slate-300">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2L6 10M6 10L3 7M6 10L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{conversions[i]}% конверсия</span>
                </div>
              )}

              <button
                onClick={() => onFilterByStatus?.(stage.statuses[0])}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:shadow-md ${
                  isActive ? 'ring-2 ring-blue-400 shadow-md' : ''
                }`}
                style={{ background: 'transparent' }}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 ${stage.color}`}>{stage.icon}</div>

                {/* Bar */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black">{stage.label}</span>
                    <span className={`text-sm font-black ${stage.color}`}>{stage.count}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${stage.bgFrom} ${stage.bgTo} transition-all duration-500`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Lost */}
      {lostCount > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => onFilterByStatus?.(LeadStatus.LOST)}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-red-50 transition-all ${activeFilter === LeadStatus.LOST ? 'bg-red-50 ring-2 ring-red-300' : ''}`}
          >
            <XCircle size={16} className="text-red-500" />
            <span className="text-xs font-black text-red-600">Проиграно</span>
            <span className="ml-auto text-sm font-black text-red-500">{lostCount}</span>
          </button>
        </div>
      )}
    </div>
  );
}
