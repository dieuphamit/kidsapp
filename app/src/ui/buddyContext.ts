import { createContext, useCallback, useContext } from 'react';
import { DEFAULT_BUDDY, buddyImageUrl, buddyName, fillName, type Buddy } from '../core/buddy';
import type { Lang } from '../core/i18n';

/** Bạn đồng hành đang chọn (App cung cấp từ settings). Không có Provider: mèo Đậu Đậu. */
export const BuddyContext = createContext<Buddy>(DEFAULT_BUDDY);

export function useBuddy(): Buddy {
  return useContext(BuddyContext);
}

/** Hàm thay {name} trong chữ hiển thị bằng tên đang chọn. */
export function useFillName(): (text: string, lang: Lang) => string {
  const { name } = useBuddy();
  return useCallback((text: string, lang: Lang) => fillName(text, lang, name), [name]);
}

/** Ảnh 2D và tên (theo ngôn ngữ) của bạn đồng hành đang chọn, cho các màn 2D trong trò. */
export function useBuddyLook(lang: Lang): { img: string; name: string; character: Buddy['character'] } {
  const b = useBuddy();
  return { img: buddyImageUrl(b.character), name: buddyName(b.name, lang), character: b.character };
}
