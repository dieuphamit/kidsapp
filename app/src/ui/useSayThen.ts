import { useCallback, useEffect, useRef } from 'react';
import { sayThen, type SayThenOptions, type Speaker } from '../core/audio';

/**
 * Nói nối tiếp cho một trò: key sau chỉ phát khi tiếng trước hết (tiếng kêu thật không bị câu
 * kế cắt ngang). `onSay` nhận từng key lúc bắt đầu phát (trò cập nhật data-last-say). Mọi chuỗi
 * còn dang dở tự huỷ khi trò unmount, nên không còn giọng đọc nào phát sau khi bé thoát.
 */
export function useSayThen(
  speaker: Speaker,
  onSay: (key: string) => void,
): (keys: readonly string[], opts?: Omit<SayThenOptions, 'onSay'>) => void {
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
        onSay: (k) => onSayRef.current(k),
        onDone: () => {
          cancels.current = cancels.current.filter((c) => c !== cancel);
          opts?.onDone?.();
        },
      });
      cancels.current.push(cancel);
    },
    [speaker],
  );
}
