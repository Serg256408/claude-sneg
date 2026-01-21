import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ContractorPortal from './ContractorPortal';
import CustomerPortal from './CustomerPortal';
import CustomerFormDispatcher from './CustomerForm_Dispatcher';
import ContractorForm from './ContractorForm';
import DriverPortal from './DriverPortal';
import MapDashboard from './MapDashboard';
import OrderForm from './OrderForm';
import {
  AssetType,
  Bid,
  Contractor,
  Customer,
  DEFAULT_MANAGERS,
  DriverAssignment,
  ManagerName,
  Order,
  OrderStatus,
  TripEvidence,
  generateId,
  generateOrderNumber,
} from './types';

type Role = 'dispatcher' | 'customer' | 'contractor' | 'driver';

const LS_KEYS = {
  orders: 'snowforce_orders_v1',
  customers: 'snowforce_customers_v1',
  contractors: 'snowforce_contractors_v1',
  role: 'snowforce_role_v1',
  manager: 'snowforce_manager_v1',
  contractorId: 'snowforce_contractor_id_v1',
  driverName: 'snowforce_driver_name_v1',
  driverContractorId: 'snowforce_driver_contractor_id_v1',
} as const;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function seedCustomers(): Customer[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'cust-1',
      name: 'ООО "СНЕГОСЕРВИС"',
      phone: '+7 (999) 111-22-33',
      email: 'dispatch@snegoservice.ru',
      inn: '7700000000',
      paymentType: 'Наличные' as any,
      address: 'Москва, ул. Тверская, 1',
      comment: '',
      createdAt: now,
    },
  ];
}

function seedContractors(): Contractor[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'cont-1',
      name: 'ИП Петров',
      phone: '+7 (999) 444-55-66',
      email: 'petrov@example.com',
      inn: '7700000001',
      equipment: ['Самосвал', 'Погрузчик'],
      districts: ['ЦАО', 'САО', 'СВАО'],
      paymentType: 'Наличные' as any,
      rating: 4.7,
      completedOrders: 42,
      comments: 'Работаем круглосуточно.',
      isVerified: true,
      createdAt: now,
    },
  ];
}

function seedOrders(customers: Customer[]): Order[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'ord-1',
      orderNumber: generateOrderNumber(),
      customer: customers[0]?.name ?? 'Клиент',
      customerId: customers[0]?.id,
      contactInfo: { name: customers[0]?.name ?? 'Клиент', phone: customers[0]?.phone ?? '' },
      address: 'Москва, ул. Тверская, 1',
      district: 'ЦАО',
      coordinates: [55.7558, 37.6173],
      assetRequirements: [
        {
          id: generateId(),
          type: AssetType.TRUCK,
          contractorId: '',
          contractorName: '',
          plannedUnits: 2,
          customerPrice: 3500,
          contractorPrice: 2800,
          priceUnit: 'За рейс' as any,
          minimalCharge: 0,
          deliveryCharge: 0,
        },
      ],
      isBirzhaOpen: true,
      bids: [],
      assignments: [],
      assignedDrivers: [],
      driverDetails: [],
      applicants: [],
      plannedTrips: 10,
      actualTrips: 0,
      evidences: [],
      isPaid: false,
      scheduledTime: now.slice(0, 16),
      status: OrderStatus.NEW_REQUEST,
      managerName: DEFAULT_MANAGERS[0],
      createdAt: now,
      updatedAt: now,
      actionLog: [],
      messages: [],
      unreadMessages: 0,
    },
  ];
}

export default function App() {
  const [role, setRole] = useState<Role>(() => (localStorage.getItem(LS_KEYS.role) as Role) || 'dispatcher');
  const [currentManager, setCurrentManager] = useState<ManagerName>(() => (localStorage.getItem(LS_KEYS.manager) as ManagerName) || DEFAULT_MANAGERS[0]);

  const [customers, setCustomers] = useState<Customer[]>(() => safeJsonParse(localStorage.getItem(LS_KEYS.customers), seedCustomers()));
  const [contractors, setContractors] = useState<Contractor[]>(() => safeJsonParse(localStorage.getItem(LS_KEYS.contractors), seedContractors()));
  const [orders, setOrders] = useState<Order[]>(() => safeJsonParse(localStorage.getItem(LS_KEYS.orders), seedOrders(seedCustomers())));

  const [view, setView] = useState<'dashboard' | 'order-form' | 'customer-form' | 'contractor-form'>('dashboard');
  const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
  const [selectedMapOrder, setSelectedMapOrder] = useState<Order | null>(null);

  const [currentContractorId, setCurrentContractorId] = useState<string>(() => localStorage.getItem(LS_KEYS.contractorId) || contractors[0]?.id || '');
  const [driverName, setDriverName] = useState<string>(() => localStorage.getItem(LS_KEYS.driverName) || 'ВОДИТЕЛЬ');
  const [driverContractorId, setDriverContractorId] = useState<string>(() => localStorage.getItem(LS_KEYS.driverContractorId) || contractors[0]?.id || '');

  // Persist
  useEffect(() => localStorage.setItem(LS_KEYS.role, role), [role]);
  useEffect(() => localStorage.setItem(LS_KEYS.manager, currentManager), [currentManager]);
  useEffect(() => localStorage.setItem(LS_KEYS.contractorId, currentContractorId), [currentContractorId]);
  useEffect(() => localStorage.setItem(LS_KEYS.driverName, driverName), [driverName]);
  useEffect(() => localStorage.setItem(LS_KEYS.driverContractorId, driverContractorId), [driverContractorId]);

  useEffect(() => localStorage.setItem(LS_KEYS.customers, JSON.stringify(customers)), [customers]);
  useEffect(() => localStorage.setItem(LS_KEYS.contractors, JSON.stringify(contractors)), [contractors]);
  useEffect(() => localStorage.setItem(LS_KEYS.orders, JSON.stringify(orders)), [orders]);

  // Dispatcher actions
  const addOrder = useCallback(
    (partial: Partial<Order>) => {
      const now = new Date().toISOString();
      const order: Order = {
        id: partial.id || generateId(),
        orderNumber: partial.orderNumber || generateOrderNumber(),
        customer: partial.customer || '',
        customerId: partial.customerId,
        contactInfo: partial.contactInfo,
        address: partial.address || '',
        district: partial.district,
        coordinates: partial.coordinates || [55.7512, 37.6184],
        restrictions: partial.restrictions,
        assetRequirements: partial.assetRequirements || [],
        isBirzhaOpen: partial.isBirzhaOpen ?? false,
        marketPosts: partial.marketPosts,
        bids: partial.bids || [],
        assignments: partial.assignments || [],
        assignedDrivers: partial.assignedDrivers || [],
        driverDetails: partial.driverDetails || [],
        applicants: partial.applicants || [],
        plannedTrips: partial.plannedTrips || 0,
        actualTrips: partial.actualTrips || 0,
        evidences: partial.evidences || [],
        quotes: partial.quotes,
        currentQuote: partial.currentQuote,
        earnings: partial.earnings,
        isPaid: partial.isPaid ?? false,
        totalCustomerPrice: partial.totalCustomerPrice,
        totalContractorPrice: partial.totalContractorPrice,
        scheduledTime: partial.scheduledTime || now.slice(0, 16),
        startedAt: partial.startedAt,
        completedAt: partial.completedAt,
        status: (partial.status as OrderStatus) || OrderStatus.NEW_REQUEST,
        isFrozen: partial.isFrozen,
        managerName: (partial.managerName as ManagerName) || currentManager,
        managerId: partial.managerId,
        messages: partial.messages || [],
        unreadMessages: partial.unreadMessages || 0,
        actionLog: partial.actionLog || [],
        createdAt: partial.createdAt || now,
        updatedAt: now,
        documents: partial.documents,
        feedback: partial.feedback,
      };
      setOrders(prev => [order, ...prev]);
    },
    [currentManager]
  );

  const updateOrder = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? ({ ...o, ...updates, updatedAt: new Date().toISOString() } as Order) : o))
    );
  }, []);

  const onSubmitOrderForm = useCallback(
    (data: Partial<Order>) => {
      if (editingOrder?.id) updateOrder(editingOrder.id, data);
      else addOrder(data);
      setEditingOrder(undefined);
      setView('dashboard');
    },
    [addOrder, updateOrder, editingOrder?.id]
  );

  const addCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => [customer, ...prev.filter(c => c.id !== customer.id)]);
    setView('dashboard');
  }, []);

  const addContractor = useCallback((contractor: Contractor) => {
    setContractors(prev => [contractor, ...prev.filter(c => c.id !== contractor.id)]);
    setView('dashboard');
  }, []);

  // Contractor actions
  const submitBid = useCallback((orderId: string, bid: Bid) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? ({ ...o, bids: [...(o.bids || []), bid], updatedAt: new Date().toISOString() } as Order) : o))
    );
  }, []);

  const withdrawBid = useCallback((orderId: string, bidId: string) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? ({ ...o, bids: (o.bids || []).map(b => (b.id === bidId ? { ...b, status: 'withdrawn' } : b)) } as Order)
          : o
      )
    );
  }, []);

  const onUpdateContractor = useCallback((contractor: Contractor) => {
    setContractors(prev => prev.map(c => (c.id === contractor.id ? contractor : c)));
  }, []);

  // Driver actions
  const reportTrip = useCallback((orderId: string, evidence: TripEvidence) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const evidences = [...(o.evidences || []), evidence];
        return {
          ...o,
          evidences,
          updatedAt: new Date().toISOString(),
        } as Order;
      })
    );
  }, []);

  const acceptJob = useCallback((orderId: string, contractorId: string, assetType: AssetType) => {
    const contractor = contractors.find(c => c.id === contractorId);
    const assignment: DriverAssignment = {
      id: generateId(),
      orderId,
      driverName,
      driverId: undefined,
      contractorId,
      contractorName: contractor?.name,
      assetType,
      vehicleNumber: '',
      assignedPrice: 0,
      priceUnit: 'За рейс' as any,
      assignedAt: new Date().toISOString(),
      assignedBy: 'SYSTEM',
      status: 'assigned',
    };

    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? ({
              ...o,
              assignments: [...(o.assignments || []), assignment],
              driverDetails: [...(o.driverDetails || []), assignment],
              status: o.status === OrderStatus.NEW_REQUEST ? OrderStatus.EQUIPMENT_APPROVED : o.status,
              updatedAt: new Date().toISOString(),
            } as Order)
          : o
      )
    );
  }, [contractors, driverName]);

  const finishWork = useCallback((orderId: string) => {
    updateOrder(orderId, { status: OrderStatus.EXPORT_COMPLETED });
  }, [updateOrder]);

  const headerRight = useMemo(() => {
    if (role === 'dispatcher') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
            value={currentManager}
            onChange={e => setCurrentManager(e.target.value as ManagerName)}
          >
            {DEFAULT_MANAGERS.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-black"
            onClick={() => {
              setEditingOrder(undefined);
              setView('order-form');
            }}
          >
            + Заказ
          </button>
          <button className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-black" onClick={() => setView('customer-form')}>
            + Клиент
          </button>
          <button className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-black" onClick={() => setView('contractor-form')}>
            + Подрядчик
          </button>
        </div>
      );
    }
    if (role === 'contractor') {
      return (
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
          value={currentContractorId}
          onChange={e => setCurrentContractorId(e.target.value)}
        >
          {contractors.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      );
    }
    if (role === 'driver') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
            value={driverName}
            onChange={e => setDriverName(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
            value={driverContractorId}
            onChange={e => setDriverContractorId(e.target.value)}
          >
            {contractors.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return null;
  }, [contractors, currentContractorId, currentManager, driverContractorId, driverName, role]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="font-black tracking-tight text-lg">SnowForce Dispatch</div>
            <div className="flex items-center gap-2">
              {(['dispatcher', 'customer', 'contractor', 'driver'] as Role[]).map(r => (
                <button
                  key={r}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${
                    role === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                  onClick={() => {
                    setRole(r);
                    setView('dashboard');
                    setSelectedMapOrder(null);
                  }}
                >
                  {r === 'dispatcher' ? 'Диспетчер' : r === 'customer' ? 'Клиент' : r === 'contractor' ? 'Подрядчик' : 'Водитель'}
                </button>
              ))}
            </div>
          </div>

          {headerRight}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {role === 'dispatcher' && view === 'dashboard' && (
          <div className="space-y-6">
            <MapDashboard orders={orders} onSelectOrder={o => setSelectedMapOrder(o)} />

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">Заказы</div>
                  <div className="text-2xl font-black tracking-tight">Панель диспетчера</div>
                </div>
                {selectedMapOrder && (
                  <button
                    className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-black"
                    onClick={() => {
                      setEditingOrder(selectedMapOrder);
                      setView('order-form');
                    }}
                  >
                    Редактировать выбранный
                  </button>
                )}
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                    <tr>
                      <th className="py-2 pr-4">№</th>
                      <th className="py-2 pr-4">Клиент</th>
                      <th className="py-2 pr-4">Адрес</th>
                      <th className="py-2 pr-4">Статус</th>
                      <th className="py-2 pr-4">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4 font-black">{o.orderNumber || o.id}</td>
                        <td className="py-3 pr-4 font-bold">{o.customer}</td>
                        <td className="py-3 pr-4">{o.address}</td>
                        <td className="py-3 pr-4 font-bold">{o.status}</td>
                        <td className="py-3 pr-4">
                          <button
                            className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-black"
                            onClick={() => {
                              setEditingOrder(o);
                              setView('order-form');
                            }}
                          >
                            Открыть
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {role === 'dispatcher' && view === 'order-form' && (
          <OrderForm
            initialData={editingOrder}
            contractors={contractors}
            customers={customers}
            allOrders={orders}
            onSubmit={onSubmitOrderForm}
            onCancel={() => {
              setEditingOrder(undefined);
              setView('dashboard');
            }}
            onAddContractor={() => setView('contractor-form')}
            onAddCustomer={() => setView('customer-form')}
            currentUser={currentManager}
          />
        )}

        {role === 'dispatcher' && view === 'customer-form' && (
          <CustomerFormDispatcher
            onSubmit={addCustomer}
            onCancel={() => setView('dashboard')}
          />
        )}

        {role === 'dispatcher' && view === 'contractor-form' && (
          <ContractorForm
            onSubmit={addContractor}
            onCancel={() => setView('dashboard')}
          />
        )}

        {role === 'customer' && <CustomerPortal orders={orders} onAddOrder={addOrder} onUpdateOrder={updateOrder} />}

        {role === 'contractor' && (
          <ContractorPortal
            orders={orders}
            contractors={contractors}
            currentContractorId={currentContractorId || contractors[0]?.id || ''}
            onSubmitBid={submitBid}
            onWithdrawBid={withdrawBid}
            onUpdateContractor={onUpdateContractor}
          />
        )}

        {role === 'driver' && (
          <DriverPortal
            orders={orders}
            contractors={contractors}
            driverName={driverName}
            driverContractorId={driverContractorId || contractors[0]?.id || ''}
            onReportTrip={reportTrip}
            onAcceptJob={acceptJob}
            onFinishWork={finishWork}
          />
        )}
      </div>
    </div>
  );
}

