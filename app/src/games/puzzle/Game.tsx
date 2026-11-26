import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import { clientToStage } from '../../ui/Stage';
import {
  newPuzzle,
  snap,
  placePiece,
  nextRound,
  initialPieceCount,
  pieceTargetPosition,
  cardContentKey,
  RECENT_PUZZLES,
  type PuzzleState,
} from './logic';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import { pictureUrl } from '../../content/pictures';
import styles from './Game.module.css';
import { FRAME_SIZE, KEEP_IN, PIECE_MIN_SIZE, STAGE_H, STAGE_W, initialTrayPositions, pieceDimensions, type PiecePosition } from './layout';


interface DragState {
  pieceIdx: number;
  offsetX: number;
  offsetY: number;
}

/** URL ảnh card (thẻ png hoặc hình khối svg). */
function cardUrl(cardId: string): string {
  return pictureUrl(cardId);
}

/** Tính background-position cho mảnh (để cắt ảnh). */
function pieceBackgroundStyle(
  pieceIdx: number,
  pieceCount: 2 | 3 | 4,
): { backgroundPosition: string; backgroundSize: string } {
  if (pieceCount === 2) {
    // Cắt dọc: mảnh 0 bên trái, mảnh 1 bên phải
    const xPercent = pieceIdx === 0 ? 0 : 100;
    return {
      backgroundPosition: `${xPercent}% 50%`,
      backgroundSize: '200% 100%',
    };
  }
  if (pieceCount === 3) {
    // Cắt dọc 3 phần
    const xPercent = pieceIdx * 50; // 0%, 50%, 100%
    return {
      backgroundPosition: `${xPercent}% 50%`,
      backgroundSize: '300% 100%',
    };
  }
  // 4 mảnh: lưới 2×2
  const col = pieceIdx % 2;
  const row = Math.floor(pieceIdx / 2);
  const xPercent = col * 100;
  const yPercent = row * 100;
  return {
    backgroundPosition: `${xPercent}% ${yPercent}%`,
    backgroundSize: '200% 200%',
  };
}

export default function Game({ speaker, ageMonths, options, onExit }: GameProps) {
  const topic = options?.topic ?? 'mix';
  const [state, setState] = useState<PuzzleState>(() => {
    // Trí nhớ ngắn: không ghép lại ảnh của vài ván gần đây (kể cả lần vào trò trước)
    const first = newPuzzle(initialPieceCount(ageMonths), 0, 0, topic, recentPicks<string>('puzzle'));
    rememberPicks('puzzle', [first.cardId], RECENT_PUZZLES);
    return first;
  });
  const [piecePositions, setPiecePositions] = useState<PiecePosition[]>(() =>
    initialTrayPositions(state.pieceCount)
  );
  const [lastSay, setLastSay] = useState<string>('');
  const [showStars, setShowStars] = useState(false);
  const [completeAnim, setCompleteAnim] = useState(false);
  const doneHandled = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  /** Mảnh đang được kéo (state để mảnh phóng to ngay lúc chạm, phản hồi trong 100ms). */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  /** Hẹn giờ của màn hoàn thành: huỷ khi bé thoát trò để không còn giọng đọc phát sau đó. */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const frameRef = useRef<HTMLDivElement>(null);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker]
  );

  // Expose solveOne for e2e test
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('e2e') === '1') {
      (window as { __behocPuzzle?: { solveOne(): void } }).__behocPuzzle = {
        solveOne: () => {
          setState((s) => {
            const notPlaced = s.pieces.find((p) => !p.placed);
            if (!notPlaced) return s;
            // Di chuyển mảnh đến đúng chỗ
            const frameLeft = (1194 - FRAME_SIZE) / 2;
            const frameTop = (834 - FRAME_SIZE) / 2;
            const target = pieceTargetPosition(
              notPlaced.index,
              FRAME_SIZE,
              FRAME_SIZE,
              s.pieceCount
            );
            setPiecePositions((pos) => {
              const newPos = [...pos];
              newPos[notPlaced.index] = {
                x: frameLeft + target.x,
                y: frameTop + target.y,
              };
              return newPos;
            });
            return placePiece(s, notPlaced.index);
          });
        },
      };
    }
    return () => {
      delete (window as { __behocPuzzle?: { solveOne(): void } }).__behocPuzzle;
    };
  }, []);

  // Hello message
  useEffect(() => {
    say('puzzle.hello');
  }, [say]);

  // Handle done
  useEffect(() => {
    if (state.done && !doneHandled.current) {
      doneHandled.current = true;
      setCompleteAnim(true);
      setShowStars(true);

      later(() => {
        say('puzzle.done');
        // Sau đó nói tên hình
        later(() => {
          say(cardContentKey(state.cardId));

          // 3s sau → ván mới
          later(() => {
            setShowStars(false);
            setCompleteAnim(false);
            const next = nextRound(state, 0, topic, recentPicks<string>('puzzle'));
            rememberPicks('puzzle', [next.cardId], RECENT_PUZZLES);
            setState(next);
            setPiecePositions(initialTrayPositions(next.pieceCount));
            doneHandled.current = false;
            say('puzzle.hello');
          }, 3000);
        }, 1500);
      }, 500);
    }
  }, [state, say, topic, later]);

  // Pointer handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, pieceIdx: number) => {
      if (state.pieces[pieceIdx].placed) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const stagePos = clientToStage(e.clientX, e.clientY);
      const piecePos = piecePositions[pieceIdx];
      dragRef.current = {
        pieceIdx,
        offsetX: stagePos.x - piecePos.x,
        offsetY: stagePos.y - piecePos.y,
      };
      setDragIdx(pieceIdx);
    },
    [state.pieces, piecePositions]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const { pieceIdx, offsetX, offsetY } = dragRef.current;
      const stagePos = clientToStage(e.clientX, e.clientY);
      setPiecePositions((pos) => {
        const newPos = [...pos];
        // giữ mảnh trong khung: kéo ra mép thì mảnh dừng lại, không mất khỏi màn hình
        newPos[pieceIdx] = {
          x: Math.min(STAGE_W - KEEP_IN, Math.max(KEEP_IN, stagePos.x - offsetX)),
          y: Math.min(STAGE_H - KEEP_IN, Math.max(KEEP_IN, stagePos.y - offsetY)),
        };
        return newPos;
      });
    },
    []
  );

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const { pieceIdx } = dragRef.current;
      dragRef.current = null;
      setDragIdx(null);

      // Kiểm tra snap
      const piecePos = piecePositions[pieceIdx];
      const frameLeft = (1194 - FRAME_SIZE) / 2;
      const frameTop = (834 - FRAME_SIZE) / 2;
      // Toạ độ mảnh trong khung
      const localX = piecePos.x - frameLeft;
      const localY = piecePos.y - frameTop;

      if (snap(pieceIdx, localX, localY, FRAME_SIZE, FRAME_SIZE, state.pieceCount)) {
        // Snap vào đúng chỗ
        const target = pieceTargetPosition(
          pieceIdx,
          FRAME_SIZE,
          FRAME_SIZE,
          state.pieceCount
        );
        setPiecePositions((pos) => {
          const newPos = [...pos];
          newPos[pieceIdx] = {
            x: frameLeft + target.x,
            y: frameTop + target.y,
          };
          return newPos;
        });
        setState((s) => placePiece(s, pieceIdx));
      }
      // Nếu không đúng chỗ → mảnh nằm yên chỗ thả
    },
    [piecePositions, state.pieceCount]
  );

  const { w: pieceW, h: pieceH } = pieceDimensions(state.pieceCount);
  // vị trí sao cố định cho mỗi lần hoàn thành (trước đây random trong lúc render nên sao nhảy chỗ mỗi lần vẽ lại)
  const stars = useMemo(() => {
    const k = [...state.cardId].reduce((n, c) => n + c.charCodeAt(0), 0);
    return Array.from({ length: 8 }, (_, i) => ({ left: 10 + i * 10 + ((i * 37 + k * 13) % 5), top: 40 + ((i * 53 + k * 7) % 20) }));
  }, [state.cardId]);
  const displayPieceW = Math.max(pieceW, PIECE_MIN_SIZE);
  const displayPieceH = Math.max(pieceH, PIECE_MIN_SIZE);
  const frameLeft = (1194 - FRAME_SIZE) / 2;
  const frameTop = (834 - FRAME_SIZE) / 2;

  return (
    <div
      className={styles.scene}
      data-testid="game-puzzle"
      data-last-say={lastSay}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Phòng ấm cúng của Đậu Đậu: tường chấm bi, cửa sổ, sàn gỗ, thảm */}
      <Scenery variant="room" />

      <BackHome onExit={onExit} />

      {/* Khung ghép */}
      <div
        ref={frameRef}
        className={`${styles.frame} ${completeAnim ? styles.completeFrame : ''}`}
        style={{
          width: FRAME_SIZE,
          height: FRAME_SIZE,
        }}
      >
        {/* Ảnh gợi ý mờ */}
        <div
          className={styles.hint}
          style={{ backgroundImage: `url(${cardUrl(state.cardId)})` }}
        />

        {/* Vị trí đích của từng mảnh */}
        {state.pieces.map((piece) => {
          const target = pieceTargetPosition(
            piece.index,
            FRAME_SIZE,
            FRAME_SIZE,
            state.pieceCount
          );
          return (
            <div
              key={piece.index}
              className={`${styles.slot} ${piece.placed ? styles.slotFilled : ''}`}
              style={{
                left: target.x - pieceW / 2,
                top: target.y - pieceH / 2,
                width: pieceW,
                height: pieceH,
              }}
            />
          );
        })}
      </div>

      {/* Các mảnh */}
      {state.pieces.map((piece) => {
        const pos = piecePositions[piece.index];
        const bgStyle = pieceBackgroundStyle(piece.index, state.pieceCount);
        const isDragging = dragIdx === piece.index && !piece.placed;

        // Nếu mảnh đã đặt vào khung, render tại vị trí trong khung
        if (piece.placed) {
          const target = pieceTargetPosition(
            piece.index,
            FRAME_SIZE,
            FRAME_SIZE,
            state.pieceCount
          );
          return (
            <div
              key={piece.index}
              className={`${styles.piece} ${styles.snapAnim}`}
              data-placed="true"
              style={{
                left: frameLeft + target.x - pieceW / 2,
                top: frameTop + target.y - pieceH / 2,
                width: pieceW,
                height: pieceH,
              }}
            >
              <div
                className={styles.pieceImage}
                style={{
                  backgroundImage: `url(${cardUrl(state.cardId)})`,
                  ...bgStyle,
                }}
              />
            </div>
          );
        }

        return (
          <div
            key={piece.index}
            className={styles.piece}
            aria-label={`Mảnh ${piece.index + 1}`}
            data-dragging={isDragging ? 'true' : undefined}
            style={{
              left: pos.x - displayPieceW / 2,
              top: pos.y - displayPieceH / 2,
              width: displayPieceW,
              height: displayPieceH,
            }}
            onPointerDown={(e) => handlePointerDown(e, piece.index)}
          >
            <div
              className={styles.pieceImage}
              style={{
                backgroundImage: `url(${cardUrl(state.cardId)})`,
                ...bgStyle,
              }}
            />
          </div>
        );
      })}

      {/* Stars khi hoàn thành */}
      {showStars && (
        <div className={styles.stars}>
          {stars.map((p, i) => (
            <span
              key={i}
              className={styles.star}
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                animationDelay: `${i * 100}ms`,
              }}
            >
              ⭐
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
