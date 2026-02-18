
import React, { useState, useMemo } from 'react';
import {
  Project, ProjectPhoto, PaymentScheduleItem, DailyReport, Resource, EXPENSE_CATEGORY_LABELS,
  SERVICE_CATEGORY_LABELS, WEATHER_ICONS, WEATHER_LABELS,
  generateId, formatPrice, formatDate, formatDateTime,
} from '../types';
import {
  FileText, Calculator, Image as ImageIcon, MessageCircle, MapPin,
  CheckCircle, ChevronDown, Download, Phone,
  DollarSign, Clock, Eye, Star, X, CreditCard, Activity,
  BarChart3, ArrowRight, Mail, CalendarDays, Shield,
  Building2, ChevronRight, TrendingUp, Sparkles, BookOpen,
} from 'lucide-react';
import { ChatWidget } from './ChatWidget';
import { CommercialProposal } from './CommercialProposal';
import { CalculatorHub } from './CalculatorHub';
import { ConstructionReference } from './ConstructionReference';

interface ClientDashboardProps {
  project: Project;
  resources: Resource[];
  onUpdateProject: (p: Project) => void;
}

type TabId = 'overview' | 'gallery' | 'finance' | 'docs' | 'calc' | 'norms' | 'chat';

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ project, resources, onUpdateProject }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [viewingPhoto, setViewingPhoto] = useState<ProjectPhoto | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<string>('all');
  const [showKPPreview, setShowKPPreview] = useState(false);

  // Computed
  const latestReport = useMemo(() => {
    const reports = project.dailyReports || [];
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }, [project.dailyReports]);

  const totalPaid = useMemo(() =>
    (project.paymentSchedule || [])
      .filter(p => p.status === 'paid')
      .reduce((s, p) => s + (p.paidAmount || p.amount), 0),
    [project.paymentSchedule]
  );

  const photoStages = useMemo(() => {
    const stages = new Set((project.photos || []).map(p => p.stage));
    return Array.from(stages);
  }, [project.photos]);

  const filteredPhotos = useMemo(() => {
    const photos = project.photos || [];
    if (galleryFilter === 'all') return photos;
    return photos.filter(p => p.stage === galleryFilter);
  }, [project.photos, galleryFilter]);

  const clientEstimateItems = project.clientEstimateItems || [];
  const estimateTotal = useMemo(() =>
    clientEstimateItems.length > 0
      ? clientEstimateItems.reduce((s, i) => s + i.totalPrice, 0)
      : project.items.reduce((s, i) => s + i.totalCost, 0),
    [clientEstimateItems, project.items]
  );

  const handleSendMessage = (text: string, photo?: string) => {
    onUpdateProject({
      ...project,
      chat: [...(project.chat || []), {
        id: generateId(), sender: 'Заказчик', role: 'client', text, timestamp: Date.now(), photo,
      }],
    });
  };

  // Tabs
  const tabs: { id: TabId; label: string; icon: React.FC<any> }[] = [
    { id: 'overview', label: 'Обзор', icon: Activity },
    { id: 'gallery', label: 'Фото', icon: ImageIcon },
    { id: 'finance', label: 'Оплата', icon: CreditCard },
    { id: 'docs', label: 'Документы', icon: FileText },
    { id: 'calc', label: 'Расчёт', icon: Calculator },
    { id: 'norms', label: 'Нормы', icon: BookOpen },
    { id: 'chat', label: 'Чат', icon: MessageCircle },
  ];

  const unreadChat = (project.chat || []).filter(m => m.role !== 'client' && !(m.readBy || []).includes('client')).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ===== PREMIUM HEADER ===== */}
      <header className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[80%] bg-emerald-400 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-30%] left-[-10%] w-[40%] h-[60%] bg-teal-400 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-5 py-6 sm:px-8 sm:py-8">
          {/* Company badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">Транском</span>
          </div>

          {/* Project info */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">{project.name}</h1>
          <p className="text-emerald-200 text-sm flex items-center gap-1.5">
            <MapPin size={14} className="shrink-0" /> {project.address}
          </p>

          {/* Progress bar */}
          <div className="mt-5 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Готовность проекта</span>
              <span className="text-2xl font-black text-emerald-300">{project.progress}%</span>
            </div>
            <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-1000"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            {project.startDate && project.endDate && (
              <div className="flex justify-between text-xs text-emerald-300 mt-2">
                <span>Начало: {formatDate(project.startDate)}</span>
                <span>Окончание: {formatDate(project.endDate)}</span>
              </div>
            )}
          </div>

          {/* Status badges */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {(project.serviceCategories || []).map(sc => (
              <span key={sc} className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-white/15 text-white">
                {SERVICE_CATEGORY_LABELS[sc]}
              </span>
            ))}
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
              project.status === 'active' ? 'bg-emerald-500/30 text-emerald-200' :
              project.status === 'completed' ? 'bg-green-500/30 text-green-200' :
              'bg-slate-500/30 text-slate-200'
            }`}>
              {project.status === 'active' ? 'В работе' : project.status === 'completed' ? 'Завершён' : 'Черновик'}
            </span>
          </div>
        </div>
      </header>

      {/* ===== TABS ===== */}
      <nav className="bg-white border-b sticky top-0 z-30 overflow-x-auto">
        <div className="max-w-5xl mx-auto px-2 flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap relative ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.id === 'chat' && unreadChat > 0 && (
                <span className="bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">{unreadChat}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ===== CONTENT ===== */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6">

        {/* ========== OVERVIEW ========== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Today on site widget */}
            {latestReport && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-3 flex items-center gap-1.5">
                  <Activity size={14} /> Сегодня на объекте
                </h3>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{WEATHER_ICONS[latestReport.weather]}</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800 font-medium">{latestReport.workDone}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>{WEATHER_LABELS[latestReport.weather]}{latestReport.temperature ? `, ${latestReport.temperature}°C` : ''}</span>
                      <span>Рабочих: {latestReport.workersCount}</span>
                    </div>
                    {latestReport.problems && (
                      <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded-lg px-2.5 py-1.5 inline-block">
                        {latestReport.problems}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Milestone timeline */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Этапы работ</h3>
              <div className="space-y-0">
                {[...project.milestones].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((m, idx) => {
                  const milestonePhotos = (project.photos || []).filter(p => p.milestoneId === m.id || p.stage === m.title);

                  return (
                    <div key={m.id} className="flex gap-4">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          m.status === 'completed' ? 'bg-green-500 text-white' :
                          m.status === 'current' ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 animate-pulse' :
                          'bg-slate-200 text-slate-400'
                        }`}>
                          {m.status === 'completed' ? <CheckCircle size={16} /> :
                           m.status === 'current' ? <Clock size={16} /> :
                           <span className="text-xs font-bold">{idx + 1}</span>}
                        </div>
                        {idx < project.milestones.length - 1 && (
                          <div className={`w-0.5 flex-1 min-h-[2rem] ${m.status === 'completed' ? 'bg-green-300' : 'bg-slate-200'}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 pb-6 ${m.status === 'completed' ? 'opacity-80' : ''}`}>
                        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                          <div>
                            <h4 className="font-bold text-slate-800">{m.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                            {m.date && <p className="text-[10px] text-green-600 mt-1">Завершён {formatDate(m.date)}</p>}
                            {m.serviceCategory && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 mt-1 inline-block">
                                {SERVICE_CATEGORY_LABELS[m.serviceCategory]}
                              </span>
                            )}
                          </div>
                          {/* Фото этапа */}
                          {milestonePhotos.length > 0 && (
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                              {milestonePhotos.slice(0, 5).map(photo => (
                                <img
                                  key={photo.id}
                                  src={photo.url}
                                  alt={photo.description}
                                  className="w-14 h-14 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform shrink-0 border-2 border-white shadow-sm"
                                  onClick={() => setViewingPhoto(photo)}
                                />
                              ))}
                              {milestonePhotos.length > 5 && (
                                <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-xs font-bold text-slate-400">
                                  +{milestonePhotos.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button onClick={() => setActiveTab('chat')} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-emerald-300 transition-colors text-center group">
                <MessageCircle size={24} className="mx-auto text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-700">Написать менеджеру</p>
              </button>
              <button onClick={() => setActiveTab('gallery')} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-emerald-300 transition-colors text-center group">
                <ImageIcon size={24} className="mx-auto text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-700">Фотоотчёт</p>
              </button>
              <button onClick={() => setActiveTab('finance')} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-emerald-300 transition-colors text-center group">
                <CreditCard size={24} className="mx-auto text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-700">Оплаты</p>
              </button>
              <button onClick={() => setActiveTab('calc')} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-emerald-300 transition-colors text-center group">
                <Calculator size={24} className="mx-auto text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-700">Калькулятор</p>
              </button>
            </div>

            {/* Financial summary mini */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Договор</p>
                <p className="text-lg font-black text-slate-900">{formatPrice(project.contractPrice)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Оплачено</p>
                <p className="text-lg font-black text-green-600">{formatPrice(totalPaid)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Остаток</p>
                <p className="text-lg font-black text-orange-600">{formatPrice(project.contractPrice - totalPaid)}</p>
              </div>
            </div>

            {/* Latest photos preview */}
            {(project.photos || []).length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Последние фото</h3>
                  <button onClick={() => setActiveTab('gallery')} className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    Все <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(project.photos || []).slice(0, 3).map(photo => (
                    <div key={photo.id} onClick={() => setViewingPhoto(photo)} className="aspect-square rounded-xl overflow-hidden cursor-pointer group">
                      <img src={photo.url} alt={photo.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ========== GALLERY ========== */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setGalleryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  galleryFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >Все ({(project.photos || []).length})</button>
              {photoStages.map(stage => (
                <button
                  key={stage}
                  onClick={() => setGalleryFilter(stage)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    galleryFilter === stage ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >{stage} ({(project.photos || []).filter(p => p.stage === stage).length})</button>
              ))}
            </div>

            {/* Photo grid */}
            {filteredPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredPhotos.map(photo => (
                  <div key={photo.id} onClick={() => setViewingPhoto(photo)} className="relative rounded-2xl overflow-hidden aspect-square cursor-pointer group shadow-sm">
                    <img src={photo.url} alt={photo.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-medium truncate">{photo.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {photo.beforeAfter && (
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                            photo.beforeAfter === 'before' ? 'bg-red-500/80 text-white' :
                            photo.beforeAfter === 'after' ? 'bg-green-500/80 text-white' :
                            'bg-blue-500/80 text-white'
                          }`}>
                            {photo.beforeAfter === 'before' ? 'До' : photo.beforeAfter === 'after' ? 'После' : 'Процесс'}
                          </span>
                        )}
                        <span className="text-white/60 text-[10px]">{formatDate(photo.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <ImageIcon size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-400">Фотографий пока нет</p>
              </div>
            )}
          </div>
        )}

        {/* ========== FINANCE ========== */}
        {activeTab === 'finance' && (
          <div className="space-y-6">

            {/* Contract info */}
            {project.contractSignedAt && (
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Договор</h3>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-black text-slate-900">{formatPrice(project.contractPrice)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Подписан {formatDate(project.contractSignedAt)}</p>
                    </div>
                    <div className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase shrink-0">
                      Подписан
                    </div>
                  </div>
                  {/* Amendments */}
                  {(project.contractAmendments || []).length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Допсоглашения</p>
                      {(project.contractAmendments || []).map(a => (
                        <div key={a.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                          <div>
                            <span className="text-slate-400">{formatDate(a.date)}</span>
                            <span className="mx-1.5 line-through text-red-400">{formatPrice(a.previousPrice)}</span>
                            <span className="text-slate-300">&rarr;</span>
                            <span className="ml-1.5 font-bold text-green-700">{formatPrice(a.newPrice)}</span>
                          </div>
                          <span className="text-slate-400 max-w-[120px] truncate ml-2" title={a.reason}>{a.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Стоимость проекта</p>
                <p className="text-2xl font-black text-slate-900">{formatPrice(project.contractPrice)}</p>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                <p className="text-xs font-bold uppercase text-emerald-600 mb-1">Оплачено</p>
                <p className="text-2xl font-black text-emerald-700">{formatPrice(totalPaid)}</p>
                <p className="text-xs text-emerald-500 mt-1">
                  {project.contractPrice > 0 ? Math.round(totalPaid / project.contractPrice * 100) : 0}% от суммы
                </p>
              </div>
            </div>

            {/* Payment schedule */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">График оплаты</h3>
              <div className="space-y-3">
                {(project.paymentSchedule || []).map((ps, idx) => (
                  <div key={ps.id} className={`bg-white rounded-xl p-4 border flex items-center gap-4 ${
                    ps.status === 'paid' ? 'border-green-200' :
                    ps.status === 'overdue' ? 'border-red-200' :
                    'border-slate-100'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      ps.status === 'paid' ? 'bg-green-100 text-green-600' :
                      ps.status === 'overdue' ? 'bg-red-100 text-red-600' :
                      ps.status === 'invoiced' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {ps.status === 'paid' ? <CheckCircle size={20} /> :
                       ps.status === 'overdue' ? <Clock size={20} /> :
                       <span className="text-sm font-bold">{idx + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800">{ps.stage}</p>
                      <p className="text-xs text-slate-400">{ps.percentage}% от договора</p>
                      {ps.paidAt && <p className="text-[10px] text-green-600">Оплачено {formatDate(ps.paidAt)}</p>}
                      {ps.dueDate && ps.status !== 'paid' && <p className="text-[10px] text-slate-400">Срок: {formatDate(ps.dueDate)}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900">{formatPrice(ps.amount)}</p>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        ps.status === 'paid' ? 'bg-green-100 text-green-700' :
                        ps.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        ps.status === 'invoiced' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {ps.status === 'paid' ? 'Оплачено' :
                         ps.status === 'overdue' ? 'Просрочено' :
                         ps.status === 'invoiced' ? 'Выставлен счёт' : 'Предстоит'}
                      </span>
                    </div>
                  </div>
                ))}
                {(project.paymentSchedule || []).length === 0 && (
                  <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
                    <CreditCard size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">График оплаты пока не настроен</p>
                  </div>
                )}
              </div>
            </section>

            {/* Estimate breakdown (client-facing) */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Стоимость работ</h3>
                {project.estimateIssuedAt && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                    Выставлена {formatDate(project.estimateIssuedAt)}
                  </span>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                {clientEstimateItems.length > 0 ? (
                  <>
                    <div className="divide-y divide-slate-50">
                      {clientEstimateItems.map((item, idx) => (
                        <div key={item.id} className="px-4 py-3 flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-700">{item.name}</span>
                            <span className="text-xs text-slate-400 ml-2">{item.quantity} {item.unit} × {formatPrice(item.unitPrice)}</span>
                          </div>
                          <span className="font-bold text-sm text-slate-900 shrink-0 ml-3">{formatPrice(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                      <span className="font-bold">Итого</span>
                      <span className="text-lg font-black">{formatPrice(estimateTotal)}</span>
                    </div>
                    {project.clientEstimateNote && (
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                        <p className="text-xs text-slate-500 italic">{project.clientEstimateNote}</p>
                      </div>
                    )}
                    {/* Кнопка открытия КП */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                      <button
                        onClick={() => setShowKPPreview(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText size={16} /> Открыть коммерческое предложение
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-slate-400">Менеджер готовит коммерческое предложение</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ========== DOCS ========== */}
        {activeTab === 'docs' && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Документы проекта</h3>

            {/* КП карточка */}
            {clientEstimateItems.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">Коммерческое предложение</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">Итого: {formatPrice(estimateTotal)}</span>
                    {project.estimateIssuedAt && (
                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                        Выставлено
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowKPPreview(true)}
                  className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5">
                  <Eye size={15} /> Открыть
                </button>
              </div>
            )}

            {(project.documents || []).map(doc => (
              <div key={doc.id} className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 hover:border-emerald-200 transition-colors">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  doc.type === 'contract' ? 'bg-blue-50 text-blue-500' :
                  doc.type === 'act' ? 'bg-green-50 text-green-500' :
                  doc.type === 'invoice' ? 'bg-violet-50 text-violet-500' :
                  doc.type === 'estimate' ? 'bg-amber-50 text-amber-500' :
                  'bg-slate-50 text-slate-400'
                }`}>
                  <FileText size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{formatDate(doc.date)}</span>
                    {doc.signStatus && (
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        doc.signStatus === 'signed' ? 'bg-green-100 text-green-700' :
                        doc.signStatus === 'sent' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {doc.signStatus === 'signed' ? 'Подписан' : doc.signStatus === 'sent' ? 'На подписи' : 'Черновик'}
                      </span>
                    )}
                  </div>
                </div>
                <button className="text-emerald-500 hover:text-emerald-700 transition-colors p-2">
                  <Download size={18} />
                </button>
              </div>
            ))}
            {(project.documents || []).length === 0 && (
              <div className="text-center py-16">
                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-400">Документов пока нет</p>
              </div>
            )}
          </div>
        )}

        {/* ========== CALCULATOR ========== */}
        {activeTab === 'calc' && (
          <CalculatorHub
            onSendToChat={handleSendMessage}
            onGoToChat={() => setActiveTab('chat')}
          />
        )}

        {/* ========== NORMS ========== */}
        {activeTab === 'norms' && (
          <ConstructionReference theme="light" />
        )}

        {/* ========== CHAT ========== */}
        {activeTab === 'chat' && (
          <ChatWidget
            messages={project.chat || []}
            currentUserRole="client"
            onSendMessage={handleSendMessage}
          />
        )}
      </main>

      {/* ===== КП PREVIEW ===== */}
      {showKPPreview && (
        <CommercialProposal
          project={project}
          onClose={() => setShowKPPreview(false)}
        />
      )}

      {/* ===== FULLSCREEN PHOTO ===== */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" onClick={() => setViewingPhoto(null)}>
          <div className="flex justify-between items-center p-4 text-white">
            <div>
              <p className="font-bold">{viewingPhoto.description}</p>
              <p className="text-xs text-white/60">{viewingPhoto.stage} · {formatDateTime(viewingPhoto.timestamp)}</p>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={viewingPhoto.url} alt={viewingPhoto.description} className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};
