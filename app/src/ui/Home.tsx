import styles from './screens.module.css';
import { Scene3D } from './Scene3D';
import { DauDau } from './DauDau';
import { ClayButton } from './ClayButton';
import type { GameManifest } from '../core/games';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';
import { contentByKey } from '../core/content';

const content = contentByKey();

type Props = { games: GameManifest[]; lang: Lang; speaker: Speaker; onPick(g: GameManifest): void };

export function Home({ games, lang, speaker, onPick }: Props) {
  return (
    <div className={styles.full} data-testid="home">
      <Scene3D label="Đậu Đậu">
        <DauDau onTap={() => speaker.say('ui.hello')} />
      </Scene3D>
      <div className={styles.bubble}>{content.get('ui.where')?.[lang]}</div>
      <div className={styles.homeGrid}>
        {games.map((g) => (
          <ClayButton key={g.id} color={g.color} label={g.title[lang]} caption={g.title[lang]}
            onPress={() => { speaker.say(g.place); onPick(g); }}>
            {g.icon}
          </ClayButton>
        ))}
      </div>
    </div>
  );
}
