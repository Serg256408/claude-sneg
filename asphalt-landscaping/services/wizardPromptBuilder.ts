import { WizardData } from '../types';

const GRAVEL_LABELS: Record<string, string> = {
  granite: 'гранитный фр. 20-40 мм М1200',
  gravel: 'гравийный фр. 20-40 мм М800',
  limestone: 'известняковый фр. 20-40 мм М600',
  recycled: 'вторичный (дроблёный бетон) фр. 20-40 мм',
};

const MIX_LABELS: Record<string, string> = {
  fine_B2: 'мелкозернистая тип Б марка II',
  coarse_A1: 'крупнозернистая тип А марка I',
  sand_D: 'песчаная тип Д марка II',
  SMA15: 'ЩМА-15',
};

export function buildPromptFromWizard(data: WizardData): string {
  const lines: string[] = [];

  lines.push(`ПЛОЩАДЬ ОБЪЕКТА: ${data.area} м²`);
  if (data.works.curbs && data.perimeterLength > 0) {
    lines.push(`ПЕРИМЕТР / ДЛИНА БОРДЮРА: ${data.perimeterLength} п.м`);
  }

  lines.push('');
  lines.push('СОСТАВ РАБОТ:');

  if (data.works.demolition) {
    const cover = data.demolitionCoverType === 'asphalt' ? 'асфальтобетонное' : 'бетонное';
    const method = data.demolitionMethod === 'milling'
      ? 'дорожной фрезой (включить фрезерование + доставку фрезы)'
      : 'гидромолотом на базе экскаватора';
    lines.push(`- Демонтаж старого покрытия: тип=${cover}, толщина до ${data.demolitionThickness} мм, способ=${method}, с погрузкой и вывозом`);
  }

  if (data.works.earthwork) {
    const excavator = data.excavatorType === 'loader'
      ? 'экскаватор-погрузчик (малый объём)'
      : 'гусеничный/колёсный экскаватор (большой объём)';

    let depthInfo: string;
    if (data.excavationDepthMode === 'manual') {
      if (data.excavationManualUnit === 'm3') {
        depthInfo = `объём выемки=${data.excavationVolumeM3} м³ (задано вручную)`;
      } else {
        depthInfo = `глубина корыта=${data.excavationDepthCm * 10} мм (задано вручную)`;
      }
    } else {
      const autoMm = (data.works.foundation ? (data.sandLayer + data.gravelLayer) : 0)
        + (data.works.asphalt ? (data.asphaltLayers === 2 ? data.asphaltThickness + data.asphaltBottomThickness : data.asphaltThickness) : 0);
      depthInfo = `глубина корыта=${autoMm} мм (авто: сумма слоёв основания и асфальта)`;
    }

    const disposalParts: string[] = [];
    if (data.soilDisposal === 'haul' || data.soilDisposal === 'both') disposalParts.push('вывоз грунта на утилизацию');
    if (data.soilDisposal === 'spread' || data.soilDisposal === 'both') disposalParts.push('планировка излишков по территории');

    lines.push(`- Земляные работы: устройство корыта, ${depthInfo}, техника=${excavator}, ${disposalParts.join(' + ')}`);
  }

  if (data.works.foundation) {
    const parts: string[] = [];
    if (data.sandLayer > 0) parts.push(`песок ${data.sandLayer} мм`);
    if (data.gravelLayer > 0) parts.push(`щебень ${GRAVEL_LABELS[data.gravelType] || data.gravelType} ${data.gravelLayer} мм`);
    if (data.geotextileDensity > 0) parts.push(`с геотекстилем плотностью ${data.geotextileDensity} г/м²`);
    lines.push(`- Устройство основания: ${parts.join(', ') || 'без слоёв'}`);
  }

  if (data.works.asphalt) {
    const method = data.asphaltMethod === 'paver' ? 'укладчиком (механизированная)' : 'вручную (швабрист)';
    if (data.asphaltLayers === 2) {
      lines.push(`- Асфальтирование (2 слоя): метод=${method}, нижний слой: смесь=${MIX_LABELS[data.asphaltBottomMixType] || data.asphaltBottomMixType}, толщина=${data.asphaltBottomThickness} мм; верхний слой: смесь=${MIX_LABELS[data.asphaltMixType] || data.asphaltMixType}, толщина=${data.asphaltThickness} мм, с подгрунтовкой между слоями`);
    } else {
      lines.push(`- Асфальтирование: метод=${method}, смесь=${MIX_LABELS[data.asphaltMixType] || data.asphaltMixType}, толщина=${data.asphaltThickness} мм, с подгрунтовкой`);
    }
  }

  if (data.works.curbs) {
    const curb = data.curbType === 'road' ? 'дорожный БР 100.30.18' : 'садовый БР 100.20.8';
    lines.push(`- Бордюры: ${curb}, длина=${data.perimeterLength} п.м`);
  }

  if (data.works.tiles) {
    lines.push(`- Тротуарная плитка: вибропрессованная, толщина=${data.tileThickness} мм, на ЦПС`);
  }

  if (data.works.landscaping) {
    const lawn = data.lawnType === 'seed' ? 'посевной (мятлик + овсяница)' : 'рулонный';
    lines.push(`- Озеленение: газон=${lawn}`);
  }

  if (data.works.drainage) {
    const drainParts = [`трубы ПВХ ∅110 мм=${data.drainagePipeLength} п.м`, `дождеприёмники=${data.drainageGrateCount} шт`];
    if (data.drainageNewWellCount > 0) drainParts.push(`строительство новых колодцев=${data.drainageNewWellCount} шт (полимерный ∅400, с люком, глубина до 1.5 м)`);
    if (data.drainageWellAdjustCount > 0) drainParts.push(`регулировка высоты существующих колодцев=${data.drainageWellAdjustCount} шт (наращивание/подрезка горловины, замена люка)`);
    if (data.drainageWellRemovalCount > 0) drainParts.push(`демонтаж (вывод) старых колодцев=${data.drainageWellRemovalCount} шт (с засыпкой котлована и уплотнением)`);
    lines.push(`- Ливневая канализация: ${drainParts.join(', ')}`);
  }

  // ── Блок обязательных норм и предрасчёт объёмов ──
  lines.push('');
  lines.push('═══ ОБЯЗАТЕЛЬНЫЕ НОРМЫ РАСЧЁТА (использовать ТОЛЬКО эти значения) ═══');
  lines.push('• Плотность а/б смеси: 2.5 т/м³ (= 125 кг/м² на каждые 50 мм толщины)');
  lines.push('• Коэфф. уплотнения песка: 1.20 (объём песка = площадь × толщина_м × 1.20)');
  lines.push('• Коэфф. уплотнения щебня: 1.30 (объём щебня = площадь × толщина_м × 1.30)');
  lines.push('• Коэфф. разрыхления грунта: 1.25');
  lines.push('• Самосвал грунт/мусор: 20 м³, доставка а/б смеси: до 30 т');

  // Предрасчёт объёмов чтобы ИИ не считал сам
  if (data.area > 0) {
    lines.push('');
    lines.push('═══ ПРЕДРАСЧЁТ ОБЪЁМОВ (используй именно эти цифры) ═══');

    if (data.works.asphalt) {
      if (data.asphaltLayers === 2) {
        const topT = Math.round(data.area * (data.asphaltThickness / 1000) * 2.5 * 10) / 10;
        const botT = Math.round(data.area * (data.asphaltBottomThickness / 1000) * 2.5 * 10) / 10;
        const totalT = Math.round((topT + botT) * 10) / 10;
        lines.push(`• А/б смесь верхний слой (${data.asphaltThickness} мм): ${data.area} × ${data.asphaltThickness / 1000} × 2.5 = ${topT} т`);
        lines.push(`• А/б смесь нижний слой (${data.asphaltBottomThickness} мм): ${data.area} × ${data.asphaltBottomThickness / 1000} × 2.5 = ${botT} т`);
        lines.push(`• ИТОГО а/б смесь: ${totalT} т`);
        lines.push(`• Рейсов доставки а/б: ceil(${totalT} / 30) = ${Math.ceil(totalT / 30)}`);
      } else {
        const tons = Math.round(data.area * (data.asphaltThickness / 1000) * 2.5 * 10) / 10;
        lines.push(`• А/б смесь (${data.asphaltThickness} мм): ${data.area} × ${data.asphaltThickness / 1000} × 2.5 = ${tons} т`);
        lines.push(`• Рейсов доставки а/б: ceil(${tons} / 30) = ${Math.ceil(tons / 30)}`);
      }
    }

    if (data.works.foundation) {
      if (data.sandLayer > 0) {
        const sandM3 = Math.round(data.area * (data.sandLayer / 1000) * 1.20 * 10) / 10;
        lines.push(`• Песок (${data.sandLayer} мм): ${data.area} × ${data.sandLayer / 1000} × 1.20 = ${sandM3} м³`);
      }
      if (data.gravelLayer > 0) {
        const gravelM3 = Math.round(data.area * (data.gravelLayer / 1000) * 1.30 * 10) / 10;
        lines.push(`• Щебень (${data.gravelLayer} мм): ${data.area} × ${data.gravelLayer / 1000} × 1.30 = ${gravelM3} м³`);
      }
      if (data.geotextileDensity > 0) {
        lines.push(`• Геотекстиль: ${data.area} м² (= площади объекта)`);
      }
    }

    if (data.works.earthwork) {
      let volM3: number;
      if (data.excavationDepthMode === 'manual' && data.excavationManualUnit === 'm3') {
        volM3 = data.excavationVolumeM3;
        lines.push(`• Объём выемки грунта: ${volM3} м³ (задано вручную)`);
      } else {
        const depthMm = data.excavationDepthMode === 'manual'
          ? data.excavationDepthCm * 10
          : (data.works.foundation ? (data.sandLayer + data.gravelLayer) : 0) + (data.works.asphalt ? (data.asphaltLayers === 2 ? data.asphaltThickness + data.asphaltBottomThickness : data.asphaltThickness) : 0);
        volM3 = Math.round(data.area * (depthMm / 1000) * 1.25 * 10) / 10;
        lines.push(`• Объём выемки грунта: ${data.area} × ${depthMm / 1000} × 1.25 = ${volM3} м³`);
      }
      lines.push(`• Рейсов вывоза грунта (самосвал 20 м³): ceil(${volM3} / 20) = ${Math.ceil(volM3 / 20)}`);
    }

    if (data.works.demolition) {
      const demVol = Math.round(data.area * (data.demolitionThickness / 1000) * 1.15 * 10) / 10;
      lines.push(`• Объём демонтажного мусора: ${data.area} × ${data.demolitionThickness / 1000} × 1.15 = ${demVol} м³`);
      lines.push(`• Рейсов вывоза мусора: ceil(${demVol} / 20) = ${Math.ceil(demVol / 20)}`);
    }
  }

  lines.push('');
  lines.push('ОБЯЗАТЕЛЬНО включи: прораб, дорожных рабочих, геодезиста (1 выезд), всю необходимую технику и доставку материалов.');
  lines.push('ВАЖНО: Используй ТОЛЬКО предрасчитанные объёмы выше. НЕ пересчитывай самостоятельно.');

  if (data.comment.trim()) {
    lines.push('');
    lines.push(`ДОПОЛНИТЕЛЬНЫЙ КОММЕНТАРИЙ ЗАКАЗЧИКА: ${data.comment.trim()}`);
    lines.push('Учти этот комментарий при формировании сметы — добавь или скорректируй ресурсы при необходимости.');
  }

  return lines.join('\n');
}
