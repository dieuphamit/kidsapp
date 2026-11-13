import { HABITAT_IDS, HABITATS } from '../../core/worldAnimals';

/** Key nội dung của con vật: id có gạch nối (blue-tang) bỏ gạch (animal.bluetang) vì key tiếng kêu chỉ nhận chữ thường */
export function voiceId(id: string): string {
  return id.replace(/-/g, '');
}

/** Số loại thú của một khu (chào đủ thì cả khu nhảy mừng) */
export function speciesCount(index: number): number {
  return HABITATS[HABITAT_IDS[index]].roster.length;
}
