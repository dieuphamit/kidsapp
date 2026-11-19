import { useEffect, useRef, useState } from 'react';
import styles from './screens.module.css';
import { HOLD_MS, makeQuestion, checkAnswer, questionText, type GateQuestion } from '../core/parentGate';
import { ClayButton } from './ClayButton';
import type { ClayColor } from '../core/tokens';

const CHOICE_COLORS: ClayColor[] = ['mint', 'butter', 'peach', 'lilac'];

/**
 * Cổng phụ huynh: giữ ⚙️ 3 giây rồi chọn đáp án đúng của một phép tính người lớn (7 × 8, 38 + 47).
 * Chọn sai thì lặng lẽ quay về app (không âm báo sai); muốn thử lại phải giữ 3 giây lần nữa,
 * nên bé bấm đoán bừa gần như không vào được.
 */
export function ParentGate({ onOpen, rand = Math.random }: { onOpen(): void; rand?: () => number }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [q, setQ] = useState<GateQuestion | null>(null);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // Dọn hẹn giờ giữ nút khi component bị gỡ, tránh setState sau unmount
  useEffect(() => cancel, []);

  const choose = (n: number) => {
    const ok = q !== null && checkAnswer(q, n);
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
          timer.current = setTimeout(() => setQ(makeQuestion(rand)), HOLD_MS);
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className={styles.gateIcon} aria-hidden="true">⚙️</span>
        <span className={styles.gateHint} aria-hidden="true">giữ 3 giây</span>
      </button>
      {q && (
        <div className={styles.dialog} role="dialog" aria-label="Xác nhận phụ huynh">
          <div className={`${styles.card} ${styles.gateCard}`}>
            <span className={styles.gateAsk}>Dành cho bố mẹ / おとなの かた / For grown-ups</span>
            <span className={styles.gateQuestion} data-testid="gate-question">{questionText(q)}</span>
            <div className={styles.gateChoices} role="group" aria-label="Đáp án">
              {q.choices.map((n, i) => (
                // kích hoạt khi nhả tay: lúc chạm xuống mà mở ngay khu bố mẹ thì cú click sau đó
                // rơi vào nút nằm bên dưới ngón tay (đổi ngôn ngữ ngoài ý muốn)
                <ClayButton key={n} color={CHOICE_COLORS[i % CHOICE_COLORS.length]} label={String(n)} size={120} activateOn="release" onPress={() => choose(n)}>
                  <span className={styles.gateNumber}>{n}</span>
                </ClayButton>
              ))}
            </div>
            <button type="button" onClick={() => setQ(null)}>Đóng / とじる / Close</button>
          </div>
        </div>
      )}
    </>
  );
}
