import { useState, useCallback, useEffect, useRef } from 'react';
import { ClayButton } from '../../ui/ClayButton';
import { LEARN_HEX } from '../../core/tokens';
import { synth as defaultSynth, type Synth, type DrumKind } from '../../core/synth';
import type { Level } from '../../core/variety';
import { MUSIC_LEVELS, melodyFor, nextSong, follow, type Song } from './songs';
import styles from './Instruments.module.css';

type Props = {
  synth?: Synth;
  /** Mức chơi: số phím, số trống, độ dài câu nhạc. Mặc định 'medium' (8 phím, 4 trống). */
  level?: Level;
  say?: (key: string) => void;
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

/** Một phách khi Đậu Đậu đàn mẫu (ms). */
const BEAT_MS = 420;
const SAY_GAP = 1800;
const NEXT_SONG_MS = 3200;

/** Bài vừa chơi, giữ qua các lần vào để lần sau ra bài khác. */
let lastSongId: string | null = null;

export function Instruments({ synth = defaultSynth, level = 'medium', say }: Props) {
  const rule = MUSIC_LEVELS[level];
  // Quản lý note bay lên
  const [notes, setNotes] = useState<{ id: number; keyIndex: number }[]>([]);
  const noteIdRef = useRef(0);

  // Quản lý trống đang lắc
  const [shakingDrums, setShakingDrums] = useState<Set<DrumKind>>(new Set());

  // Bài hát dẫn: phím sáng là nốt kế tiếp
  const [song, setSong] = useState<Song>(() => {
    const s = nextSong(level, lastSongId);
    lastSongId = s.id;
    return s;
  });
  const melody = melodyFor(song, level);
  const [pos, setPos] = useState(0);
  const [cheer, setCheer] = useState(false);
  const [demoKey, setDemoKey] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const demoTimers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number, list = timers) => {
    list.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const a = timers.current;
    const b = demoTimers.current;
    return () => {
      a.forEach((t) => window.clearTimeout(t));
      b.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Vào chế độ nhạc / đổi bài: nói tên bài rồi nhắc chạm phím sáng
  const introduced = useRef(false);
  useEffect(() => {
    if (!say) return;
    say(`song.${song.id}`);
    if (!introduced.current) {
      introduced.current = true;
      later(() => say('music.follow'), SAY_GAP);
    }
  }, [song, say, later]);

  const stopDemo = useCallback(() => {
    demoTimers.current.forEach((t) => window.clearTimeout(t));
    demoTimers.current = [];
    setDemoKey(null);
  }, []);

  /** Đậu Đậu đàn mẫu cả câu, phím sáng theo nốt. */
  const playDemo = useCallback(
    (notesToPlay: readonly (readonly [number, number])[]) => {
      stopDemo();
      let t = 0;
      notesToPlay.forEach(([k, beats]) => {
        later(() => {
          synth.playNote(k);
          setDemoKey(k);
        }, t, demoTimers);
        t += beats * BEAT_MS;
      });
      later(() => setDemoKey(null), t, demoTimers);
    },
    [synth, later, stopDemo],
  );

  const changeSong = useCallback(() => {
    stopDemo();
    const s = nextSong(level, song.id);
    lastSongId = s.id;
    setSong(s);
    setPos(0);
    setCheer(false);
  }, [level, song.id, stopDemo]);

  const handleKeyPress = useCallback(
    (index: number) => {
      synth.playNote(index);

      // Tạo note bay lên
      const id = noteIdRef.current++;
      setNotes((prev) => [...prev, { id, keyIndex: index }]);

      // Xóa note sau 700ms
      later(() => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }, 700);

      if (cheer) return;
      const r = follow(melody, pos, index);
      setPos(r.pos);
      if (r.done && r.pos !== pos) {
        // Xong cả câu/bài: khen, đàn lại cho bé nghe, rồi sang bài mới
        setCheer(true);
        later(() => {
          say?.('music.song-done');
          playDemo(melody);
        }, 600);
        later(changeSong, 600 + melody.reduce((t, [, b]) => t + b * BEAT_MS, 0) + NEXT_SONG_MS);
      }
    },
    [synth, later, cheer, melody, pos, say, playDemo, changeSong],
  );

  const handleDrumPress = useCallback(
    (kind: DrumKind) => {
      synth.playDrum(kind);

      // Thêm hiệu ứng lắc
      setShakingDrums((prev) => new Set(prev).add(kind));

      // Xóa hiệu ứng sau 300ms
      later(() => {
        setShakingDrums((prev) => {
          const next = new Set(prev);
          next.delete(kind);
          return next;
        });
      }, 300);
    },
    [synth, later],
  );

  const nextKey = !cheer && demoKey === null && pos < melody.length ? melody[pos][0] : null;
  const drums = DRUMS.filter((d) => rule.drums.includes(d.kind));

  return (
    <div
      className={styles.container}
      data-testid="instruments"
      data-level={level}
      data-song={song.id}
      data-pos={pos}
      data-length={melody.length}
      data-next-key={nextKey ?? undefined}
      data-cheer={cheer ? '' : undefined}
    >
      {/* Hàng trống phía trên, hai bên là nút nghe mẫu và đổi bài */}
      <div className={styles.drums}>
        <ClayButton color="butter" size={120} label="Nghe mẫu" onPress={() => playDemo(melody)}>
          <span className={styles.songIcon}>👂</span>
        </ClayButton>
        {drums.map(({ kind, emoji, color, label }) => (
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
        <ClayButton color="mint" size={120} label="Bài khác" onPress={changeSong}>
          <span className={styles.songIcon}>🎶</span>
        </ClayButton>
      </div>

      {/* Thanh tiến trình bài: mỗi nốt một chấm */}
      <div className={styles.progress} aria-hidden="true">
        {melody.map((_, i) => (
          <i key={i} data-done={i < pos ? '' : undefined} />
        ))}
      </div>

      {/* Hàng phím đàn phía dưới */}
      <div className={styles.keyboard}>
        {Array.from({ length: rule.keys }, (_, i) => (
          <div
            key={i}
            className={styles.keyWrapper}
            data-next={nextKey === i ? '' : undefined}
            data-demo={demoKey === i ? '' : undefined}
          >
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

      {cheer && (
        <div className={styles.cheer} aria-hidden="true">
          {['⭐', '🎵', '⭐', '🎶', '⭐'].map((c, i) => (
            <span key={i} style={{ left: `${14 + i * 17}%`, animationDelay: `${i * 120}ms` }}>
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
