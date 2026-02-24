import { WizardData, ClientEstimateItem, EstimateItem, Resource, generateId } from '../types';
import { CLIENT_WORK_CATALOG, INITIAL_RESOURCES } from '../constants';
import { loadPriceOverrides } from './priceListService';

// ══════════════════════════════════════════════════════════════
// Детерминистический построитель КП v5
//
// ЦЕНООБРАЗОВАНИЕ:
//   Грунт:   ФИКСИРОВАННАЯ цена 1000₽/м³ (уже с наценкой)
//   Асфальт: ФИКСИРОВАННАЯ цена 1000₽/м² (уже с наценкой)
//   Песок:   себестоимость + наценка 1000₽/м³
//   Щебень:  себестоимость + наценка 1000₽/м³
//   Остальное: себестоимость × (1 + markup%)
//
// Все ставки масштабируются пропорционально markup%:
//   25% → 1000₽, 30% → 1200₽, 50% → 2000₽
//
// Итого КП ≥ себестоимость × (1 + markup%)
// ══════════════════════════════════════════════════════════════

// ─── Базовые ставки (при markup = 25%) ───
const BASE_MARKUP_PCT = 25;
const BASE_RATES = {
  // Сыпучие: НАЦЕНКА сверху к себестоимости (₽/м³ материала)
  sand_markup_per_m3: 1000,
  gravel_markup_per_m3: 1000,
  // Грунт, асфальт: ФИКСИРОВАННАЯ цена для клиента (₽/ед)
  earthwork_price_per_m3: 1000,
  asphalt_price_per_m2: 1000,
};

// Масштабирование: пропорционально в обе стороны
// 15% → 600₽, 20% → 800₽, 25% → 1000₽, 50% → 2000₽
function scaleMin(baseMin: number, markupPct: number): number {
  return baseMin * (markupPct / BASE_MARKUP_PCT);
}

// ─── Группы КП ───
type KpGroup =
  | 'demolition' | 'earthwork' | 'sand' | 'gravel' | 'geotextile'
  | 'asphalt_primer' | 'asphalt_main'
  | 'curbs' | 'tiles' | 'landscaping'
  | 'drainage_pipe' | 'drainage_grate' | 'drainage_well_new'
  | 'drainage_well_adjust' | 'drainage_well_remove'
  | 'overhead';

// ─── Справочник ресурсов ───
const resourceById = new Map<string, Resource>();
for (const r of INITIAL_RESOURCES) resourceById.set(r.id, r);

// ─── Классификация ресурса → группа КП ───
function classifyResource(res: Resource): KpGroup {
  const sg = res.subGroup || '';
  const name = res.name.toLowerCase();

  if (sg === 'Асфальтобетон' || sg === 'Асфальтирование') {
    if (name.includes('подгрунтов') || name.includes('эмульс')) return 'asphalt_primer';
    return 'asphalt_main';
  }
  if (sg === 'Щебень') return 'gravel';
  if (sg === 'Песок и геоматериалы') {
    if (name.includes('геотекстиль') || name.includes('геосетк')) return 'geotextile';
    return 'sand';
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

// ─── Себестоимость по группам + распределение накладных ───
function calcGroupCosts(items: EstimateItem[]): { groupCosts: Map<KpGroup, number>; totalCost: number } {
  const raw = new Map<KpGroup, number>();
  let totalCost = 0;

  for (const item of items) {
    const res = resourceById.get(item.resourceId);
    const group = res ? classifyResource(res) : classifyByName(item.customName || item.resourceId);
    raw.set(group, (raw.get(group) || 0) + item.totalCost);
    totalCost += item.totalCost;
  }

  // Накладные → пропорционально прямым затратам
  const overheadCost = raw.get('overhead') || 0;
  const directTotal = totalCost - overheadCost;

  const result = new Map<KpGroup, number>();
  for (const [group, cost] of raw) {
    if (group === 'overhead') continue;
    const overheadShare = directTotal > 0 ? overheadCost * (cost / directTotal) : 0;
    result.set(group, Math.round(cost + overheadShare));
  }

  return { groupCosts: result, totalCost };
}

// ─── Каталогная цена ───
function getCatalogPrice(name: string, overrides: Map<string, number>): number {
  if (overrides.has(name)) return overrides.get(name)!;
  const item = CLIENT_WORK_CATALOG.find(c => c.name === name);
  return item?.recommendedPrice ?? 0;
}

// ═══════════════════════════════════════════════════════════════
// ГЛАВНАЯ ФУНКЦИЯ
// ═══════════════════════════════════════════════════════════════
export function buildClientEstimate(
  wizardData: WizardData,
  internalItems: EstimateItem[],
  markupPercent: number,
): ClientEstimateItem[] {
  const d = wizardData;
  const area = d.area;
  if (area <= 0) return [];

  const overrides = loadPriceOverrides();
  const markupFrac = markupPercent / 100; // 25% → 0.25

  // ─── Шаг 1: Себестоимость по группам ───
  const { groupCosts, totalCost } = calcGroupCosts(internalItems);
  const hasInternalData = totalCost > 0;

  const items: ClientEstimateItem[] = [];
  let sortOrder = 0;

  // ─── Шаг 2-3: Формируем позиции КП ───
  // fixedClientPrice — ФИКСИРОВАННАЯ цена для клиента (грунт, асфальт)
  // minMarkupPerUnit — мин. НАЦЕНКА сверху к себестоимости (песок, щебень)
  const add = (name: string, unit: string, quantity: number, section: string,
               group: KpGroup, opts?: { fixedClientPrice?: number; minMarkupPerUnit?: number }) => {
    if (quantity <= 0) return;

    const groupCost = groupCosts.get(group) || 0;
    const catalogPrice = getCatalogPrice(name, overrides);

    let unitPrice: number;

    if (opts?.fixedClientPrice) {
      // Грунт, асфальт: фиксированная ставка (уже с наценкой)
      unitPrice = Math.round(opts.fixedClientPrice);
    } else if (groupCost > 0) {
      // Есть данные из сметы → себестоимость + наценка
      const costPerUnit = groupCost / quantity;
      const markupFromPercent = costPerUnit * markupFrac;
      // Сыпучие: наценка = MAX(%, минимум_наценки)
      const markup = Math.max(markupFromPercent, opts?.minMarkupPerUnit ?? 0);
      unitPrice = Math.round(costPerUnit + markup);
    } else {
      // Нет данных → каталогная цена
      unitPrice = catalogPrice;
    }

    // Не ниже каталога
    unitPrice = Math.max(unitPrice, catalogPrice);

    items.push({
      id: generateId(),
      name,
      unit,
      quantity: Math.round(quantity * 100) / 100,
      unitPrice,
      totalPrice: Math.round(unitPrice * quantity),
      section,
      sortOrder: sortOrder++,
    });
  };

  // ═══ 1. ДЕМОНТАЖ ═══
  if (d.works.demolition) {
    if (d.demolitionMethod === 'milling') {
      const thickness = d.demolitionThickness <= 50 ? '50' : '100';
      add(
        `Фрезерование асфальтобетонного покрытия, глубина до ${thickness} мм, с вывозом фрезерованного материала`,
        'м²', area, 'Земляные работы', 'demolition'
      );
    } else {
      if (d.demolitionCoverType === 'asphalt') {
        add('Демонтаж существующего асфальтобетонного покрытия толщ. до 100 мм с погрузкой и вывозом',
          'м²', area, 'Земляные работы', 'demolition');
      } else {
        add('Демонтаж бетонного покрытия/отмостки толщ. до 150 мм с погрузкой и вывозом',
          'м²', area, 'Земляные работы', 'demolition');
      }
    }
  }

  // ═══ 2. ЗЕМЛЯНЫЕ РАБОТЫ ═══
  if (d.works.earthwork) {
    let volumeM3: number;
    if (d.excavationDepthMode === 'manual' && d.excavationManualUnit === 'm3') {
      volumeM3 = d.excavationVolumeM3;
    } else {
      const depthMm = d.excavationDepthMode === 'manual'
        ? d.excavationDepthCm * 10
        : (d.works.foundation ? d.sandLayer + d.gravelLayer : 0)
          + (d.works.asphalt ? (d.asphaltLayers === 2 ? d.asphaltThickness + d.asphaltBottomThickness : d.asphaltThickness) : 0);
      volumeM3 = area * (depthMm / 1000) * 1.25;
    }
    volumeM3 = Math.round(volumeM3);

    // Грунт: мин. ЦЕНА для клиента (итоговая, не наценка)
    const earthMinPrice = scaleMin(BASE_RATES.earthwork_price_per_m3, markupPercent);
    add('Разработка грунта II категории экскаватором с погрузкой в самосвал и вывозом на полигон, плечо до 30 км',
      'м³', volumeM3, 'Земляные работы', 'earthwork', { fixedClientPrice: earthMinPrice });
  }

  // ═══ 3. ГЕОТЕКСТИЛЬ ═══
  if (d.works.foundation && d.geotextileDensity > 0) {
    if (d.geotextileDensity >= 300) {
      add('Укладка геотекстиля иглопробивного плотн. 300 г/м², ГОСТ Р 56338-2015, армирующий слой',
        'м²', area, 'Устройство основания', 'geotextile');
    } else {
      add('Укладка геотекстиля иглопробивного плотн. 200 г/м², ГОСТ Р 56338-2015, разделительный слой',
        'м²', area, 'Устройство основания', 'geotextile');
    }
  }

  // ═══ 4. ПЕСОК ═══
  if (d.works.foundation && d.sandLayer > 0) {
    let sandName: string;
    if (d.sandLayer <= 150) {
      sandName = 'Устройство подстилающего слоя из песка средней крупности Мкр≥2.0, ГОСТ 8736-2014, толщ. 150 мм, Ку≥0.95';
    } else if (d.sandLayer <= 200) {
      sandName = 'Устройство подстилающего слоя из песка средней крупности Мкр≥2.0, ГОСТ 8736-2014, толщ. 200 мм, Ку≥0.95';
    } else {
      sandName = 'Устройство подстилающего слоя из песка средней крупности Мкр≥2.0, ГОСТ 8736-2014, толщ. 300 мм, Ку≥0.95';
    }

    // Песок: мин. НАЦЕНКА 1000₽/м³ материала → пересчёт в ₽/м²
    const sandVolPerM2 = (d.sandLayer / 1000) * 1.20;
    const sandMinMarkup = sandVolPerM2 * scaleMin(BASE_RATES.sand_markup_per_m3, markupPercent);
    add(sandName, 'м²', area, 'Устройство основания', 'sand', { minMarkupPerUnit: sandMinMarkup });
  }

  // ═══ 5. ЩЕБЕНЬ ═══
  if (d.works.foundation && d.gravelLayer > 0) {
    let gravelName: string;
    const thickness = d.gravelLayer <= 150 ? '150' : '200';
    if (d.gravelType === 'granite') {
      gravelName = `Устройство основания из щебня гранитного фр. 20–40 мм М1200, ГОСТ 8267-93, толщ. ${thickness} мм, Ку≥0.98, Еd≥130 МПа`;
    } else if (d.gravelType === 'gravel') {
      gravelName = 'Устройство основания из щебня гравийного фр. 20–40 мм М800, ГОСТ 8267-93, толщ. 200 мм, Ку≥0.98';
    } else if (d.gravelType === 'recycled') {
      gravelName = 'Устройство основания из щебня вторичного (дроблёный бетон) фр. 20–40 мм, ТУ, толщ. 200 мм, Ку≥0.95';
    } else if (d.gravelType === 'limestone') {
      gravelName = `Устройство основания из щебня известнякового фр. 20–40 мм М600, ГОСТ 8267-93, толщ. ${thickness} мм, Ку≥0.98`;
    } else {
      gravelName = `Устройство основания из щебня гранитного фр. 20–40 мм М1200, ГОСТ 8267-93, толщ. ${thickness} мм, Ку≥0.98, Еd≥130 МПа`;
    }

    // Щебень: мин. НАЦЕНКА 1000₽/м³ материала → пересчёт в ₽/м²
    const gravelVolPerM2 = (d.gravelLayer / 1000) * 1.30;
    const gravelMinMarkup = gravelVolPerM2 * scaleMin(BASE_RATES.gravel_markup_per_m3, markupPercent);
    add(gravelName, 'м²', area, 'Устройство основания', 'gravel', { minMarkupPerUnit: gravelMinMarkup });
  }

  // ═══ 6. АСФАЛЬТ ═══
  if (d.works.asphalt) {
    // Подгрунтовка — без минимальной наценки
    add('Устройство подгрунтовки основания битумной эмульсией катионной ЭБК-1, ГОСТ Р 52128-2003, расход 0.3–0.5 л/м²',
      'м²', area, 'Асфальтирование', 'asphalt_primer');

    // Асфальт: мин. ЦЕНА для клиента (итоговая, не наценка)
    const asphaltMinPrice = scaleMin(BASE_RATES.asphalt_price_per_m2, markupPercent);

    if (d.asphaltLayers === 2) {
      add('Устройство двухслойного а/б покрытия (нижний слой — крупнозерн. 40 мм + верхний — мелкозерн. 40 мм), ГОСТ 9128-2013',
        'м²', area, 'Асфальтирование', 'asphalt_main', { fixedClientPrice: asphaltMinPrice });
    } else {
      if (d.asphaltMixType === 'SMA15') {
        add('Устройство покрытия из ЩМА-15, ГОСТ 31015-2002, толщ. 50 мм, модуль упругости ≥3200 МПа',
          'м²', area, 'Асфальтирование', 'asphalt_main', { fixedClientPrice: asphaltMinPrice });
      } else if (d.asphaltMixType === 'coarse_A1') {
        add('Устройство покрытия из а/б смеси крупнозернистой тип А марка I, ГОСТ 9128-2013, толщ. 60 мм, Ку≥0.99',
          'м²', area, 'Асфальтирование', 'asphalt_main', { fixedClientPrice: asphaltMinPrice });
      } else {
        if (d.asphaltThickness <= 40) {
          add('Устройство покрытия из а/б смеси мелкозернистой тип Б марка II, ГОСТ 9128-2013, толщ. 40 мм, Ку≥0.99',
            'м²', area, 'Асфальтирование', 'asphalt_main', { fixedClientPrice: asphaltMinPrice });
        } else {
          add('Устройство покрытия из а/б смеси мелкозернистой тип Б марка II, ГОСТ 9128-2013, толщ. 50 мм, Ку≥0.99',
            'м²', area, 'Асфальтирование', 'asphalt_main', { fixedClientPrice: asphaltMinPrice });
        }
      }
    }
  }

  // ═══ 7. БОРДЮРЫ ═══
  if (d.works.curbs && d.perimeterLength > 0) {
    if (d.curbType === 'road') {
      add('Установка бортового камня дорожного БР 100.30.18, ГОСТ 6665-91, на бетонное основание М200, с обоймой',
        'п.м', d.perimeterLength, 'Благоустройство', 'curbs');
    } else {
      add('Установка бортового камня садового БР 100.20.8, ГОСТ 6665-91, на бетонное основание М200',
        'п.м', d.perimeterLength, 'Благоустройство', 'curbs');
    }
  }

  // ═══ 8. ПЛИТКА ═══
  if (d.works.tiles) {
    if (d.tileThickness >= 80) {
      add('Мощение тротуарной плиткой вибропрессованной кл. В30 F300, ГОСТ 17608-2017, толщ. 80 мм, на ЦПС',
        'м²', area, 'Благоустройство', 'tiles');
    } else {
      add('Мощение тротуарной плиткой вибропрессованной кл. В22.5 F200, ГОСТ 17608-2017, толщ. 60 мм, на ЦПС',
        'м²', area, 'Благоустройство', 'tiles');
    }
  }

  // ═══ 9. ОЗЕЛЕНЕНИЕ ═══
  if (d.works.landscaping) {
    if (d.lawnType === 'roll') {
      add('Устройство газона рулонного из мятлика лугового, 1 сорт, толщ. дёрна ≥ 20 мм, с прикаткой',
        'м²', area, 'Озеленение', 'landscaping');
    } else {
      add('Устройство газона посевного из смеси мятлика лугового и овсяницы красной, расход семян 40 г/м²',
        'м²', area, 'Озеленение', 'landscaping');
    }
  }

  // ═══ 10. ЛИВНЁВКА ═══
  if (d.works.drainage) {
    if (d.drainagePipeLength > 0) {
      add('Устройство ливневой канализации из труб ПВХ ∅110 мм SN4, ГОСТ 32413-2013, с земляными работами',
        'п.м', d.drainagePipeLength, 'Инженерные сети', 'drainage_pipe');
    }
    if (d.drainageGrateCount > 0) {
      add('Установка дождеприёмника ДБ 300×300 мм с решёткой чугунной кл. В125, с подключением к коллектору',
        'шт', d.drainageGrateCount, 'Инженерные сети', 'drainage_grate');
    }
    if (d.drainageNewWellCount > 0) {
      add('Устройство смотрового колодца ∅400 мм полимерного, с крышкой, глубина до 1.5 м',
        'шт', d.drainageNewWellCount, 'Инженерные сети', 'drainage_well_new');
    }
    if (d.drainageWellAdjustCount > 0) {
      add('Регулировка высоты существующего колодца (наращивание/подрезка горловины, замена люка)',
        'шт', d.drainageWellAdjustCount, 'Инженерные сети', 'drainage_well_adjust');
    }
    if (d.drainageWellRemovalCount > 0) {
      add('Демонтаж (вывод) существующего колодца с засыпкой котлована и уплотнением',
        'шт', d.drainageWellRemovalCount, 'Инженерные сети', 'drainage_well_remove');
    }
  }

  // ═══ 11. ГАРАНТИЯ МАРЖИ (только вверх) ═══
  // Минимумы — жёсткие полы, никогда не снижаем.
  // Если сумма ниже цели → масштабируем вверх. Если выше — ок, маржа больше.
  if (hasInternalData) {
    const targetTotal = Math.round(totalCost * (1 + markupFrac));
    const currentTotal = items.reduce((s, i) => s + i.totalPrice, 0);

    if (currentTotal > 0 && currentTotal < targetTotal) {
      const scale = targetTotal / currentTotal;
      for (const item of items) {
        item.unitPrice = Math.round(item.unitPrice * scale);
        item.totalPrice = Math.round(item.unitPrice * item.quantity);
      }
    }
  }

  return items;
}
