
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Project, ClientEstimateItem, formatPrice, formatDate } from '../types';
import { X, Printer, Send, FileText, Phone, Mail, MapPin, Ruler, Download, Share2, MessageCircle, Copy, Check } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface CommercialProposalProps {
  project: Project;
  onClose: () => void;
  onIssue?: () => void;
}

interface SectionGroup {
  sectionName: string;
  items: ClientEstimateItem[];
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
  validityDays: 30,
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

export const CommercialProposal: React.FC<CommercialProposalProps> = ({ project, onClose, onIssue }) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);

  // Escape для закрытия
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); setShowShareMenu(false); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Закрыть меню при клике вне
  useEffect(() => {
    if (!showShareMenu) return;
    const handler = () => setShowShareMenu(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showShareMenu]);

  // Группировка позиций по разделам
  const groupedSections = useMemo(() => {
    const sectionMap = new Map<string, ClientEstimateItem[]>();
    const sorted = [...(project.clientEstimateItems || [])].sort((a, b) => a.sortOrder - b.sortOrder);

    sorted.forEach(item => {
      const section = item.section || 'Прочие работы';
      if (!sectionMap.has(section)) sectionMap.set(section, []);
      sectionMap.get(section)!.push(item);
    });

    const groups: SectionGroup[] = [];
    const usedSections = new Set<string>();

    SECTION_ORDER.forEach(sectionName => {
      if (sectionMap.has(sectionName)) {
        const items = sectionMap.get(sectionName)!;
        groups.push({ sectionName, items, subtotal: items.reduce((sum, i) => sum + i.totalPrice, 0) });
        usedSections.add(sectionName);
      }
    });

    sectionMap.forEach((items, sectionName) => {
      if (!usedSections.has(sectionName)) {
        groups.push({ sectionName, items, subtotal: items.reduce((sum, i) => sum + i.totalPrice, 0) });
      }
    });

    return groups;
  }, [project.clientEstimateItems]);

  const grandTotal = useMemo(
    () => (project.clientEstimateItems || []).reduce((s, i) => s + i.totalPrice, 0),
    [project.clientEstimateItems]
  );

  const kpNumber = useMemo(() => {
    const estimateDocs = (project.documents || []).filter(d => d.type === 'estimate');
    return `КП-${String(estimateDocs.length + 1).padStart(3, '0')}`;
  }, [project.documents]);

  const kpDate = formatDate(Date.now());

  // Сохранить как PDF-файл
  const handleSavePdf = useCallback(async () => {
    const el = document.getElementById('kp-document');
    if (!el || savingPdf) return;
    setSavingPdf(true);
    try {
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `КП_${project.name.replace(/[^а-яА-ЯёЁa-zA-Z0-9 ]/g, '').trim()}_${kpDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(el).save();
    } catch (e) {
      console.error('PDF save error:', e);
    } finally {
      setSavingPdf(false);
    }
  }, [project.name, kpDate, savingPdf]);

  // Текст для шаринга
  const shareText = useMemo(() => {
    const lines = [
      `Коммерческое предложение ${kpNumber}`,
      `Объект: ${project.name}`,
      project.address ? `Адрес: ${project.address}` : '',
      `Итого: ${formatPrice(grandTotal)}`,
      '',
      `${COMPANY_INFO.name}`,
      `Тел.: ${COMPANY_INFO.phone}`,
    ];
    return lines.filter(Boolean).join('\n');
  }, [kpNumber, project.name, project.address, grandTotal]);

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };
  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(shareText)}`, '_blank');
  };
  const handleShareEmail = () => {
    const subject = `Коммерческое предложение ${kpNumber} — ${project.name}`;
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
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#kp-overlay) { display: none !important; }
          #kp-overlay { position: static !important; overflow: visible !important; background: white !important; }
          #kp-toolbar { display: none !important; }
          #kp-document {
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page { size: A4; margin: 10mm; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* Overlay */}
      <div id="kp-overlay" className="fixed inset-0 z-50 bg-slate-200 overflow-y-auto">
        {/* Toolbar */}
        <div id="kp-toolbar" className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <X size={20} />
            </button>
            <h3 className="font-bold text-slate-700 text-sm sm:text-base">Предпросмотр КП</h3>
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
            {onIssue && (
              <button onClick={onIssue}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 shadow-lg shadow-orange-600/20">
                <Send size={16} /> Выставить
              </button>
            )}
          </div>
        </div>

        {/* A4 Document */}
        <div id="kp-document" className="max-w-[210mm] mx-auto my-6 sm:my-8 bg-white shadow-2xl rounded-lg p-6 sm:p-10 md:p-[20mm]">

          {/* ═══ HEADER ═══ */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-[3px] border-slate-800">
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
                Коммерческое<br />предложение
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                {kpNumber} от {kpDate}
              </p>
            </div>
          </div>

          {/* ═══ КЛИЕНТ + ОБЪЕКТ ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Заказчик</p>
              <p className="text-base sm:text-lg font-bold text-slate-800">{project.client || 'Не указан'}</p>
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
              <p className="text-base sm:text-lg font-bold text-slate-800 flex items-start gap-1">
                <MapPin size={16} className="shrink-0 mt-1 text-slate-400" />
                {project.address || 'Не указан'}
              </p>
              {project.areaSize > 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Ruler size={11} /> Площадь: {project.areaSize.toLocaleString('ru-RU')} м²
                </p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                Проект: {project.name}
              </p>
            </div>
          </div>

          {/* ═══ ТАБЛИЦА РАБОТ ═══ */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="py-2.5 px-2 sm:px-3 text-left w-8 sm:w-10 font-bold rounded-tl-lg">№</th>
                  <th className="py-2.5 px-2 sm:px-3 text-left font-bold">Наименование работ и затрат</th>
                  <th className="py-2.5 px-2 sm:px-3 text-center w-12 sm:w-16 font-bold">Ед.</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right w-16 sm:w-20 font-bold">Кол-во</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right w-20 sm:w-28 font-bold">Цена</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right w-24 sm:w-32 font-bold rounded-tr-lg">Стоимость</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let rowNum = 0;
                  return groupedSections.map((section, sIdx) => (
                    <React.Fragment key={sIdx}>
                      {/* Заголовок раздела */}
                      <tr className="bg-orange-50 border-t-2 border-orange-200">
                        <td colSpan={6} className="py-2 px-2 sm:px-3 font-black text-orange-700 uppercase text-[10px] sm:text-xs tracking-wider">
                          {section.sectionName}
                        </td>
                      </tr>
                      {/* Позиции */}
                      {section.items.map((item) => {
                        rowNum++;
                        return (
                          <tr key={item.id} className={`border-b border-slate-100 ${rowNum % 2 === 0 ? 'bg-slate-50/40' : ''}`}>
                            <td className="py-2 px-2 sm:px-3 text-slate-400 text-center">{rowNum}</td>
                            <td className="py-2 px-2 sm:px-3 text-slate-700">{item.name}</td>
                            <td className="py-2 px-2 sm:px-3 text-center text-slate-500">{item.unit}</td>
                            <td className="py-2 px-2 sm:px-3 text-right tabular-nums">{item.quantity}</td>
                            <td className="py-2 px-2 sm:px-3 text-right tabular-nums">{formatPrice(item.unitPrice)}</td>
                            <td className="py-2 px-2 sm:px-3 text-right font-bold tabular-nums">{formatPrice(item.totalPrice)}</td>
                          </tr>
                        );
                      })}
                      {/* Итого по разделу */}
                      {groupedSections.length > 1 && (
                        <tr className="border-b-2 border-slate-200">
                          <td colSpan={5} className="py-2 px-2 sm:px-3 text-right text-[10px] sm:text-xs font-bold text-slate-500 italic">
                            Итого «{section.sectionName}»:
                          </td>
                          <td className="py-2 px-2 sm:px-3 text-right font-black text-slate-700 tabular-nums">
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
          <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6 flex justify-between items-center mb-8">
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">Итого стоимость работ</span>
              <p className="text-[10px] text-slate-400 mt-0.5">включая материалы и механизмы</p>
            </div>
            <span className="text-2xl sm:text-3xl font-black tabular-nums">{formatPrice(grandTotal)}</span>
          </div>

          {/* ═══ ПРИМЕЧАНИЕ ═══ */}
          {project.clientEstimateNote && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 rounded-r-lg">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Примечание</p>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{project.clientEstimateNote}</p>
            </div>
          )}

          {/* ═══ УСЛОВИЯ ═══ */}
          {(() => {
            const prepayment = project.kpPrepayment ?? 50;
            const warranty = project.kpWarranty ?? 24;
            const workDuration = project.kpWorkDuration || '';
            const restPayment = 100 - prepayment;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-xs text-slate-600">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="font-bold text-slate-700 mb-2 text-[10px] uppercase tracking-wider">Условия</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold mt-0.5">&#x2022;</span>
                      Предложение действительно {COMPANY_INFO.validityDays} календарных дней
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold mt-0.5">&#x2022;</span>
                      Оплата: предоплата {prepayment}%{restPayment > 0 ? `, остаток ${restPayment}% по завершении` : ''}
                    </li>
                    {workDuration && (
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 font-bold mt-0.5">&#x2022;</span>
                        Срок выполнения работ: {workDuration}
                      </li>
                    )}
                    {warranty > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 font-bold mt-0.5">&#x2022;</span>
                        Гарантия на выполненные работы — {warranty} мес.
                      </li>
                    )}
                  </ul>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="font-bold text-slate-700 mb-2 text-[10px] uppercase tracking-wider">В стоимость входит</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold mt-0.5">&#x2713;</span>
                      Доставка материалов на объект
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold mt-0.5">&#x2713;</span>
                      Работа техники и персонала
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold mt-0.5">&#x2713;</span>
                      Геодезический контроль качества
                    </li>
                  </ul>
                </div>
              </div>
            );
          })()}

          {/* ═══ ПОДПИСЬ ═══ */}
          <div className="border-t-2 border-slate-200 pt-6 mt-8">
            <div className="flex justify-between items-end mb-10">
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
