
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Project, ClientEstimateItem, formatPrice, formatDate } from '../types';
import { splitMaterialWork, MaterialWorkItem } from '../services/materialWorkSplitter';
import { X, Printer, Download, Share2, MessageCircle, Send, Mail, Copy, Check, Phone, MapPin, Ruler } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface MaterialWorkProposalProps {
  project: Project;
  onClose: () => void;
}

interface SectionGroup {
  sectionName: string;
  items: MaterialWorkItem[];
  subtotalMaterials: number;
  subtotalWork: number;
  subtotal: number;
}

const COMPANY_INFO = {
  name: 'ООО "Транском"',
  brand: 'AsphaltPro',
  inn: '7712345678',
  kpp: '771201001',
  address: 'г. Москва, ул. Строителей, д. 10, оф. 205',
  phone: '+7 (495) 123-45-67',
  email: 'info@transkom.ru',
};

const SECTION_ORDER = [
  'Земляные работы',
  'Устройство основания',
  'Асфальтирование',
  'Благоустройство',
  'Озеленение',
  'Инженерные сети',
  'Прочие работы',
];

export const MaterialWorkProposal: React.FC<MaterialWorkProposalProps> = ({ project, onClose }) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); setShowShareMenu(false); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (!showShareMenu) return;
    const handler = () => setShowShareMenu(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showShareMenu]);

  // Разбивка КП на материалы и работу
  const splitData = useMemo(
    () => splitMaterialWork(project.clientEstimateItems || [], project.items || []),
    [project.clientEstimateItems, project.items]
  );

  // Группировка по разделам
  const groupedSections = useMemo(() => {
    const sectionMap = new Map<string, MaterialWorkItem[]>();

    splitData.items.forEach(item => {
      const section = item.section || 'Прочие работы';
      if (!sectionMap.has(section)) sectionMap.set(section, []);
      sectionMap.get(section)!.push(item);
    });

    const groups: SectionGroup[] = [];
    const usedSections = new Set<string>();

    SECTION_ORDER.forEach(sectionName => {
      if (sectionMap.has(sectionName)) {
        const items = sectionMap.get(sectionName)!;
        groups.push({
          sectionName,
          items,
          subtotalMaterials: items.reduce((sum, i) => sum + i.materialTotal, 0),
          subtotalWork: items.reduce((sum, i) => sum + i.workTotal, 0),
          subtotal: items.reduce((sum, i) => sum + i.total, 0),
        });
        usedSections.add(sectionName);
      }
    });

    sectionMap.forEach((items, sectionName) => {
      if (!usedSections.has(sectionName)) {
        groups.push({
          sectionName,
          items,
          subtotalMaterials: items.reduce((sum, i) => sum + i.materialTotal, 0),
          subtotalWork: items.reduce((sum, i) => sum + i.workTotal, 0),
          subtotal: items.reduce((sum, i) => sum + i.total, 0),
        });
      }
    });

    return groups;
  }, [splitData.items]);

  const kpNumber = useMemo(() => {
    const estimateDocs = (project.documents || []).filter(d => d.type === 'estimate');
    return `С-${String(estimateDocs.length + 1).padStart(3, '0')}`;
  }, [project.documents]);

  const kpDate = formatDate(Date.now());

  const handleSavePdf = useCallback(async () => {
    const el = document.getElementById('mw-document');
    if (!el || savingPdf) return;
    setSavingPdf(true);
    try {
      await html2pdf().set({
        margin: [8, 8, 8, 8],
        filename: `Смета_МиР_${project.name.replace(/[^а-яА-ЯёЁa-zA-Z0-9 ]/g, '').trim()}_${kpDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(el).save();
    } catch (e) {
      console.error('PDF save error:', e);
    } finally {
      setSavingPdf(false);
    }
  }, [project.name, kpDate, savingPdf]);

  const shareText = useMemo(() => {
    const lines = [
      `Смета (материалы + работа) ${kpNumber}`,
      `Объект: ${project.name}`,
      project.address ? `Адрес: ${project.address}` : '',
      '',
      `Материалы: ${formatPrice(splitData.totalMaterials)}`,
      `Работа: ${formatPrice(splitData.totalWork)}`,
      `Итого: ${formatPrice(splitData.grandTotal)}`,
      '',
      COMPANY_INFO.name,
      `Тел.: ${COMPANY_INFO.phone}`,
    ];
    return lines.filter(Boolean).join('\n');
  }, [kpNumber, project.name, project.address, splitData]);

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };
  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(shareText)}`, '_blank');
  };
  const handleShareEmail = () => {
    const subject = `Смета ${kpNumber} — ${project.name}`;
    window.open(`mailto:${project.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`, '_self');
  };
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#mw-overlay) { display: none !important; }
          #mw-overlay { position: static !important; overflow: visible !important; background: white !important; }
          #mw-toolbar { display: none !important; }
          #mw-document {
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page { size: A4 landscape; margin: 8mm; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div id="mw-overlay" className="fixed inset-0 z-50 bg-slate-200 overflow-y-auto">
        {/* Toolbar */}
        <div id="mw-toolbar" className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <X size={20} />
            </button>
            <h3 className="font-bold text-slate-700 text-sm sm:text-base">Смета: Материалы и Работа</h3>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => window.print()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5">
              <Printer size={16} /> <span className="hidden sm:inline">Печать</span>
            </button>
            <button onClick={handleSavePdf} disabled={savingPdf}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/20">
              <Download size={16} /> {savingPdf ? 'Сохраняю...' : <><span className="hidden sm:inline">Сохранить</span> PDF</>}
            </button>
            {/* Поделиться */}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowShareMenu(!showShareMenu); }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5">
                <Share2 size={16} /> <span className="hidden sm:inline">Поделиться</span>
              </button>
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-20" onClick={e => e.stopPropagation()}>
                  <button onClick={handleShareWhatsApp}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-3 transition-colors">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><MessageCircle size={16} className="text-green-600" /></div>
                    WhatsApp
                  </button>
                  <button onClick={handleShareTelegram}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Send size={16} className="text-blue-600" /></div>
                    Telegram
                  </button>
                  <button onClick={handleShareEmail}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 flex items-center gap-3 transition-colors">
                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center"><Mail size={16} className="text-violet-600" /></div>
                    Email
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button onClick={handleCopyText}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-500" />}
                    </div>
                    {copied ? 'Скопировано!' : 'Скопировать текст'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* A4 Landscape Document */}
        <div id="mw-document" className="max-w-[297mm] mx-auto my-6 sm:my-8 bg-white shadow-2xl rounded-lg p-6 sm:p-8 md:p-[15mm]">

          {/* ═══ HEADER ═══ */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-[3px] border-slate-800">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Asphalt<span className="text-orange-500">Pro</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-0.5">
                {COMPANY_INFO.name}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-sm sm:text-lg font-black text-slate-800 uppercase tracking-wider">
                Смета<br />Материалы и Работа
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                {kpNumber} от {kpDate}
              </p>
            </div>
          </div>

          {/* ═══ КЛИЕНТ + ОБЪЕКТ ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Заказчик</p>
              <p className="text-base font-bold text-slate-800">{project.client || 'Не указан'}</p>
              {project.clientPhone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Phone size={11} /> {project.clientPhone}
                </p>
              )}
              {project.clientEmail && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Mail size={11} /> {project.clientEmail}
                </p>
              )}
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Объект</p>
              <p className="text-base font-bold text-slate-800 flex items-start gap-1">
                <MapPin size={16} className="shrink-0 mt-1 text-slate-400" />
                {project.address || 'Не указан'}
              </p>
              {project.areaSize > 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Ruler size={11} /> Площадь: {project.areaSize.toLocaleString('ru-RU')} м²
                </p>
              )}
            </div>
          </div>

          {/* ═══ ТАБЛИЦА ═══ */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="py-2 px-2 text-left w-8 font-bold rounded-tl-lg">№</th>
                  <th className="py-2 px-2 text-left font-bold">Наименование работ и затрат</th>
                  <th className="py-2 px-2 text-center w-12 font-bold">Ед.</th>
                  <th className="py-2 px-2 text-right w-14 font-bold">Кол-во</th>
                  <th className="py-2 px-2 text-right w-28 font-bold bg-blue-800/50" colSpan={1}>Материалы</th>
                  <th className="py-2 px-2 text-right w-28 font-bold bg-amber-800/40" colSpan={1}>Работа</th>
                  <th className="py-2 px-2 text-right w-28 font-bold rounded-tr-lg">Итого</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let rowNum = 0;
                  return groupedSections.map((section, sIdx) => (
                    <React.Fragment key={sIdx}>
                      {/* Заголовок раздела */}
                      <tr className="bg-orange-50 border-t-2 border-orange-200">
                        <td colSpan={7} className="py-2 px-2 font-black text-orange-700 uppercase text-[10px] tracking-wider">
                          {section.sectionName}
                        </td>
                      </tr>
                      {/* Позиции */}
                      {section.items.map((item) => {
                        rowNum++;
                        return (
                          <tr key={rowNum} className={`border-b border-slate-100 ${rowNum % 2 === 0 ? 'bg-slate-50/40' : ''}`}>
                            <td className="py-1.5 px-2 text-slate-400 text-center">{rowNum}</td>
                            <td className="py-1.5 px-2 text-slate-700">{item.name}</td>
                            <td className="py-1.5 px-2 text-center text-slate-500">{item.unit}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums">{item.quantity}</td>
                            <td className="py-1.5 px-2 text-right bg-blue-50/50">
                              <div className="text-blue-700 tabular-nums font-medium">{formatPrice(item.materialTotal)}</div>
                              <div className="text-[9px] text-blue-400 tabular-nums">{formatPrice(item.materialUnitPrice)}/{item.unit}</div>
                            </td>
                            <td className="py-1.5 px-2 text-right bg-amber-50/50">
                              <div className="text-amber-700 tabular-nums font-medium">{formatPrice(item.workTotal)}</div>
                              <div className="text-[9px] text-amber-400 tabular-nums">{formatPrice(item.workUnitPrice)}/{item.unit}</div>
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold tabular-nums">{formatPrice(item.total)}</td>
                          </tr>
                        );
                      })}
                      {/* Итого по разделу */}
                      {groupedSections.length > 1 && (
                        <tr className="border-b-2 border-slate-200">
                          <td colSpan={4} className="py-1.5 px-2 text-right text-[10px] font-bold text-slate-500 italic">
                            Итого «{section.sectionName}»:
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-blue-700 tabular-nums text-[11px] bg-blue-50/30">
                            {formatPrice(section.subtotalMaterials)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-amber-700 tabular-nums text-[11px] bg-amber-50/30">
                            {formatPrice(section.subtotalWork)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-black text-slate-700 tabular-nums text-[11px]">
                            {formatPrice(section.subtotal)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* ═══ ИТОГО ═══ */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-600 text-white rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-1">Материалы</p>
              <p className="text-xl font-black tabular-nums">{formatPrice(splitData.totalMaterials)}</p>
            </div>
            <div className="bg-amber-600 text-white rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200 mb-1">Работа</p>
              <p className="text-xl font-black tabular-nums">{formatPrice(splitData.totalWork)}</p>
            </div>
            <div className="bg-slate-900 text-white rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">Итого</p>
              <p className="text-xl font-black tabular-nums">{formatPrice(splitData.grandTotal)}</p>
            </div>
          </div>

          {/* ═══ ПРИМЕЧАНИЕ ═══ */}
          {project.clientEstimateNote && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Примечание</p>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{project.clientEstimateNote}</p>
            </div>
          )}

          {/* ═══ ПОДПИСЬ ═══ */}
          <div className="border-t-2 border-slate-200 pt-6 mt-6">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-sm font-bold text-slate-700">С уважением,</p>
                <p className="text-sm text-slate-600 mt-0.5">{project.manager || 'Менеджер проекта'}</p>
                <p className="text-xs text-slate-400">{COMPANY_INFO.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 mb-8">Подпись</p>
                <div className="border-b border-slate-400 w-40 sm:w-48 mb-1" />
                <p className="text-[10px] text-slate-500">/ {project.manager || '________________'} /</p>
              </div>
            </div>
          </div>

          {/* ═══ РЕКВИЗИТЫ ═══ */}
          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
            <p className="font-bold text-slate-500">{COMPANY_INFO.name} | ИНН {COMPANY_INFO.inn} | КПП {COMPANY_INFO.kpp}</p>
            <p className="mt-0.5">{COMPANY_INFO.address}</p>
            <p className="mt-0.5">
              Тел.: {COMPANY_INFO.phone} | {COMPANY_INFO.email}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
