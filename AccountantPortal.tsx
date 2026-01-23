import React, { useState, useMemo } from 'react';
import {
  Order,
  OrderStatus,
  Invoice,
  InvoiceStatus,
  Payment,
  Contract,
  ClosingDocs,
  DocumentSignStatus,
  generateId,
  generateInvoiceNumber,
  generateContractNumber,
  formatPrice,
  formatDateTime,
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
  const [activeTab, setActiveTab] = useState<'pending_invoices' | 'pending_payments' | 'closing_docs' | 'contracts'>('pending_invoices');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);

  // Заказы, требующие выставления счетов
  const ordersNeedingInvoice = useMemo(() => {
    return orders.filter(o =>
      (o.status === OrderStatus.CONFIRMED_BY_CUSTOMER || o.status === OrderStatus.CONTRACT_SIGNING) &&
      (!o.invoices || o.invoices.length === 0)
    );
  }, [orders]);

  // Заказы с ожидающими оплаты счетами
  const ordersWithPendingPayments = useMemo(() => {
    return orders.filter(o =>
      o.invoices?.some(inv => inv.status === InvoiceStatus.ISSUED || inv.status === InvoiceStatus.SENT)
    );
  }, [orders]);

  // Заказы, требующие закрывающих документов
  const ordersNeedingClosingDocs = useMemo(() => {
    return orders.filter(o =>
      (o.status === OrderStatus.EXPORT_COMPLETED || o.status === OrderStatus.AWAITING_CLOSING_DOCS) &&
      !o.closingDocs
    );
  }, [orders]);

  // Заказы, требующие договоров
  const ordersNeedingContracts = useMemo(() => {
    return orders.filter(o =>
      o.status === OrderStatus.CONFIRMED_BY_CUSTOMER &&
      !o.contract
    );
  }, [orders]);

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

    onUpdateOrder(selectedOrder.id, {
      payments: [...(selectedOrder.payments || []), payment],
      invoices: updatedInvoices,
      isPaid: true,
      status: OrderStatus.SCHEDULING,
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

  // Создание закрывающих документов
  const handleCreateClosingDocs = (order: Order) => {
    const docs: ClosingDocs = {
      id: generateId(),
      orderId: order.id,
      actNumber: `АКТ-${order.orderNumber}`,
      actDate: new Date().toISOString().slice(0, 10),
      status: 'draft',
      createdBy: currentUserName,
      createdAt: new Date().toISOString(),
    };

    onCreateClosingDocs(order.id, docs);
    onUpdateOrder(order.id, {
      closingDocs: docs,
      status: OrderStatus.CLOSING_DOCS_SENT,
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
                    className="border border-slate-100 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold">{order.orderNumber}</div>
                      <div className="text-sm text-slate-500">{order.customer}</div>
                      <div className="text-xs text-slate-400">{order.address}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black">{formatPrice(order.totalCustomerPrice || 0)}</div>
                      <button
                        className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold"
                        onClick={() => handleCreateClosingDocs(order)}
                      >
                        Сформировать акт
                      </button>
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
    </div>
  );
}
