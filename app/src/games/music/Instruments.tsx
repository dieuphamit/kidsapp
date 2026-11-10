import { useState, useCallback, useEffect, useRef } from 'react';
import { ClayButton } from '../../ui/ClayButton';
import { LEARN_HEX } from '../../core/tokens';
import { synth as defaultSynth, type Synth, type DrumKind } from '../../core/synth';
import styles from './Instruments.module.css';

type Props = {
  synth?: Synth;
};

// Màu phím đàn theo thứ tự LEARN_HEX: red, orange, yellow, green, blue, purple, mint, lilac
const KEY_DOT_COLORS = [
  LEARN_HEX.red,
  LEARN_HEX.orange,
  LEARN_HEX.yellow,
  LEARN_HEX.green,
  LEARN_HEX.blue,
  LEARN_HEX.purple,
  'var(--clay-mint)',
  'var(--clay-lilac)',
] as const;

// Màu ClayButton cho từng phím: peach, butter, leaf, mint, lilac, peach, butter, leaf
const KEY_COLORS = ['peach', 'butter', 'leaf', 'mint', 'lilac', 'peach', 'butter', 'leaf'] as const;

// Cấu hình trống
const DRUMS: { kind: DrumKind; emoji: string; color: 'peach' | 'butter' | 'leaf' | 'lilac'; label: string }[] = [
  { kind: 'boom', emoji: '🥁', color: 'peach', label: 'Trống to' },
  { kind: 'tap', emoji: '🪘', color: 'butter', label: 'Trống nhỏ' },
  { kind: 'shaker', emoji: '🪇', color: 'leaf', label: 'Cái lắc' },
  { kind: 'bell', emoji: '🔔', color: 'lilac', label: 'Cái chuông' },
];

export function Instruments({ synth = defaultSynth }: Props) {
  // Quản lý note bay lên
  const [notes, setNotes] = useState<{ id: number; keyIndex: number }[]>([]);
  const noteIdRef = useRef(0);

  // Quản lý trống đang lắc
  const [shakingDrums, setShakingDrums] = useState<Set<DrumKind>>(new Set());

  const handleKeyPress = useCallback(
    (index: number) => {
      synth.playNote(index);

      // Tạo note bay lên
      const id = noteIdRef.current++;
      setNotes((prev) => [...prev, { id, keyIndex: index }]);

      // Xóa note sau 700ms
      setTimeout(() => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }, 700);
    },
    [synth],
  );

  const handleDrumPress = useCallback(
    (kind: DrumKind) => {
      synth.playDrum(kind);

      // Thêm hiệu ứng lắc
      setShakingDrums((prev) => new Set(prev).add(kind));

      // Xóa hiệu ứng sau 300ms
      setTimeout(() => {
        setShakingDrums((prev) => {
          const next = new Set(prev);
          next.delete(kind);
          return next;
        });
      }, 300);
    },
    [synth],
  );

  // Cleanup notes khi unmount
  useEffect(() => {
    return () => {
      setNotes([]);
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* Hàng trống phía trên */}
      <div className={styles.drums}>
        {DRUMS.map(({ kind, emoji, color, label }) => (
          <div
            key={kind}
            className={`${styles.drumWrapper} ${shakingDrums.has(kind) ? styles.shaking : ''}`}
          >
            <ClayButton
              color={color}
              size={170}
              label={label}
              onPress={() => handleDrumPress(kind)}
              style={{ borderRadius: '50%' }}
            >
              <span className={styles.drum}>{emoji}</span>
            </ClayButton>
          </div>
        ))}
      </div>

      {/* Hàng phím đàn phía dưới */}
      <div className={styles.keyboard}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={styles.keyWrapper}>
            {/* Phần trang trí phía trên phím (chứa chấm màu) */}
            <div
              className={styles.keyDecorator}
              style={{ backgroundColor: `var(--clay-${KEY_COLORS[i]})` }}
            >
              <div className={styles.keyDot} style={{ backgroundColor: KEY_DOT_COLORS[i] }} />
            </div>

            {/* Nút phím chính */}
            <div className={styles.keyButton}>
              <ClayButton
                color={KEY_COLORS[i]}
                size={120}
                label={`Phím ${i + 1}`}
                onPress={() => handleKeyPress(i)}
              >
                {' '}
              </ClayButton>
            </div>

            {/* Notes bay lên */}
            {notes
              .filter((n) => n.keyIndex === i)
              .map((n) => (
                <span key={n.id} className={styles.note}>
                  ♪
                </span>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
