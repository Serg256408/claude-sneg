import React, { useState, useMemo } from 'react';
import {
  User,
  UserRole,
  Company,
  CompanyType,
  PriceBookItem,
  ServiceType,
  CommissionSettings,
  Vehicle,
  AssetType,
  generateId,
  formatPrice,
  USER_ROLE_LABELS,
  SERVICE_TYPE_LABELS,
  MOSCOW_DISTRICTS,
} from './types';

interface AdminPanelProps {
  users: User[];
  companies: Company[];
  priceBook: PriceBookItem[];
  commissionSettings: CommissionSettings | null;
  vehicles: Vehicle[];
  onAddUser: (user: User) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onAddCompany: (company: Company) => void;
  onUpdateCompany: (companyId: string, updates: Partial<Company>) => void;
  onAddPriceItem: (item: PriceBookItem) => void;
  onUpdatePriceItem: (itemId: string, updates: Partial<PriceBookItem>) => void;
  onDeletePriceItem: (itemId: string) => void;
  onUpdateCommissionSettings: (settings: CommissionSettings) => void;
  onAddVehicle: (vehicle: Vehicle) => void;
  onUpdateVehicle: (vehicleId: string, updates: Partial<Vehicle>) => void;
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

export default function AdminPanel({
  users,
  companies,
  priceBook,
  commissionSettings,
  vehicles,
  onAddUser,
  onUpdateUser,
  onAddCompany,
  onUpdateCompany,
  onAddPriceItem,
  onUpdatePriceItem,
  onDeletePriceItem,
  onUpdateCommissionSettings,
  onAddVehicle,
  onUpdateVehicle,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'prices' | 'commissions' | 'vehicles'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const settings = commissionSettings || DEFAULT_COMMISSION;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Администрирование</h1>
        <p className="text-slate-500">Управление справочниками и настройками системы</p>
      </div>

      {/* Табы */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('users')}
        >
          Пользователи ({users.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'companies' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('companies')}
        >
          Компании ({companies.length})
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
          Техника ({vehicles.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${activeTab === 'commissions' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
          onClick={() => setActiveTab('commissions')}
        >
          Комиссии
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
                {users.map(user => (
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
                {companies.map(company => (
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
                {vehicles.map(vehicle => (
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
    </div>
  );
}
