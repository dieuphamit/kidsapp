import { useCallback, useEffect, useRef } from 'react';
import { sayThen, type SayThenOptions, type Speaker } from '../core/audio';

/** Tuỳ chọn của hook: như sayThen, thêm `onStep` báo lúc từng key bắt đầu phát. */
export type SayAllOptions = Omit<SayThenOptions, 'onSay'> & { onStep?(key: string, index: number): void };

/**
 * Nói nối tiếp cho một trò: key sau chỉ phát khi tiếng trước hết (tiếng kêu thật không bị câu
 * kế cắt ngang). `onSay` nhận từng key lúc bắt đầu phát (trò cập nhật data-last-say). Mọi chuỗi
 * còn dang dở tự huỷ khi trò unmount, nên không còn giọng đọc nào phát sau khi bé thoát. Trả về
 * hàm huỷ: câu đang phát nói nốt, các câu sau không phát nữa và không báo onDone (ví dụ bé bắt đầu chơi).
 */
export function useSayThen(
  speaker: Speaker,
  onSay: (key: string) => void,
): (keys: readonly string[], opts?: SayAllOptions) => () => void {
  const cancels = useRef<(() => void)[]>([]);
  const onSayRef = useRef(onSay);
  onSayRef.current = onSay;
  useEffect(
    () => () => {
      cancels.current.forEach((c) => c());
      cancels.current = [];
    },
    [],
  );
  return useCallback(
    (keys, opts) => {
      // chuỗi cũ (nếu còn) do loa tự cắt và báo onDone; ở đây chỉ giữ hàm huỷ cho lúc unmount
      let cancel: () => void = () => {};
      cancel = sayThen(speaker, keys, {
        ...opts,
        onSay: (k, i) => {
          onSayRef.current(k);
          opts?.onStep?.(k, i);
        },
        onDone: () => {
          cancels.current = cancels.current.filter((c) => c !== cancel);
          opts?.onDone?.();
        },
      });
      cancels.current.push(cancel);
      return cancel;
    },
    [speaker],
  );
}
