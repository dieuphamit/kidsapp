import { useEffect, useRef, useState } from 'react';
import styles from './screens.module.css';
import { HOLD_MS, makeQuestion, checkAnswer, type GateQuestion } from '../core/parentGate';

export function ParentGate({ onOpen, rand = Math.random }: { onOpen(): void; rand?: () => number }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [q, setQ] = useState<GateQuestion | null>(null);
  const [value, setValue] = useState('');

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // Dọn hẹn giờ giữ nút khi component bị gỡ, tránh setState sau unmount
  useEffect(() => cancel, []);

  const submit = () => {
    const ok = q !== null && checkAnswer(q, value);
    setQ(null);
    if (ok) onOpen();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Khu phụ huynh"
        className={styles.gateZone}
        onPointerDown={() => {
          cancel();
          timer.current = setTimeout(() => { setQ(makeQuestion(rand)); setValue(''); }, HOLD_MS);
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
      />
      {q && (
        <div className={styles.dialog} role="dialog" aria-label="Xác nhận phụ huynh">
          <div className={styles.card}>
            <span>{`${q.a} + ${q.b} = ?`}</span>
            <input aria-label="Đáp án" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
            <button type="button" onClick={submit}>Mở</button>
            <button type="button" onClick={() => setQ(null)}>Đóng</button>
          </div>
        </div>
      )}
    </>
  );
}
