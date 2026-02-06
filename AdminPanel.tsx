import React, { useState, useMemo } from 'react';
import {
  User,
  UserRole,
  Company,
  CompanyType,
  PriceBookItem,
  ServiceType,
  CommissionSettings,
  CompanySettings,
  Vehicle,
  AssetType,
  generateId,
  formatPrice,
  formatDateTime,
  USER_ROLE_LABELS,
  SERVICE_TYPE_LABELS,
  MOSCOW_DISTRICTS,
  ActivityLogEntry,
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ENTITY_LABELS,
} from './types';

interface AdminPanelProps {
  users: User[];
  companies: Company[];
  priceBook: PriceBookItem[];
  commissionSettings: CommissionSettings | null;
  companySettings: CompanySettings | null;
  vehicles: Vehicle[];
  onAddUser: (user: User) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onAddCompany: (company: Company) => void;
  onUpdateCompany: (companyId: string, updates: Partial<Company>) => void;
  onAddPriceItem: (item: PriceBookItem) => void;
  onUpdatePriceItem: (itemId: string, updates: Partial<PriceBookItem>) => void;
  onDeletePriceItem: (itemId: string) => void;
  onUpdateCommissionSettings: (settings: CommissionSettings) => void;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  onAddVehicle: (vehicle: Vehicle) => void;
  onUpdateVehicle: (vehicleId: string, updates: Partial<Vehicle>) => void;
  // Журнал действий
  activityLog: ActivityLogEntry[];
  onRevertActivity: (entry: ActivityLogEntry) => void;
  onClearActivityLog: () => void;
}

// Дефолтные настройки комиссий
const DEFAULT_COMMISSION: CommissionSettings = {
  id: 'default',
  name: 'Стандартные настройки',
  platformCommissionType: 'percent',
  platformCommissionPercent: 7,
  acquiringFeePercent: 2,
  managerBonusType: 'gross_profit_percent',
  managerBonusRate: 10,
  cancellationPenaltyPercent: 20,
  isActive: true,
  createdAt: new Date().toISOString(),
};

// Дефолтные настройки компании (реквизиты Транском)
const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: 'transkom',
  name: 'Транском',
  fullName: 'ООО "Транском"',
  legalAddress: 'Московская область, г. Балашиха',
  inn: '5001098904',
  kpp: '500101001',
  ogrn: '1145001001530',
  bankName: 'Московский филиал ПАО «Промсвязьбанк»',
  bankAccount: '40702810900000035482',
  corrAccount: '30101810400000000555',
  bik: '044525555',
  directorName: 'Терехов Сергей Юрьевич',
  directorPosition: 'Генеральный директор',
  phone: '8-915-019-59-41',
  email: 'Spezavtoteh@gmail.com',
  createdAt: new Date().toISOString(),
};

export default function AdminPanel({
  users,
  companies,
  priceBook,
  commissionSettings,
  companySettings,
  vehicles,
  onAddUser,
  onUpdateUser,
  onAddCompany,
  onUpdateCompany,
  onAddPriceItem,
  onUpdatePriceItem,
  onDeletePriceItem,
  onUpdateCommissionSettings,
  onUpdateCompanySettings,
  onAddVehicle,
  onUpdateVehicle,
  activityLog,
  onRevertActivity,
  onClearActivityLog,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'prices' | 'commissions' | 'vehicles' | 'requisites' | 'activity_log'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const settings = commissionSettings || DEFAULT_COMMISSION;

  // Отфильтрованные данные по поиску
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      [u.name, u.email, u.phone, USER_ROLE_LABELS[u.role]].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(c =>
      [c.name, c.inn, c.address, c.email, c.phone].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return vehicles;
    const q = searchQuery.toLowerCase();
    return vehicles.filter(v =>
      [v.model, v.plateNumber, v.ownerName].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [vehicles, searchQuery]);

  // Форма пользователя
  const [newUser, setNewUser] = useState<Partial<User>>({
    role: UserRole.CUSTOMER,
    status: 'active',
  });

  const handleSaveUser = () => {
    if (!newUser.name || !newUser.phone) {
      alert('Заполните имя и телефон');
      return;
    }
    if (editingItem) {
      onUpdateUser(editingItem.id, newUser);
    } else {
      const user: User = {
        id: generateId(),
        role: newUser.role || UserRole.CUSTOMER,
        phone: newUser.phone || '',
        email: newUser.email,
        name: newUser.name || '',
        companyName: newUser.companyName,
        companyId: newUser.companyId,
        status: newUser.status || 'active',
        createdAt: new Date().toISOString(),
      };
      onAddUser(user);
    }
    setNewUser({ role: UserRole.CUSTOMER, status: 'active' });
    setShowUserForm(false);
    setEditingItem(null);
  };

  // Форма компании
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    type: CompanyType.CUSTOMER,
    defaultPaymentType: 'С НДС 20%' as any,
    isVerified: false,
  });

  const handleSaveCompany = () => {
    if (!newCompany.name || !newCompany.inn) {
      alert('Заполните название и ИНН');
      return;
    }
    if (editingItem) {
      onUpdateCompany(editingItem.id, newCompany);
    } else {
      const company: Company = {
        id: generateId(),
        type: newCompany.type || CompanyType.CUSTOMER,
        name: newCompany.name || '',
        inn: newCompany.inn || '',
        kpp: newCompany.kpp,
        legalAddress: newCompany.legalAddress || '',
        actualAddress: newCompany.actualAddress,
        bankName: newCompany.bankName,
        bankBik: newCompany.bankBik,
        bankAccount: newCompany.bankAccount,
        phone: newCompany.phone || '',
        email: newCompany.email,
        defaultPaymentType: newCompany.defaultPaymentType || 'С НДС 20%' as any,
        isVerified: newCompany.isVerified || false,
        createdAt: new Date().toISOString(),
      };
      onAddCompany(company);
    }
    setNewCompany({ type: CompanyType.CUSTOMER, defaultPaymentType: 'С НДС 20%' as any, isVerified: false });
    setShowCompanyForm(false);
    setEditingItem(null);
  };

  // Форма позиции прайса
  const [newPrice, setNewPrice] = useState<Partial<PriceBookItem>>({
    serviceType: ServiceType.SNOW,
    unit: 'trip',
    isActive: true,
  });

  const handleSavePrice = () => {
    if (!newPrice.workTypeName || !newPrice.baseCustomerPrice) {
      alert('Заполните название и цену');
      return;
    }
    if (editingItem) {
      onUpdatePriceItem(editingItem.id, newPrice);
    } else {
      const item: PriceBookItem = {
        id: generateId(),
        workTypeId: generateId(),
        workTypeName: newPrice.workTypeName || '',
        serviceType: newPrice.serviceType || ServiceType.SNOW,
        unit: newPrice.unit || 'trip',
        unitLabel: newPrice.unitLabel || 'шт.',
        baseCustomerPrice: newPrice.baseCustomerPrice || 0,
        baseCostPrice: newPrice.baseCostPrice || 0,
        minimalCharge: newPrice.minimalCharge,
        isActive: newPrice.isActive ?? true,
        createdAt: new Date().toISOString(),
      };
      onAddPriceItem(item);
    }
    setNewPrice({ serviceType: ServiceType.SNOW, unit: 'trip', isActive: true });
    setShowPriceForm(false);
    setEditingItem(null);
  };

  // Форма техники
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    type: AssetType.TRUCK,
    ownerType: 'transkom',
    gpsEnabled: false,
    status: 'available',
  });

  const handleSaveVehicle = () => {
    if (!newVehicle.plateNumber) {
      alert('Заполните госномер');
      return;
    }
    if (editingItem) {
      onUpdateVehicle(editingItem.id, newVehicle);
    } else {
      const vehicle: Vehicle = {
        id: generateId(),
        ownerCompanyId: newVehicle.ownerCompanyId || 'transkom',
        ownerCompanyName: newVehicle.ownerCompanyName || 'Транском',
        ownerType: newVehicle.ownerType || 'transkom',
        type: newVehicle.type || AssetType.TRUCK,
        plateNumber: newVehicle.plateNumber || '',
        brand: newVehicle.brand,
        model: newVehicle.model,
        year: newVehicle.year,
        capacityM3: newVehicle.capacityM3,
        capacityTons: newVehicle.capacityTons,
        gpsEnabled: newVehicle.gpsEnabled || false,
        status: newVehicle.status || 'available',
        createdAt: new Date().toISOString(),
      };
      onAddVehicle(vehicle);
    }
    setNewVehicle({ type: AssetType.TRUCK, ownerType: 'transkom', gpsEnabled: false, status: 'available' });
    setShowVehicleForm(false);
    setEditingItem(null);
  };

  // Сохранение настроек комиссий
  const [editingSettings, setEditingSettings] = useState<CommissionSettings>(settings);

  const handleSaveSettings = () => {
    onUpdateCommissionSettings(editingSettings);
  };

  // Редактирование реквизитов компании
  const companyData = companySettings || DEFAULT_COMPANY_SETTINGS;
  const [editingCompanySettings, setEditingCompanySettings] = useState<CompanySettings>(companyData);

  const handleSaveCompanySettings = () => {
    onUpdateCompanySettings({
      ...editingCompanySettings,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Администрирование</h1>
        <p className="text-slate-500">Управление справочниками и настройками системы</p>
      </div>

      {/* Поиск */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Поиск по имени, телефону, роли, компании, ИНН..."
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
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('users')}
        >
          Пользователи ({filteredUsers.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'companies' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('companies')}
        >
          Компании ({filteredCompanies.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'prices' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('prices')}
        >
          Прайс-лист ({priceBook.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'vehicles' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('vehicles')}
        >
          Техника ({filteredVehicles.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'commissions' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('commissions')}
        >
          Комиссии
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'requisites' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('requisites')}
        >
          Реквизиты компании
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap relative ${activeTab === 'activity_log' ? 'bg-amber-500 text-white' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}
          onClick={() => setActiveTab('activity_log')}
        >
          Журнал действий
          {activityLog.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white">
              {activityLog.length > 99 ? '99+' : activityLog.length}
            </span>
          )}
        </button>
      </div>

      {/* Пользователи */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">Пользователи</h2>
            <button
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
              onClick={() => { setEditingItem(null); setNewUser({ role: UserRole.CUSTOMER, status: 'active' }); setShowUserForm(true); }}
            >
              + Добавить
            </button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                <tr>
                  <th className="py-2 pr-4">Имя</th>
                  <th className="py-2 pr-4">Телефон</th>
                  <th className="py-2 pr-4">Роль</th>
                  <th className="py-2 pr-4">Статус</th>
                  <th className="py-2">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td className="py-3 pr-4 font-bold">{user.name}</td>
                    <td className="py-3 pr-4">{user.phone}</td>
                    <td className="py-3 pr-4">{USER_ROLE_LABELS[user.role]}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.status === 'active' ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        className="text-blue-600 hover:underline text-sm"
                        onClick={() => { setEditingItem(user); setNewUser(user); setShowUserForm(true); }}
                      >
                        Изменить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Компании */}
      {activeTab === 'companies' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">Компании</h2>
            <button
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
              onClick={() => { setEditingItem(null); setNewCompany({ type: CompanyType.CUSTOMER }); setShowCompanyForm(true); }}
            >
              + Добавить
            </button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                <tr>
                  <th className="py-2 pr-4">Название</th>
                  <th className="py-2 pr-4">ИНН</th>
                  <th className="py-2 pr-4">Тип</th>
                  <th className="py-2 pr-4">Телефон</th>
                  <th className="py-2">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map(company => (
                  <tr key={company.id}>
                    <td className="py-3 pr-4 font-bold">{company.name}</td>
                    <td className="py-3 pr-4">{company.inn}</td>
                    <td className="py-3 pr-4">
                      {company.type === CompanyType.CUSTOMER ? 'Клиент' :
                       company.type === CompanyType.CONTRACTOR ? 'Подрядчик' : 'Транском'}
                    </td>
                    <td className="py-3 pr-4">{company.phone}</td>
                    <td className="py-3">
                      <button
                        className="text-blue-600 hover:underline text-sm"
                        onClick={() => { setEditingItem(company); setNewCompany(company); setShowCompanyForm(true); }}
                      >
                        Изменить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Прайс-лист */}
      {activeTab === 'prices' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">Прайс-лист</h2>
            <button
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
              onClick={() => { setEditingItem(null); setNewPrice({ serviceType: ServiceType.SNOW, unit: 'trip', isActive: true }); setShowPriceForm(true); }}
            >
              + Добавить
            </button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                <tr>
                  <th className="py-2 pr-4">Наименование</th>
                  <th className="py-2 pr-4">Услуга</th>
                  <th className="py-2 pr-4">Ед.</th>
                  <th className="py-2 pr-4">Цена клиента</th>
                  <th className="py-2 pr-4">Себестоимость</th>
                  <th className="py-2 pr-4">Маржа</th>
                  <th className="py-2">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priceBook.map(item => {
                  const margin = item.baseCustomerPrice > 0
                    ? ((item.baseCustomerPrice - item.baseCostPrice) / item.baseCustomerPrice * 100).toFixed(1)
                    : '0';
                  return (
                    <tr key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
                      <td className="py-3 pr-4 font-bold">{item.workTypeName}</td>
                      <td className="py-3 pr-4">{SERVICE_TYPE_LABELS[item.serviceType]}</td>
                      <td className="py-3 pr-4">{item.unitLabel}</td>
                      <td className="py-3 pr-4 font-bold">{formatPrice(item.baseCustomerPrice)}</td>
                      <td className="py-3 pr-4">{formatPrice(item.baseCostPrice)}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${Number(margin) > 20 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {margin}%
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          className="text-blue-600 hover:underline text-sm mr-2"
                          onClick={() => { setEditingItem(item); setNewPrice(item); setShowPriceForm(true); }}
                        >
                          Изменить
                        </button>
                        <button
                          className="text-red-600 hover:underline text-sm"
                          onClick={() => onDeletePriceItem(item.id)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Техника */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">Техника</h2>
            <button
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
              onClick={() => { setEditingItem(null); setNewVehicle({ type: AssetType.TRUCK, ownerType: 'transkom', status: 'available' }); setShowVehicleForm(true); }}
            >
              + Добавить
            </button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-400 uppercase text-[10px] tracking-widest font-black">
                <tr>
                  <th className="py-2 pr-4">Госномер</th>
                  <th className="py-2 pr-4">Тип</th>
                  <th className="py-2 pr-4">Владелец</th>
                  <th className="py-2 pr-4">Вместимость</th>
                  <th className="py-2 pr-4">Статус</th>
                  <th className="py-2">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map(vehicle => (
                  <tr key={vehicle.id}>
                    <td className="py-3 pr-4 font-bold">{vehicle.plateNumber}</td>
                    <td className="py-3 pr-4">{vehicle.type}</td>
                    <td className="py-3 pr-4">{vehicle.ownerCompanyName}</td>
                    <td className="py-3 pr-4">{vehicle.capacityM3 ? `${vehicle.capacityM3} м³` : '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        vehicle.status === 'available' ? 'bg-green-100 text-green-800' :
                        vehicle.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {vehicle.status === 'available' ? 'Свободна' :
                         vehicle.status === 'busy' ? 'Занята' :
                         vehicle.status === 'maintenance' ? 'На ТО' : 'Неактивна'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        className="text-blue-600 hover:underline text-sm"
                        onClick={() => { setEditingItem(vehicle); setNewVehicle(vehicle); setShowVehicleForm(true); }}
                      >
                        Изменить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Комиссии */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
          <h2 className="text-xl font-black mb-6">Настройки комиссий</h2>
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="font-bold mb-3">Комиссия платформы (для биржи)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Тип</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingSettings.platformCommissionType}
                    onChange={e => setEditingSettings({ ...editingSettings, platformCommissionType: e.target.value as any })}
                  >
                    <option value="percent">Процент</option>
                    <option value="fixed">Фиксированная</option>
                    <option value="percent_plus_fixed">Процент + фикс</option>
                  </select>
                </div>
                {(editingSettings.platformCommissionType === 'percent' || editingSettings.platformCommissionType === 'percent_plus_fixed') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Процент %</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2"
                      value={editingSettings.platformCommissionPercent || ''}
                      onChange={e => setEditingSettings({ ...editingSettings, platformCommissionPercent: Number(e.target.value) })}
                    />
                  </div>
                )}
                {(editingSettings.platformCommissionType === 'fixed' || editingSettings.platformCommissionType === 'percent_plus_fixed') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Фикс, ₽</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2"
                      value={editingSettings.platformCommissionFixed || ''}
                      onChange={e => setEditingSettings({ ...editingSettings, platformCommissionFixed: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3">Эквайринг</h3>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Комиссия %</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 max-w-[200px]"
                  value={editingSettings.acquiringFeePercent || ''}
                  onChange={e => setEditingSettings({ ...editingSettings, acquiringFeePercent: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3">Бонусы менеджерам</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Тип</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingSettings.managerBonusType}
                    onChange={e => setEditingSettings({ ...editingSettings, managerBonusType: e.target.value as any })}
                  >
                    <option value="gross_profit_percent">% от прибыли</option>
                    <option value="revenue_percent">% от выручки</option>
                    <option value="fixed">Фиксированный</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Значение</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingSettings.managerBonusRate || ''}
                    onChange={e => setEditingSettings({ ...editingSettings, managerBonusRate: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3">Штрафы</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">За отмену %</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingSettings.cancellationPenaltyPercent || ''}
                    onChange={e => setEditingSettings({ ...editingSettings, cancellationPenaltyPercent: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">За опоздание %</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingSettings.latePenaltyPercent || ''}
                    onChange={e => setEditingSettings({ ...editingSettings, latePenaltyPercent: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <button
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold"
              onClick={handleSaveSettings}
            >
              Сохранить настройки
            </button>
          </div>
        </div>
      )}

      {/* Реквизиты компании */}
      {activeTab === 'requisites' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
          <h2 className="text-xl font-black mb-6">Реквизиты компании</h2>
          <p className="text-slate-500 text-sm mb-6">
            Эти данные будут использоваться во всех документах: счетах, договорах, актах, реестрах.
          </p>
          <div className="space-y-6 max-w-2xl">
            {/* Основные данные */}
            <div className="border-b border-slate-100 pb-6">
              <h3 className="font-bold mb-4 text-slate-700">Основные данные</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Краткое название *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.name || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, name: e.target.value })}
                    placeholder="Транском"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Полное наименование *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.fullName || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, fullName: e.target.value })}
                    placeholder='ООО "Транском"'
                  />
                </div>
              </div>
            </div>

            {/* Регистрационные данные */}
            <div className="border-b border-slate-100 pb-6">
              <h3 className="font-bold mb-4 text-slate-700">Регистрационные данные</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ИНН *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.inn || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, inn: e.target.value })}
                    placeholder="1234567890"
                    maxLength={12}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">КПП *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.kpp || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, kpp: e.target.value })}
                    placeholder="123456789"
                    maxLength={9}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ОГРН *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.ogrn || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, ogrn: e.target.value })}
                    placeholder="1234567890123"
                    maxLength={15}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Юридический адрес *</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={editingCompanySettings.legalAddress || ''}
                  onChange={e => setEditingCompanySettings({ ...editingCompanySettings, legalAddress: e.target.value })}
                  placeholder="Московская область, г. Балашиха..."
                />
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Фактический адрес</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={editingCompanySettings.actualAddress || ''}
                  onChange={e => setEditingCompanySettings({ ...editingCompanySettings, actualAddress: e.target.value })}
                  placeholder="Если отличается от юридического"
                />
              </div>
            </div>

            {/* Банковские реквизиты */}
            <div className="border-b border-slate-100 pb-6">
              <h3 className="font-bold mb-4 text-slate-700">Банковские реквизиты</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Наименование банка *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.bankName || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, bankName: e.target.value })}
                    placeholder='Московский филиал ПАО «Промсвязьбанк»'
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Расчётный счёт *</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2"
                      value={editingCompanySettings.bankAccount || ''}
                      onChange={e => setEditingCompanySettings({ ...editingCompanySettings, bankAccount: e.target.value })}
                      placeholder="40702810900000035482"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Корр. счёт *</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2"
                      value={editingCompanySettings.corrAccount || ''}
                      onChange={e => setEditingCompanySettings({ ...editingCompanySettings, corrAccount: e.target.value })}
                      placeholder="30101810400000000555"
                      maxLength={20}
                    />
                  </div>
                </div>
                <div className="max-w-[200px]">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">БИК *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.bik || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, bik: e.target.value })}
                    placeholder="044525555"
                    maxLength={9}
                  />
                </div>
              </div>
            </div>

            {/* Руководитель и контакты */}
            <div className="border-b border-slate-100 pb-6">
              <h3 className="font-bold mb-4 text-slate-700">Руководитель и контакты</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ФИО руководителя *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.directorName || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, directorName: e.target.value })}
                    placeholder="Терехов Сергей Юрьевич"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Должность</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.directorPosition || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, directorPosition: e.target.value })}
                    placeholder="Генеральный директор"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Телефон *</label>
                  <input
                    type="tel"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.phone || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, phone: e.target.value })}
                    placeholder="+7 (915) 019-59-41"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email *</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={editingCompanySettings.email || ''}
                    onChange={e => setEditingCompanySettings({ ...editingCompanySettings, email: e.target.value })}
                    placeholder="Spezavtoteh@gmail.com"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Сайт</label>
                <input
                  type="url"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={editingCompanySettings.website || ''}
                  onChange={e => setEditingCompanySettings({ ...editingCompanySettings, website: e.target.value })}
                  placeholder="https://transkom.ru"
                />
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-4">
              <button
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold"
                onClick={handleSaveCompanySettings}
              >
                Сохранить реквизиты
              </button>
              <button
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600"
                onClick={() => setEditingCompanySettings(companyData)}
              >
                Сбросить изменения
              </button>
            </div>

            {/* Информация о последнем обновлении */}
            {editingCompanySettings.updatedAt && (
              <p className="text-xs text-slate-400 mt-4">
                Последнее обновление: {new Date(editingCompanySettings.updatedAt).toLocaleString('ru')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Модалка пользователя */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUserForm(false)}>
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-6">{editingItem ? 'Редактировать' : 'Добавить'} пользователя</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Имя *</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newUser.name || ''}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Телефон *</label>
                <input
                  type="tel"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newUser.phone || ''}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newUser.email || ''}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Роль</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newUser.role || UserRole.CUSTOMER}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                >
                  {Object.entries(USER_ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Статус</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newUser.status || 'active'}
                  onChange={e => setNewUser({ ...newUser, status: e.target.value as User['status'] })}
                >
                  <option value="active">Активен</option>
                  <option value="blocked">Заблокирован</option>
                  <option value="pending">Ожидает</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 font-bold" onClick={handleSaveUser}>
                  Сохранить
                </button>
                <button className="px-4 py-3 rounded-xl border border-slate-200 font-bold" onClick={() => setShowUserForm(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка компании */}
      {showCompanyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCompanyForm(false)}>
          <div className="bg-white rounded-[2rem] p-6 max-w-lg w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-6">{editingItem ? 'Редактировать' : 'Добавить'} компанию</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Название *</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newCompany.name || ''}
                  onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ИНН *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newCompany.inn || ''}
                    onChange={e => setNewCompany({ ...newCompany, inn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">КПП</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newCompany.kpp || ''}
                    onChange={e => setNewCompany({ ...newCompany, kpp: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Тип</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newCompany.type || CompanyType.CUSTOMER}
                  onChange={e => setNewCompany({ ...newCompany, type: e.target.value as CompanyType })}
                >
                  <option value={CompanyType.CUSTOMER}>Клиент</option>
                  <option value={CompanyType.CONTRACTOR}>Подрядчик</option>
                  <option value={CompanyType.TRANSKOM}>Транском</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Юридический адрес</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newCompany.legalAddress || ''}
                  onChange={e => setNewCompany({ ...newCompany, legalAddress: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Телефон</label>
                <input
                  type="tel"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newCompany.phone || ''}
                  onChange={e => setNewCompany({ ...newCompany, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 font-bold" onClick={handleSaveCompany}>
                  Сохранить
                </button>
                <button className="px-4 py-3 rounded-xl border border-slate-200 font-bold" onClick={() => setShowCompanyForm(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка прайса */}
      {showPriceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPriceForm(false)}>
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-6">{editingItem ? 'Редактировать' : 'Добавить'} позицию</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Наименование *</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newPrice.workTypeName || ''}
                  onChange={e => setNewPrice({ ...newPrice, workTypeName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Услуга</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newPrice.serviceType || ServiceType.SNOW}
                    onChange={e => setNewPrice({ ...newPrice, serviceType: e.target.value as ServiceType })}
                  >
                    {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Единица</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newPrice.unitLabel || ''}
                    onChange={e => setNewPrice({ ...newPrice, unitLabel: e.target.value })}
                    placeholder="рейс, час, м²..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Цена клиента *</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newPrice.baseCustomerPrice || ''}
                    onChange={e => setNewPrice({ ...newPrice, baseCustomerPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Себестоимость</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newPrice.baseCostPrice || ''}
                    onChange={e => setNewPrice({ ...newPrice, baseCostPrice: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newPrice.isActive ?? true}
                  onChange={e => setNewPrice({ ...newPrice, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" className="text-sm">Активна</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 font-bold" onClick={handleSavePrice}>
                  Сохранить
                </button>
                <button className="px-4 py-3 rounded-xl border border-slate-200 font-bold" onClick={() => setShowPriceForm(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка техники */}
      {showVehicleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowVehicleForm(false)}>
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-6">{editingItem ? 'Редактировать' : 'Добавить'} технику</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Госномер *</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newVehicle.plateNumber || ''}
                  onChange={e => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                  placeholder="А123БВ77"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Тип техники</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newVehicle.type || AssetType.TRUCK}
                  onChange={e => setNewVehicle({ ...newVehicle, type: e.target.value as AssetType })}
                >
                  {Object.values(AssetType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Марка</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newVehicle.brand || ''}
                    onChange={e => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Модель</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newVehicle.model || ''}
                    onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Вместимость м³</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newVehicle.capacityM3 || ''}
                    onChange={e => setNewVehicle({ ...newVehicle, capacityM3: Number(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Год выпуска</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    value={newVehicle.year || ''}
                    onChange={e => setNewVehicle({ ...newVehicle, year: Number(e.target.value) || undefined })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Статус</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  value={newVehicle.status || 'available'}
                  onChange={e => setNewVehicle({ ...newVehicle, status: e.target.value as Vehicle['status'] })}
                >
                  <option value="available">Свободна</option>
                  <option value="busy">Занята</option>
                  <option value="maintenance">На ТО</option>
                  <option value="inactive">Неактивна</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 font-bold" onClick={handleSaveVehicle}>
                  Сохранить
                </button>
                <button className="px-4 py-3 rounded-xl border border-slate-200 font-bold" onClick={() => setShowVehicleForm(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Журнал действий */}
      {activeTab === 'activity_log' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black">Журнал действий</h2>
              <p className="text-sm text-slate-500 mt-1">
                История всех изменений с возможностью отката
              </p>
            </div>
            <button
              className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100"
              onClick={() => {
                if (window.confirm('Очистить весь журнал действий?')) {
                  onClearActivityLog();
                }
              }}
            >
              Очистить журнал
            </button>
          </div>

          {activityLog.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📋</div>
              <div className="text-lg font-bold text-slate-400">Журнал пуст</div>
              <div className="text-sm text-slate-400 mt-1">
                Действия будут записываться автоматически
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {activityLog.map(log => (
                <div
                  key={log.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    log.isReverted
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Иконка типа */}
                    <div className="text-2xl flex-shrink-0">
                      {log.entityType === 'order' && '📦'}
                      {log.entityType === 'customer' && '👤'}
                      {log.entityType === 'contractor' && '🚛'}
                      {log.entityType === 'lead' && '📋'}
                      {log.entityType === 'invoice' && '📄'}
                      {log.entityType === 'payment' && '💳'}
                      {!['order', 'customer', 'contractor', 'lead', 'invoice', 'payment'].includes(log.entityType) && '📝'}
                    </div>

                    {/* Основной контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            log.isReverted ? 'bg-slate-100 text-slate-400' :
                            log.action === 'create' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                            log.action === 'delete' ? 'bg-red-100 text-red-700' :
                            log.action === 'status_change' ? 'bg-violet-100 text-violet-700' :
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ACTIVITY_ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className="text-xs text-slate-400">
                          {ACTIVITY_ENTITY_LABELS[log.entityType] || log.entityType}
                        </span>
                        {log.isReverted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-700">
                            Откачено
                          </span>
                        )}
                      </div>

                      <div className="mt-1 font-bold text-slate-900 truncate">
                        {log.entityName}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        {log.description}
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span>👤 {log.userName}</span>
                        <span>📅 {formatDateTime(log.timestamp)}</span>
                        {log.isReverted && log.revertedAt && (
                          <span>↩️ Откачено: {formatDateTime(log.revertedAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* Кнопка отката */}
                    <div className="flex-shrink-0">
                      {log.isReversible && !log.isReverted ? (
                        <button
                          onClick={() => {
                            if (window.confirm(`Откатить действие "${log.description}"?`)) {
                              onRevertActivity(log);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
                        >
                          ↩️ Откатить
                        </button>
                      ) : log.isReverted ? (
                        <span className="text-xs text-slate-400 italic">Откачено</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Нельзя откатить</span>
                      )}
                    </div>
                  </div>

                  {/* Детали для разработчиков */}
                  <details className="mt-3">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                      Показать детали (JSON)
                    </summary>
                    <div className="mt-2 p-3 bg-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
                      <div className="mb-2">
                        <strong>Было:</strong>
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.prevState, null, 2)?.slice(0, 500) || 'null'}
                          {JSON.stringify(log.prevState)?.length > 500 ? '...' : ''}
                        </pre>
                      </div>
                      <div>
                        <strong>Стало:</strong>
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.newState, null, 2)?.slice(0, 500) || 'null'}
                          {JSON.stringify(log.newState)?.length > 500 ? '...' : ''}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <div className="text-xs text-slate-400">
              Хранится последние 500 записей. Откат возможен для создания, изменения и удаления.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
