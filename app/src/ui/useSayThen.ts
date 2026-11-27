import { useCallback, useEffect, useMemo, useRef } from 'react';
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

/** Một đoạn trong kịch bản nói: các key nói nối tiếp; `onStart` chạy ngay trước câu đầu của đoạn. */
export type SayStep = {
  keys: readonly string[];
  /** Loa giả (test) không báo hết tiếng: mỗi key của đoạn cách nhau chừng này, đoạn kế sau key cuối chừng này. */
  fallbackMs?: number;
  gapMs?: number;
  onStart?(): void;
  onStep?(key: string, index: number): void;
};

/**
 * Kịch bản nói nhiều đoạn cho một trò (ví dụ khen → hỏi → khách mới nói tên → gọi bánh): đoạn sau
 * bắt đầu khi đoạn trước nói xong, nên không câu nào bị câu sau của chính app cắt. Mỗi đoạn có
 * `fallbackMs` riêng để loa giả trong test giữ nhịp cũ. `play` mới huỷ kịch bản cũ; `stop` huỷ
 * phần còn lại (câu đang phát nói nốt). Nếu bé chạm làm một câu khác chen vào thì kịch bản vẫn đi
 * tiếp (chuyển lượt chơi không bị kẹt). `onDone` chạy khi đoạn cuối xong.
 */
export function useSaySteps(
  speaker: Speaker,
  onSay: (key: string) => void,
): { play(steps: readonly SayStep[], onDone?: () => void): void; stop(): void } {
  const sayAll = useSayThen(speaker, onSay);
  const run = useRef(0);
  const cancel = useRef<() => void>(() => {});
  const stop = useCallback(() => {
    run.current++;
    cancel.current();
    cancel.current = () => {};
  }, []);
  const play = useCallback(
    (steps: readonly SayStep[], onDone?: () => void) => {
      stop();
      const id = run.current;
      const go = (i: number) => {
        if (id !== run.current) return;
        if (i >= steps.length) {
          onDone?.();
          return;
        }
        const s = steps[i];
        s.onStart?.();
        if (id !== run.current) return;
        if (s.keys.length === 0) {
          go(i + 1);
          return;
        }
        cancel.current = sayAll(s.keys, {
          fallbackMs: s.fallbackMs,
          gapMs: s.gapMs,
          onStep: s.onStep,
          onDone: () => go(i + 1),
        });
      };
      go(0);
    },
    [sayAll, stop],
  );
  return useMemo(() => ({ play, stop }), [play, stop]);
}
