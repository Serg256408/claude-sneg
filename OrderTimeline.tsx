import React from 'react';
import { CheckCircle, Circle, XCircle, Briefcase, Settings, Truck, ClipboardCheck } from 'lucide-react';

interface OrderTimelineProps {
  currentStatus: string;
  compact?: boolean;
  dark?: boolean;
}

const stages = [
  { id: 'sale', label: 'Заявка', icon: Briefcase, statuses: ['DRAFT', 'NEW_REQUEST', 'CALCULATING', 'AWAITING_CUSTOMER', 'CONFIRMED_BY_CUSTOMER', 'CONTRACT_SIGNING', 'AWAITING_PREPAYMENT'] },
  { id: 'assignment', label: 'Подготовка', icon: Settings, statuses: ['SEARCHING_EQUIPMENT', 'SCHEDULING', 'EQUIPMENT_APPROVED'] },
  { id: 'execution', label: 'Выполнение', icon: Truck, statuses: ['EN_ROUTE', 'IN_PROGRESS', 'EXPORT_COMPLETED'] },
  { id: 'closing', label: 'Завершение', icon: ClipboardCheck, statuses: ['AWAITING_CLOSING_DOCS', 'CLOSING_DOCS_SENT', 'REPORT_READY', 'COMPLETED'] },
];

function getStageIndex(status: string): number {
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].statuses.includes(status)) return i;
  }
  return -1;
}

export function OrderTimeline({ currentStatus, compact, dark = true }: OrderTimelineProps) {
  const isCancelled = currentStatus === 'CANCELLED';
  const isDispute = currentStatus === 'DISPUTE';
  const currentStageIndex = getStageIndex(currentStatus);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {stages.map((stage, i) => {
          const isCompleted = i < currentStageIndex;
          const isCurrent = i === currentStageIndex;
          return (
            <React.Fragment key={stage.id}>
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isCancelled || isDispute
                    ? 'bg-red-500'
                    : isCompleted
                    ? 'bg-green-500'
                    : isCurrent
                    ? 'bg-blue-500 timeline-pulse'
                    : dark ? 'bg-white/10' : 'bg-slate-200'
                }`}
                title={stage.label}
              />
              {i < stages.length - 1 && (
                <div className={`w-3 h-0.5 ${
                  isCompleted ? 'bg-green-500/50' : dark ? 'bg-white/5' : 'bg-slate-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center w-full">
      {stages.map((stage, i) => {
        const isCompleted = i < currentStageIndex;
        const isCurrent = i === currentStageIndex;
        const Icon = stage.icon;

        return (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isCancelled || isDispute
                    ? 'bg-red-500/20 text-red-400'
                    : isCompleted
                    ? 'bg-green-500/20 text-green-400'
                    : isCurrent
                    ? 'bg-blue-500/20 text-blue-400 timeline-pulse'
                    : dark ? 'bg-white/5 text-slate-600' : 'bg-slate-100 text-slate-300'
                }`}
              >
                {isCancelled || isDispute ? (
                  <XCircle size={18} />
                ) : isCompleted ? (
                  <CheckCircle size={18} />
                ) : isCurrent ? (
                  <Icon size={18} />
                ) : (
                  <Circle size={18} />
                )}
              </div>
              <span className={`text-[10px] font-bold mt-1.5 whitespace-nowrap ${
                isCurrent
                  ? dark ? 'text-blue-400' : 'text-blue-600'
                  : isCompleted
                  ? dark ? 'text-green-400' : 'text-green-600'
                  : dark ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {stage.label}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-18px] ${
                isCompleted ? 'bg-green-500/40' : dark ? 'bg-white/5' : 'bg-slate-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
