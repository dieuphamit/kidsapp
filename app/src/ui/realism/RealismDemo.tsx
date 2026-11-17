import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClayButton } from '../ClayButton';
import { createSpeaker } from '../../core/audio';
import { contentByKey } from '../../core/content';
import { animalVoiceKeys } from '../../core/worldAnimals';
import { BACKDROP } from '../../games/world/scenery';
import { createDemoHerd, DEMO_SCENES, type DemoScene } from './demoHerd';
import type { Option } from './RealismScene';

/**
 * Trang DEMO cho bố mẹ (`?demo=realism`, không có trong menu, không đổi app thật): so sánh cách vẽ thú
 * "giống thật" trên cùng nền cảnh và cùng đội hình đang chuyển động. Thanh nút trên: phương án A/B/C và cảnh
 * Biển/Đồng cỏ. Tham số tuỳ chọn `&pa=a|b|c&scene=sea|meadow` để mở thẳng một tổ hợp.
 */

const RealismScene = lazy(() => import('./RealismScene'));

export const OPTIONS: readonly { id: Option; letter: string; name: string; note: string; extra: string; color: 'peach' | 'mint' | 'lilac' }[] = [
  {
    id: 'a',
    letter: 'A',
    name: 'Hiện tại (low-poly)',
    note: 'Model Quaternius/Kenney màu phẳng, có khung xương. Ưu: dễ thương, nhẹ, đồng bộ. Nhược: trông như đồ chơi, khó nhận ra loài thật.',
    extra: '+0 MB',
    color: 'peach',
  },
  {
    id: 'b',
    letter: 'B',
    name: 'Ảnh thật 2.5D',
    note: 'Ảnh chụp thật tách nền, thân uốn bằng lưới (đuôi vẫy, cánh vỗ, chân bước). Ưu: nhận ra ngay con thật. Nhược: phẳng, quay đầu là lật ảnh, nhìn nghiêng không được.',
    extra: '+0,5 MB (10 ảnh PNG)',
    color: 'mint',
  },
  {
    id: 'c',
    letter: 'C',
    name: '3D có texture',
    note: 'Model 3D có texture (ảnh scan/vẽ tay, CC0 và CC BY). Ưu: khối 3D thật, xoay được. Nhược: chất lượng mỗi con một kiểu (cá nóc, cá đuối là bản scan phải giảm tam giác nên lỗ chỗ), chỉ cá voi/cá heo/cáo có khung xương, con khác uốn đỉnh giả.',
    extra: '+2,4 MB (10 model GLB)',
    color: 'lilac',
  },
];

const SCENE_LABEL: Record<DemoScene, { icon: string; name: string; color: 'butter' | 'leaf' }> = {
  sea: { icon: '🌊', name: 'Biển', color: 'butter' },
  meadow: { icon: '🌾', name: 'Đồng cỏ', color: 'leaf' },
};

function initial<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const v = new URLSearchParams(window.location.search).get(key) as T | null;
  return v && allowed.includes(v) ? v : fallback;
}

export default function RealismDemo() {
  const [option, setOption] = useState<Option>(() => initial('pa', ['a', 'b', 'c'], 'b'));
  const [scene, setScene] = useState<DemoScene>(() => initial('scene', DEMO_SCENES, 'sea'));
  const [ready, setReady] = useState('');
  const herds = useMemo(() => ({ sea: createDemoHerd('sea'), meadow: createDemoHerd('meadow') }), []);
  const speaker = useMemo(() => createSpeaker(() => 'vi'), []);
  const content = useMemo(() => contentByKey(), []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTap = useCallback(
    (id: string) => {
      if (timer.current) clearTimeout(timer.current);
      const [first, ...rest] = animalVoiceKeys(id, (k) => content.has(k));
      if (first) speaker.say(first);
      if (rest[0]) timer.current = setTimeout(() => speaker.say(rest[0]), 1300);
    },
    [content, speaker],
  );
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const onReady = useCallback((o: Option) => setReady(`${scene}-${o}`), [scene]);
  const info = OPTIONS.find((o) => o.id === option)!;

  return (
    <div
      data-testid="realism-demo"
      data-option={option}
      data-scene={scene}
      data-ready={ready === `${scene}-${option}` ? 'true' : undefined}
      style={{ position: 'fixed', inset: 0, background: BACKDROP[scene], overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <Suspense fallback={null}>
          <RealismScene scene={scene} option={option} herd={herds[scene]} onTap={onTap} onReady={onReady} />
        </Suspense>
      </div>
      <div style={{ position: 'absolute', top: 16, left: 24, right: 24, display: 'flex', gap: 24, alignItems: 'flex-start', pointerEvents: 'none' }}>
        {OPTIONS.map((o) => (
          <ClayButton key={o.id} color={o.color} size={120} label={`Phương án ${o.letter}: ${o.name}`} selected={o.id === option} onPress={() => setOption(o.id)} style={{ pointerEvents: 'auto', outline: o.id === option ? '6px solid var(--ink)' : undefined }}>
            <span style={{ fontSize: 52 }}>{o.letter}</span>
          </ClayButton>
        ))}
        <div style={{ flex: 1 }} />
        {DEMO_SCENES.map((s) => (
          <ClayButton key={s} color={SCENE_LABEL[s].color} size={120} label={SCENE_LABEL[s].name} caption={SCENE_LABEL[s].name} selected={s === scene} onPress={() => setScene(s)} style={{ pointerEvents: 'auto', outline: s === scene ? '6px solid var(--ink)' : undefined }}>
            <span style={{ fontSize: 44 }}>{SCENE_LABEL[s].icon}</span>
          </ClayButton>
        ))}
      </div>
      <div
        data-testid="realism-info"
        style={{
          position: 'absolute',
          left: 24,
          bottom: 16,
          right: 24,
          padding: '10px 18px',
          borderRadius: 20,
          background: 'color-mix(in srgb, var(--paper) 80%, transparent)',
          color: 'var(--ink)',
          font: '600 19px/1.35 var(--font-kid)',
          pointerEvents: 'none',
        }}
      >
        <b style={{ fontSize: 24 }}>
          {info.letter}. {info.name}
        </b>{' '}
        <span style={{ color: 'var(--ink-soft)' }}>· tải thêm {info.extra}</span>
        <div>{info.note}</div>
      </div>
    </div>
  );
}
