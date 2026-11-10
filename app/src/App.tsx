import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './core/settings';
import { createSpeaker, unlockAudioOnFirstGesture } from './core/audio';
import { ALL_GAMES, gamesForAge, type GameManifest } from './core/games';
import { startSession, isOver, readLocked, writeLocked } from './core/session';
import { Home } from './ui/Home';
import { SleepScreen } from './ui/SleepScreen';
import { ParentGate } from './ui/ParentGate';
import { ParentArea } from './ui/ParentArea';

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [game, setGame] = useState<GameManifest | null>(null);
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
      if (!locked && isOver(session, Date.now())) { writeLocked(true); setLocked(true); setGame(null); }
    }, 1000);
    return () => clearInterval(id);
  }, [session, locked]);

  const games = gamesForAge(ALL_GAMES, settings.ageMonths);

  return (
    <>
      {locked ? (
        <SleepScreen speaker={speaker} />
      ) : game ? (
        <Suspense fallback={null}>
          <game.Component lang={settings.lang} speaker={speaker} onExit={() => setGame(null)} />
        </Suspense>
      ) : (
        <Home games={games} lang={settings.lang} speaker={speaker} onPick={setGame} />
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
    </>
  );
}
