
import React, { useState, useMemo, useRef } from 'react';
import {
  Project, Expense, Milestone, ProjectPhoto, DailyReport, DailyChecklist, ChecklistItem,
  WeatherType, WEATHER_LABELS, WEATHER_ICONS, EXPENSE_CATEGORY_LABELS,
  generateId, formatPrice, formatDate, formatDateTime,
} from '../types';
import {
  Camera, Plus, CheckCircle, Clock, MapPin, DollarSign, MessageSquare,
  ChevronRight, ListChecks, Image, FileText, CloudSun, Send, Trash2,
  X, ChevronDown, AlertTriangle, Receipt, Users, Thermometer,
} from 'lucide-react';
import { ChatWidget } from './ChatWidget';

interface ForemanDashboardProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

type TabId = 'tasks' | 'photos' | 'expenses' | 'report' | 'chat';

export const ForemanDashboard: React.FC<ForemanDashboardProps> = ({ project, onUpdateProject }) => {
  const [activeTab, setActiveTab] = useState<TabId>('tasks');

  // --- Expense state ---
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ desc: '', amount: '', category: 'other' as Expense['category'] });

  // --- Photo state ---
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoForm, setPhotoForm] = useState({ description: '', stage: '', beforeAfter: 'process' as 'before' | 'after' | 'process' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Checklist state ---
  const [newTaskText, setNewTaskText] = useState('');

  // --- Daily report state ---
  const [reportForm, setReportForm] = useState<{
    weather: WeatherType;
    temperature: string;
    workersCount: string;
    workDone: string;
    problems: string;
    materialsUsed: string;
  }>({ weather: 'sunny', temperature: '', workersCount: '', workDone: '', problems: '', materialsUsed: '' });
  const [reportSent, setReportSent] = useState(false);

  // --- Fullscreen photo viewer ---
  const [viewingPhoto, setViewingPhoto] = useState<ProjectPhoto | null>(null);

  // --- Computed ---
  const currentMilestone = project.milestones.find(m => m.status === 'current');
  const milestoneOptions = project.milestones.map(m => m.title);

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayPhotos = useMemo(() =>
    (project.photos || []).filter(p => p.timestamp >= todayStart),
    [project.photos, todayStart]
  );

  const todayChecklist = useMemo(() => {
    const lists = project.checklists || [];
    return lists.find(c => c.date >= todayStart) || null;
  }, [project.checklists, todayStart]);

  const todayReport = useMemo(() => {
    const reports = project.dailyReports || [];
    return reports.find(r => r.date >= todayStart) || null;
  }, [project.dailyReports, todayStart]);

  const totalExpenses = useMemo(() =>
    (project.expenses || []).reduce((s, e) => s + e.amount, 0),
    [project.expenses]
  );

  const todayExpenses = useMemo(() =>
    (project.expenses || []).filter(e => e.date >= todayStart).reduce((s, e) => s + e.amount, 0),
    [project.expenses, todayStart]
  );

  // ========== HANDLERS ==========

  const handleUpdateMilestone = (id: string, status: Milestone['status']) => {
    const updatedMilestones = project.milestones.map(m =>
      m.id === id ? { ...m, status, date: status === 'completed' ? Date.now() : m.date } : m
    );
    const completedCount = updatedMilestones.filter(m => m.status === 'completed').length;
    const progress = Math.round((completedCount / updatedMilestones.length) * 100);

    // Add system chat message
    const milestone = project.milestones.find(m => m.id === id);
    const sysMsg = status === 'completed' && milestone ? {
      id: generateId(), sender: 'Система', role: 'foreman' as const,
      text: `Этап "${milestone.title}" завершён`, timestamp: Date.now(), isSystem: true,
    } : null;

    onUpdateProject({
      ...project,
      milestones: updatedMilestones,
      progress,
      chat: sysMsg ? [...(project.chat || []), sysMsg] : (project.chat || []),
    });
  };

  // --- Photo ---
  const handlePhotoUpload = () => {
    const stage = photoForm.stage || currentMilestone?.title || 'Общее';
    const newPhoto: ProjectPhoto = {
      id: generateId(),
      url: `https://images.unsplash.com/photo-${1621275344335 + Math.floor(Math.random() * 1000000)}?auto=format&fit=crop&q=80&w=600`,
      description: photoForm.description || 'Фото с объекта',
      uploadedBy: 'foreman',
      timestamp: Date.now(),
      stage,
      beforeAfter: photoForm.beforeAfter,
      milestoneId: currentMilestone?.id,
    };

    const sysMsg = {
      id: generateId(), sender: 'Система', role: 'foreman' as const,
      text: `Бригадир загрузил фото: ${stage}`, timestamp: Date.now(), isSystem: true,
    };

    onUpdateProject({
      ...project,
      photos: [newPhoto, ...(project.photos || [])],
      chat: [...(project.chat || []), sysMsg],
    });
    setPhotoForm({ description: '', stage: '', beforeAfter: 'process' });
    setShowPhotoModal(false);
  };

  // --- Expenses ---
  const handleAddExpense = () => {
    if (!expenseForm.desc || !expenseForm.amount) return;
    const newExp: Expense = {
      id: generateId(),
      description: expenseForm.desc,
      amount: Number(expenseForm.amount),
      date: Date.now(),
      category: expenseForm.category,
      status: 'pending',
    };
    onUpdateProject({ ...project, expenses: [newExp, ...(project.expenses || [])] });
    setExpenseForm({ desc: '', amount: '', category: 'other' });
    setShowExpenseModal(false);
  };

  // --- Checklist ---
  const handleAddChecklistItem = () => {
    if (!newTaskText.trim()) return;
    const newItem: ChecklistItem = { id: generateId(), text: newTaskText.trim(), completed: false };

    if (todayChecklist) {
      const updated = (project.checklists || []).map(c =>
        c.id === todayChecklist.id ? { ...c, items: [...c.items, newItem] } : c
      );
      onUpdateProject({ ...project, checklists: updated });
    } else {
      const newChecklist: DailyChecklist = {
        id: generateId(), date: todayStart, foremanId: 'foreman-1',
        foremanName: 'Бригадир', items: [newItem], createdAt: Date.now(),
      };
      onUpdateProject({ ...project, checklists: [...(project.checklists || []), newChecklist] });
    }
    setNewTaskText('');
  };

  const handleToggleChecklistItem = (itemId: string) => {
    if (!todayChecklist) return;
    const updated = (project.checklists || []).map(c =>
      c.id === todayChecklist.id ? {
        ...c,
        items: c.items.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed, completedAt: !item.completed ? Date.now() : undefined } : item
        ),
      } : c
    );
    onUpdateProject({ ...project, checklists: updated });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (!todayChecklist) return;
    const updated = (project.checklists || []).map(c =>
      c.id === todayChecklist.id ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
    );
    onUpdateProject({ ...project, checklists: updated });
  };

  // --- Daily Report ---
  const handleSendReport = () => {
    if (!reportForm.workDone.trim()) return;
    const report: DailyReport = {
      id: generateId(),
      date: todayStart,
      foremanId: 'foreman-1',
      foremanName: 'Бригадир',
      weather: reportForm.weather,
      temperature: reportForm.temperature ? Number(reportForm.temperature) : undefined,
      workersCount: Number(reportForm.workersCount) || 0,
      workDone: reportForm.workDone,
      problems: reportForm.problems || undefined,
      materialsUsed: reportForm.materialsUsed || undefined,
      photos: todayPhotos.map(p => p.url),
      createdAt: Date.now(),
    };

    const sysMsg = {
      id: generateId(), sender: 'Система', role: 'foreman' as const,
      text: `Бригадир отправил дневной отчёт`, timestamp: Date.now(), isSystem: true,
    };

    onUpdateProject({
      ...project,
      dailyReports: [...(project.dailyReports || []), report],
      chat: [...(project.chat || []), sysMsg],
    });
    setReportSent(true);
  };

  // ========== TABS CONFIG ==========
  const tabs: { id: TabId; label: string; icon: React.FC<any> }[] = [
    { id: 'tasks', label: 'Задачи', icon: ListChecks },
    { id: 'photos', label: 'Фото', icon: Image },
    { id: 'expenses', label: 'Расходы', icon: Receipt },
    { id: 'report', label: 'Отчёт', icon: CloudSun },
    { id: 'chat', label: 'Чат', icon: MessageSquare },
  ];

  const unreadChat = (project.chat || []).filter(m => m.role !== 'foreman' && !(m.readBy || []).includes('foreman')).length;

  // ========== RENDER ==========
  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-24 font-sans">
      {/* ===== HEADER ===== */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-b-[2rem] shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black tracking-tight truncate">{project.name}</h2>
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
              <MapPin size={12} className="text-orange-500 shrink-0" />
              <span className="truncate">{project.address}</span>
            </p>
          </div>
          <button
            onClick={() => setShowPhotoModal(true)}
            className="bg-orange-600 p-3 rounded-2xl shadow-lg shadow-orange-900/40 hover:bg-orange-500 active:scale-95 transition-all ml-3 shrink-0"
          >
            <Camera size={22} />
          </button>
        </div>

        {/* Progress */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Прогресс</span>
            <span className="font-bold text-orange-400">{project.progress}%</span>
          </div>
          <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-700" style={{ width: `${project.progress}%` }} />
          </div>
          {currentMilestone && (
            <p className="text-xs text-orange-300 mt-2 flex items-center gap-1">
              <Clock size={10} /> Сейчас: {currentMilestone.title}
            </p>
          )}
        </div>
      </header>

      {/* ===== TABS NAV ===== */}
      <nav className="flex justify-between px-3 py-3 -mt-4 relative z-10 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-2xl transition-all relative ${
              activeTab === tab.id
                ? 'bg-white shadow-md text-slate-900 scale-105'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={18} />
            <span className="text-[9px] font-bold uppercase">{tab.label}</span>
            {tab.id === 'chat' && unreadChat > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unreadChat}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ===== CONTENT ===== */}
      <main className="px-4">

        {/* ========== TAB: TASKS ========== */}
        {activeTab === 'tasks' && (
          <div className="space-y-5">
            {/* Today's Checklist */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Чек-лист на сегодня
              </h3>

              {/* Add task */}
              <div className="flex gap-2 mb-3">
                <input
                  placeholder="Добавить задачу..."
                  className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                />
                <button
                  onClick={handleAddChecklistItem}
                  className="bg-orange-600 text-white px-4 rounded-xl hover:bg-orange-500 active:scale-95 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* Checklist items */}
              {todayChecklist && todayChecklist.items.length > 0 ? (
                <div className="space-y-2">
                  {todayChecklist.items.map(item => (
                    <div
                      key={item.id}
                      className={`bg-white p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                        item.completed ? 'border-green-200 bg-green-50/50' : 'border-slate-100'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleChecklistItem(item.id)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                          item.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-slate-300 hover:border-orange-400'
                        }`}
                      >
                        {item.completed && <CheckCircle size={14} />}
                      </button>
                      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                        {item.text}
                      </span>
                      <button onClick={() => handleDeleteChecklistItem(item.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 text-center pt-1">
                    {todayChecklist.items.filter(i => i.completed).length} / {todayChecklist.items.length} выполнено
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
                  <ListChecks size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Задач пока нет. Добавьте первую!</p>
                </div>
              )}
            </section>

            {/* Milestones */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Этапы проекта</h3>
              <div className="space-y-3">
                {project.milestones.map(m => (
                  <div key={m.id} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 transition-all ${
                    m.status === 'completed' ? 'border-green-500 opacity-70' :
                    m.status === 'current' ? 'border-orange-500 ring-2 ring-orange-500/10' : 'border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm">{m.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                        {m.date && <p className="text-[10px] text-green-600 mt-1">Завершён: {formatDate(m.date)}</p>}
                      </div>
                      {m.status === 'completed' ? (
                        <div className="bg-green-100 text-green-600 p-1.5 rounded-full"><CheckCircle size={18} /></div>
                      ) : m.status === 'current' ? (
                        <button
                          onClick={() => handleUpdateMilestone(m.id, 'completed')}
                          className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-200 active:scale-95 transition-all"
                        >
                          Завершить
                        </button>
                      ) : (
                        <div className="text-slate-300"><Clock size={18} /></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ========== TAB: PHOTOS ========== */}
        {activeTab === 'photos' && (
          <div className="space-y-5">
            {/* Upload button */}
            <button
              onClick={() => setShowPhotoModal(true)}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-500 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all text-lg"
            >
              <Camera size={24} /> Сфотографировать
            </button>

            {/* Today's photos */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Сегодня загружено: {todayPhotos.length}
              </h3>
              {todayPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {todayPhotos.map(photo => (
                    <div
                      key={photo.id}
                      onClick={() => setViewingPhoto(photo)}
                      className="relative rounded-2xl overflow-hidden aspect-square shadow-sm cursor-pointer group"
                    >
                      <img src={photo.url} alt={photo.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <p className="text-white text-xs font-medium truncate">{photo.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                            photo.beforeAfter === 'before' ? 'bg-red-500/80 text-white' :
                            photo.beforeAfter === 'after' ? 'bg-green-500/80 text-white' :
                            'bg-blue-500/80 text-white'
                          }`}>
                            {photo.beforeAfter === 'before' ? 'До' : photo.beforeAfter === 'after' ? 'После' : 'Процесс'}
                          </span>
                          <span className="text-white/60 text-[10px]">{photo.stage}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
                  <Image size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Пока нет фото за сегодня</p>
                </div>
              )}
            </div>

            {/* All photos */}
            {(project.photos || []).length > todayPhotos.length && (
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  Все фото проекта: {(project.photos || []).length}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(project.photos || []).filter(p => p.timestamp < todayStart).slice(0, 9).map(photo => (
                    <div
                      key={photo.id}
                      onClick={() => setViewingPhoto(photo)}
                      className="rounded-xl overflow-hidden aspect-square cursor-pointer"
                    >
                      <img src={photo.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== TAB: EXPENSES ========== */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Сегодня</p>
                <p className="text-lg font-black text-slate-900">{formatPrice(todayExpenses)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">За проект</p>
                <p className="text-lg font-black text-slate-900">{formatPrice(totalExpenses)}</p>
              </div>
            </div>

            {/* Add button */}
            <button
              onClick={() => setShowExpenseModal(true)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
            >
              <Plus size={20} /> Новый расход
            </button>

            {/* Expense list */}
            <div className="space-y-2">
              {(project.expenses || []).map(exp => (
                <div key={exp.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      exp.category === 'fuel' ? 'bg-amber-50 text-amber-500' :
                      exp.category === 'materials' ? 'bg-blue-50 text-blue-500' :
                      exp.category === 'food' ? 'bg-green-50 text-green-500' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      <Receipt size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{exp.description}</p>
                      <p className="text-[10px] text-slate-400">
                        {formatDate(exp.date)} · {EXPENSE_CATEGORY_LABELS[exp.category]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-black text-slate-900 text-sm">{formatPrice(exp.amount)}</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      exp.status === 'approved' ? 'bg-green-100 text-green-700' :
                      exp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {exp.status === 'approved' ? 'Одобрен' : exp.status === 'rejected' ? 'Отклонён' : 'На проверке'}
                    </span>
                  </div>
                </div>
              ))}
              {(project.expenses || []).length === 0 && (
                <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
                  <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Расходов пока нет</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== TAB: DAILY REPORT ========== */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            {todayReport || reportSent ? (
              <div className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center">
                <CheckCircle size={40} className="mx-auto text-green-500 mb-3" />
                <h3 className="text-lg font-bold text-green-800">Отчёт отправлен!</h3>
                <p className="text-sm text-green-600 mt-1">
                  Менеджер и заказчик получили информацию о ходе работ
                </p>
                {todayReport && (
                  <div className="mt-4 text-left bg-white rounded-xl p-4 text-sm space-y-2">
                    <p><span className="font-bold">Погода:</span> {WEATHER_ICONS[todayReport.weather]} {WEATHER_LABELS[todayReport.weather]}</p>
                    <p><span className="font-bold">Рабочих:</span> {todayReport.workersCount} чел.</p>
                    <p><span className="font-bold">Выполнено:</span> {todayReport.workDone}</p>
                    {todayReport.problems && <p><span className="font-bold text-red-600">Проблемы:</span> {todayReport.problems}</p>}
                  </div>
                )}
              </div>
            ) : (
              <>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Дневной отчёт</h3>

                {/* Weather */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Погода</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(WEATHER_LABELS) as WeatherType[]).map(w => (
                      <button
                        key={w}
                        onClick={() => setReportForm({ ...reportForm, weather: w })}
                        className={`py-2 rounded-xl text-center transition-all text-sm ${
                          reportForm.weather === w
                            ? 'bg-orange-100 border-2 border-orange-400 font-bold'
                            : 'bg-slate-50 border-2 border-transparent hover:border-slate-200'
                        }`}
                      >
                        <span className="text-lg">{WEATHER_ICONS[w]}</span>
                        <span className="block text-[10px] mt-0.5">{WEATHER_LABELS[w]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Workers & Temperature */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                      <Users size={12} /> Рабочих
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full text-2xl font-black text-center outline-none"
                      value={reportForm.workersCount}
                      onChange={e => setReportForm({ ...reportForm, workersCount: e.target.value })}
                    />
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                      <Thermometer size={12} /> Темп. °C
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full text-2xl font-black text-center outline-none"
                      value={reportForm.temperature}
                      onChange={e => setReportForm({ ...reportForm, temperature: e.target.value })}
                    />
                  </div>
                </div>

                {/* Work done */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Что сделано за день *</label>
                  <textarea
                    placeholder="Подготовили основание, уложили 50м² щебня..."
                    className="w-full h-24 outline-none resize-none text-sm"
                    value={reportForm.workDone}
                    onChange={e => setReportForm({ ...reportForm, workDone: e.target.value })}
                  />
                </div>

                {/* Problems */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                    <AlertTriangle size={12} /> Проблемы / задержки
                  </label>
                  <textarea
                    placeholder="Если есть проблемы — опишите"
                    className="w-full h-20 outline-none resize-none text-sm"
                    value={reportForm.problems}
                    onChange={e => setReportForm({ ...reportForm, problems: e.target.value })}
                  />
                </div>

                {/* Materials used */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Использованные материалы</label>
                  <textarea
                    placeholder="Щебень 5т, асфальт 3т..."
                    className="w-full h-16 outline-none resize-none text-sm"
                    value={reportForm.materialsUsed}
                    onChange={e => setReportForm({ ...reportForm, materialsUsed: e.target.value })}
                  />
                </div>

                {/* Photos attached */}
                {todayPhotos.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 flex items-center gap-2">
                    <Image size={16} />
                    К отчёту будет прикреплено {todayPhotos.length} фото за сегодня
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSendReport}
                  disabled={!reportForm.workDone.trim()}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                    reportForm.workDone.trim()
                      ? 'bg-green-600 text-white active:scale-[0.98] hover:bg-green-500'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={20} /> Отправить отчёт
                </button>
              </>
            )}
          </div>
        )}

        {/* ========== TAB: CHAT ========== */}
        {activeTab === 'chat' && (
          <div className="-mx-4">
            <ChatWidget
              messages={project.chat || []}
              currentUserRole="foreman"
              onSendMessage={(text, photo) => onUpdateProject({
                ...project,
                chat: [...(project.chat || []), {
                  id: generateId(), sender: 'Бригадир', role: 'foreman', text, timestamp: Date.now(), photo,
                }],
              })}
            />
          </div>
        )}
      </main>

      {/* ===== MODAL: Photo Upload ===== */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slideUp">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Загрузить фото</h3>
              <button onClick={() => setShowPhotoModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              {/* Before/After/Process */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Тип фото</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['before', 'process', 'after'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setPhotoForm({ ...photoForm, beforeAfter: type })}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                        photoForm.beforeAfter === type
                          ? type === 'before' ? 'bg-red-100 border-2 border-red-400 text-red-700' :
                            type === 'after' ? 'bg-green-100 border-2 border-green-400 text-green-700' :
                            'bg-blue-100 border-2 border-blue-400 text-blue-700'
                          : 'bg-slate-50 border-2 border-transparent text-slate-500'
                      }`}
                    >
                      {type === 'before' ? 'До' : type === 'after' ? 'После' : 'Процесс'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Этап работ</label>
                <select
                  className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-orange-500"
                  value={photoForm.stage}
                  onChange={e => setPhotoForm({ ...photoForm, stage: e.target.value })}
                >
                  <option value="">— Текущий этап —</option>
                  {milestoneOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Description */}
              <input
                placeholder="Описание (опционально)"
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-orange-500"
                value={photoForm.description}
                onChange={e => setPhotoForm({ ...photoForm, description: e.target.value })}
              />

              {/* Hidden file input (for future real upload) */}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" />

              <div className="flex gap-3">
                <button onClick={() => setShowPhotoModal(false)} className="flex-1 py-3 font-bold text-slate-400 rounded-xl hover:bg-slate-50">Отмена</button>
                <button
                  onClick={handlePhotoUpload}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-500 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Camera size={18} /> Загрузить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Expense ===== */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slideUp">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Новый расход</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <input
                placeholder="Что купили?"
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-orange-500"
                value={expenseForm.desc}
                onChange={e => setExpenseForm({ ...expenseForm, desc: e.target.value })}
              />
              <input
                type="number"
                placeholder="Сумма в рублях"
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-orange-500"
                value={expenseForm.amount}
                onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              />
              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Категория</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fuel', 'materials', 'food', 'transport', 'tools', 'other'] as Expense['category'][]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setExpenseForm({ ...expenseForm, category: cat })}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        expenseForm.category === cat
                          ? 'bg-orange-100 border-2 border-orange-400 text-orange-700'
                          : 'bg-slate-50 border-2 border-transparent text-slate-500'
                      }`}
                    >
                      {EXPENSE_CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowExpenseModal(false)} className="flex-1 py-3 font-bold text-slate-400">Отмена</button>
                <button onClick={handleAddExpense} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-500 active:scale-95 transition-all">
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FULLSCREEN PHOTO VIEWER ===== */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col" onClick={() => setViewingPhoto(null)}>
          <div className="flex justify-between items-center p-4 text-white">
            <div>
              <p className="font-bold">{viewingPhoto.description}</p>
              <p className="text-xs text-white/60">{viewingPhoto.stage} · {formatDateTime(viewingPhoto.timestamp)}</p>
            </div>
            <button className="p-2"><X size={24} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={viewingPhoto.url} alt={viewingPhoto.description} className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
        </div>
      )}

      {/* CSS for slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
};
