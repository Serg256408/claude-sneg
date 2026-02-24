
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, BookOpen, FileText, BarChart3, TrendingUp, Users, LogOut, HardHat, Briefcase, UserCircle, Plus, Wallet, AlertCircle, ChevronDown, Settings, Key, X, ExternalLink, Menu } from 'lucide-react';
import { Project, Resource, UserRole, Milestone, ServiceCategory, AsphaltWorkType, formatPrice } from './types';
import { INITIAL_RESOURCES, MOCK_PROJECT } from './constants';
import { ProjectList } from './components/ProjectList';
import { DirectoryManager } from './components/DirectoryManager';
import { ProjectDetail } from './components/ProjectDetail';
import { ForemanDashboard } from './components/ForemanDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { getApiKey, setApiKey, hasApiKey, getProvider, setProvider, getGrokKey, setGrokKey, getGroqKey, setGroqKey, AIProvider } from './services/geminiService';

// Версия справочника ресурсов — увеличить при обновлении INITIAL_RESOURCES
const RESOURCES_VERSION = 5;

const App: React.FC = () => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'directories' | 'detail'>('dashboard');

  const [resources, setResources] = useState<Resource[]>(() => {
    const savedVersion = localStorage.getItem('asphalt_resources_version');
    const saved = localStorage.getItem('asphalt_resources');

    if (savedVersion && Number(savedVersion) >= RESOURCES_VERSION && saved) {
      return JSON.parse(saved);
    }

    // Новая версия — умное слияние: сохраняем пользовательские цены
    localStorage.setItem('asphalt_resources_version', String(RESOURCES_VERSION));

    if (saved) {
      const oldResources: Resource[] = JSON.parse(saved);
      const oldMap = new Map<string, Resource>();
      oldResources.forEach(r => oldMap.set(r.id, r));

      // Берём новый справочник, но для существующих ресурсов сохраняем ВСЕ пользовательские правки (имя, цена, ед.изм.)
      const merged = INITIAL_RESOURCES.map(r => {
        const userRes = oldMap.get(r.id);
        if (userRes) {
          // Сохраняем пользовательские данные, но добавляем новые поля из обновлённого справочника
          return { ...r, name: userRes.name, costPerUnit: userRes.costPerUnit, unit: userRes.unit };
        }
        return r;
      });

      // Добавляем пользовательские ресурсы, которых нет в INITIAL_RESOURCES
      const initialIds = new Set(INITIAL_RESOURCES.map(r => r.id));
      const customResources = oldResources.filter(r => !initialIds.has(r.id));

      return [...merged, ...customResources];
    }

    return INITIAL_RESOURCES;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('asphalt_projects_v3');
    if (saved) {
      return JSON.parse(saved).map((p: Project) => ({
        ...p,
        clientEstimateItems: p.clientEstimateItems || [],
        contractAmendments: p.contractAmendments || [],
        milestones: (p.milestones || []).map((m: any, i: number) => ({
          ...m,
          sortOrder: m.sortOrder ?? i,
        })),
      }));
    }
    return [MOCK_PROJECT];
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<AIProvider>(getProvider());
  const [grokKeyInput, setGrokKeyInput] = useState(getGrokKey());
  const [groqKeyInput, setGroqKeyInput] = useState(getGroqKey());
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());

  useEffect(() => {
    localStorage.setItem('asphalt_resources', JSON.stringify(resources));
    localStorage.setItem('asphalt_resources_version', String(RESOURCES_VERSION));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem('asphalt_projects_v3', JSON.stringify(projects));
  }, [projects]);

  const activeProject = useMemo(() =>
    projects.find(p => p.id === activeProjectId) || null
  , [projects, activeProjectId]);

  const globalStats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'active');
    const totalRevenue = projects.reduce((sum, p) => sum + p.contractPrice, 0);
    const totalCost = projects.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.totalCost, 0), 0);
    const totalExpenses = projects.reduce((sum, p) => sum + (p.expenses || []).filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0), 0);
    const pendingExpenses = projects.reduce((sum, p) => sum + (p.expenses || []).filter(e => e.status === 'pending').length, 0);
    const totalPhotos = projects.reduce((sum, p) => sum + (p.photos || []).length, 0);
    return {
      activeCount: activeProjects.length,
      totalProjects: projects.length,
      revenue: totalRevenue,
      cost: totalCost + totalExpenses,
      profit: totalRevenue - totalCost - totalExpenses,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCost - totalExpenses) / totalRevenue * 100).toFixed(1) : '0',
      pendingExpenses,
      totalPhotos,
    };
  }, [projects]);

  const handleAddProject = () => {
    const defaultMilestones: Milestone[] = [
      { id: 'm1', title: 'Подготовка', description: 'Разметка, снятие грунта', status: 'current', sortOrder: 0 },
      { id: 'm2', title: 'Основание', description: 'Песок, щебень, уплотнение', status: 'pending', sortOrder: 1 },
      { id: 'm3', title: 'Асфальтирование', description: 'Укладка слоев асфальта', status: 'pending', sortOrder: 2 },
      { id: 'm4', title: 'Завершение', description: 'Уборка, сдача объекта', status: 'pending', sortOrder: 3 }
    ];

    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Новый объект',
      manager: 'Алексей Смирнов',
      client: 'Новый Заказчик',
      clientPhone: '',
      address: '',
      areaSize: 0,
      contractPrice: 0,
      items: [],
      status: 'draft',
      progress: 0,
      createdAt: Date.now(),
      milestones: defaultMilestones,
      chat: [],
      expenses: [],
      photos: [],
      documents: [],
      serviceCategories: [ServiceCategory.ASPHALT],
      workTypes: [AsphaltWorkType.PAVING],
      checklists: [],
      dailyReports: [],
      paymentSchedule: [],
      materialDeliveries: [],
      clientEstimateItems: [],
      contractAmendments: [],
    };
    setProjects([newProject, ...projects]);
    setActiveProjectId(newProject.id);
    setActiveTab('detail');
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Удалить проект?')) {
      setProjects(projects.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    }
  };

  // Project selector component for foreman/client
  const ProjectSelector = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 animate-slideUp" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
        <h3 className="text-lg font-bold text-slate-800 mb-4">Выберите объект</h3>
        <div className="space-y-2">
          {projects.filter(p => p.status === 'active' || p.status === 'draft').map(p => (
            <button key={p.id} onClick={() => { setActiveProjectId(p.id); onClose(); }}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                activeProjectId === p.id ? 'bg-orange-50 border-orange-300' : 'border-slate-200 hover:bg-slate-50'
              }`}>
              <p className="font-bold text-slate-800">{p.name}</p>
              <p className="text-xs text-slate-500 mt-1">{p.client} | {p.address || 'Адрес не указан'}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${p.progress}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{p.progress}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (!currentUserRole) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-4xl w-full relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-black text-white mb-4 tracking-tighter uppercase italic">
              Asphalt<span className="text-orange-500">Pro</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium">Интеллектуальная экосистема благоустройства</p>
            <p className="text-slate-600 text-xs mt-2 font-bold uppercase tracking-widest">by Транском</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <button
              onClick={() => setCurrentUserRole('manager')}
              className="bg-white/5 hover:bg-white/10 border border-white/10 p-10 rounded-[3rem] flex flex-col items-center transition-all hover:-translate-y-2 group shadow-2xl"
            >
              <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-lg shadow-blue-900/50 group-hover:rotate-12 transition-transform">
                <Briefcase size={40} />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Менеджер</h3>
              <p className="text-slate-500 text-center text-sm leading-relaxed">Сметы, финансы и управление всеми объектами компании</p>
            </button>

            <button
              onClick={() => setCurrentUserRole('foreman')}
              className="bg-white/5 hover:bg-white/10 border border-white/10 p-10 rounded-[3rem] flex flex-col items-center transition-all hover:-translate-y-2 group shadow-2xl"
            >
              <div className="w-24 h-24 bg-orange-600 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-lg shadow-orange-900/50 group-hover:-rotate-12 transition-transform">
                <HardHat size={40} />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Бригадир</h3>
              <p className="text-slate-500 text-center text-sm leading-relaxed">Мобильный терминал: вехи, фотоотчеты и наличные расходы</p>
            </button>

            <button
              onClick={() => setCurrentUserRole('client')}
              className="bg-white/5 hover:bg-white/10 border border-white/10 p-10 rounded-[3rem] flex flex-col items-center transition-all hover:-translate-y-2 group shadow-2xl"
            >
              <div className="w-24 h-24 bg-green-600 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-lg shadow-green-900/50 group-hover:scale-110 transition-transform">
                <UserCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Заказчик</h3>
              <p className="text-slate-500 text-center text-sm leading-relaxed">Премиальный опыт: живая лента, документы и AI-отчеты</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentUserRole === 'client') {
    return (
      <>
        <ClientDashboard 
          project={activeProject || MOCK_PROJECT} 
          resources={resources} 
          onUpdateProject={handleUpdateProject}
          onLogout={() => setCurrentUserRole(null)}
          onChangeProject={projects.length > 1 ? () => setShowProjectSelector(true) : undefined}
        />
        {showProjectSelector && <ProjectSelector onClose={() => setShowProjectSelector(false)} />}
      </>
    );
  }

  if (currentUserRole === 'foreman') {
    return (
      <>
        <ForemanDashboard 
          project={activeProject || MOCK_PROJECT} 
          onUpdateProject={handleUpdateProject}
          onLogout={() => setCurrentUserRole(null)}
          onChangeProject={projects.length > 1 ? () => setShowProjectSelector(true) : undefined}
        />
        {showProjectSelector && <ProjectSelector onClose={() => setShowProjectSelector(false)} />}
      </>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#F1F5F9] md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-[#0F172A] text-white flex-col p-6 shadow-2xl z-40">
        <div className="mb-12">
          <h1 className="text-3xl font-black italic tracking-tighter text-orange-500">AsphaltPro</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mt-2">Executive Office</p>
        </div>

        <nav className="flex-1 space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Дашборд' },
            { id: 'directories', icon: BookOpen, label: 'Справочники' },
            { id: 'detail', icon: FileText, label: 'Текущий проект' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${
                activeTab === item.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Pending alerts */}
        {globalStats.pendingExpenses > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-4">
            <p className="text-orange-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={14} />
              {globalStats.pendingExpenses} расходов ждут одобрения
            </p>
          </div>
        )}

        <div className="mt-auto space-y-4">
          <button
            onClick={handleAddProject}
            className="w-full bg-white text-slate-900 py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-100 transition-all active:scale-95"
          >
            <Plus size={18} /> Создать объект
          </button>
          <button onClick={() => setCurrentUserRole(null)} className="w-full flex items-center gap-2 text-slate-500 hover:text-white transition-colors py-2 px-5 text-sm font-bold">
            <LogOut size={18} /> Выйти из системы
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] text-white flex justify-between items-end px-2 py-2 pb-safe z-40 shadow-[0_-4px_25px_rgba(0,0,0,0.15)]">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Дашборд' },
          { id: 'directories', icon: BookOpen, label: 'Справочник' },
          { id: 'detail', icon: FileText, label: 'Проект' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 w-20 py-2 rounded-2xl transition-all relative ${
              activeTab === item.id ? 'text-orange-500 scale-105' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <item.icon size={22} className={activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
        {/* Logout on mobile */}
        <button
          onClick={() => setCurrentUserRole(null)}
          className="flex flex-col items-center gap-1 w-16 py-2 text-slate-500 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Выход</span>
        </button>
      </nav>

      {/* Mobile Add FAB */}
      {activeTab === 'dashboard' && (
        <button
          onClick={handleAddProject}
          className="md:hidden fixed bottom-20 right-4 z-40 bg-orange-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-orange-900/40 hover:bg-orange-500 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      )}

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <header className="bg-white/80 backdrop-blur-md border-b px-4 sm:px-10 py-4 sm:py-6 sticky top-0 z-30 flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {activeTab === 'dashboard' ? 'Глобальный Дашборд' : activeTab === 'directories' ? 'Управление Ресурсами' : 'Редактор Проекта'}
          </h2>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Авторизован как</p>
              <p className="text-sm font-bold text-slate-700">Алексей Смирнов</p>
            </div>
            <button onClick={() => { setCurrentProvider(getProvider()); setGrokKeyInput(getGrokKey()); setGroqKeyInput(getGroqKey()); setShowSettings(true); }}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-colors ${hasApiKey() ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-orange-50 text-orange-500 border-orange-200 hover:bg-orange-100'}`}
              title="Настройки AI">
              <Settings size={20} />
            </button>
            <div className="hidden sm:flex w-12 h-12 bg-slate-100 rounded-2xl items-center justify-center text-slate-400 border border-slate-200"><Users size={24} /></div>
          </div>
        </header>

        <div className="p-4 sm:p-10 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              {/* Global Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 {[
                   { label: 'Объектов в работе', value: `${globalStats.activeCount} / ${globalStats.totalProjects}`, icon: HardHat, color: 'text-orange-600', bg: 'bg-orange-100' },
                   { label: 'Общая выручка', value: formatPrice(globalStats.revenue), icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100' },
                   { label: 'Чистая прибыль', value: formatPrice(globalStats.profit), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
                   { label: 'Средняя маржа', value: `${globalStats.margin}%`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100' },
                 ].map((stat, i) => (
                   <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center gap-5">
                      <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner`}><stat.icon size={28} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-xl font-black text-slate-900">{stat.value}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <ProjectList projects={projects} onSelect={(id) => { setActiveProjectId(id); setActiveTab('detail'); }} onDelete={handleDeleteProject} />
            </div>
          )}

          {activeTab === 'directories' && <DirectoryManager resources={resources} setResources={setResources} />}
          {activeTab === 'detail' && activeProject && <ProjectDetail project={activeProject} resources={resources} onUpdate={handleUpdateProject} />}

          {activeTab === 'detail' && !activeProject && (
            <div className="text-center py-40">
              <div className="w-32 h-32 bg-slate-200 rounded-[3rem] flex items-center justify-center text-slate-400 mx-auto mb-6"><FileText size={48} /></div>
              <h3 className="text-2xl font-black text-slate-800">Проект не выбран</h3>
              <p className="text-slate-500 mt-2">Выберите объект в дашборде или создайте новый</p>
              <button onClick={() => setActiveTab('dashboard')} className="mt-8 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-xl">Вернуться к списку</button>
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Settings size={20} className="text-orange-500" /> Настройки AI</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Provider toggle */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">AI-провайдер</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCurrentProvider('groq'); setProvider('groq'); }}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${currentProvider === 'groq' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    Groq (бесплатно)
                  </button>
                  <button
                    onClick={() => { setCurrentProvider('grok'); setProvider('grok'); }}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${currentProvider === 'grok' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    xAI Grok
                  </button>
                </div>
              </div>

              {/* Groq key */}
              {currentProvider === 'groq' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">API-ключ Groq</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="password" className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        value={groqKeyInput} onChange={e => setGroqKeyInput(e.target.value)} placeholder="gsk_..." />
                    </div>
                    <button onClick={() => { setGroqKey(groqKeyInput); setShowSettings(false); }}
                      className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap">
                      Сохранить
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 mt-3">
                    <p className="text-xs font-bold text-slate-600">Как получить ключ:</p>
                    <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                      <li>Зайдите на <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-medium">console.groq.com <ExternalLink size={10} className="inline" /></a></li>
                      <li>Зарегистрируйтесь (через Google/GitHub)</li>
                      <li>Создайте API Key (начинается с gsk_...)</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Grok (xAI) key */}
              {currentProvider === 'grok' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">API-ключ xAI Grok</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="password" className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        value={grokKeyInput} onChange={e => setGrokKeyInput(e.target.value)} placeholder="xai-..." />
                    </div>
                    <button onClick={() => { setGrokKey(grokKeyInput); setShowSettings(false); }}
                      className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap">
                      Сохранить
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 mt-3">
                    <p className="text-xs font-bold text-slate-600">Как получить ключ:</p>
                    <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                      <li>Зайдите на <a href="https://console.x.ai" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-medium">console.x.ai <ExternalLink size={10} className="inline" /></a></li>
                      <li>Зарегистрируйтесь и пополните баланс</li>
                      <li>Создайте API Key (начинается с xai-...)</li>
                    </ol>
                  </div>
                </div>
              )}

              {hasApiKey() && (
                <div className="flex items-center gap-2 text-green-600 text-xs font-bold">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  AI подключён: {currentProvider === 'grok' ? 'xAI Grok' : 'Groq (Llama 3.3)'}
                </div>
              )}
              {!hasApiKey() && (
                <div className="flex items-center gap-2 text-orange-500 text-xs font-bold">
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                  Введите API-ключ для {currentProvider === 'grok' ? 'xAI Grok' : 'Groq'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
