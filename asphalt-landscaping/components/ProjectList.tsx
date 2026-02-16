
import React, { useState, useMemo } from 'react';
import { Project, ServiceCategory, SERVICE_CATEGORY_LABELS, formatPrice, formatDate } from '../types';
import { Trash2, ExternalLink, Calendar, MapPin, User, Search, Filter, SortAsc, SortDesc, ChevronDown, HardHat, TrendingUp, Clock, Image, BarChart3 } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Черновик', color: 'text-slate-600', bg: 'bg-slate-100' },
  active: { label: 'В работе', color: 'text-blue-700', bg: 'bg-blue-100' },
  completed: { label: 'Завершен', color: 'text-green-700', bg: 'bg-green-100' },
  paused: { label: 'Приостановлен', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  cancelled: { label: 'Отменён', color: 'text-red-700', bg: 'bg-red-100' },
};

type SortKey = 'date' | 'margin' | 'progress' | 'price';

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelect, onDelete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDesc, setSortDesc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSorted = useMemo(() => {
    let result = [...projects];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.manager.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(p => (p.serviceCategories || []).includes(categoryFilter as ServiceCategory));
    }

    // Sort
    result.sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case 'date':
          diff = a.createdAt - b.createdAt;
          break;
        case 'margin': {
          const costA = a.items.reduce((s, i) => s + i.totalCost, 0);
          const costB = b.items.reduce((s, i) => s + i.totalCost, 0);
          const marginA = a.contractPrice > 0 ? (a.contractPrice - costA) / a.contractPrice : 0;
          const marginB = b.contractPrice > 0 ? (b.contractPrice - costB) / b.contractPrice : 0;
          diff = marginA - marginB;
          break;
        }
        case 'progress':
          diff = a.progress - b.progress;
          break;
        case 'price':
          diff = a.contractPrice - b.contractPrice;
          break;
      }
      return sortDesc ? -diff : diff;
    });

    return result;
  }, [projects, searchQuery, statusFilter, categoryFilter, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-200">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4"><HardHat size={36} /></div>
        <h3 className="text-lg font-bold text-slate-600">Объекты не найдены</h3>
        <p className="text-slate-400 mt-2">Начните с создания нового объекта.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию, клиенту, адресу..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Toggle filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showFilters ? 'bg-orange-50 border-orange-200 text-orange-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            Фильтры
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Sort buttons */}
          <div className="flex gap-1">
            {([
              { key: 'date' as SortKey, label: 'Дата', icon: Calendar },
              { key: 'margin' as SortKey, label: 'Маржа', icon: TrendingUp },
              { key: 'progress' as SortKey, label: 'Прогресс', icon: BarChart3 },
              { key: 'price' as SortKey, label: 'Цена', icon: Clock },
            ]).map(s => (
              <button
                key={s.key}
                onClick={() => toggleSort(s.key)}
                className={`flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  sortKey === s.key ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {s.label}
                {sortKey === s.key && (sortDesc ? <SortDesc size={12} /> : <SortAsc size={12} />)}
              </button>
            ))}
          </div>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
            {/* Status filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Статус</label>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Все статусы</option>
                {Object.entries(statusMap).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            {/* Category filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Категория</label>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Все категории</option>
                {Object.entries(SERVICE_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Results count */}
            <div className="flex items-end ml-auto">
              <span className="text-xs text-slate-400">
                Найдено: <span className="font-bold text-slate-600">{filteredAndSorted.length}</span> из {projects.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Project Cards Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Search size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Ничего не найдено</p>
          <p className="text-slate-400 text-sm mt-1">Попробуйте изменить параметры поиска</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSorted.map((project) => {
            const totalCost = project.items.reduce((sum, item) => sum + item.totalCost, 0);
            const approvedExpenses = (project.expenses || []).filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
            const allCosts = totalCost + approvedExpenses;
            const profit = project.contractPrice - allCosts;
            const margin = project.contractPrice > 0 ? (profit / project.contractPrice) * 100 : 0;
            const status = statusMap[project.status] || statusMap.draft;
            const latestPhoto = (project.photos || []).length > 0 ? project.photos[project.photos.length - 1] : null;
            const completedMilestones = (project.milestones || []).filter(m => m.status === 'completed').length;
            const totalMilestones = (project.milestones || []).length;
            const categories = (project.serviceCategories || []).map(c => SERVICE_CATEGORY_LABELS[c]).filter(Boolean);
            const daysLeft = project.endDate ? Math.ceil((project.endDate - Date.now()) / 86400000) : null;

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all group flex flex-col overflow-hidden"
              >
                {/* Photo header or gradient */}
                <div className="h-32 relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                  {latestPhoto && (
                    <img src={latestPhoto.url} alt="" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Status badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                    className="absolute top-3 right-3 text-white/40 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Project name overlay */}
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-white font-bold text-base truncate">{project.name}</h3>
                    {categories.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {categories.map((c, i) => (
                          <span key={i} className="text-[9px] bg-white/20 text-white/80 px-1.5 py-0.5 rounded font-medium">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Прогресс</span>
                      <span className="text-xs font-bold text-slate-600">{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          project.progress >= 100 ? 'bg-green-500' : project.progress >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(project.progress, 100)}%` }}
                      />
                    </div>
                    {totalMilestones > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1">Этапы: {completedMilestones} из {totalMilestones}</p>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 text-sm text-slate-500 mb-4 flex-1">
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-slate-400" />
                      <span className="truncate">{project.client}</span>
                    </div>
                    {project.address && (
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-slate-400" />
                        <span className="truncate">{project.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{formatDate(project.createdAt)}</span>
                      {daysLeft !== null && daysLeft > 0 && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium ml-auto">
                          {daysLeft} дн. до срока
                        </span>
                      )}
                      {daysLeft !== null && daysLeft <= 0 && project.status === 'active' && (
                        <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold ml-auto">
                          Просрочен
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial summary */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Контракт</p>
                      <p className="font-bold text-slate-800 text-sm">{(project.contractPrice / 1000).toFixed(0)}к</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Расходы</p>
                      <p className="font-bold text-slate-800 text-sm">{(allCosts / 1000).toFixed(0)}к</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Маржа</p>
                      <p className={`font-black text-sm ${margin > 20 ? 'text-green-600' : margin > 10 ? 'text-orange-600' : 'text-red-600'}`}>
                        {margin.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Activity indicators */}
                  <div className="flex gap-2 mt-3">
                    {(project.photos || []).length > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Image size={10} /> {project.photos.length}
                      </span>
                    )}
                    {(project.dailyReports || []).length > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <HardHat size={10} /> {project.dailyReports.length} отч.
                      </span>
                    )}
                    {(project.expenses || []).filter(e => e.status === 'pending').length > 0 && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                        {project.expenses.filter(e => e.status === 'pending').length} расх. ждут
                      </span>
                    )}
                  </div>
                </div>

                {/* Open button */}
                <button
                  onClick={() => onSelect(project.id)}
                  className="w-full bg-slate-50 border-t py-3.5 rounded-b-2xl flex items-center justify-center gap-2 text-slate-600 hover:bg-orange-50 hover:text-orange-600 font-bold text-sm transition-colors"
                >
                  Открыть проект
                  <ExternalLink size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
