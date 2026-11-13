import { Scene3D } from './Scene3D';
import { Buddy } from './Buddy';
import type { BuddyCharacter } from '../core/tokens';

type Props = { character: BuddyCharacter; wave: number; label: string; onTap(): void };

/** Xem trước 3D trong màn Bạn đồng hành (file riêng: R3F không chạy trong jsdom). */
export function BuddyPreview({ character, wave, label, onTap }: Props) {
  return (
    <Scene3D label={label} view={{ position: [0, 2.2, 9.5], target: [0, 1.6, 0], fov: 30 }} shadowScale={5}>
      <Buddy character={character} wave={wave} onTap={onTap} />
    </Scene3D>
  );
}
