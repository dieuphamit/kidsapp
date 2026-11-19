import { createContext, useContext, useEffect } from 'react';
import { applyCalmVolume } from '../core/audio';

/**
 * Chế độ nhẹ nhàng (bố mẹ bật trong khu phụ huynh). App cung cấp từ settings; không có Provider: tắt.
 * Thành phần dùng chung có hiệu ứng ăn mừng/nhảy nhót đọc useCalm() để làm nhỏ, chậm lại.
 */
export const CalmContext = createContext(false);

export function useCalm(): boolean {
  return useContext(CalmContext);
}

/**
 * Áp chế độ nhẹ nhàng cho cả app: âm lượng tổng nhỏ lại và `data-calm` trên <html>, để CSS chung
 * (index.css) tắt hiệu ứng lặp/nhấp nháy và lấp lánh trong mọi trò mà không phải sửa từng trò.
 */
export function useApplyCalm(calm: boolean): void {
  useEffect(() => {
    applyCalmVolume(calm);
    if (calm) document.documentElement.setAttribute('data-calm', 'true');
    else document.documentElement.removeAttribute('data-calm');
  }, [calm]);
}
