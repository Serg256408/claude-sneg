import React, { useState, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
const fontBundle: any = (pdfFonts as any).pdfMake?.vfs
  ? (pdfFonts as any).pdfMake
  : (pdfFonts as any).default?.pdfMake;
if (fontBundle?.vfs) {
  (pdfMake as any).vfs = fontBundle.vfs;
}
import {
  Order,
  OrderStatus,
  Invoice,
  InvoiceStatus,
  Payment,
  Contract,
  ClosingDocs,
  Message,
  DocumentSignStatus,
  generateId,
  generateInvoiceNumber,
  generateContractNumber,
  formatPrice,
  formatDateTime,
  AssetRequirement,
  getUnitsForRequirement,
} from './types';

interface AccountantPortalProps {
  orders: Order[];
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
  onCreateInvoice: (orderId: string, invoice: Invoice) => void;
  onCreateContract: (orderId: string, contract: Contract) => void;
  onRecordPayment: (orderId: string, payment: Payment) => void;
  onCreateClosingDocs: (orderId: string, docs: ClosingDocs) => void;
  currentUserId: string;
  currentUserName: string;
}

export default function AccountantPortal({
  orders,
  onUpdateOrder,
  onCreateInvoice,
  onCreateContract,
  onRecordPayment,
  onCreateClosingDocs,
  currentUserId,
  currentUserName,
}: AccountantPortalProps) {
  const [activeTab, setActiveTab] = useState<'pending_invoices' | 'pending_payments' | 'closing_docs' | 'contracts' | 'completed'>('pending_invoices');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [closingDocsNotes, setClosingDocsNotes] = useState<Record<string, string>>({});
  const [closingDocsFiles, setClosingDocsFiles] = useState<Record<string, File[]>>({});
  const [closingDocsSending, setClosingDocsSending] = useState<Record<string, boolean>>({});

  // Состояние чата с клиентом
  const [chatModal, setChatModal] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });

  // Состояние для просмотра завершённого заказа
  const [viewingCompletedOrder, setViewingCompletedOrder] = useState<Order | null>(null);
  const [isDownloadingDocs, setIsDownloadingDocs] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  // Функция для проверки соответствия заказа поисковому запросу
  const matchesSearch = (order: Order, query: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    return [
      order.orderNumber,
      order.customer,
      order.address,
      order.invoices?.map(i => i.number).join(' ')
    ].filter(Boolean).join(' ').toLowerCase().includes(q);
  };

  // Заказы, требующие выставления счетов
  const ordersNeedingInvoice = useMemo(() => {
    return orders.filter(o =>
      (o.status === OrderStatus.CONFIRMED_BY_CUSTOMER || o.status === OrderStatus.CONTRACT_SIGNING) &&
      (!o.invoices || o.invoices.length === 0) &&
      matchesSearch(o, searchQuery)
    );
  }, [orders, searchQuery]);

  // Заказы с ожидающими оплаты счетами
  const ordersWithPendingPayments = useMemo(() => {
    return orders.filter(o =>
      o.invoices?.some(inv => inv.status === InvoiceStatus.ISSUED || inv.status === InvoiceStatus.SENT) &&
      matchesSearch(o, searchQuery)
    );
  }, [orders, searchQuery]);

  // Заказы, требующие закрывающих документов
  const ordersNeedingClosingDocs = useMemo(() => {
    return orders.filter(o =>
      [
        OrderStatus.EXPORT_COMPLETED,
        OrderStatus.AWAITING_CLOSING_DOCS,
        OrderStatus.CLOSING_DOCS_SENT,
        OrderStatus.REPORT_READY,
      ].includes(o.status) &&
      !o.isPaid &&
      matchesSearch(o, searchQuery)
    );
  }, [orders, searchQuery]);

  const completedOrders = useMemo(() => {
    return orders.filter(o => o.status === OrderStatus.COMPLETED && matchesSearch(o, searchQuery));
  }, [orders, searchQuery]);

  // Заказы, требующие договоров
  const ordersNeedingContracts = useMemo(() => {
    return orders.filter(o =>
      o.status === OrderStatus.CONFIRMED_BY_CUSTOMER &&
      !o.contract &&
      matchesSearch(o, searchQuery)
    );
  }, [orders, searchQuery]);

  // Статистика
  const stats = useMemo(() => {
    const totalInvoiced = orders.reduce((sum, o) =>
      sum + (o.invoices?.reduce((s, inv) => s + inv.amount, 0) || 0), 0);
    const totalPaid = orders.reduce((sum, o) =>
      sum + (o.payments?.reduce((s, p) => s + (p.status === 'completed' ? p.amount : 0), 0) || 0), 0);
    const overdue = orders.filter(o =>
      o.invoices?.some(inv => inv.status === InvoiceStatus.OVERDUE)
    ).length;
    return { totalInvoiced, totalPaid, overdue, pendingInvoices: ordersNeedingInvoice.length };
  }, [orders, ordersNeedingInvoice]);

  // Функции чата с клиентом
  const getCustomerMessages = (order: Order): Message[] => {
    return (order.messages || []).filter(
      m =>
        (m.fromRole === 'accountant' && m.toRole === 'customer') ||
        (m.fromRole === 'customer' && m.toRole === 'accountant')
    );
  };

  const getUnreadFromCustomer = (order: Order): number => {
    return (order.messages || []).filter(
      m => m.fromRole === 'customer' && m.toRole === 'accountant' && !m.isRead
    ).length;
  };

  const openCustomerChat = (order: Order) => {
    // Помечаем сообщения от клиента как прочитанные
    const updatedMessages = (order.messages || []).map(m =>
      m.fromRole === 'customer' && m.toRole === 'accountant' && !m.isRead
        ? { ...m, isRead: true }
        : m
    );
    const hadUnread = updatedMessages.some((m, i) => (order.messages || [])[i]?.isRead !== m.isRead);
    if (hadUnread) {
      onUpdateOrder(order.id, { messages: updatedMessages });
    }
    setChatModal({ open: true, orderId: order.id });
  };

  const sendChatMessage = () => {
    if (!chatModal.orderId || !chatMessage.trim()) return;
    const order = orders.find(o => o.id === chatModal.orderId);
    if (!order) return;

    const message: Message = {
      id: generateId(),
      orderId: order.id,
      fromRole: 'accountant',
      fromName: currentUserName,
      fromId: currentUserId,
      toRole: 'customer',
      toId: order.customerId,
      text: chatMessage.trim(),
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    onUpdateOrder(order.id, {
      messages: [...(order.messages || []), message],
      unreadMessages: (order.unreadMessages || 0) + 1,
    });
    setChatMessage('');
  };

  const chatOrder = chatModal.orderId ? orders.find(o => o.id === chatModal.orderId) : null;
  const chatMessages = chatOrder ? getCustomerMessages(chatOrder) : [];

  // Скачивание закрывающих документов в ZIP
  const downloadClosingDocsZip = useCallback(async (order: Order) => {
    setIsDownloadingDocs(true);
    try {
      const zip = new JSZip();
      const attachments = order.closingDocs?.attachments || [];
      let addedFiles = 0;

      // Добавляем прикреплённые документы
      for (const att of attachments) {
        if (!att.url) continue;
        try {
          const response = await fetch(att.url);
          const blob = await response.blob();
          zip.file(att.name || `document_${addedFiles + 1}`, blob);
          addedFiles++;
        } catch { /* skip */ }
      }

      // Генерируем акт выполненных работ
      const getUnitsForReq = (req: AssetRequirement) => getUnitsForRequirement(order, req, { mode: 'actual_or_planned' });
      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: { font: 'Roboto', fontSize: 10 },
        content: [
          { text: 'АКТ ВЫПОЛНЕННЫХ РАБОТ', style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
          { text: `Заказ №${order.orderNumber || order.id}`, alignment: 'center', margin: [0, 0, 0, 10] },
          { text: `Дата: ${formatDateTime(new Date().toISOString())}`, alignment: 'center', margin: [0, 0, 0, 20] },
          { text: 'Заказчик:', bold: true, margin: [0, 10, 0, 5] },
          { text: order.customer, margin: [0, 0, 0, 2] },
          { text: `Объект: ${order.address}`, margin: [0, 0, 0, 20] },
          { text: 'Выполненные работы:', bold: true, margin: [0, 10, 0, 10] },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: 'Услуга', bold: true, fillColor: '#f0f0f0' },
                  { text: 'Кол-во', bold: true, fillColor: '#f0f0f0', alignment: 'center' },
                  { text: 'Цена', bold: true, fillColor: '#f0f0f0', alignment: 'right' },
                  { text: 'Сумма', bold: true, fillColor: '#f0f0f0', alignment: 'right' }
                ],
                ...(order.assetRequirements || []).map(req => {
                  const units = getUnitsForReq(req);
                  const unitLabel = req.priceUnit === 'PER_HOUR' ? 'ч' : 'рейс';
                  const lineTotal = (req.customerPrice || 0) * units * (req.quantity || 1);
                  return [
                    { text: `${req.assetType} (${req.quantity || 1} ед.)` },
                    { text: `${units} ${unitLabel}`, alignment: 'center' },
                    { text: formatPrice(req.customerPrice || 0), alignment: 'right' },
                    { text: formatPrice(lineTotal), alignment: 'right' }
                  ];
                })
              ]
            },
            margin: [0, 0, 0, 20]
          },
          { text: `ИТОГО: ${formatPrice(order.totalCustomerPrice || 0)}`, bold: true, fontSize: 14, alignment: 'right', margin: [0, 10, 0, 5] },
          { text: `В т.ч. НДС 20%: ${formatPrice((order.totalCustomerPrice || 0) * 0.2 / 1.2)}`, alignment: 'right', margin: [0, 0, 0, 30] },
          {
            columns: [
              { text: 'Исполнитель: _________________', width: '50%' },
              { text: 'Заказчик: _________________', width: '50%', alignment: 'right' }
            ],
            margin: [0, 30, 0, 0]
          }
        ],
        styles: { header: { fontSize: 16, bold: true } }
      };

      const pdfBlob = await new Promise<Blob>((resolve) => {
        pdfMake.createPdf(docDefinition as any).getBlob((blob: Blob) => resolve(blob));
      });
      zip.file(`Акт_${order.orderNumber || order.id}.pdf`, pdfBlob);
      addedFiles++;

      // Добавляем счета-фактуры
      if (order.invoices && order.invoices.length > 0) {
        for (const inv of order.invoices) {
          const invoiceDoc = {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            defaultStyle: { font: 'Roboto', fontSize: 10 },
            content: [
              { text: `СЧЁТ-ФАКТУРА №${inv.number}`, style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
              { text: `от ${inv.date}`, alignment: 'center', margin: [0, 0, 0, 20] },
              { text: `Заказ: ${order.orderNumber}`, margin: [0, 0, 0, 10] },
              { text: `Заказчик: ${order.customer}`, margin: [0, 0, 0, 20] },
              { text: `Сумма: ${formatPrice(inv.amount)}`, bold: true, fontSize: 14 },
              { text: `НДС: ${formatPrice(inv.vatAmount || 0)}`, margin: [0, 5, 0, 0] },
              { text: `Статус: ${inv.status === 'paid' ? 'Оплачен' : inv.status === 'sent' ? 'Отправлен' : 'Выставлен'}`, margin: [0, 10, 0, 0] },
            ],
            styles: { header: { fontSize: 16, bold: true } }
          };
          const invBlob = await new Promise<Blob>((resolve) => {
            pdfMake.createPdf(invoiceDoc as any).getBlob((blob: Blob) => resolve(blob));
          });
          zip.file(`Счёт-фактура_${inv.number}.pdf`, invBlob);
          addedFiles++;
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Закрывающие_документы_${order.orderNumber || order.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Ошибка создания архива:', err);
    } finally {
      setIsDownloadingDocs(false);
    }
  }, []);

  // Форма счёта
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
    type: 'prepayment',
    vatRate: 20,
  });

  const handleCreateInvoice = () => {
    if (!selectedOrder) return;
    const amount = newInvoice.amount || selectedOrder.totalCustomerPrice || 0;
    const vatAmount = amount * ((newInvoice.vatRate || 20) / 100) / (1 + (newInvoice.vatRate || 20) / 100);

    const invoice: Invoice = {
      id: generateId(),
      orderId: selectedOrder.id,
      contractId: selectedOrder.contractId,
      customerCompanyId: selectedOrder.customerCompanyId || selectedOrder.customerId || '',
      number: generateInvoiceNumber(),
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      type: newInvoice.type || 'prepayment',
      amount,
      vatAmount,
      vatRate: newInvoice.vatRate || 20,
      status: InvoiceStatus.ISSUED,
      paidAmount: 0,
      createdBy: currentUserName,
      createdAt: new Date().toISOString(),
    };

    onCreateInvoice(selectedOrder.id, invoice);
    onUpdateOrder(selectedOrder.id, {
      invoices: [...(selectedOrder.invoices || []), invoice],
      invoiceIds: [...(selectedOrder.invoiceIds || []), invoice.id],
      status: OrderStatus.AWAITING_PREPAYMENT,
    });

    setShowInvoiceForm(false);
    setNewInvoice({ type: 'prepayment', vatRate: 20 });
    setSelectedOrder(null);
  };

  // Форма платежа
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    method: 'bank_transfer',
  });

  const handleRecordPayment = () => {
    if (!selectedOrder || !selectedOrder.invoices?.length) return;
    const invoice = selectedOrder.invoices.find(inv =>
      inv.status === InvoiceStatus.ISSUED || inv.status === InvoiceStatus.SENT
    );
    if (!invoice) return;

    const payment: Payment = {
      id: generateId(),
      invoiceId: invoice.id,
      orderId: selectedOrder.id,
      amount: newPayment.amount || invoice.amount,
      method: newPayment.method || 'bank_transfer',
      status: 'completed',
      transactionId: newPayment.transactionId,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    onRecordPayment(selectedOrder.id, payment);

    // Обновляем статус счёта
    const updatedInvoices = selectedOrder.invoices.map(inv =>
      inv.id === invoice.id
        ? { ...inv, status: InvoiceStatus.PAID, paidAmount: inv.amount, paidAt: new Date().toISOString() }
        : inv
    );

    const updatedPayments = [...(selectedOrder.payments || []), payment];
    const totalPaid = updatedPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const requiredTotal = selectedOrder.totalCustomerPrice || invoice.amount || 0;
    const isFullyPaid = requiredTotal > 0 ? totalPaid >= requiredTotal : totalPaid > 0;
    const isClosingDocsStage = [
      OrderStatus.EXPORT_COMPLETED,
      OrderStatus.AWAITING_CLOSING_DOCS,
      OrderStatus.CLOSING_DOCS_SENT,
      OrderStatus.REPORT_READY,
    ].includes(selectedOrder.status);
    const nextStatus = isFullyPaid && isClosingDocsStage
      ? OrderStatus.COMPLETED
      : selectedOrder.status === OrderStatus.AWAITING_PREPAYMENT
        ? OrderStatus.SCHEDULING
        : selectedOrder.status;

    onUpdateOrder(selectedOrder.id, {
      payments: updatedPayments,
      invoices: updatedInvoices,
      isPaid: isFullyPaid,
      status: nextStatus,
    });

    setShowPaymentForm(false);
    setNewPayment({ method: 'bank_transfer' });
    setSelectedOrder(null);
  };

  // Форма договора
  const [newContract, setNewContract] = useState<Partial<Contract>>({
    signMethod: 'simple_ep',
  });

  const handleCreateContract = () => {
    if (!selectedOrder) return;

    const contract: Contract = {
      id: generateId(),
      orderId: selectedOrder.id,
      customerCompanyId: selectedOrder.customerCompanyId || selectedOrder.customerId || '',
      number: generateContractNumber(),
      date: new Date().toISOString().slice(0, 10),
      totalAmount: selectedOrder.totalCustomerPrice || 0,
      vatAmount: (selectedOrder.totalCustomerPrice || 0) * 0.2 / 1.2,
      paymentTerms: newContract.paymentTerms || 'Предоплата 100%',
      workDeadline: newContract.workDeadline,
      signStatus: DocumentSignStatus.DRAFT,
      signMethod: newContract.signMethod,
      createdBy: currentUserName,
      createdAt: new Date().toISOString(),
    };

    onCreateContract(selectedOrder.id, contract);
    onUpdateOrder(selectedOrder.id, {
      contract,
      contractId: contract.id,
      status: OrderStatus.CONTRACT_SIGNING,
    });

    setShowContractForm(false);
    setNewContract({ signMethod: 'simple_ep' });
    setSelectedOrder(null);
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  // Создание закрывающих документов
  const handleCreateClosingDocs = async (order: Order) => {
    if (closingDocsSending[order.id]) return;
    setClosingDocsSending(prev => ({ ...prev, [order.id]: true }));

    try {
      const note = (closingDocsNotes[order.id] || '').trim();
      const files = closingDocsFiles[order.id] || [];
      const attachments = await Promise.all(
        files.map(async file => ({
          name: file.name,
          url: await readFileAsDataUrl(file),
        }))
      );

      const docs: ClosingDocs = {
        id: generateId(),
        orderId: order.id,
        actNumber: `АКТ-${order.orderNumber}`,
        actDate: new Date().toISOString().slice(0, 10),
        status: 'sent',
        sentAt: new Date().toISOString(),
        createdBy: currentUserName,
        createdAt: new Date().toISOString(),
        attachments,
        noteToCustomer: note,
      };

      const message: Message = {
        id: generateId(),
        orderId: order.id,
        fromRole: 'accountant',
        fromName: currentUserName,
        fromId: currentUserId,
        toRole: 'customer',
        toId: order.customerId,
        text: note || 'Закрывающие документы отправлены.',
        attachments: attachments.map(file => ({
          type: 'document',
          url: file.url,
          name: file.name,
        })),
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      onCreateClosingDocs(order.id, docs);
      onUpdateOrder(order.id, {
        closingDocs: docs,
        status: OrderStatus.CLOSING_DOCS_SENT,
        messages: [...(order.messages || []), message],
        unreadMessages: (order.unreadMessages || 0) + 1,
      });

      setClosingDocsNotes(prev => ({ ...prev, [order.id]: '' }));
      setClosingDocsFiles(prev => ({ ...prev, [order.id]: [] }));
    } finally {
      setClosingDocsSending(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const handleMarkOrderPaid = (order: Order) => {
    const totalPaid = (order.payments || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const requiredTotal = order.totalCustomerPrice || 0;
    const remaining = Math.max(0, requiredTotal - totalPaid);
    const now = new Date().toISOString();
    const payment: Payment | null = remaining > 0
      ? {
          id: generateId(),
          invoiceId: order.invoices?.[0]?.id || '',
          orderId: order.id,
          amount: remaining,
          method: 'bank_transfer',
          status: 'completed',
          transactionId: 'manual_confirm',
          createdAt: now,
          completedAt: now,
        }
      : null;

    const isClosingDocsStage = [
      OrderStatus.EXPORT_COMPLETED,
      OrderStatus.AWAITING_CLOSING_DOCS,
      OrderStatus.CLOSING_DOCS_SENT,
      OrderStatus.REPORT_READY,
    ].includes(order.status);

    onUpdateOrder(order.id, {
      isPaid: true,
      payments: payment ? [...(order.payments || []), payment] : order.payments,
      status: isClosingDocsStage ? OrderStatus.COMPLETED : order.status,
    });
  };

  const getInvoiceStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.ISSUED: return 'bg-blue-100 text-blue-800';
      case InvoiceStatus.SENT: return 'bg-yellow-100 text-yellow-800';
      case InvoiceStatus.PAID: return 'bg-green-100 text-green-800';
      case InvoiceStatus.OVERDUE: return 'bg-red-100 text-red-800';
      case InvoiceStatus.CANCELLED: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-blue-600">{formatPrice(stats.totalInvoiced)}</div>
          <div className="text-xs font-bold text-blue-800 uppercase">Выставлено</div>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-green-600">{formatPrice(stats.totalPaid)}</div>
          <div className="text-xs font-bold text-green-800 uppercase">Оплачено</div>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-orange-600">{stats.pendingInvoices}</div>
          <div className="text-xs font-bold text-orange-800 uppercase">Ждут счёт</div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-red-600">{stats.overdue}</div>
          <div className="text-xs font-bold text-red-800 uppercase">Просрочено</div>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Поиск по номеру заказа, клиенту, адресу, номеру счёта..."
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Табы */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'pending_invoices' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('pending_invoices')}
        >
          Выставить счёт ({ordersNeedingInvoice.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'pending_payments' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('pending_payments')}
        >
          Ожидают оплаты ({ordersWithPendingPayments.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'contracts' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('contracts')}
        >
          Договоры ({ordersNeedingContracts.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'closing_docs' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('closing_docs')}
        >
          Закрывающие ({ordersNeedingClosingDocs.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'completed' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('completed')}
        >
          Завершённые ({completedOrders.length})
        </button>
      </div>

      {/* Контент табов */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
        {/* Выставление счетов */}
        {activeTab === 'pending_invoices' && (
          <>
            <h2 className="text-xl font-black mb-4">Заказы для выставления счёта</h2>
            {ordersNeedingInvoice.length === 0 ? (
              <div className="text-center text-slate-400 py-8">Нет заказов</div>
            ) : (
              <div className="space-y-3">
                {ordersNeedingInvoice.map(order => (
                  <div
                    key={order.id}
                    className="border border-slate-100 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold">{order.orderNumber}</div>
                      <div className="text-sm text-slate-500">{order.customer}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black">{formatPrice(order.totalCustomerPrice || 0)}</div>
                      <button
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
                        onClick={() => { setSelectedOrder(order); setShowInvoiceForm(true); }}
                      >
                        Выставить счёт
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Ожидание оплаты */}
        {activeTab === 'pending_payments' && (
          <>
            <h2 className="text-xl font-black mb-4">Ожидают оплаты</h2>
            {ordersWithPendingPayments.length === 0 ? (
              <div className="text-center text-slate-400 py-8">Нет неоплаченных счетов</div>
            ) : (
              <div className="space-y-3">
                {ordersWithPendingPayments.map(order => {
                  const pendingInvoice = order.invoices?.find(inv =>
                    inv.status === InvoiceStatus.ISSUED || inv.status === InvoiceStatus.SENT
                  );
                  return (
                    <div
                      key={order.id}
                      className="border border-slate-100 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold">{order.orderNumber}</div>
                        <div className="text-sm text-slate-500">{order.customer}</div>
                        {pendingInvoice && (
                          <div className="text-xs text-slate-400">
                            Счёт {pendingInvoice.number} от {pendingInvoice.date}
                          </div>
                        )}
                        {/* Кнопка чата с клиентом */}
                        <button
                          onClick={() => openCustomerChat(order)}
                          className="mt-2 relative inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          💬 Написать заказчику
                          {getUnreadFromCustomer(order) > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full px-1">
                              {getUnreadFromCustomer(order)}
                            </span>
                          )}
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black">{formatPrice(pendingInvoice?.amount || 0)}</div>
                        {pendingInvoice && (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getInvoiceStatusColor(pendingInvoice.status)}`}>
                            {pendingInvoice.status === InvoiceStatus.ISSUED ? 'Выставлен' :
                             pendingInvoice.status === InvoiceStatus.SENT ? 'Отправлен' :
                             pendingInvoice.status}
                          </span>
                        )}
                        <button
                          className="mt-2 ml-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold"
                          onClick={() => { setSelectedOrder(order); setShowPaymentForm(true); }}
                        >
                          Зачесть оплату
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Договоры */}
        {activeTab === 'contracts' && (
          <>
            <h2 className="text-xl font-black mb-4">Требуют договора</h2>
            {ordersNeedingContracts.length === 0 ? (
              <div className="text-center text-slate-400 py-8">Нет заказов</div>
            ) : (
              <div className="space-y-3">
                {ordersNeedingContracts.map(order => (
                  <div
                    key={order.id}
                    className="border border-slate-100 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold">{order.orderNumber}</div>
                      <div className="text-sm text-slate-500">{order.customer}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black">{formatPrice(order.totalCustomerPrice || 0)}</div>
                      <button
                        className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold"
                        onClick={() => { setSelectedOrder(order); setShowContractForm(true); }}
                      >
                        Создать договор
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Закрывающие документы */}
        {activeTab === 'closing_docs' && (
          <>
            <h2 className="text-xl font-black mb-4">Закрывающие документы</h2>
            {ordersNeedingClosingDocs.length === 0 ? (
              <div className="text-center text-slate-400 py-8">Нет заказов</div>
            ) : (
              <div className="space-y-3">
                {ordersNeedingClosingDocs.map(order => (
                  <div
                    key={order.id}
                    className="border border-slate-100 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="font-bold">{order.orderNumber}</div>
                        <div className="text-sm text-slate-500">{order.customer}</div>
                        <div className="text-xs text-slate-400">{order.address}</div>
                        {/* Кнопка чата с клиентом */}
                        <button
                          onClick={() => openCustomerChat(order)}
                          className="mt-2 relative inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          💬 Написать заказчику
                          {getUnreadFromCustomer(order) > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full px-1">
                              {getUnreadFromCustomer(order)}
                            </span>
                          )}
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black">{formatPrice(order.totalCustomerPrice || 0)}</div>
                        <div className="mt-2 flex flex-col gap-2 items-end">
                          <button
                            className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold"
                            onClick={() => handleCreateClosingDocs(order)}
                            disabled={!!order.closingDocs || closingDocsSending[order.id]}
                          >
                            {closingDocsSending[order.id]
                              ? 'Отправка...'
                              : order.closingDocs
                              ? 'Акт сформирован'
                              : 'Сформировать акт'}
                          </button>
                          {order.isPaid ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                              Оплачено
                            </span>
                          ) : (
                            <button
                              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                              onClick={() => handleMarkOrderPaid(order)}
                            >
                              Подтвердить оплату
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Прикрепление документов для акта */}
                    <div className="space-y-2">
                      <label className="flex items-center justify-between gap-3 px-4 py-3 border border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer hover:border-slate-400 transition-all">
                        <span>📎 Прикрепить документы к акту</span>
                        <span className="text-[11px] text-slate-400">
                          {closingDocsFiles[order.id]?.length ? `Файлов: ${closingDocsFiles[order.id]?.length}` : 'Выбрать'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={e => {
                            const incoming = Array.from(e.target.files || []);
                            if (incoming.length === 0) return;
                            setClosingDocsFiles(prev => ({
                              ...prev,
                              [order.id]: [...(prev[order.id] || []), ...incoming],
                            }));
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                      {(closingDocsFiles[order.id] || []).length > 0 && (
                        <div className="space-y-1">
                          {(closingDocsFiles[order.id] || []).map((file, idx) => (
                            <div key={`${order.id}-file-${idx}`} className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                              <span className="truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setClosingDocsFiles(prev => ({
                                    ...prev,
                                    [order.id]: (prev[order.id] || []).filter((_, i) => i !== idx),
                                  }))
                                }
                                className="text-red-500 text-[10px] font-black uppercase hover:text-red-600"
                              >
                                Удалить
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Завершённые */}
        {activeTab === 'completed' && (
          <>
            <h2 className="text-xl font-black mb-4">Завершённые заказы</h2>
            {completedOrders.length === 0 ? (
              <div className="text-center text-slate-400 py-8">Нет завершённых заказов</div>
            ) : (
              <div className="space-y-3">
                {completedOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setViewingCompletedOrder(order)}
                    className="border border-slate-100 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="font-bold">{order.orderNumber}</div>
                      <div className="text-sm text-slate-500">{order.customer}</div>
                      <div className="text-xs text-slate-400">{order.address}</div>
                      {/* Индикатор непрочитанных сообщений */}
                      {getUnreadFromCustomer(order) > 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                          💬 {getUnreadFromCustomer(order)} новых
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black">{formatPrice(order.totalCustomerPrice || 0)}</div>
                      <span className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        {order.isPaid ? 'Оплачено' : 'Завершён'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Модалка счёта */}
      {showInvoiceForm && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowInvoiceForm(false)}>
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-6">Выставить счёт</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500">Заказ</div>
                <div className="font-bold">{selectedOrder.orderNumber} — {selectedOrder.customer}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Тип счёта</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newInvoice.type || 'prepayment'}
                  onChange={e => setNewInvoice({ ...newInvoice, type: e.target.value as Invoice['type'] })}
                >
                  <option value="prepayment">Предоплата</option>
                  <option value="partial">Частичная оплата</option>
                  <option value="final">Финальный счёт</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Сумма</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newInvoice.amount || selectedOrder.totalCustomerPrice || ''}
                  onChange={e => setNewInvoice({ ...newInvoice, amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ставка НДС</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newInvoice.vatRate || 20}
                  onChange={e => setNewInvoice({ ...newInvoice, vatRate: Number(e.target.value) })}
                >
                  <option value={0}>Без НДС</option>
                  <option value={10}>10%</option>
                  <option value={20}>20%</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  className="flex-1 bg-blue-600 text-white rounded-xl px-4 py-3 font-bold"
                  onClick={handleCreateInvoice}
                >
                  Выставить
                </button>
                <button
                  className="px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  onClick={() => setShowInvoiceForm(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка платежа */}
      {showPaymentForm && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentForm(false)}>
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-6">Зачесть оплату</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500">Заказ</div>
                <div className="font-bold">{selectedOrder.orderNumber} — {selectedOrder.customer}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Способ оплаты</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newPayment.method || 'bank_transfer'}
                  onChange={e => setNewPayment({ ...newPayment, method: e.target.value as Payment['method'] })}
                >
                  <option value="bank_transfer">Безналичный расчёт</option>
                  <option value="card">Карта</option>
                  <option value="cash">Наличные</option>
                  <option value="qr_code">QR-код</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Сумма</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newPayment.amount || selectedOrder.invoices?.find(inv => inv.status === InvoiceStatus.ISSUED || inv.status === InvoiceStatus.SENT)?.amount || ''}
                  onChange={e => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">№ платёжного поручения</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newPayment.transactionId || ''}
                  onChange={e => setNewPayment({ ...newPayment, transactionId: e.target.value })}
                  placeholder="123456"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  className="flex-1 bg-green-600 text-white rounded-xl px-4 py-3 font-bold"
                  onClick={handleRecordPayment}
                >
                  Зачесть
                </button>
                <button
                  className="px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  onClick={() => setShowPaymentForm(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка договора */}
      {showContractForm && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowContractForm(false)}>
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-6">Создать договор</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500">Заказ</div>
                <div className="font-bold">{selectedOrder.orderNumber} — {selectedOrder.customer}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Условия оплаты</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newContract.paymentTerms || ''}
                  onChange={e => setNewContract({ ...newContract, paymentTerms: e.target.value })}
                  placeholder="Предоплата 100%"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Срок выполнения</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newContract.workDeadline || ''}
                  onChange={e => setNewContract({ ...newContract, workDeadline: e.target.value })}
                  placeholder="5 рабочих дней"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Способ подписания</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newContract.signMethod || 'simple_ep'}
                  onChange={e => setNewContract({ ...newContract, signMethod: e.target.value as Contract['signMethod'] })}
                >
                  <option value="simple_ep">Простая ЭП</option>
                  <option value="sms_code">SMS-код</option>
                  <option value="scan">Скан подписи</option>
                  <option value="qualified_ep">УКЭП</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  className="flex-1 bg-purple-600 text-white rounded-xl px-4 py-3 font-bold"
                  onClick={handleCreateContract}
                >
                  Создать
                </button>
                <button
                  className="px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  onClick={() => setShowContractForm(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка чата с клиентом */}
      {chatModal.open && chatOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setChatModal({ open: false, orderId: null })}>
          <div className="bg-white rounded-[2rem] max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Заголовок */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black">Переписка с заказчиком</h3>
                <div className="text-xs text-slate-500">
                  {chatOrder.orderNumber} — {chatOrder.customer}
                </div>
              </div>
              <button
                onClick={() => setChatModal({ open: false, orderId: null })}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  Нет сообщений. Начните переписку!
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.fromRole === 'accountant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.fromRole === 'accountant'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {msg.fromRole === 'accountant' ? 'Вы' : msg.fromName || 'Заказчик'}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`block text-xs underline ${
                                msg.fromRole === 'accountant' ? 'text-indigo-200' : 'text-indigo-600'
                              }`}
                            >
                              📎 {att.name || 'Файл'}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] opacity-50 mt-1">
                        {formatDateTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ввод сообщения */}
            <div className="p-4 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Введите сообщение..."
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatMessage.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка просмотра завершённого заказа */}
      {viewingCompletedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingCompletedOrder(null)}>
          <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Заголовок */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black">{viewingCompletedOrder.orderNumber}</h3>
                <div className="text-sm text-slate-500">{viewingCompletedOrder.customer}</div>
                <div className="text-xs text-slate-400">{viewingCompletedOrder.address}</div>
              </div>
              <button
                onClick={() => setViewingCompletedOrder(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Контент */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Финансы */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <h4 className="font-black mb-3">Финансы</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Сумма заказа</div>
                    <div className="text-xl font-black">{formatPrice(viewingCompletedOrder.totalCustomerPrice || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Статус оплаты</div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${viewingCompletedOrder.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {viewingCompletedOrder.isPaid ? 'Оплачено' : 'Ожидает оплаты'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Счета */}
              {viewingCompletedOrder.invoices && viewingCompletedOrder.invoices.length > 0 && (
                <div>
                  <h4 className="font-black mb-3">Счета ({viewingCompletedOrder.invoices.length})</h4>
                  <div className="space-y-2">
                    {viewingCompletedOrder.invoices.map(inv => (
                      <div key={inv.id} className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm">Счёт №{inv.number}</div>
                          <div className="text-xs text-slate-500">{inv.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatPrice(inv.amount)}</div>
                          <span className={`text-xs font-bold ${inv.status === 'paid' ? 'text-green-600' : 'text-slate-500'}`}>
                            {inv.status === 'paid' ? 'Оплачен' : inv.status === 'sent' ? 'Отправлен' : 'Выставлен'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Закрывающие документы */}
              {viewingCompletedOrder.closingDocs && (
                <div>
                  <h4 className="font-black mb-3">Закрывающие документы</h4>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-sm text-slate-600 mb-2">
                      Сформированы: {formatDateTime(viewingCompletedOrder.closingDocs.createdAt)}
                    </div>
                    {viewingCompletedOrder.closingDocs.attachments && viewingCompletedOrder.closingDocs.attachments.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {viewingCompletedOrder.closingDocs.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-indigo-600 hover:underline"
                          >
                            📎 {att.name || 'Документ'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Переписка */}
              <div>
                <h4 className="font-black mb-3">
                  Переписка с заказчиком
                  {getUnreadFromCustomer(viewingCompletedOrder) > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                      {getUnreadFromCustomer(viewingCompletedOrder)} новых
                    </span>
                  )}
                </h4>
                <div className="bg-slate-50 rounded-xl p-4 max-h-[250px] overflow-y-auto">
                  {getCustomerMessages(viewingCompletedOrder).length === 0 ? (
                    <div className="text-center text-slate-400 py-4">Нет сообщений</div>
                  ) : (
                    <div className="space-y-3">
                      {getCustomerMessages(viewingCompletedOrder).map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.fromRole === 'accountant' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-3 py-2 ${
                              msg.fromRole === 'accountant'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-800 border border-slate-200'
                            }`}
                          >
                            <div className="text-xs opacity-70">{msg.fromRole === 'accountant' ? 'Вы' : msg.fromName || 'Заказчик'}</div>
                            <div className="text-sm">{msg.text}</div>
                            <div className="text-[10px] opacity-50 mt-1">{formatDateTime(msg.timestamp)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Кнопка открыть чат */}
                <button
                  onClick={() => {
                    setViewingCompletedOrder(null);
                    openCustomerChat(viewingCompletedOrder);
                  }}
                  className="mt-3 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-colors"
                >
                  💬 Написать заказчику
                </button>
              </div>
            </div>

            {/* Футер с кнопками */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => downloadClosingDocsZip(viewingCompletedOrder)}
                disabled={isDownloadingDocs}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {isDownloadingDocs ? 'Генерация...' : '📦 Скачать документы (ZIP)'}
              </button>
              <button
                onClick={() => setViewingCompletedOrder(null)}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
