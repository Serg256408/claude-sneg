
import React, { useState } from 'react';
import { Contractor, Vehicle, AssetType, PaymentType, MOSCOW_DISTRICTS, generateId } from './types';
import { Plus, Trash2, Car } from 'lucide-react';

interface ContractorFormProps {
  initialData?: Contractor;
  onSubmit: (data: Contractor) => void;
  onCancel: () => void;
  vehicles?: Vehicle[];
  onAddVehicle?: (vehicle: Vehicle) => void;
  onUpdateVehicle?: (vehicleId: string, updates: Partial<Vehicle>) => void;
  onDeleteVehicle?: (vehicleId: string) => void;
}

const COMMON_EQUIPMENT = ["Погрузчик", "Самосвал 20м3", "Самосвал 15м3", "Трактор JCB", "Экскаватор"];

const ContractorForm: React.FC<ContractorFormProps> = ({ initialData, onSubmit, onCancel, vehicles = [], onAddVehicle, onUpdateVehicle, onDeleteVehicle }) => {
  const [formData, setFormData] = useState<Contractor>(initialData || {
    id: generateId(),
    name: '',
    phone: '',
    email: '',
    inn: '',
    equipment: [],
    districts: [],
    paymentType: PaymentType.CASH,
    rating: 0,
    completedOrders: 0,
    comments: '',
    isVerified: false,
    createdAt: new Date().toISOString()
  });

  const [newEquipment, setNewEquipment] = useState('');

  // Автомобили этого подрядчика
  const contractorVehicles = vehicles.filter(v => v.ownerCompanyId === formData.id);

  // Форма нового авто
  const [newVehicle, setNewVehicle] = useState({
    plateNumber: '',
    brand: '',
    type: AssetType.TRUCK as AssetType,
    capacityM3: '',
  });
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const addEquipment = (item?: string) => {
    const value = (item || newEquipment).trim();
    if (value && !formData.equipment.includes(value)) {
      setFormData({ ...formData, equipment: [...formData.equipment, value] });
      setNewEquipment('');
    }
  };

  const removeEquipment = (item: string) => {
    setFormData({ ...formData, equipment: formData.equipment.filter(e => e !== item) });
  };

  const toggleDistrict = (district: string) => {
    setFormData(prev => ({
      ...prev,
      districts: prev.districts.includes(district)
        ? prev.districts.filter(d => d !== district)
        : [...prev.districts, district]
    }));
  };

  const handleAddVehicle = () => {
    if (!newVehicle.plateNumber.trim()) return;
    const vehicle: Vehicle = {
      id: generateId(),
      ownerCompanyId: formData.id,
      ownerCompanyName: formData.name,
      ownerType: 'contractor',
      type: newVehicle.type,
      plateNumber: newVehicle.plateNumber.trim().toUpperCase(),
      brand: newVehicle.brand.trim() || undefined,
      capacityM3: newVehicle.capacityM3 ? Number(newVehicle.capacityM3) : undefined,
      gpsEnabled: false,
      status: 'available',
      createdAt: new Date().toISOString(),
    };
    onAddVehicle?.(vehicle);
    setNewVehicle({ plateNumber: '', brand: '', type: AssetType.TRUCK, capacityM3: '' });
    setShowVehicleForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
          {initialData ? '⚙️ Редактировать подрядчика' : '🚛 Новый подрядчик'}
        </h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Данные в базу техники</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Организация / ИП</label>
            <input
              required
              type="text"
              placeholder="Название"
              className="w-full rounded-xl border-slate-200 bg-slate-50 p-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Контактный номер</label>
            <input
              required
              type="text"
              placeholder="+7 (___) ___-__-__"
              className="w-full rounded-xl border-slate-200 bg-slate-50 p-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</label>
            <input
              type="email"
              placeholder="info@contractor.ru"
              className="w-full rounded-xl border-slate-200 bg-slate-50 p-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ИНН</label>
            <input
              type="text"
              placeholder="7700000000"
              className="w-full rounded-xl border-slate-200 bg-slate-50 p-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={formData.inn || ''}
              onChange={e => setFormData({ ...formData, inn: e.target.value })}
            />
          </div>
        </div>

        {/* === АВТОМОБИЛИ === */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Car size={12} className="inline mr-1" />
              Автомобили ({contractorVehicles.length})
            </label>
            <button
              type="button"
              onClick={() => setShowVehicleForm(!showVehicleForm)}
              className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Plus size={12} /> Добавить авто
            </button>
          </div>

          {/* Форма добавления нового авто */}
          {showVehicleForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Госномер *</label>
                  <input
                    type="text"
                    placeholder="А 123 АА 77"
                    className="w-full rounded-lg border-slate-200 bg-white p-2 text-sm font-black uppercase focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newVehicle.plateNumber}
                    onChange={e => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Марка</label>
                  <input
                    type="text"
                    placeholder="КАМАЗ"
                    className="w-full rounded-lg border-slate-200 bg-white p-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newVehicle.brand}
                    onChange={e => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Тип техники</label>
                  <select
                    className="w-full rounded-lg border-slate-200 bg-white p-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newVehicle.type}
                    onChange={e => setNewVehicle({ ...newVehicle, type: e.target.value as AssetType })}
                  >
                    {Object.values(AssetType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Объём м³</label>
                  <input
                    type="number"
                    placeholder="20"
                    className="w-full rounded-lg border-slate-200 bg-white p-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newVehicle.capacityM3}
                    onChange={e => setNewVehicle({ ...newVehicle, capacityM3: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowVehicleForm(false)}
                  className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleAddVehicle}
                  disabled={!newVehicle.plateNumber.trim()}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase disabled:opacity-30 hover:bg-blue-700 transition-colors"
                >
                  Добавить
                </button>
              </div>
            </div>
          )}

          {/* Список автомобилей */}
          {contractorVehicles.length > 0 ? (
            <div className="space-y-1.5">
              {contractorVehicles.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider flex-shrink-0">
                      {v.plateNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-600 truncate">
                      {v.brand || v.type}
                    </span>
                    {v.capacityM3 && (
                      <span className="text-[10px] text-slate-400">{v.capacityM3}м³</span>
                    )}
                    <span className="text-[10px] text-slate-400">{v.type}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteVehicle?.(v.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                    title="Удалить"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-300 italic">
              Нет автомобилей. Нажмите «Добавить авто» чтобы внести госномера.
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Техника в парке</label>

          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_EQUIPMENT.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => addEquipment(item)}
                className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all border ${
                  formData.equipment.includes(item)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                + {item}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-xl border-slate-200 bg-slate-50 p-2 text-sm font-medium"
              value={newEquipment}
              onChange={e => setNewEquipment(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
              placeholder="Свой вариант (Enter для добавления)"
            />
            <button
              type="button"
              onClick={() => addEquipment()}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black"
            >
              ОК
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3 min-h-[32px]">
            {formData.equipment.map(item => (
              <span key={item} className="inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100 group">
                {item.includes('Самосвал') ? '🚛' : item.includes('Погрузчик') || item.includes('Трактор') ? '🚜' : '⚙️'} {item}
                <button type="button" onClick={() => removeEquipment(item)} className="ml-2 text-blue-300 hover:text-red-500 transition-colors">
                  ×
                </button>
              </span>
            ))}
            {formData.equipment.length === 0 && <span className="text-[10px] text-slate-300 italic">Техника не выбрана</span>}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Тип оплаты</label>
          <div className="flex flex-wrap gap-3">
            {Object.values(PaymentType).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, paymentType: type })}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  formData.paymentType === type
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xl'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Районы работы</label>
          <div className="flex flex-wrap gap-2">
            {MOSCOW_DISTRICTS.map(district => (
              <button
                key={district}
                type="button"
                onClick={() => toggleDistrict(district)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                  formData.districts.includes(district)
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {district}
              </button>
            ))}
          </div>
          {formData.districts.length === 0 && (
            <div className="mt-2 text-[10px] text-slate-300 italic">Районы не выбраны</div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Примечания (Цены, Ночные смены, Условия)</label>
          <textarea
            className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
            rows={3}
            value={formData.comments}
            onChange={e => setFormData({ ...formData, comments: e.target.value })}
            placeholder="Напр: Только безнал с НДС, работают в САО..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-wider shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all"
          >
            Сохранить в базу
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContractorForm;
