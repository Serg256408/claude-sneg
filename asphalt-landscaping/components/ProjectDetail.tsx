
import React, { useState, useMemo, useEffect } from 'react';
import { Project, Resource, Category, EstimateItem, ClientEstimateItem, ContractAmendment, ServiceCategory, SERVICE_CATEGORY_LABELS, WORK_TYPE_LABELS, WorkType, AsphaltWorkType, LandscapingWorkType, EarthworkType, Expense, EXPENSE_CATEGORY_LABELS, PaymentScheduleItem, formatPrice, formatDate, formatDateTime, WEATHER_LABELS, WEATHER_ICONS, generateId, WizardData, WIZARD_DEFAULTS } from '../types';
import { Plus, Trash2, BarChart2, MessageSquare, AlertTriangle, Sparkles, Wand2, Loader2, ArrowRight, FileText, Users, HardHat, Wallet, Calendar, Check, X, Clock, Eye, ChevronDown, ChevronUp, Camera, MapPin, Phone, Mail, CreditCard, Receipt, Image, Sun, CloudRain, Send, ExternalLink, Layers } from 'lucide-react';
import { CLIENT_WORK_CATALOG } from '../constants';
import { loadPriceOverrides, getRecommendedPrice } from '../services/priceListService';
import { analyzeProfitability, generateSmartEstimate, generateClientEstimateAI, generateMilestonesAI, hasApiKey } from '../services/geminiService';
import { EstimateWizard } from './EstimateWizard';
import { buildPromptFromWizard } from '../services/wizardPromptBuilder';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChatWidget } from './ChatWidget';
import { CommercialProposal } from './CommercialProposal';
import { MaterialWorkProposal } from './MaterialWorkProposal';
import { loadPricingRules } from '../services/pricingRulesService';
import { buildClientEstimate } from '../services/clientEstimateBuilder';

interface ProjectDetailProps {
  project: Project;
  resources: Resource[];
  onUpdate: (project: Project) => void;
}

const categoryLabels: Record<Category, string> = {
  [Category.MATERIAL]: 'Материалы',
  [Category.MACHINERY]: 'Техника',
  [Category.LABOR]: 'Персонал'
};

type TabId = 'estimate' | 'info' | 'foreman' | 'expenses' | 'payments' | 'chat';

const WORK_TYPES_BY_CATEGORY: Record<ServiceCategory, WorkType[]> = {
  [ServiceCategory.ASPHALT]: Object.values(AsphaltWorkType),
  [ServiceCategory.LANDSCAPING]: Object.values(LandscapingWorkType),
  [ServiceCategory.EARTHWORK]: Object.values(EarthworkType),
};

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, resources, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabId>('estimate');
  const [estimateSubTab, setEstimateSubTab] = useState<'internal' | 'client'>('internal');
  const [clientMarginPercent, setClientMarginPercent] = useState(25);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingKP, setIsGeneratingKP] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetMargin, setTargetMargin] = useState(25);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [catalogSectionByItem, setCatalogSectionByItem] = useState<Record<string, string>>({});
  const [wizardMode, setWizardMode] = useState(true);
  const [wizardData, setWizardData] = useState<WizardData>(() => {
    try {
      const saved = localStorage.getItem(`wizard_data_${project.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...WIZARD_DEFAULTS, ...parsed, works: { ...WIZARD_DEFAULTS.works, ...(parsed.works || {}) } };
      }
    } catch { /* ignore */ }
    return { ...WIZARD_DEFAULTS };
  });
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardCollapsed, setWizardCollapsed] = useState(() => {
    // Если есть сохранённые данные wizard — показать свёрнуто
    try {
      const saved = localStorage.getItem(`wizard_data_${project.id}`);
      if (saved) {
        const d = JSON.parse(saved);
        return d.area > 0;
      }
    } catch { /* ignore */ }
    return false;
  });
  // Сохранять wizardData в localStorage при изменениях
  useEffect(() => {
    try {
      const hasData = wizardData.area > 0 || (wizardData.works && Object.values(wizardData.works).some(Boolean));
      if (hasData) {
        localStorage.setItem(`wizard_data_${project.id}`, JSON.stringify(wizardData));
      }
    } catch { /* ignore */ }
  }, [wizardData, project.id]);

  const [showKPPreview, setShowKPPreview] = useState(false);
  const [showMaterialWorkPreview, setShowMaterialWorkPreview] = useState(false);
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [amendmentPrice, setAmendmentPrice] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');

  const totalCost = useMemo(() => project.items.reduce((sum, item) => sum + item.totalCost, 0), [project.items]);
  const approvedExpenses = useMemo(() => (project.expenses || []).filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0), [project.expenses]);
  const pendingExpenses = useMemo(() => (project.expenses || []).filter(e => e.status === 'pending'), [project.expenses]);
  const allCosts = totalCost + approvedExpenses;
  const profit = project.contractPrice - allCosts;
  const margin = project.contractPrice > 0 ? (profit / project.contractPrice) * 100 : 0;

  const recommendedPrice = useMemo(() => {
    if (targetMargin >= 100) return totalCost * 2;
    return Math.round(totalCost / (1 - targetMargin / 100));
  }, [totalCost, targetMargin]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    project.items.forEach(item => {
      const res = resources.find(r => r.id === item.resourceId);
      if (res) {
        categories[categoryLabels[res.category]] = (categories[categoryLabels[res.category]] || 0) + item.totalCost;
      }
    });
    if (approvedExpenses > 0) categories['Расходы бригадира'] = approvedExpenses;
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [project.items, resources, approvedExpenses]);

  const COLORS = ['#8884d8', '#ffc658', '#00C49F', '#ff7c43', '#665191'];

  const totalPaid = useMemo(() => (project.paymentSchedule || []).filter(p => p.status === 'paid').reduce((s, p) => s + (p.paidAmount || p.amount), 0), [project.paymentSchedule]);

  const tabs: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'estimate', label: 'Смета', icon: FileText },
    { id: 'info', label: 'Информация', icon: Users },
    { id: 'foreman', label: 'Бригадир', icon: HardHat, badge: (project.dailyReports || []).length },
    { id: 'expenses', label: 'Расходы', icon: Wallet, badge: pendingExpenses.length },
    { id: 'payments', label: 'Оплаты', icon: CreditCard },
    { id: 'chat', label: 'Чат', icon: MessageSquare, badge: (project.chat || []).length },
  ];

  // === Handlers ===

  const handleAddItem = (category: Category) => {
    const firstRes = resources.find(r => r.category === category);
    if (!firstRes) return;
    const newItem: EstimateItem = {
      resourceId: firstRes.id, category, quantity: 1,
      totalCost: firstRes.costPerUnit,
      customName: firstRes.name,
      customPrice: firstRes.costPerUnit,
      customUnit: firstRes.unit,
    };
    onUpdate({ ...project, items: [...project.items, newItem] });
  };

  const handleUpdateItem = (index: number, updates: Partial<EstimateItem>) => {
    const newItems = [...project.items];
    const item = { ...newItems[index], ...updates };

    // При смене ресурса — подтянуть его данные
    if (updates.resourceId) {
      const newRes = resources.find(r => r.id === updates.resourceId);
      if (newRes) {
        item.category = newRes.category;
        item.customName = newRes.name;
        item.customPrice = newRes.costPerUnit;
        item.customUnit = newRes.unit;
      }
    }

    // Расчёт итога: customPrice × quantity
    const price = item.customPrice !== undefined ? item.customPrice :
      (resources.find(r => r.id === item.resourceId)?.costPerUnit || 0);
    item.totalCost = price * (item.quantity || 0);

    newItems[index] = item;
    onUpdate({ ...project, items: newItems });
  };

  const handleDeleteItem = (index: number) => {
    onUpdate({ ...project, items: project.items.filter((_, i) => i !== index) });
  };

  const handleRunAiAnalysis = async () => {
    if (!hasApiKey()) { alert('Настройте API-ключ AI в настройках (иконка шестерёнки вверху).'); return; }
    setIsAnalyzing(true);
    try {
      const report = await analyzeProfitability(project, resources);
      setAiReport(report);
    } catch (e: any) { alert(e.message || 'Ошибка AI-анализа.'); }
    setIsAnalyzing(false);
  };

  const handleAiGenerateEstimate = async () => {
    if (!aiPrompt.trim()) return;
    if (!hasApiKey()) { alert('Настройте API-ключ AI в настройках (иконка шестерёнки вверху).'); return; }
    setIsGenerating(true);
    try {
      const result = await generateSmartEstimate(aiPrompt, resources);
      const newItems: EstimateItem[] = result.items.map((item: any) => {
        const res = resources.find(r => r.id === item.resourceId);
        return { resourceId: item.resourceId, category: res?.category || Category.MATERIAL, quantity: item.quantity, totalCost: (res?.costPerUnit || 0) * item.quantity };
      });
      onUpdate({ ...project, name: result.projectName || project.name, areaSize: result.areaSize || project.areaSize, items: newItems });
      setAiPrompt('');
    } catch (e: any) { alert(e.message || "Не удалось сгенерировать смету."); }
    finally { setIsGenerating(false); }
  };

  const handleWizardGenerate = async () => {
    if (!hasApiKey()) { alert('Настройте API-ключ AI в настройках (иконка шестерёнки вверху).'); return; }
    if (wizardData.area <= 0) { alert('Укажите площадь объекта.'); return; }
    setIsGenerating(true);
    try {
      const prompt = buildPromptFromWizard(wizardData);
      const result = await generateSmartEstimate(prompt, resources);
      const newItems: EstimateItem[] = result.items.map((item: any) => {
        const res = resources.find(r => r.id === item.resourceId);
        return { resourceId: item.resourceId, category: res?.category || Category.MATERIAL, quantity: item.quantity, totalCost: (res?.costPerUnit || 0) * item.quantity };
      });
      onUpdate({ ...project, name: result.projectName || project.name, areaSize: result.areaSize || wizardData.area, items: newItems });
      setWizardCollapsed(true);
    } catch (e: any) { alert(e.message || 'Не удалось сгенерировать смету.'); }
    finally { setIsGenerating(false); }
  };

  const handleExpenseAction = (expenseId: string, action: 'approved' | 'rejected', reason?: string) => {
    const updated = (project.expenses || []).map(e =>
      e.id === expenseId ? { ...e, status: action as Expense['status'], approvedBy: 'Менеджер', approvedAt: Date.now(), rejectionReason: reason } : e
    );
    onUpdate({ ...project, expenses: updated });
  };

  const handlePaymentStatusChange = (paymentId: string, status: PaymentScheduleItem['status']) => {
    const updated = (project.paymentSchedule || []).map(p =>
      p.id === paymentId ? { ...p, status, paidAt: status === 'paid' ? Date.now() : undefined, paidAmount: status === 'paid' ? p.amount : undefined } : p
    );
    onUpdate({ ...project, paymentSchedule: updated });
  };

  const handleAddPayment = () => {
    const newPayment: PaymentScheduleItem = {
      id: generateId(), stage: 'Новый этап', amount: 0, percentage: 0, status: 'upcoming'
    };
    onUpdate({ ...project, paymentSchedule: [...(project.paymentSchedule || []), newPayment] });
  };

  const handleUpdatePayment = (id: string, updates: Partial<PaymentScheduleItem>) => {
    const updated = (project.paymentSchedule || []).map(p => p.id === id ? { ...p, ...updates } : p);
    onUpdate({ ...project, paymentSchedule: updated });
  };

  const handleDeletePayment = (id: string) => {
    onUpdate({ ...project, paymentSchedule: (project.paymentSchedule || []).filter(p => p.id !== id) });
  };

  // --- Contract handlers ---
  const kpTotal = useMemo(() =>
    (project.clientEstimateItems || []).reduce((s, i) => s + i.totalPrice, 0),
    [project.clientEstimateItems]
  );

  const handleSignContract = () => {
    const price = kpTotal > 0 ? kpTotal : project.contractPrice;
    const contractDoc = {
      id: generateId(),
      name: `Договор от ${formatDate(Date.now())}`,
      type: 'contract' as const,
      date: Date.now(),
      signStatus: 'signed' as const,
    };
    const sysMsg = {
      id: generateId(), sender: 'Система', role: 'manager' as const,
      text: `Договор подписан на сумму ${formatPrice(price)}`, timestamp: Date.now(), isSystem: true,
    };
    onUpdate({
      ...project,
      contractPrice: price,
      contractSignedAt: Date.now(),
      documents: [...(project.documents || []), contractDoc],
      chat: [...(project.chat || []), sysMsg],
    });
  };

  const handleAddAmendment = () => {
    const newPrice = Number(amendmentPrice);
    if (!newPrice || !amendmentReason.trim()) return;
    const amendment: ContractAmendment = {
      id: generateId(),
      date: Date.now(),
      previousPrice: project.contractPrice,
      newPrice,
      reason: amendmentReason.trim(),
    };
    const sysMsg = {
      id: generateId(), sender: 'Система', role: 'manager' as const,
      text: `Допсоглашение: сумма договора изменена ${formatPrice(project.contractPrice)} → ${formatPrice(newPrice)}. Причина: ${amendmentReason.trim()}`,
      timestamp: Date.now(), isSystem: true,
    };
    onUpdate({
      ...project,
      contractPrice: newPrice,
      contractAmendments: [...(project.contractAmendments || []), amendment],
      chat: [...(project.chat || []), sysMsg],
    });
    setShowAmendmentForm(false);
    setAmendmentPrice('');
    setAmendmentReason('');
  };

  const handleCreateScheduleFromContract = () => {
    const half = Math.round(project.contractPrice / 2);
    const schedule: PaymentScheduleItem[] = [
      { id: generateId(), stage: 'Предоплата 50%', amount: half, percentage: 50, status: 'upcoming' },
      { id: generateId(), stage: 'Окончательный расчёт 50%', amount: project.contractPrice - half, percentage: 50, status: 'upcoming' },
    ];
    onUpdate({ ...project, paymentSchedule: schedule });
  };

  // --- Milestone handlers ---
  const handleAddMilestone = () => {
    const milestones = project.milestones || [];
    const newMs = {
      id: generateId(),
      title: 'Новый этап',
      description: '',
      status: 'pending' as const,
      sortOrder: milestones.length,
    };
    onUpdate({ ...project, milestones: [...milestones, newMs] });
  };

  const handleUpdateMilestone = (id: string, updates: Partial<typeof project.milestones[0]>) => {
    const updated = (project.milestones || []).map(m =>
      m.id === id ? { ...m, ...updates } : m
    );
    onUpdate({ ...project, milestones: updated });
  };

  const handleDeleteMilestone = (id: string) => {
    const filtered = (project.milestones || []).filter(m => m.id !== id);
    const reindexed = filtered.map((m, i) => ({ ...m, sortOrder: i }));
    const completedCount = reindexed.filter(m => m.status === 'completed').length;
    const progress = reindexed.length > 0 ? Math.round((completedCount / reindexed.length) * 100) : 0;
    onUpdate({ ...project, milestones: reindexed, progress });
  };

  const handleMoveMilestone = (id: string, direction: 'up' | 'down') => {
    const sorted = [...(project.milestones || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const idx = sorted.findIndex(m => m.id === id);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    const reindexed = sorted.map((m, i) => ({ ...m, sortOrder: i }));
    onUpdate({ ...project, milestones: reindexed });
  };

  const handleSetMilestoneStatus = (id: string, status: 'pending' | 'current' | 'completed') => {
    const milestones = (project.milestones || []).map(m =>
      m.id === id ? { ...m, status, date: status === 'completed' ? Date.now() : m.date } : m
    );
    const completedCount = milestones.filter(m => m.status === 'completed').length;
    const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
    onUpdate({ ...project, milestones, progress });
  };

  const handleGenerateMilestones = async () => {
    const kpItems = project.clientEstimateItems || [];
    if (kpItems.length === 0 || isGeneratingMilestones) return;
    setIsGeneratingMilestones(true);
    try {
      const aiMilestones = await generateMilestonesAI(
        kpItems.map(item => ({ name: item.name, unit: item.unit, quantity: item.quantity, section: item.section })),
        project.areaSize,
        project.name
      );
      const newMilestones = aiMilestones.map((m, i) => ({
        id: generateId(),
        title: m.title,
        description: m.description || '',
        status: (i === 0 ? 'current' : 'pending') as 'pending' | 'current' | 'completed',
        sortOrder: i,
      }));
      const completedCount = newMilestones.filter(m => m.status === 'completed').length;
      const progress = newMilestones.length > 0 ? Math.round((completedCount / newMilestones.length) * 100) : 0;
      onUpdate({ ...project, milestones: newMilestones, progress });
    } catch (e: any) {
      alert(e.message || 'Ошибка генерации этапов');
    } finally {
      setIsGeneratingMilestones(false);
    }
  };

  const handleToggleCategory = (cat: ServiceCategory) => {
    const current = project.serviceCategories || [];
    const updated = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    onUpdate({ ...project, serviceCategories: updated });
  };

  const handleToggleWorkType = (wt: WorkType) => {
    const current = project.workTypes || [];
    const updated = current.includes(wt) ? current.filter(w => w !== wt) : [...current, wt];
    onUpdate({ ...project, workTypes: updated });
  };

  const handleIssueEstimate = () => {
    const materialsCost = project.items.filter(i => i.category === Category.MATERIAL).reduce((s, i) => s + i.totalCost, 0);
    const machineryCost = project.items.filter(i => i.category === Category.MACHINERY).reduce((s, i) => s + i.totalCost, 0);
    const laborCost = project.items.filter(i => i.category === Category.LABOR).reduce((s, i) => s + i.totalCost, 0);
    const grandTotal = totalCost + approvedExpenses;

    const estimateLines = project.items.map(item => {
      const res = resources.find(r => r.id === item.resourceId);
      const name = item.customName || res?.name || item.resourceId;
      const unit = item.customUnit || res?.unit || '';
      return `• ${name}: ${item.quantity} ${unit} — ${formatPrice(item.totalCost)}`;
    }).filter(Boolean);

    if (approvedExpenses > 0) {
      estimateLines.push(`• Дополнительные расходы — ${formatPrice(approvedExpenses)}`);
    }

    const docName = `Смета №${(project.documents || []).filter(d => d.type === 'estimate').length + 1} от ${formatDate(Date.now())}.pdf`;

    const newDoc = {
      id: generateId(),
      name: docName,
      type: 'estimate' as const,
      date: Date.now(),
      signStatus: 'sent' as const,
    };

    const systemMessage = {
      id: generateId(),
      sender: 'Система',
      role: 'manager' as const,
      text: `Менеджер выставил смету на сумму ${formatPrice(grandTotal)}. Документ: ${docName}`,
      timestamp: Date.now(),
      isSystem: true,
    };

    onUpdate({
      ...project,
      estimateIssuedAt: Date.now(),
      documents: [...(project.documents || []), newDoc],
      chat: [...(project.chat || []), systemMessage],
    });

    alert(`Смета выставлена клиенту!\n\nСумма: ${formatPrice(grandTotal)}\nДокумент: ${docName}`);
  };

  const handleSendChat = (text: string, photo?: string) => {
    onUpdate({
      ...project,
      chat: [...(project.chat || []), {
        id: generateId(), sender: 'Менеджер', role: 'manager' as const, text, timestamp: Date.now(), photo
      }]
    });
  };

  // === КП для клиента ===
  const clientEstimateItems = project.clientEstimateItems || [];
  const clientEstimateTotal = useMemo(() => clientEstimateItems.reduce((s, i) => s + i.totalPrice, 0), [clientEstimateItems]);

  const catalogSections = useMemo(() => {
    const sections: string[] = [];
    CLIENT_WORK_CATALOG.forEach(ci => { if (!sections.includes(ci.section)) sections.push(ci.section); });
    return sections;
  }, []);
  const catalogBySection = useMemo(() => {
    const map: Record<string, { item: typeof CLIENT_WORK_CATALOG[0]; idx: number }[]> = {};
    CLIENT_WORK_CATALOG.forEach((ci, i) => {
      if (!map[ci.section]) map[ci.section] = [];
      map[ci.section].push({ item: ci, idx: i });
    });
    return map;
  }, []);
  const clientProfit = clientEstimateTotal - allCosts;
  const clientMargin = clientEstimateTotal > 0 ? (clientProfit / clientEstimateTotal) * 100 : 0;

  const handleAddClientItem = () => {
    const newItem: ClientEstimateItem = {
      id: generateId(),
      name: '',
      unit: 'м²',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      sortOrder: clientEstimateItems.length,
    };
    onUpdate({ ...project, clientEstimateItems: [...clientEstimateItems, newItem] });
  };

  const handleUpdateClientItem = (id: string, updates: Partial<ClientEstimateItem>) => {
    const updated = clientEstimateItems.map(item => {
      if (item.id !== id) return item;
      const merged = { ...item, ...updates };
      merged.totalPrice = merged.quantity * merged.unitPrice;
      return merged;
    });
    onUpdate({ ...project, clientEstimateItems: updated });
  };

  const handleDeleteClientItem = (id: string) => {
    onUpdate({ ...project, clientEstimateItems: clientEstimateItems.filter(i => i.id !== id) });
  };

  const handleMoveClientItem = (id: string, direction: 'up' | 'down') => {
    const idx = clientEstimateItems.findIndex(i => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= clientEstimateItems.length) return;
    const arr = [...clientEstimateItems];
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    arr.forEach((item, i) => item.sortOrder = i);
    onUpdate({ ...project, clientEstimateItems: arr });
  };

  const handleGenerateClientEstimate = () => {
    if (project.items.length === 0) {
      alert('Сначала заполните себестоимость (внутреннюю смету).');
      return;
    }

    try {
      // Если в wizardData нет площади — берём из проекта
      const wd = { ...wizardData, works: { ...wizardData.works } };
      if (wd.area <= 0 && project.areaSize > 0) {
        wd.area = project.areaSize;
      }
      // Если нет выбранных работ — включаем основание+асфальт по умолчанию
      if (!Object.values(wd.works).some(Boolean)) {
        wd.works.foundation = true;
        wd.works.asphalt = true;
      }

      const generated = buildClientEstimate(wd, project.items, clientMarginPercent);

      if (generated.length === 0) {
        alert(`Не удалось сформировать КП.\nПлощадь: ${wd.area} м²\nПроверьте ТЗ проекта.`);
        return;
      }

      onUpdate({ ...project, clientEstimateItems: generated });
      setEstimateSubTab('client');
    } catch (error: any) {
      console.error('KP build error:', error);
      alert(`Ошибка формирования КП: ${error.message || error}`);
    }
  };

  const handleIssueClientEstimate = () => {
    if (clientEstimateItems.length === 0) {
      alert('Добавьте позиции в КП для клиента.');
      return;
    }
    const docName = `КП №${(project.documents || []).filter(d => d.type === 'estimate').length + 1} от ${formatDate(Date.now())}.pdf`;
    const newDoc = { id: generateId(), name: docName, type: 'estimate' as const, date: Date.now(), signStatus: 'sent' as const };
    const systemMessage = {
      id: generateId(), sender: 'Система', role: 'manager' as const,
      text: `Менеджер выставил коммерческое предложение на сумму ${formatPrice(clientEstimateTotal)}. Документ: ${docName}`,
      timestamp: Date.now(), isSystem: true,
    };
    onUpdate({
      ...project,
      estimateIssuedAt: Date.now(),
      documents: [...(project.documents || []), newDoc],
      chat: [...(project.chat || []), systemMessage],
    });
    alert(`КП выставлено клиенту!\n\nСумма: ${formatPrice(clientEstimateTotal)}\nДокумент: ${docName}`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 flex gap-1 overflow-x-auto hide-scrollbar snap-x">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap snap-start shrink-0 ${
              activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'
              }`}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* === ESTIMATE TAB === */}
      {activeTab === 'estimate' && (
        <div className="space-y-8">
          {/* Sub-tabs: Себестоимость / КП для клиента */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setEstimateSubTab('internal')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                estimateSubTab === 'internal'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Себестоимость
            </button>
            <button
              onClick={() => setEstimateSubTab('client')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                estimateSubTab === 'client'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              КП для клиента
              {clientEstimateItems.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {clientEstimateItems.length}
                </span>
              )}
            </button>
          </div>

          {/* ===== SUB-TAB: СЕБЕСТОИМОСТЬ ===== */}
          {estimateSubTab === 'internal' && (<>
          {/* AI Generator */}
          <section className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden relative">
            {/* Заголовок — всегда видим */}
            <div
              className="flex items-center justify-between px-4 sm:px-6 py-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
              onClick={() => setWizardCollapsed(!wizardCollapsed)}
            >
              <div className="flex items-center gap-2">
                <div className="bg-orange-500 p-2 rounded-lg shrink-0"><Sparkles className="text-white" size={20} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-bold text-base sm:text-lg truncate">Умный AI-Ассистент</h3>
                  <p className="text-slate-400 text-[10px] sm:text-xs truncate">
                    {wizardCollapsed
                      ? `Шаг ${wizardStep}/3 · ${Object.values(wizardData.works).filter(Boolean).length} видов работ · ${wizardData.area || 0} м²`
                      : (wizardMode ? 'Выберите параметры — AI подберёт ресурсы' : 'Опишите задачу свободным текстом')
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!wizardCollapsed && (
                  <div className="hidden sm:flex bg-slate-800 rounded-lg p-0.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setWizardMode(true)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${wizardMode ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                      Мастер
                    </button>
                    <button onClick={() => setWizardMode(false)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!wizardMode ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                      Свободный ввод
                    </button>
                  </div>
                )}
                <button className="p-1.5 text-slate-400 hover:text-white transition-colors">
                  {wizardCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
              </div>
            </div>

            {/* Тело — сворачивается */}
            {!wizardCollapsed && (
              <div className="px-4 sm:px-6 pb-6 relative">
                {/* Mobile Toggle inside */}
                <div className="sm:hidden flex bg-slate-800 rounded-lg p-0.5 mb-4 max-w-fit">
                  <button onClick={() => setWizardMode(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex-1 ${wizardMode ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                    Мастер
                  </button>
                  <button onClick={() => setWizardMode(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex-1 ${!wizardMode ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                    Текст
                  </button>
                </div>
                
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Wand2 size={120} className="text-orange-500 rotate-12" /></div>
                <div className="relative z-10">
                  {wizardMode ? (
                    <EstimateWizard
                      data={wizardData}
                      onChange={setWizardData}
                      step={wizardStep}
                      onStepChange={setWizardStep}
                      onGenerate={handleWizardGenerate}
                      isGenerating={isGenerating}
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      <textarea
                        className="w-full bg-slate-800 border-slate-700 border rounded-xl p-3 text-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none placeholder:text-slate-500 min-h-[100px]"
                        placeholder="Пример: Нужно заасфальтировать двор 250 м2 мелкозернистым асфальтом, установить бордюры и посыпать песком."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                      />
                      <button onClick={handleAiGenerateEstimate} disabled={isGenerating || !aiPrompt.trim()}
                        className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white font-bold w-full py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                        {isGenerating ? <Loader2 className="animate-spin" /> : <><Wand2 size={20} /><span>Создать смету</span></>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ТЗ проекта — всегда видно если есть данные wizard */}
          {wizardData.area > 0 && wizardData.works && Object.values(wizardData.works).some(Boolean) && (
            <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-lg border border-slate-700 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <FileText size={16} className="text-orange-400" />
                  ТЗ проекта — {wizardData.area} м²
                </h3>
                {project.items.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">Смета сформирована</span>
                )}
              </div>

              {/* Список работ — компактно */}
              <div className="flex flex-wrap gap-1.5">
                {wizardData.works.demolition && <span className="bg-red-500/15 text-red-300 text-[10px] font-bold px-2 py-1 rounded-lg">Демонтаж</span>}
                {wizardData.works.earthwork && <span className="bg-amber-500/15 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-lg">Земляные {wizardData.excavationDepthMode === 'auto' ? `≈${Math.round(((wizardData.works.foundation ? wizardData.sandLayer + wizardData.gravelLayer : 0) + (wizardData.works.asphalt ? (wizardData.asphaltLayers === 2 ? wizardData.asphaltThickness + wizardData.asphaltBottomThickness : wizardData.asphaltThickness) : 0)) / 10)} см` : wizardData.excavationManualUnit === 'm3' ? `${wizardData.excavationVolumeM3} м³` : `${wizardData.excavationDepthCm} см`}</span>}
                {wizardData.works.foundation && <span className="bg-yellow-500/15 text-yellow-300 text-[10px] font-bold px-2 py-1 rounded-lg">Основание ({wizardData.sandLayer > 0 ? `п.${wizardData.sandLayer}` : ''}{wizardData.sandLayer > 0 && wizardData.gravelLayer > 0 ? '+' : ''}{wizardData.gravelLayer > 0 ? `щ.${wizardData.gravelLayer}` : ''} мм)</span>}
                {wizardData.works.asphalt && <span className="bg-slate-500/15 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg">Асфальт {wizardData.asphaltLayers === 2 ? `2сл ${wizardData.asphaltBottomThickness}+${wizardData.asphaltThickness}` : wizardData.asphaltThickness} мм</span>}
                {wizardData.works.curbs && <span className="bg-purple-500/15 text-purple-300 text-[10px] font-bold px-2 py-1 rounded-lg">Бордюры {wizardData.perimeterLength} п.м</span>}
                {wizardData.works.tiles && <span className="bg-cyan-500/15 text-cyan-300 text-[10px] font-bold px-2 py-1 rounded-lg">Плитка {wizardData.tileThickness} мм</span>}
                {wizardData.works.landscaping && <span className="bg-green-500/15 text-green-300 text-[10px] font-bold px-2 py-1 rounded-lg">Газон</span>}
                {wizardData.works.drainage && <span className="bg-blue-500/15 text-blue-300 text-[10px] font-bold px-2 py-1 rounded-lg">Ливнёвка</span>}
                {wizardData.soilDisposal === 'haul' && wizardData.works.earthwork && <span className="bg-orange-500/15 text-orange-300 text-[10px] font-bold px-2 py-1 rounded-lg">Вывоз грунта</span>}
                {wizardData.soilDisposal === 'spread' && wizardData.works.earthwork && <span className="bg-orange-500/15 text-orange-300 text-[10px] font-bold px-2 py-1 rounded-lg">Планировка грунта</span>}
                {wizardData.soilDisposal === 'both' && wizardData.works.earthwork && <span className="bg-orange-500/15 text-orange-300 text-[10px] font-bold px-2 py-1 rounded-lg">Вывоз + планировка</span>}
              </div>

              {/* Расчётные объёмы */}
              {(() => {
                const d2 = wizardData;
                const a = d2.area;
                const vols: { label: string; value: string; color: string }[] = [];
                if (d2.works.earthwork) {
                  let vol: number;
                  if (d2.excavationDepthMode === 'manual' && d2.excavationManualUnit === 'm3') {
                    vol = d2.excavationVolumeM3;
                  } else {
                    const depMm = d2.excavationDepthMode === 'manual' ? d2.excavationDepthCm * 10
                      : (d2.works.foundation ? d2.sandLayer + d2.gravelLayer : 0) + (d2.works.asphalt ? (d2.asphaltLayers === 2 ? d2.asphaltThickness + d2.asphaltBottomThickness : d2.asphaltThickness) : 0);
                    vol = a * (depMm / 1000) * 1.25;
                  }
                  vols.push({ label: 'Выемка грунта', value: `${Math.round(vol)} м³`, color: 'text-amber-400' });
                  vols.push({ label: 'Рейсов вывоза', value: `${Math.ceil(vol / 20)} рейс.`, color: 'text-amber-300' });
                }
                if (d2.works.foundation && d2.sandLayer > 0) {
                  vols.push({ label: 'Песок', value: `${Math.round(a * (d2.sandLayer / 1000) * 1.2)} м³`, color: 'text-yellow-400' });
                }
                if (d2.works.foundation && d2.gravelLayer > 0) {
                  vols.push({ label: 'Щебень', value: `${Math.round(a * (d2.gravelLayer / 1000) * 1.3)} м³`, color: 'text-yellow-300' });
                }
                if (d2.works.asphalt) {
                  let tons: number;
                  if (d2.asphaltLayers === 2) {
                    tons = a * (d2.asphaltThickness / 1000) * 2.5 + a * (d2.asphaltBottomThickness / 1000) * 2.5;
                  } else {
                    tons = a * (d2.asphaltThickness / 1000) * 2.5;
                  }
                  vols.push({ label: 'А/б смесь', value: `${Math.round(tons)} т`, color: 'text-slate-300' });
                  vols.push({ label: 'Доставка а/б', value: `${Math.ceil(tons / 30)} рейс.`, color: 'text-slate-400' });
                }
                if (d2.works.foundation && d2.geotextileDensity > 0) {
                  vols.push({ label: 'Геотекстиль', value: `${a} м²`, color: 'text-blue-300' });
                }
                if (vols.length === 0) return null;
                return (
                  <div className="bg-slate-800/60 rounded-xl p-3 space-y-1.5">
                    <p className="text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-1">Расчётные объёмы</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                      {vols.map((v, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">{v.label}</span>
                          <span className={`text-xs font-bold ${v.color}`}>{v.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Этапы по дням — показываем после генерации сметы */}
              {project.items.length > 0 && (() => {
                const area = wizardData.area;
                const d = wizardData;
                const phases: { name: string; days: number; color: string }[] = [];

                // Демонтаж
                if (d.works.demolition) {
                  const demoArea = area;
                  if (d.demolitionMethod === 'milling') {
                    phases.push({ name: 'Демонтаж (фрезерование)', days: Math.max(1, Math.ceil(demoArea / 800)), color: 'bg-red-500' });
                  } else {
                    phases.push({ name: 'Демонтаж (гидромолот)', days: Math.max(1, Math.ceil(demoArea / 150)), color: 'bg-red-500' });
                  }
                }

                // Выемка грунта
                if (d.works.earthwork) {
                  let volumeM3: number;
                  if (d.excavationDepthMode === 'manual' && d.excavationManualUnit === 'm3') {
                    volumeM3 = d.excavationVolumeM3;
                  } else {
                    const depthMm = d.excavationDepthMode === 'manual'
                      ? d.excavationDepthCm * 10
                      : (d.works.foundation ? d.sandLayer + d.gravelLayer : 0) + (d.works.asphalt ? (d.asphaltLayers === 2 ? d.asphaltThickness + d.asphaltBottomThickness : d.asphaltThickness) : 0);
                    volumeM3 = area * (depthMm / 1000) * 1.25;
                  }
                  phases.push({ name: `Выемка грунта (≈${Math.round(volumeM3)} м³)`, days: Math.max(1, Math.ceil(volumeM3 / 250)), color: 'bg-amber-500' });
                }

                // Основание — песок
                if (d.works.foundation && d.sandLayer > 0) {
                  const sandVol = area * (d.sandLayer / 1000) * 1.2;
                  phases.push({ name: `Укладка песка (≈${Math.round(sandVol)} м³)`, days: Math.max(1, Math.ceil(sandVol / 180)), color: 'bg-yellow-500' });
                }

                // Основание — щебень
                if (d.works.foundation && d.gravelLayer > 0) {
                  const gravelVol = area * (d.gravelLayer / 1000) * 1.3;
                  phases.push({ name: `Укладка щебня (≈${Math.round(gravelVol)} м³)`, days: Math.max(1, Math.ceil(gravelVol / 150)), color: 'bg-yellow-600' });
                }

                // Ливнёвка (параллельно с основанием, но покажем отдельно)
                if (d.works.drainage) {
                  const drainDays = Math.max(1, Math.ceil(d.drainagePipeLength / 40)) + (d.drainageNewWellCount > 0 ? d.drainageNewWellCount : 0);
                  phases.push({ name: `Ливневая канализация`, days: drainDays, color: 'bg-blue-500' });
                }

                // Бордюры
                if (d.works.curbs) {
                  phases.push({ name: `Бордюры (${d.perimeterLength} п.м)`, days: Math.max(1, Math.ceil(d.perimeterLength / 60)), color: 'bg-purple-500' });
                }

                // Асфальт
                if (d.works.asphalt) {
                  const asphaltDaysPerLayer = Math.max(1, Math.ceil(area / (d.asphaltMethod === 'paver' ? 3000 : 150)));
                  const totalLayers = d.asphaltLayers === 2 ? 2 : 1;
                  phases.push({ name: `Асфальтирование (${totalLayers} ${totalLayers === 2 ? 'слоя' : 'слой'})`, days: asphaltDaysPerLayer * totalLayers, color: 'bg-slate-500' });
                }

                // Плитка
                if (d.works.tiles) {
                  phases.push({ name: 'Укладка плитки', days: Math.max(1, Math.ceil(area / 30)), color: 'bg-cyan-500' });
                }

                // Озеленение
                if (d.works.landscaping) {
                  phases.push({ name: 'Озеленение', days: Math.max(1, Math.ceil(area / 200)), color: 'bg-green-500' });
                }

                const totalDays = phases.reduce((s, p) => s + p.days, 0);

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-orange-300 uppercase tracking-widest">Этапы работ (ориентировочно)</p>
                      <span className="text-xs text-white font-bold">≈ {totalDays} {totalDays === 1 ? 'день' : totalDays < 5 ? 'дня' : 'дней'}</span>
                    </div>
                    <div className="space-y-1">
                      {phases.map((phase, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${phase.color} shrink-0`} />
                          <span className="text-slate-300 text-xs flex-1">{phase.name}</span>
                          <span className="text-slate-400 text-xs font-bold">{phase.days} {phase.days === 1 ? 'день' : phase.days < 5 ? 'дня' : 'дней'}</span>
                        </div>
                      ))}
                    </div>
                    {/* Визуальная шкала */}
                    <div className="flex rounded-full overflow-hidden h-2 bg-slate-700">
                      {phases.map((phase, i) => (
                        <div key={i} className={`${phase.color} transition-all`} style={{ width: `${(phase.days / totalDays) * 100}%` }} title={`${phase.name}: ${phase.days} дн.`} />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Estimate items grouped by category */}
              {(() => {
                const itemsWithIdx = project.items.map((item, idx) => ({ item, idx }));
                const catConfigs: { cat: Category; label: string; color: string; bg: string; border: string }[] = [
                  { cat: Category.MATERIAL, label: 'Материалы', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
                  { cat: Category.MACHINERY, label: 'Техника', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
                  { cat: Category.LABOR, label: 'Персонал', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
                ];

                return catConfigs.map(({ cat, label, color, bg, border }) => {
                  const catItems = itemsWithIdx.filter(({ item }) => item.category === cat);
                  const catTotal = catItems.reduce((s, { item }) => s + item.totalCost, 0);

                  return (
                    <section key={cat} className={`bg-white rounded-xl shadow-sm border ${border} overflow-hidden`}>
                      {/* Заголовок категории */}
                      <div className={`${bg} px-4 py-2.5 flex items-center justify-between ${`border-b ${border}`}`}>
                        <span className={`font-bold text-xs uppercase tracking-wider ${color}`}>{label}</span>
                        <div className="flex items-center gap-3">
                          {catItems.length > 0 && (
                            <span className={`text-xs font-bold ${color} opacity-70`}>{formatPrice(catTotal)}</span>
                          )}
                          <button onClick={() => handleAddItem(cat)}
                            className={`${color} hover:opacity-80 text-xs font-bold flex items-center gap-1 transition-opacity`}>
                            <Plus size={14} /> Добавить
                          </button>
                        </div>
                      </div>

                      {/* Позиции */}
                      {catItems.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {catItems.map(({ item, idx: originalIdx }) => {
                            const res = resources.find(r => r.id === item.resourceId);
                            const filteredOptions = resources.filter(r => r.category === item.category);
                            const groupedOptions: Record<string, Resource[]> = {};
                            filteredOptions.forEach(r => {
                              const g = r.subGroup || 'Прочее';
                              if (!groupedOptions[g]) groupedOptions[g] = [];
                              groupedOptions[g].push(r);
                            });
                            const unitPrice = item.customPrice !== undefined ? item.customPrice : (res?.costPerUnit || 0);
                            const displayUnit = item.customUnit || res?.unit || '';

                            return (
                              <div key={originalIdx} className="px-4 py-2.5 hover:bg-slate-50/50 transition-colors space-y-1.5">
                                {/* Строка 1: Название (редактируемое) + выбор из справочника */}
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    className="flex-1 min-w-0 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-orange-400 p-0 pb-0.5 outline-none text-sm text-slate-700 transition-colors"
                                    value={item.customName || res?.name || ''}
                                    onChange={(e) => handleUpdateItem(originalIdx, { customName: e.target.value })}
                                    placeholder="Наименование в смете"
                                  />
                                  <select className="shrink-0 bg-slate-100 hover:bg-slate-200 border-0 rounded-lg outline-none cursor-pointer text-xs text-slate-500 px-2 py-1 transition-colors max-w-[140px]"
                                    value={item.resourceId} onChange={(e) => handleUpdateItem(originalIdx, { resourceId: e.target.value })}
                                    title="Выбрать из справочника">
                                    {Object.entries(groupedOptions).map(([group, grpItems]) => (
                                      <optgroup key={group} label={`— ${group} —`}>
                                        {grpItems.map(r => (
                                          <option key={r.id} value={r.id}>
                                            {r.name} — {r.costPerUnit.toLocaleString('ru-RU')} ₽/{r.unit}
                                          </option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                </div>

                                {/* Строка 2: Цена × Кол-во = Подытог + Удалить */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-400 mb-0.5">Цена</span>
                                    <input type="number"
                                      className="w-24 bg-white border-slate-200 border p-1.5 rounded-lg outline-none text-right focus:ring-2 focus:ring-orange-500 text-sm"
                                      value={unitPrice}
                                      onChange={(e) => handleUpdateItem(originalIdx, { customPrice: Number(e.target.value) })}
                                    />
                                  </div>
                                  <span className="text-slate-300 text-sm mt-3.5">×</span>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-400 mb-0.5">Кол-во</span>
                                    <input type="number"
                                      className="w-20 bg-white border-slate-200 border p-1.5 rounded-lg outline-none text-right focus:ring-2 focus:ring-orange-500 text-sm"
                                      value={item.quantity}
                                      onChange={(e) => handleUpdateItem(originalIdx, { quantity: Number(e.target.value) })}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-400 font-medium mt-3.5">{displayUnit}</span>
                                  <span className="text-slate-300 text-sm">=</span>
                                  <span className="font-black text-slate-800 ml-auto">{formatPrice(item.totalCost)}</span>
                                  <button onClick={() => handleDeleteItem(originalIdx)}
                                    className="text-red-300 hover:text-red-500 p-1 transition-colors ml-1" title="Удалить">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-4 py-4 text-center text-xs text-slate-300 italic">
                          Нет позиций
                        </div>
                      )}
                    </section>
                  );
                });
              })()}

              {project.items.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 bg-white">
                  Пусто. Используйте AI-помощника выше или добавьте ресурсы вручную.
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Recommended Price */}
              <section className="bg-white p-6 rounded-xl shadow-md border-t-4 border-t-orange-500 border-x border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart2 className="text-orange-500" /> Рекомендуемая цена
                </h3>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-500 font-medium">Желаемая маржа</span>
                    <span className="text-sm font-bold text-orange-600">{targetMargin}%</span>
                  </div>
                  <input type="range" min="0" max="80" step="5"
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} />
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">К предложению клиенту</p>
                  <p className="text-3xl font-black text-slate-900">{formatPrice(recommendedPrice)}</p>
                </div>
                <button onClick={() => { setClientMarginPercent(targetMargin); setEstimateSubTab('client'); }}
                  className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                  Перейти к КП <ArrowRight size={18} />
                </button>
              </section>

              {/* Profitability */}
              <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart2 className="text-blue-500" /> Рентабельность
                </h3>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-slate-500 text-sm">Себестоимость</span>
                    <span className="font-bold text-red-600">-{formatPrice(totalCost)}</span>
                  </div>
                  {approvedExpenses > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">Расходы бригадира</span>
                      <span className="font-bold text-red-600">-{formatPrice(approvedExpenses)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-slate-500 text-sm">Чистая прибыль</span>
                    <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPrice(profit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Маржа</span>
                    <span className={`text-2xl font-black ${margin > 20 ? 'text-green-600' : margin > 10 ? 'text-orange-600' : 'text-red-600'}`}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number | string | undefined) => formatPrice(Number(value || 0))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* AI Analysis */}
              <section className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Sparkles className="text-orange-400" /> AI Проверка</h3>
                  <button onClick={handleRunAiAnalysis} disabled={isAnalyzing}
                    className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white text-xs px-3 py-1 rounded transition-colors">
                    {isAnalyzing ? 'Анализирую...' : 'Запустить'}
                  </button>
                </div>
                {aiReport ? (
                  <div className="text-sm text-slate-300 leading-relaxed overflow-y-auto max-h-60">
                    {aiReport.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 opacity-50 text-center">
                    <MessageSquare className="mb-2" />
                    <p className="text-xs">Запустите анализ для советов</p>
                  </div>
                )}
              </section>

              {margin < 10 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3 text-red-800">
                  <AlertTriangle className="flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Низкая рентабельность!</p>
                    <p className="text-xs mt-1">Маржа ниже 10%. Пересмотрите затраты.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTA: Перейти к КП */}
          <section className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-2xl border-2 border-orange-200">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Send className="text-orange-500" size={18} /> Готовы выставить клиенту?
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Себестоимость: <span className="font-bold text-slate-800">{formatPrice(allCosts)}</span>.
                  Перейдите в КП, чтобы сформировать позиции для клиента.
                </p>
              </div>
              <button onClick={() => setEstimateSubTab('client')}
                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap shadow-lg active:scale-95">
                КП для клиента <ArrowRight size={18} />
              </button>
            </div>
          </section>
          </>)}

          {/* ===== SUB-TAB: КП ДЛЯ КЛИЕНТА ===== */}
          {estimateSubTab === 'client' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left column: КП items */}
              <div className="lg:col-span-2 space-y-4">
                {/* Auto-generate button */}
                <section className="bg-slate-900 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-sm flex items-center gap-2"><Sparkles size={16} className="text-orange-400" /> Генерация КП</h3>
                      <p className="text-slate-400 text-xs mt-1">Объёмы из ТЗ × прайс-лист × наценка + правила КП</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">Наценка</span>
                        <input type="number" className="w-16 bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-2 py-1.5 text-center outline-none focus:ring-2 focus:ring-orange-500"
                          value={clientMarginPercent} onChange={(e) => setClientMarginPercent(Number(e.target.value))} min={0} max={200} />
                        <span className="text-slate-400 text-xs">%</span>
                      </div>
                      <button onClick={handleGenerateClientEstimate}
                        className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2">
                        <Sparkles size={14} /> Сформировать
                      </button>
                    </div>
                  </div>
                </section>

                {/* КП items list */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                    <span className="font-bold text-sm text-slate-700">Позиции КП</span>
                    <button onClick={handleAddClientItem}
                      className="text-orange-600 hover:text-orange-500 text-xs font-bold flex items-center gap-1 transition-colors">
                      <Plus size={14} /> Добавить позицию
                    </button>
                  </div>

                  {clientEstimateItems.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {clientEstimateItems.map((item, idx) => (
                        <div key={item.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors space-y-2">
                          {/* Row 1: Name + catalog select */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold w-5 shrink-0">{idx + 1}.</span>
                            <input
                              type="text"
                              className="flex-1 min-w-0 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-orange-400 p-0 pb-0.5 outline-none text-sm text-slate-700 transition-colors"
                              value={item.name}
                              onChange={(e) => handleUpdateClientItem(item.id, { name: e.target.value })}
                              placeholder="Наименование работы"
                            />
                            <select
                              className="shrink-0 bg-slate-100 hover:bg-slate-200 border-0 rounded-lg outline-none cursor-pointer text-xs text-slate-500 px-2 py-1 transition-colors w-[130px]"
                              value={catalogSectionByItem[item.id] || ''}
                              onChange={(e) => setCatalogSectionByItem(prev => ({ ...prev, [item.id]: e.target.value }))}
                              title="Раздел работ"
                            >
                              <option value="" disabled>Раздел...</option>
                              {catalogSections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {catalogSectionByItem[item.id] && (
                              <select
                                className="shrink-0 bg-orange-50 hover:bg-orange-100 border-0 rounded-lg outline-none cursor-pointer text-xs text-orange-700 px-2 py-1 transition-colors max-w-[200px]"
                                value=""
                                onChange={(e) => {
                                  const catItem = CLIENT_WORK_CATALOG[Number(e.target.value)];
                                  if (catItem) {
                                    handleUpdateClientItem(item.id, { name: catItem.name, unit: catItem.unit, section: catItem.section });
                                    setCatalogSectionByItem(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                                  }
                                }}
                                title="Выбрать позицию"
                              >
                                <option value="" disabled>Позиция...</option>
                                {(catalogBySection[catalogSectionByItem[item.id]] || []).map(({ item: ci, idx: i }) => (
                                  <option key={i} value={i}>{ci.name} ({ci.unit})</option>
                                ))}
                              </select>
                            )}
                            <div className="flex gap-0.5 shrink-0">
                              <button onClick={() => handleMoveClientItem(item.id, 'up')} disabled={idx === 0}
                                className="p-1 text-slate-300 hover:text-slate-500 disabled:opacity-30 transition-colors">
                                <ChevronUp size={14} />
                              </button>
                              <button onClick={() => handleMoveClientItem(item.id, 'down')} disabled={idx === clientEstimateItems.length - 1}
                                className="p-1 text-slate-300 hover:text-slate-500 disabled:opacity-30 transition-colors">
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          </div>
                          {/* Row 2: Price × Qty Unit = Total + Delete */}
                          <div className="flex items-center gap-2 flex-wrap pl-7">
                            <div className="flex flex-col items-center">
                              <input type="number"
                                className="w-24 bg-white border-slate-200 border p-1.5 rounded-lg outline-none text-right focus:ring-2 focus:ring-orange-500 text-sm"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateClientItem(item.id, { unitPrice: Number(e.target.value) })}
                                placeholder="Цена"
                              />
                              <span className="text-[9px] text-slate-400 mt-0.5">Цена</span>
                            </div>
                            <span className="text-slate-300 text-sm mb-3">×</span>
                            <div className="flex flex-col items-center">
                              <input type="number"
                                className="w-20 bg-white border-slate-200 border p-1.5 rounded-lg outline-none text-right focus:ring-2 focus:ring-orange-500 text-sm"
                                value={item.quantity}
                                onChange={(e) => handleUpdateClientItem(item.id, { quantity: Number(e.target.value) })}
                                placeholder="Кол-во"
                              />
                              <span className="text-[9px] text-slate-400 mt-0.5">Кол-во</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <input type="text"
                                className="w-14 bg-white border-slate-200 border p-1.5 rounded-lg outline-none text-center focus:ring-2 focus:ring-orange-500 text-xs"
                                value={item.unit}
                                onChange={(e) => handleUpdateClientItem(item.id, { unit: e.target.value })}
                                placeholder="ед."
                              />
                              <span className="text-[9px] text-slate-400 mt-0.5">Ед.</span>
                            </div>
                            <span className="text-slate-300 text-sm mb-3">=</span>
                            <div className="flex flex-col items-end ml-auto">
                              <span className="font-black text-slate-800">{formatPrice(item.totalPrice)}</span>
                              <span className="text-[9px] text-slate-400 mt-0.5">Итого</span>
                            </div>
                            <button onClick={() => handleDeleteClientItem(item.id)}
                              className="text-red-300 hover:text-red-500 p-1 transition-colors ml-1 mb-3" title="Удалить">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-10 text-center">
                      <FileText size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Нет позиций в КП</p>
                      <p className="text-slate-300 text-xs mt-1">Добавьте вручную или сформируйте из себестоимости</p>
                    </div>
                  )}

                  {/* Total */}
                  {clientEstimateItems.length > 0 && (
                    <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                      <span className="font-bold">Итого КП</span>
                      <span className="text-xl font-black">{formatPrice(clientEstimateTotal)}</span>
                    </div>
                  )}
                </section>

                {/* Note for client */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Примечание для клиента</label>
                  <textarea
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    rows={2}
                    value={project.clientEstimateNote || ''}
                    onChange={(e) => onUpdate({ ...project, clientEstimateNote: e.target.value })}
                    placeholder="Например: Стоимость включает доставку материалов. Срок выполнения — 10 рабочих дней."
                  />
                </section>

                {/* КП условия: предоплата, сроки, гарантия */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Условия КП</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Предоплата</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                          value={project.kpPrepayment ?? 50}
                          onChange={(e) => onUpdate({ ...project, kpPrepayment: Number(e.target.value) })}
                          min={0} max={100}
                        />
                        <span className="text-sm text-slate-400 shrink-0">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Срок работ</label>
                      <input
                        type="text"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                        value={project.kpWorkDuration || ''}
                        onChange={(e) => onUpdate({ ...project, kpWorkDuration: e.target.value })}
                        placeholder="10 рабочих дней"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Гарантия</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                          value={project.kpWarranty ?? 24}
                          onChange={(e) => onUpdate({ ...project, kpWarranty: Number(e.target.value) })}
                          min={0}
                        />
                        <span className="text-sm text-slate-400 shrink-0">мес.</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Preview + Issue buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowKPPreview(true)}
                    disabled={clientEstimateItems.length === 0}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] uppercase tracking-wider"
                  >
                    <Eye size={20} />
                    Предпросмотр КП
                  </button>
                  <button
                    onClick={() => setShowMaterialWorkPreview(true)}
                    disabled={clientEstimateItems.length === 0}
                    className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-slate-300 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] uppercase tracking-wider"
                  >
                    <Layers size={20} />
                    Смета: Материалы и Работа
                  </button>
                  <button
                    onClick={handleIssueClientEstimate}
                    disabled={clientEstimateItems.length === 0}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] uppercase tracking-wider"
                  >
                    <Send size={20} />
                    {project.estimateIssuedAt ? 'Обновить КП и выставить клиенту' : 'Выставить КП клиенту'}
                  </button>
                </div>
              </div>

              {/* Right column: Margin comparison */}
              <div className="space-y-6">
                <section className="bg-white p-6 rounded-xl shadow-md border-t-4 border-t-green-500 border-x border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart2 className="text-green-500" /> Сравнение маржи
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">Себестоимость</span>
                      <span className="font-bold text-red-600">-{formatPrice(allCosts)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">КП для клиента</span>
                      <span className="font-bold text-green-600">{formatPrice(clientEstimateTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">Прибыль</span>
                      <span className={`font-bold ${clientProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPrice(clientProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Маржа</span>
                      <span className={`text-2xl font-black ${clientMargin > 20 ? 'text-green-600' : clientMargin > 10 ? 'text-orange-600' : 'text-red-600'}`}>
                        {clientMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Margin bar */}
                  <div className="mt-4 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${clientMargin > 20 ? 'bg-green-500' : clientMargin > 10 ? 'bg-orange-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.max(clientMargin, 0), 100)}%` }}
                    />
                  </div>
                </section>

                {project.estimateIssuedAt && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                      <Check size={14} /> КП выставлено {formatDate(project.estimateIssuedAt)}
                    </p>
                  </div>
                )}

                {clientMargin < 10 && clientEstimateTotal > 0 && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3 text-red-800">
                    <AlertTriangle className="flex-shrink-0" size={18} />
                    <div>
                      <p className="font-bold text-sm">Низкая маржа!</p>
                      <p className="text-xs mt-1">Увеличьте цены в КП или снизьте себестоимость.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === INFO TAB === */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><FileText className="text-blue-500" /> Основная информация</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Название объекта</label>
                <input type="text" className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={project.name} onChange={(e) => onUpdate({ ...project, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Адрес объекта</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" className="w-full border-slate-200 border p-2.5 pl-10 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={project.address} onChange={(e) => onUpdate({ ...project, address: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Менеджер</label>
                  <input type="text" className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={project.manager} onChange={(e) => onUpdate({ ...project, manager: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Площадь (м2)</label>
                  <input type="number" className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={project.areaSize} onChange={(e) => onUpdate({ ...project, areaSize: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Цена контракта</label>
                  <input type="number" className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                    value={project.contractPrice} onChange={(e) => onUpdate({ ...project, contractPrice: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Статус</label>
                  <select className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={project.status} onChange={(e) => onUpdate({ ...project, status: e.target.value as any })}>
                    <option value="draft">Черновик</option>
                    <option value="active">В работе</option>
                    <option value="paused">Приостановлен</option>
                    <option value="completed">Завершен</option>
                    <option value="cancelled">Отменён</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Client Info */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Users className="text-green-500" /> Заказчик (Клиент)</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Организация / ФИО</label>
                <input type="text" className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={project.client} onChange={(e) => onUpdate({ ...project, client: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Телефон</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="tel" className="w-full border-slate-200 border p-2.5 pl-10 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={project.clientPhone || ''} onChange={(e) => onUpdate({ ...project, clientPhone: e.target.value })} placeholder="+7 (999) 123-45-67" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="email" className="w-full border-slate-200 border p-2.5 pl-10 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={project.clientEmail || ''} onChange={(e) => onUpdate({ ...project, clientEmail: e.target.value })} placeholder="client@company.ru" />
                </div>
              </div>
            </div>
          </section>

          {/* Dates */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Calendar className="text-purple-500" /> Сроки</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Плановое начало</label>
                <input type="date" className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => onUpdate({ ...project, startDate: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Плановое окончание</label>
                <input type="date" className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => onUpdate({ ...project, endDate: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Факт. начало</label>
                <input type="date" className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={project.actualStartDate ? new Date(project.actualStartDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => onUpdate({ ...project, actualStartDate: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Факт. окончание</label>
                <input type="date" className="w-full border-slate-200 border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={project.actualEndDate ? new Date(project.actualEndDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => onUpdate({ ...project, actualEndDate: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
              </div>
            </div>
          </section>

          {/* Service Categories & Work Types */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><HardHat className="text-orange-500" /> Виды работ</h3>

            {/* Category toggles */}
            <div className="flex gap-3 mb-6">
              {Object.values(ServiceCategory).map(cat => {
                const isActive = (project.serviceCategories || []).includes(cat);
                return (
                  <button key={cat} onClick={() => handleToggleCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    {SERVICE_CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>

            {/* Work type checkboxes grouped by active category */}
            {(project.serviceCategories || []).map(cat => (
              <div key={cat} className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{SERVICE_CATEGORY_LABELS[cat]}</p>
                <div className="flex flex-wrap gap-2">
                  {WORK_TYPES_BY_CATEGORY[cat].map(wt => {
                    const isActive = (project.workTypes || []).includes(wt);
                    return (
                      <button key={wt} onClick={() => handleToggleWorkType(wt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isActive ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                        }`}>
                        {isActive && <Check size={12} className="inline mr-1" />}
                        {WORK_TYPE_LABELS[wt]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* === FOREMAN TAB === */}
      {activeTab === 'foreman' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Дневных<br/>отчётов</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{(project.dailyReports || []).length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Фото<br/>загружено</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{(project.photos || []).length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Чек-<br/>листов</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{(project.checklists || []).length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Этапы<br/>завершены</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {(project.milestones || []).filter(m => m.status === 'completed').length}/{(project.milestones || []).length}
              </p>
            </div>
          </div>

          {/* Daily Reports */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <HardHat className="text-orange-500" /> Дневные отчёты бригадира
            </h3>
            {(project.dailyReports || []).length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <HardHat size={36} className="mx-auto mb-2 opacity-30" />
                <p>Отчётов пока нет. Бригадир ещё не отправлял отчёты.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...(project.dailyReports || [])].reverse().map(report => (
                  <div key={report.id} className="border border-slate-100 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{WEATHER_ICONS[report.weather]}</span>
                        <div>
                          <p className="font-bold text-slate-800">{formatDate(report.date)}</p>
                          <p className="text-xs text-slate-400">{report.foremanName} | {WEATHER_LABELS[report.weather]} | {report.workersCount} чел.</p>
                        </div>
                      </div>
                      {expandedReport === report.id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </button>
                    {expandedReport === report.id && (
                      <div className="p-4 pt-0 border-t border-slate-100 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Выполнено</p>
                          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{report.workDone}</p>
                        </div>
                        {report.problems && (
                          <div>
                            <p className="text-xs font-bold text-red-400 uppercase mb-1">Проблемы</p>
                            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{report.problems}</p>
                          </div>
                        )}
                        {report.materialsUsed && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Материалы</p>
                            <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{report.materialsUsed}</p>
                          </div>
                        )}
                        {report.temperature !== undefined && (
                          <p className="text-xs text-slate-500">Температура: {report.temperature}°C</p>
                        )}
                        {report.photos && report.photos.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Фото ({report.photos.length})</p>
                            <div className="flex gap-2 flex-wrap">
                              {report.photos.map((url, i) => (
                                <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-80"
                                  onClick={() => setFullscreenPhoto(url)} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Milestones management */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock size={20} className="text-orange-500" /> Этапы проекта
              </h3>
              <div className="flex items-center gap-2">
                {(project.clientEstimateItems || []).length > 0 && hasApiKey() && (
                  <button onClick={handleGenerateMilestones} disabled={isGeneratingMilestones}
                    className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-400 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                    {isGeneratingMilestones ? <><Loader2 size={14} className="animate-spin" /> Генерация...</> : <><Sparkles size={14} /> Сгенерировать из КП</>}
                  </button>
                )}
                <button onClick={handleAddMilestone}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-black transition-colors">
                  <Plus size={14} /> Добавить этап
                </button>
              </div>
            </div>

            {(project.milestones || []).length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Clock size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Этапы не заданы. Добавьте первый этап.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...(project.milestones || [])]
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((ms, idx, arr) => (
                  <div key={ms.id} className={`p-4 rounded-xl border ${
                    ms.status === 'completed' ? 'bg-green-50 border-green-200' :
                    ms.status === 'current' ? 'bg-orange-50 border-orange-200' :
                    'border-slate-200'
                  }`}>
                    <div className="flex gap-3 items-start">
                      {/* Number + Reorder arrows */}
                      <div className="flex items-center gap-1 flex-shrink-0 pt-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          ms.status === 'completed' ? 'bg-green-500' :
                          ms.status === 'current' ? 'bg-orange-500' : 'bg-slate-300'
                        }`}>
                          {ms.status === 'completed' ? <Check size={14} /> : idx + 1}
                        </div>
                        <div className="flex flex-col">
                          <button onClick={() => handleMoveMilestone(ms.id, 'up')} disabled={idx === 0}
                            className="text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors p-0.5">
                            <ChevronUp size={13} />
                          </button>
                          <button onClick={() => handleMoveMilestone(ms.id, 'down')} disabled={idx === arr.length - 1}
                            className="text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors p-0.5">
                            <ChevronDown size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Editable fields */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Название</label>
                          <input type="text"
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 font-bold bg-white"
                            value={ms.title}
                            onChange={(e) => handleUpdateMilestone(ms.id, { title: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Статус</label>
                          <select
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                            value={ms.status}
                            onChange={(e) => handleSetMilestoneStatus(ms.id, e.target.value as 'pending' | 'current' | 'completed')}>
                            <option value="pending">Ожидает</option>
                            <option value="current">Текущий</option>
                            <option value="completed">Завершён</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">План. дата</label>
                          <input type="date"
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                            value={ms.plannedDate ? new Date(ms.plannedDate).toISOString().slice(0, 10) : ''}
                            onChange={(e) => handleUpdateMilestone(ms.id, {
                              plannedDate: e.target.value ? new Date(e.target.value).getTime() : undefined
                            })} />
                        </div>
                      </div>

                      {/* Delete */}
                      <button onClick={() => handleDeleteMilestone(ms.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 flex-shrink-0 mt-1">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Description row */}
                    <div className="mt-2 ml-[52px]">
                      <input type="text"
                        placeholder="Описание этапа..."
                        className="w-full border border-slate-100 rounded-lg px-2.5 py-1 text-xs text-slate-500 outline-none focus:ring-1 focus:ring-orange-500 bg-transparent"
                        value={ms.description}
                        onChange={(e) => handleUpdateMilestone(ms.id, { description: e.target.value })} />
                    </div>

                    {/* Completion info */}
                    {ms.status === 'completed' && ms.date && (
                      <div className="mt-2 ml-[52px] flex items-center gap-2 text-[10px] text-green-600">
                        <Check size={12} /> Завершён {formatDate(ms.date)}
                        {ms.completionPhoto && (
                          <img src={ms.completionPhoto} alt="" className="w-8 h-8 rounded object-cover cursor-pointer"
                            onClick={() => setFullscreenPhoto(ms.completionPhoto!)} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Progress summary */}
            {(project.milestones || []).length > 0 && (
              <div className="mt-4 p-3 rounded-lg text-sm font-medium bg-slate-50 text-slate-600 flex justify-between items-center">
                <span>Прогресс: {(project.milestones || []).filter(m => m.status === 'completed').length} из {(project.milestones || []).length} этапов</span>
                <span className="font-bold text-orange-600">{project.progress}%</span>
              </div>
            )}
          </section>

          {/* Photos gallery */}
          {(project.photos || []).length > 0 && (
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Camera className="text-blue-500" /> Фотогалерея ({project.photos.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {project.photos.map(photo => (
                  <div key={photo.id} className="relative group cursor-pointer" onClick={() => setFullscreenPhoto(photo.url)}>
                    <img src={photo.url} alt={photo.description} className="w-full h-24 rounded-lg object-cover group-hover:opacity-80 transition-opacity" />
                    {photo.beforeAfter && (
                      <span className={`absolute top-1 left-1 text-[8px] px-1.5 py-0.5 rounded font-bold ${
                        photo.beforeAfter === 'before' ? 'bg-red-500 text-white' :
                        photo.beforeAfter === 'after' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                      }`}>{photo.beforeAfter === 'before' ? 'ДО' : photo.beforeAfter === 'after' ? 'ПОСЛЕ' : 'ПРОЦЕСС'}</span>
                    )}
                    <p className="text-[9px] text-slate-400 mt-1 truncate">{photo.stage}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* === EXPENSES TAB === */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Всего<br/>расходов</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{(project.expenses || []).length}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest leading-tight">Ожидают<br/>одобрения</p>
              <p className="text-xl sm:text-2xl font-black text-orange-600 mt-1">{pendingExpenses.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
              <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest leading-tight">Одобрено<br/>в смету</p>
              <p className="text-xl sm:text-2xl font-black text-green-600 mt-1">{formatPrice(approvedExpenses)}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-tight">Отклонено<br/>менеджером</p>
              <p className="text-xl sm:text-2xl font-black text-red-600 mt-1">
                {formatPrice((project.expenses || []).filter(e => e.status === 'rejected').reduce((s, e) => s + e.amount, 0))}
              </p>
            </div>
          </div>

          {/* Pending expenses (highlight) */}
          {pendingExpenses.length > 0 && (
            <section className="bg-orange-50 p-6 rounded-xl border border-orange-200">
              <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" /> Требуют решения ({pendingExpenses.length})
              </h3>
              <div className="space-y-3">
                {pendingExpenses.map(expense => (
                  <div key={expense.id} className="bg-white p-4 rounded-xl border border-orange-100 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{EXPENSE_CATEGORY_LABELS[expense.category]}</span>
                        <span className="text-xs text-slate-400">{formatDate(expense.date)}</span>
                      </div>
                      <p className="font-bold text-slate-800">{expense.description}</p>
                      <p className="text-xl font-black text-slate-900 mt-1">{formatPrice(expense.amount)}</p>
                    </div>
                    {expense.receiptPhoto && (
                      <img src={expense.receiptPhoto} alt="Чек" className="w-16 h-16 rounded-lg object-cover cursor-pointer" onClick={() => setFullscreenPhoto(expense.receiptPhoto!)} />
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleExpenseAction(expense.id, 'approved')}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1 transition-colors">
                        <Check size={16} /> Одобрить
                      </button>
                      <button onClick={() => { const reason = prompt('Причина отклонения:'); if (reason) handleExpenseAction(expense.id, 'rejected', reason); }}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1 transition-colors">
                        <X size={16} /> Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All expenses */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Все расходы</h3>
            {(project.expenses || []).length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Wallet size={36} className="mx-auto mb-2 opacity-30" />
                <p>Расходов пока нет</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...(project.expenses || [])].reverse().map(expense => (
                  <div key={expense.id} className={`flex items-center gap-4 p-3 rounded-lg border ${
                    expense.status === 'approved' ? 'border-green-100 bg-green-50/50' :
                    expense.status === 'rejected' ? 'border-red-100 bg-red-50/50' : 'border-slate-100'
                  }`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      expense.status === 'approved' ? 'bg-green-500' : expense.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{expense.description}</p>
                      <p className="text-xs text-slate-400">{EXPENSE_CATEGORY_LABELS[expense.category]} | {formatDate(expense.date)}</p>
                    </div>
                    <p className="font-bold text-slate-800">{formatPrice(expense.amount)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      expense.status === 'approved' ? 'bg-green-100 text-green-700' :
                      expense.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>{expense.status === 'approved' ? 'Одобрено' : expense.status === 'rejected' ? 'Отклонено' : 'Ожидает'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Expense breakdown chart */}
          {(project.expenses || []).filter(e => e.status === 'approved').length > 0 && (
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Расходы по категориям</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(
                    (project.expenses || []).filter(e => e.status === 'approved').reduce((acc, e) => {
                      acc[EXPENSE_CATEGORY_LABELS[e.category]] = (acc[EXPENSE_CATEGORY_LABELS[e.category]] || 0) + e.amount;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number | string | undefined) => formatPrice(Number(value || 0))} />
                    <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Form estimate from expenses CTA */}
          <section className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-2xl border-2 border-orange-200">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="text-orange-500" /> Сформировать смету
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Одобренные расходы ({formatPrice(approvedExpenses)}) будут включены в итоговую смету вместе с позициями сметы.
                  Общая сумма: <span className="font-bold text-slate-800">{formatPrice(totalCost + approvedExpenses)}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveTab('estimate')}
                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap shadow-lg active:scale-95"
              >
                Перейти к смете <ArrowRight size={18} />
              </button>
            </div>
          </section>
        </div>
      )}

      {/* === PAYMENTS TAB === */}
      {activeTab === 'payments' && (
        <div className="space-y-6">

          {/* Contract block */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <FileText size={20} className="text-blue-500" /> Договор
            </h3>

            {project.contractSignedAt ? (
              <>
                {/* Signed contract info */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase">Договор подписан</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatPrice(project.contractPrice)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">от {formatDate(project.contractSignedAt)}</p>
                  </div>
                  <button
                    onClick={() => { setShowAmendmentForm(!showAmendmentForm); setAmendmentPrice(String(project.contractPrice)); }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <FileText size={14} /> Допсоглашение
                  </button>
                </div>

                {/* Amendment form */}
                {showAmendmentForm && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-blue-700">Новое допсоглашение</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Новая сумма договора</label>
                        <input type="number" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          value={amendmentPrice} onChange={e => setAmendmentPrice(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Причина изменения</label>
                        <input type="text" placeholder="Дополнительные работы, изменение объёмов..."
                          className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={amendmentReason} onChange={e => setAmendmentReason(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddAmendment} disabled={!amendmentPrice || !amendmentReason.trim()}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                        Сохранить
                      </button>
                      <button onClick={() => setShowAmendmentForm(false)}
                        className="text-slate-400 hover:text-slate-600 px-4 py-2 text-xs font-bold transition-colors">
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                {/* Amendments history */}
                {(project.contractAmendments || []).length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">История допсоглашений</p>
                    {(project.contractAmendments || []).map(a => (
                      <div key={a.id} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between text-sm">
                        <div>
                          <span className="text-slate-500">{formatDate(a.date)}</span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="line-through text-red-400">{formatPrice(a.previousPrice)}</span>
                          <span className="mx-1.5 text-slate-400">&rarr;</span>
                          <span className="font-bold text-green-700">{formatPrice(a.newPrice)}</span>
                        </div>
                        <span className="text-xs text-slate-400 max-w-[200px] truncate ml-3" title={a.reason}>{a.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (project.clientEstimateItems || []).length > 0 && project.estimateIssuedAt ? (
              /* KP issued but contract not signed */
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase">КП выставлено</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{formatPrice(kpTotal)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Договор ещё не подписан</p>
                </div>
                <button onClick={handleSignContract}
                  className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shrink-0 shadow-lg shadow-green-600/20">
                  <Check size={16} /> Подписать договор
                </button>
              </div>
            ) : (
              /* No KP - manual contract price */
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Сумма контракта (ручной ввод)</p>
                <div className="flex gap-3 items-end">
                  <input type="number" className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                    value={project.contractPrice} onChange={e => onUpdate({ ...project, contractPrice: Number(e.target.value) })} />
                  {project.contractPrice > 0 && !project.contractSignedAt && (
                    <button onClick={() => {
                      onUpdate({ ...project, contractSignedAt: Date.now(), documents: [...(project.documents || []), {
                        id: generateId(), name: `Договор от ${formatDate(Date.now())}`, type: 'contract' as const, date: Date.now(), signStatus: 'signed' as const,
                      }]});
                    }}
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg font-bold text-xs transition-colors shrink-0">
                      Зафиксировать
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Сумма контракта</p>
              <p className="text-2xl font-black text-slate-900">{formatPrice(project.contractPrice)}</p>
            </div>
            <div className="bg-green-50 p-5 rounded-xl border border-green-200 shadow-sm">
              <p className="text-[10px] font-bold text-green-500 uppercase">Оплачено</p>
              <p className="text-2xl font-black text-green-600">{formatPrice(totalPaid)}</p>
              <div className="h-1.5 bg-green-100 rounded-full mt-2">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${project.contractPrice > 0 ? Math.min((totalPaid / project.contractPrice) * 100, 100) : 0}%` }} />
              </div>
            </div>
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 shadow-sm">
              <p className="text-[10px] font-bold text-blue-500 uppercase">Остаток</p>
              <p className="text-2xl font-black text-blue-600">{formatPrice(project.contractPrice - totalPaid)}</p>
            </div>
          </div>

          {/* Payment schedule */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="text-blue-500" /> График оплаты
              </h3>
              <div className="flex items-center gap-2">
                {project.contractPrice > 0 && (project.paymentSchedule || []).length === 0 && (
                  <button onClick={handleCreateScheduleFromContract}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                    <Sparkles size={14} /> Создать график
                  </button>
                )}
                <button onClick={handleAddPayment}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-black transition-colors">
                  <Plus size={14} /> Добавить этап
                </button>
              </div>
            </div>

            {(project.paymentSchedule || []).length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CreditCard size={36} className="mx-auto mb-2 opacity-30" />
                <p>График оплаты не настроен</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(project.paymentSchedule || []).map((payment, idx) => (
                  <div key={payment.id} className={`p-4 rounded-xl border ${
                    payment.status === 'paid' ? 'bg-green-50 border-green-200' :
                    payment.status === 'overdue' ? 'bg-red-50 border-red-200' :
                    payment.status === 'invoiced' ? 'bg-blue-50 border-blue-200' : 'border-slate-200'
                  }`}>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          payment.status === 'paid' ? 'bg-green-500' :
                          payment.status === 'overdue' ? 'bg-red-500' :
                          payment.status === 'invoiced' ? 'bg-blue-500' : 'bg-slate-300'
                        }`}>{idx + 1}</div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Этап</label>
                          <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                            value={payment.stage} onChange={(e) => handleUpdatePayment(payment.id, { stage: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Сумма</label>
                          <input type="number" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                            value={payment.amount} onChange={(e) => {
                              const amount = Number(e.target.value);
                              const percentage = project.contractPrice > 0 ? Math.round((amount / project.contractPrice) * 100) : 0;
                              handleUpdatePayment(payment.id, { amount, percentage });
                            }} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Статус</label>
                          <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                            value={payment.status} onChange={(e) => handlePaymentStatusChange(payment.id, e.target.value as PaymentScheduleItem['status'])}>
                            <option value="upcoming">Предстоит</option>
                            <option value="invoiced">Выставлен счёт</option>
                            <option value="paid">Оплачено</option>
                            <option value="overdue">Просрочено</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-sm font-bold text-slate-500">{payment.percentage}%</span>
                          {payment.paidAt && <span className="text-[10px] text-green-600">{formatDate(payment.paidAt)}</span>}
                          <button onClick={() => handleDeletePayment(payment.id)} className="ml-auto text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total check */}
            {(project.paymentSchedule || []).length > 0 && (() => {
              const totalScheduled = (project.paymentSchedule || []).reduce((s, p) => s + p.amount, 0);
              const totalPercentage = (project.paymentSchedule || []).reduce((s, p) => s + p.percentage, 0);
              const diff = project.contractPrice - totalScheduled;
              return (
                <div className={`mt-4 p-3 rounded-lg text-sm font-medium flex justify-between ${
                  Math.abs(diff) < 1 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  <span>Итого по графику: {formatPrice(totalScheduled)} ({totalPercentage}%)</span>
                  {Math.abs(diff) >= 1 && <span>Разница: {formatPrice(diff)}</span>}
                  {Math.abs(diff) < 1 && <span>Совпадает с контрактом</span>}
                </div>
              );
            })()}
          </section>
        </div>
      )}

      {/* === CHAT TAB === */}
      {activeTab === 'chat' && (
        <ChatWidget messages={project.chat || []} currentUserRole="manager" onSendMessage={handleSendChat} />
      )}

      {/* Fullscreen photo overlay */}
      {fullscreenPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullscreenPhoto(null)}>
          <img src={fullscreenPhoto} alt="" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setFullscreenPhoto(null)}>
            <X size={32} />
          </button>
        </div>
      )}

      {/* КП Preview Modal */}
      {showKPPreview && (
        <CommercialProposal
          project={project}
          onClose={() => setShowKPPreview(false)}
          onIssue={() => {
            handleIssueClientEstimate();
            setShowKPPreview(false);
          }}
        />
      )}

      {/* Смета: Материалы и Работа */}
      {showMaterialWorkPreview && (
        <MaterialWorkProposal
          project={project}
          onClose={() => setShowMaterialWorkPreview(false)}
        />
      )}
    </div>
  );
};
