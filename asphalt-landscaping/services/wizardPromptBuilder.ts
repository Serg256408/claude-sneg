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
    lines.push(`- Земляные работы: устройство корыта, планировка, вывоз грунта, техника=${excavator}`);
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
    lines.push(`- Ливневая канализация: трубы ПВХ ∅110 мм=${data.drainagePipeLength} п.м, дождеприёмники=${data.drainageGrateCount} шт`);
  }

  lines.push('');
  lines.push('ОБЯЗАТЕЛЬНО включи: прораб, дорожных рабочих, геодезиста (1 выезд), всю необходимую технику и доставку материалов.');

  return lines.join('\n');
}
