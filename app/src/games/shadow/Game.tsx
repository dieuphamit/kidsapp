import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import { STAGE_W, STAGE_H, clientToStage } from '../../ui/Stage';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import { pictureSayKey, pictureUrl } from '../../content/pictures';
import { newRound, dropResult, choiceCountForAge, type AnimalId, type Round } from './logic';

// Không ra lại hình của 3 ván gần nhất (nhớ cả khi ra vào trò)
const RECENT_ROUNDS = 3;

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');

// Card size
const SHADOW_SIZE = 280;
const CARD_SIZE = 180;
const CARD_GAP = 24;

// Drop radius (px from shadow center)
const DROP_RADIUS = 150;

// Position of shadow (center top area)
const SHADOW_X = STAGE_W / 2;
const SHADOW_Y = 260;

interface DragState {
  id: AnimalId;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface CardPos {
  id: AnimalId;
  homeX: number;
  homeY: number;
}

export default function Game({ speaker, ageMonths, options, onExit }: GameProps) {
  const topic = options?.topic ?? 'mix';
  const [lastSay, setLastSay] = useState('');
  const [round, setRound] = useState<Round | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [snapped, setSnapped] = useState(false);
  const [cardPositions, setCardPositions] = useState<CardPos[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<AnimalId, HTMLDivElement>>(new Map());

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker]
  );

  // Initialize round
  const startRound = useCallback(
    () => {
      const choiceCount = choiceCountForAge(ageMonths);
      const r = newRound(choiceCount, Math.random, recentPicks<AnimalId>('shadow'), topic);
      rememberPicks('shadow', [r.answer], RECENT_ROUNDS);
      setRound(r);
      setSnapped(false);
      setDrag(null);

      // Calculate card positions (bottom center)
      const totalWidth = r.choices.length * CARD_SIZE + (r.choices.length - 1) * CARD_GAP;
      const startX = (STAGE_W - totalWidth) / 2 + CARD_SIZE / 2;
      const homeY = STAGE_H - 140;

      setCardPositions(
        r.choices.map((id, i) => ({
          id,
          homeX: startX + i * (CARD_SIZE + CARD_GAP),
          homeY,
        }))
      );
    },
    [ageMonths, topic]
  );

  // Bắt đầu ván đầu khi vào trò
  useEffect(() => {
    startRound();
  }, [startRound]);

  // Mỗi khi đổi nhóm hình thì hỏi lại: "Bóng của ai?" (con vật) hay "Bóng của cái gì?" (quả, hình)
  const group = round?.group;
  useEffect(() => {
    if (!group) return;
    say(group === 'animals' ? 'shadow.hello' : 'shadow.hello-thing');
  }, [group, say]);

  // E2E hooks
  useEffect(() => {
    if (IS_E2E && round) {
      (window as unknown as { __behocShadow: { answer(): string; sayKey(): string; drop(id: string): void } }).__behocShadow = {
        answer: () => round.answer,
        sayKey: () => pictureSayKey(round.answer),
        drop: (id: string) => {
          const animalId = id as AnimalId;
          const result = dropResult(animalId, round.answer, 0, DROP_RADIUS);
          if (result === 'snap') {
            setSnapped(true);
            say(pictureSayKey(animalId));
            setTimeout(() => say('ui.great'), 900);
            setTimeout(() => startRound(), 3400);
          }
        },
      };
      return () => {
        delete (window as unknown as { __behocShadow?: unknown }).__behocShadow;
      };
    }
  }, [round, say, startRound]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: AnimalId) => {
      if (snapped) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const stagePos = clientToStage(e.clientX, e.clientY);
      const card = cardPositions.find((c) => c.id === id);
      if (card) {
        setDrag({
          id,
          startX: stagePos.x,
          startY: stagePos.y,
          currentX: stagePos.x,
          currentY: stagePos.y,
        });
      }
    },
    [cardPositions, snapped]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;
      const stagePos = clientToStage(e.clientX, e.clientY);
      setDrag((prev) => (prev ? { ...prev, currentX: stagePos.x, currentY: stagePos.y } : null));
    },
    [drag]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || !round) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const stagePos = clientToStage(e.clientX, e.clientY);
      const dx = stagePos.x - SHADOW_X;
      const dy = stagePos.y - SHADOW_Y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const result = dropResult(drag.id, round.answer, dist, DROP_RADIUS);

      if (result === 'snap') {
        setSnapped(true);
        say(pictureSayKey(drag.id));
        setTimeout(() => say('ui.great'), 900);
        setTimeout(() => startRound(), 3400);
      } else {
        // Return to home - do nothing, animation handles it
      }
      setDrag(null);
    },
    [drag, round, say, startRound]
  );

  const handleTap = useCallback(
    (id: AnimalId) => {
      if (snapped) return;
      // Tap without drag: say animal name
      say(pictureSayKey(id));
    },
    [say, snapped]
  );

  const handleClick = useCallback(
    (_e: React.MouseEvent, id: AnimalId) => {
      // Only trigger tap if not dragging
      if (!drag) {
        handleTap(id);
      }
    },
    [drag, handleTap]
  );

  if (!round) return null;

  // Render cards
  const renderCard = (pos: CardPos) => {
    const isDragging = drag?.id === pos.id;
    const isAnswer = snapped && pos.id === round.answer;

    let x = pos.homeX;
    let y = pos.homeY;

    if (isDragging && drag) {
      const offsetX = drag.currentX - drag.startX;
      const offsetY = drag.currentY - drag.startY;
      x = pos.homeX + offsetX;
      y = pos.homeY + offsetY;
    }

    if (isAnswer) {
      x = SHADOW_X;
      y = SHADOW_Y;
    }

    const scale = isDragging ? 1.1 : 1;
    const zIndex = isDragging ? 100 : 10;

    return (
      <div
        key={pos.id}
        ref={(el) => {
          if (el) cardRefs.current.set(pos.id, el);
        }}
        data-testid={`card-${pos.id}`}
        onPointerDown={(e) => handlePointerDown(e, pos.id)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => handleClick(e, pos.id)}
        style={{
          position: 'absolute',
          left: x - CARD_SIZE / 2,
          top: y - CARD_SIZE / 2,
          width: CARD_SIZE,
          height: CARD_SIZE,
          borderRadius: 24,
          background: 'var(--paper)',
          boxShadow: 'var(--shadow-clay)',
          cursor: 'grab',
          touchAction: 'none',
          transform: `scale(${scale})`,
          transition: isDragging ? 'none' : 'left 0.5s var(--ease-squish), top 0.5s var(--ease-squish), transform 0.12s',
          zIndex,
          display: isAnswer || !snapped ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        <img
          src={pictureUrl(pos.id)}
          alt={pos.id}
          draggable={false}
          style={{
            width: CARD_SIZE - 24,
            height: CARD_SIZE - 24,
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      data-testid="game-shadow"
      data-last-say={lastSay || undefined}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--sky-top)',
        overflow: 'hidden',
      }}
    >
      {/* Đồng cỏ nắng: trời, mây, đồi, cây, hoa */}
      <Scenery variant="meadow" />

      {/* Shadow */}
      <div
        ref={shadowRef}
        data-testid="shadow"
        style={{
          position: 'absolute',
          left: SHADOW_X - SHADOW_SIZE / 2,
          top: SHADOW_Y - SHADOW_SIZE / 2,
          width: SHADOW_SIZE,
          height: SHADOW_SIZE,
          borderRadius: 40,
          // khung kính mờ viền trắng: bóng đen nổi rõ trên trời xanh
          background: 'color-mix(in srgb, var(--paper) 92%, transparent)',
          border: '6px solid var(--paper)',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-clay)',
          zIndex: 1,
        }}
      >
        <img
          src={pictureUrl(round.answer)}
          alt="shadow"
          draggable={false}
          style={{
            width: SHADOW_SIZE - 32,
            height: SHADOW_SIZE - 32,
            objectFit: 'contain',
            filter: snapped ? 'none' : 'brightness(0) opacity(0.55)',
            transition: 'filter 0.3s',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Cards */}
      {cardPositions.map(renderCard)}

      <BackHome onExit={onExit} />
    </div>
  );
}
