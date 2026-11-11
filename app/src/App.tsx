import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './core/settings';
import { createSpeaker, unlockAudioOnFirstGesture } from './core/audio';
import { ALL_GAMES, gamesForAge, type GameManifest } from './core/games';
import { startSession, isOver, readLocked, writeLocked } from './core/session';
import { WorldMap } from './ui/WorldMap';
import { GamePicker } from './ui/GamePicker';
import { SleepScreen } from './ui/SleepScreen';
import { ParentGate } from './ui/ParentGate';
import { ParentArea } from './ui/ParentArea';
import { Stage } from './ui/Stage';

type PickerState = { placeKey: string; placeGames: GameManifest[] } | null;

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [game, setGame] = useState<GameManifest | null>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const [parentOpen, setParentOpen] = useState(false);
  const [locked, setLocked] = useState(readLocked);
  const langRef = useRef(settings.lang);
  useEffect(() => { langRef.current = settings.lang; }, [settings.lang]);
  const speaker = useMemo(() => createSpeaker(() => langRef.current), []);
  const [session, setSession] = useState(() => startSession(Date.now(), DEFAULT_SETTINGS.sessionMinutes));

  useEffect(() => unlockAudioOnFirstGesture(), []);

  useEffect(() => {
    loadSettings().then((s) => { setSettings(s); setSession(startSession(Date.now(), s.sessionMinutes)); });
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!locked && isOver(session, Date.now())) { writeLocked(true); setLocked(true); setGame(null); setPicker(null); }
    }, 1000);
    return () => clearInterval(id);
  }, [session, locked]);

  // Hook cho e2e: ?e2e=1&picker=farm → ép mở picker
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('e2e') === '1' && params.has('picker')) {
      const placeKey = `place.${params.get('picker')}`;
      const games = gamesForAge(ALL_GAMES, settings.ageMonths);
      const placeGames = games.filter((g) => g.place === placeKey);
      if (placeGames.length > 0) {
        setPicker({ placeKey, placeGames });
      }
    }
  }, [settings.ageMonths]);

  const games = gamesForAge(ALL_GAMES, settings.ageMonths);

  const handlePickFromPicker = (g: GameManifest) => {
    setPicker(null);
    setGame(g);
  };

  return (
    <Stage>
      {locked ? (
        <SleepScreen speaker={speaker} />
      ) : game ? (
        <Suspense fallback={null}>
          <game.Component lang={settings.lang} speaker={speaker} ageMonths={settings.ageMonths} onExit={() => setGame(null)} />
        </Suspense>
      ) : picker ? (
        <GamePicker
          placeKey={picker.placeKey}
          games={picker.placeGames}
          lang={settings.lang}
          speaker={speaker}
          onPick={handlePickFromPicker}
          onBack={() => setPicker(null)}
        />
      ) : (
        <WorldMap
          games={games}
          lang={settings.lang}
          speaker={speaker}
          onPick={setGame}
          onOpenPicker={(placeKey, placeGames) => setPicker({ placeKey, placeGames })}
        />
      )}
      <ParentGate onOpen={() => setParentOpen(true)} />
      {parentOpen && (
        <ParentArea
          settings={settings}
          onSave={(s) => { setSettings(s); void saveSettings(s); }}
          onUnlock={() => { writeLocked(false); setLocked(false); setSession(startSession(Date.now(), settings.sessionMinutes)); }}
          onClose={() => setParentOpen(false)}
        />
      )}
    </Stage>
  );
}
