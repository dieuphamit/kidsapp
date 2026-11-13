import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './core/settings';
import { createSpeaker, unlockAudioOnFirstGesture } from './core/audio';
import { cacheBuddyAudio } from './core/buddyAudio';
import { BuddyContext } from './ui/buddyContext';
import { ALL_GAMES, visibleGames, type GameManifest } from './core/games';
import { effectiveAge, gameSetting, optionsFor } from './core/gameOptions';
import { startSession, isOver, readLocked, writeLocked } from './core/session';
import { loadLastGame, saveLastGame } from './core/lastGame';
import { WorldMap } from './ui/WorldMap';
import { ShelfMenu } from './ui/ShelfMenu';
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
  const [lastGameId, setLastGameId] = useState<string | null>(null);
  const [parentOpen, setParentOpen] = useState(false);
  const [locked, setLocked] = useState(readLocked);
  const [forceShelf] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('e2e') === '1' && params.get('menu') === 'shelf';
  });
  const langRef = useRef(settings.lang);
  const nameRef = useRef(settings.buddy.name);
  useEffect(() => { langRef.current = settings.lang; }, [settings.lang]);
  useEffect(() => { nameRef.current = settings.buddy.name; }, [settings.buddy.name]);
  const speaker = useMemo(() => createSpeaker(() => langRef.current, undefined, () => nameRef.current), []);
  // Giọng đọc có tên của tên đang chọn: nạp sẵn vào cache để chạy offline (tên mặc định đã precache)
  // (chỉ sau khi đọc xong settings: chạy với mặc định trước sẽ xoá mất bộ của tên đã chọn)
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { if (loaded) void cacheBuddyAudio(settings.buddy.name); }, [loaded, settings.buddy.name]);
  const [session, setSession] = useState(() => startSession(Date.now(), DEFAULT_SETTINGS.sessionMinutes));

  useEffect(() => unlockAudioOnFirstGesture(), []);

  useEffect(() => {
    loadSettings().then((s) => { setSettings(s); setSession(startSession(Date.now(), s.sessionMinutes)); setLoaded(true); });
    void loadLastGame().then((id) => { if (id) setLastGameId((cur) => cur ?? id); });
  }, []);

  // Mở trò và nhớ lại để hiện nút chơi lại trên bản đồ
  const openGame = (g: GameManifest) => {
    setPicker(null);
    setGame(g);
    setLastGameId(g.id);
    void saveLastGame(g.id);
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (!locked && isOver(session, Date.now())) { writeLocked(true); setLocked(true); setGame(null); setPicker(null); }
    }, 1000);
    return () => clearInterval(id);
  }, [session, locked]);

  // Hook cho e2e: ?e2e=1&picker=zoo → ép mở picker
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('e2e') === '1' && params.has('picker')) {
      const placeKey = `place.${params.get('picker')}`;
      const games = visibleGames(ALL_GAMES, settings.ageMonths, settings.games);
      const placeGames = games.filter((g) => g.place === placeKey);
      if (placeGames.length > 0) {
        setPicker({ placeKey, placeGames });
      }
    }
  }, [settings.ageMonths, settings.games]);

  const games = visibleGames(ALL_GAMES, settings.ageMonths, settings.games);
  const gameOptions = game ? optionsFor(game, gameSetting(settings.games, game.id)) : null;
  // Móc e2e: ?e2e=1&menu=shelf ép kiểu kệ đồ chơi
  const menuStyle = forceShelf ? 'shelf' : settings.menuStyle;

  return (
    <BuddyContext value={settings.buddy}>
    <Stage>
      {locked ? (
        <SleepScreen speaker={speaker} />
      ) : game ? (
        <Suspense fallback={null}>
          <game.Component
            lang={settings.lang}
            speaker={speaker}
            ageMonths={effectiveAge(settings.ageMonths, gameOptions?.difficulty ?? 'auto', game)}
            options={gameOptions ?? undefined}
            onExit={() => setGame(null)}
          />
        </Suspense>
      ) : picker ? (
        <GamePicker
          placeKey={picker.placeKey}
          games={picker.placeGames}
          lang={settings.lang}
          speaker={speaker}
          onPick={openGame}
          onBack={() => setPicker(null)}
        />
      ) : menuStyle === 'shelf' ? (
        <ShelfMenu games={games} lang={settings.lang} speaker={speaker} onPick={openGame} />
      ) : (
        <WorldMap
          games={games}
          lang={settings.lang}
          speaker={speaker}
          onPick={openGame}
          onOpenPicker={(placeKey, placeGames) => setPicker({ placeKey, placeGames })}
          lastGameId={lastGameId}
        />
      )}
      <ParentGate onOpen={() => setParentOpen(true)} />
      {parentOpen && (
        <ParentArea
          settings={settings}
          speaker={speaker}
          onSave={(s) => {
            // cập nhật ngay (không chờ effect) để câu chào thử trong BuddySettings đọc đúng tên/ngôn ngữ mới
            langRef.current = s.lang;
            nameRef.current = s.buddy.name;
            setSettings(s);
            void saveSettings(s);
          }}
          onUnlock={() => { writeLocked(false); setLocked(false); setSession(startSession(Date.now(), settings.sessionMinutes)); }}
          onClose={() => setParentOpen(false)}
        />
      )}
    </Stage>
    </BuddyContext>
  );
}
