
import { ClientEstimateItem, EstimateItem, Category, Resource } from '../types';
import { INITIAL_RESOURCES } from '../constants';

// ══════════════════════════════════════════════════════════
// Разбивка КП на Материалы и Работу
//
// ЛОГИКА:
//   Материалы = закупочная стоимость ресурсов (category=MATERIAL)
//               из внутренней сметы + 15% наценка (доставка и пр.)
//   Работа    = цена КП − Материалы
//
// Пример (песок 200мм, 750м²):
//   Объём = 180 м³, закупка = 180 × 1300 = 234,000
//   Материалы = 234,000 × 1.15 = 269,100
//   КП итого = 501,750
//   Работа = 501,750 − 269,100 = 232,650
//   Работа за м² = 232,650 / 750 = 310 ₽/м²
// ══════════════════════════════════════════════════════════

const DELIVERY_MARKUP = 1.15; // 15% наценка на материалы (доставка)

export interface MaterialWorkItem {
  name: string;
  unit: string;
  quantity: number;
  materialUnitPrice: number;
  workUnitPrice: number;
  materialTotal: number;
  workTotal: number;
  total: number;
  section?: string;
}

export interface MaterialWorkSplit {
  items: MaterialWorkItem[];
  totalMaterials: number;
  totalWork: number;
  grandTotal: number;
}

// ─── Группы (как в clientEstimateBuilder) ───
type KpGroup =
  | 'demolition' | 'earthwork' | 'sand' | 'gravel' | 'geotextile'
  | 'asphalt_primer' | 'asphalt_main'
  | 'curbs' | 'tiles' | 'landscaping'
  | 'drainage_pipe' | 'drainage_grate' | 'drainage_well_new'
  | 'drainage_well_adjust' | 'drainage_well_remove'
  | 'overhead' | 'unknown';

// ─── Справочник ресурсов ───
const resourceById = new Map<string, Resource>();
for (const r of INITIAL_RESOURCES) resourceById.set(r.id, r);

// ─── Классификация внутреннего ресурса → группа (полная, как в clientEstimateBuilder) ───
function classifyResource(res: Resource): KpGroup {
  const sg = res.subGroup || '';
  const name = res.name.toLowerCase();

  if (sg === 'Асфальтобетон' || sg === 'Асфальтирование') {
    return name.includes('подгрунтов') || name.includes('эмульс') ? 'asphalt_primer' : 'asphalt_main';
  }
  if (sg === 'Щебень') return 'gravel';
  if (sg === 'Песок и геоматериалы') {
    return name.includes('геотекстиль') || name.includes('геосетк') ? 'geotextile' : 'sand';
  }
  if (sg === 'Бордюры') return 'curbs';
  if (sg === 'Плитка и мощение') return 'tiles';
  if (sg === 'Озеленение') return 'landscaping';
  if (sg === 'Ливневая канализация') {
    if (name.includes('дождеприём') || name.includes('пескоуловитель')) return 'drainage_grate';
    if (name.includes('колодец') || name.includes('колодц') || name.includes('кольц') || name.includes('надставк') || name.includes('люк')) {
      if (name.includes('демонтаж') || name.includes('вывод')) return 'drainage_well_remove';
      if (name.includes('регулировк') || name.includes('наращив') || name.includes('кольц') || name.includes('надставк') || name.includes('люк')) return 'drainage_well_adjust';
      return 'drainage_well_new';
    }
    return 'drainage_pipe';
  }
  if (sg === 'Демонтаж') return 'demolition';
  if (sg === 'Земляные работы') return 'earthwork';
  if (sg === 'Дорожные работы') {
    if (name.includes('швабрист') || name.includes('асфальтобетонщик')) return 'asphalt_main';
    return 'overhead';
  }
  if (sg === 'Благоустройство') {
    if (name.includes('бордюр') || name.includes('бортов')) return 'curbs';
    if (name.includes('мостовщик') || name.includes('плиточник')) return 'tiles';
    if (name.includes('зелён') || name.includes('озелен') || name.includes('газон')) return 'landscaping';
    return 'overhead';
  }
  if (sg === 'Руководство и специалисты') return 'overhead';
  return classifyByName(name);
}

function classifyByName(name: string): KpGroup {
  const n = typeof name === 'string' ? name.toLowerCase() : '';
  if (n.includes('подгрунтов') || n.includes('эмульс')) return 'asphalt_primer';
  if (n.includes('асфальт') || n.includes('а/б') || n.includes('укладчик') || (n.includes('каток') && !n.includes('грунтов'))) return 'asphalt_main';
  if (n.includes('щебен') || n.includes('щебён')) return 'gravel';
  if (n.includes('геотекстиль')) return 'geotextile';
  if (n.includes('песок') || n.includes('песч')) return 'sand';
  if (n.includes('бордюр') || n.includes('бортов')) return 'curbs';
  if (n.includes('плитк') || n.includes('мощен')) return 'tiles';
  if (n.includes('газон') || n.includes('озелен') || n.includes('дерев')) return 'landscaping';
  if (n.includes('ливнев') || n.includes('дренаж') || n.includes('дождеприём')) return 'drainage_pipe';
  if (n.includes('демонтаж') || n.includes('фрезер') || n.includes('гидромолот')) return 'demolition';
  if (n.includes('экскаватор') || n.includes('грунт') || n.includes('самосвал')) return 'earthwork';
  return 'overhead';
}

// ─── Классификация КП-позиции по имени → группа (сводная, drainage → одна) ───
type KpGroupMerged = Exclude<KpGroup, 'drainage_grate' | 'drainage_well_new' | 'drainage_well_adjust' | 'drainage_well_remove'> | 'drainage';

function classifyKpItem(name: string): KpGroupMerged {
  const n = name.toLowerCase();
  if (n.includes('грунт') || n.includes('разработка') || n.includes('экскаватор') || n.includes('самосвал')) return 'earthwork';
  if (n.includes('геотекстиль') || n.includes('геосетк')) return 'geotextile';
  if (n.includes('песок') || n.includes('песч') || n.includes('подстилающ')) return 'sand';
  if (n.includes('щебен') || n.includes('щебён') || n.includes('щебн') || n.includes('основани')) return 'gravel';
  if (n.includes('подгрунтов') || n.includes('эмульс')) return 'asphalt_primer';
  if (n.includes('а/б') || n.includes('асфальт') || n.includes('щма') || n.includes('покрыти')) return 'asphalt_main';
  if (n.includes('бордюр') || n.includes('бортов')) return 'curbs';
  if (n.includes('плитк') || n.includes('мощен')) return 'tiles';
  if (n.includes('газон') || n.includes('озелен')) return 'landscaping';
  if (n.includes('ливнев') || n.includes('дренаж') || n.includes('дождеприём') || n.includes('колодец') || n.includes('труб') || n.includes('регулировк')) return 'drainage';
  if (n.includes('демонтаж') || n.includes('фрезер')) return 'demolition';
  return 'unknown';
}

// Сводка drainage-подгрупп в одну
function mergeDrainageGroup(g: KpGroup): KpGroupMerged {
  if (g === 'drainage_pipe' || g === 'drainage_grate' || g === 'drainage_well_new' || g === 'drainage_well_adjust' || g === 'drainage_well_remove') return 'drainage';
  return g as KpGroupMerged;
}

// ─── Дефолтные доли материалов (когда нет внутренней сметы) ───
const DEFAULT_MATERIAL_RATIOS: Partial<Record<KpGroupMerged, number>> = {
  earthwork: 0.10,       // в основном работа (техника)
  sand: 0.55,            // песок ~55%
  gravel: 0.60,          // щебень ~60%
  geotextile: 0.70,      // в основном материал
  asphalt_primer: 0.50,
  asphalt_main: 0.55,
  curbs: 0.50,
  tiles: 0.55,
  landscaping: 0.50,
  drainage: 0.55,
  demolition: 0.10,
  overhead: 0.00,
  unknown: 0.50,
};

// ═══════════════════════════════════════════════════════════
// ГЛАВНАЯ ФУНКЦИЯ
//
// Материалы = закупка ресурсов (MATERIAL) × 1.15
// Работа = КП итого − Материалы
// ═══════════════════════════════════════════════════════════
export function splitMaterialWork(
  kpItems: ClientEstimateItem[],
  internalItems: EstimateItem[],
): MaterialWorkSplit {
  // 1. Считаем закупочную стоимость МАТЕРИАЛОВ по группам из внутренней сметы
  const rawMaterialByGroup = new Map<KpGroupMerged, number>();

  for (const item of internalItems) {
    if (item.category !== Category.MATERIAL) continue;
    const res = resourceById.get(item.resourceId);
    const rawGroup = res ? classifyResource(res) : classifyByName(item.customName || item.resourceId);
    const group = mergeDrainageGroup(rawGroup);
    rawMaterialByGroup.set(group, (rawMaterialByGroup.get(group) || 0) + item.totalCost);
  }

  const hasInternalData = rawMaterialByGroup.size > 0;

  // 2. Считаем суммарную стоимость КП по группам (для пропорционального деления)
  const kpTotalByGroup = new Map<KpGroupMerged, number>();
  for (const item of kpItems) {
    const group = classifyKpItem(item.name);
    kpTotalByGroup.set(group, (kpTotalByGroup.get(group) || 0) + item.totalPrice);
  }

  // 3. Разбиваем каждую позицию КП
  let totalMaterials = 0;
  let totalWork = 0;

  const items: MaterialWorkItem[] = kpItems.map(item => {
    const group = classifyKpItem(item.name);

    let materialTotal: number;

    if (hasInternalData && rawMaterialByGroup.has(group)) {
      // Закупка материалов группы × 1.15 (доставка)
      const groupRawMaterial = rawMaterialByGroup.get(group)!;
      const groupClientMaterial = Math.round(groupRawMaterial * DELIVERY_MARKUP);

      // Если несколько КП позиций в одной группе — делим пропорционально
      const groupKpTotal = kpTotalByGroup.get(group) || item.totalPrice;
      const share = groupKpTotal > 0 ? item.totalPrice / groupKpTotal : 1;
      materialTotal = Math.round(groupClientMaterial * share);
    } else {
      // Нет данных из внутренней сметы → дефолтная доля
      const ratio = DEFAULT_MATERIAL_RATIOS[group] ?? 0.5;
      materialTotal = Math.round(item.totalPrice * ratio);
    }

    // Материалы не могут превышать КП цену
    materialTotal = Math.min(materialTotal, item.totalPrice);
    const workTotal = item.totalPrice - materialTotal;

    const materialUnitPrice = item.quantity > 0 ? Math.round(materialTotal / item.quantity) : 0;
    const workUnitPrice = item.quantity > 0 ? Math.round(workTotal / item.quantity) : 0;

    totalMaterials += materialTotal;
    totalWork += workTotal;

    return {
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      materialUnitPrice,
      workUnitPrice,
      materialTotal,
      workTotal,
      total: item.totalPrice,
      section: item.section,
    };
  });

  return {
    items,
    totalMaterials,
    totalWork,
    grandTotal: totalMaterials + totalWork,
  };
}
