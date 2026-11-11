import { useState, useEffect, useCallback, useRef } from 'react';
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
  type PuzzleState,
} from './logic';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
const FRAME_SIZE = 360; // px, khung ghép ≥ 360px theo spec
const PIECE_MIN_SIZE = 120; // luật UX: vùng chạm ≥ 120px

interface PiecePosition {
  x: number; // toạ độ tâm trong stage
  y: number;
}

interface DragState {
  pieceIdx: number;
  offsetX: number;
  offsetY: number;
}

/** Tính kích thước một mảnh. */
function pieceDimensions(pieceCount: 2 | 3 | 4): { w: number; h: number } {
  if (pieceCount === 2) return { w: FRAME_SIZE / 2, h: FRAME_SIZE };
  if (pieceCount === 3) return { w: FRAME_SIZE / 3, h: FRAME_SIZE };
  // pieceCount === 4
  return { w: FRAME_SIZE / 2, h: FRAME_SIZE / 2 };
}

/** Vị trí ban đầu của các mảnh ở ngăn trái/phải. */
function initialTrayPositions(pieceCount: 2 | 3 | 4): PiecePosition[] {
  const { w, h } = pieceDimensions(pieceCount);
  const positions: PiecePosition[] = [];
  const centerY = 834 / 2; // Stage height / 2

  if (pieceCount === 2) {
    // Mảnh 0 bên trái, mảnh 1 bên phải
    positions.push({ x: 100 + w / 2, y: centerY });
    positions.push({ x: 1194 - 100 - w / 2, y: centerY });
  } else if (pieceCount === 3) {
    // 2 mảnh bên trái, 1 bên phải (hoặc ngược lại)
    const gap = 24;
    positions.push({ x: 80 + w / 2, y: centerY - h / 2 - gap / 2 });
    positions.push({ x: 80 + w / 2, y: centerY + h / 2 + gap / 2 });
    positions.push({ x: 1194 - 80 - w / 2, y: centerY });
  } else {
    // 4 mảnh: 2 bên trái, 2 bên phải
    const gap = 24;
    positions.push({ x: 80 + w / 2, y: centerY - h / 2 - gap / 2 });
    positions.push({ x: 80 + w / 2, y: centerY + h / 2 + gap / 2 });
    positions.push({ x: 1194 - 80 - w / 2, y: centerY - h / 2 - gap / 2 });
    positions.push({ x: 1194 - 80 - w / 2, y: centerY + h / 2 + gap / 2 });
  }
  return positions;
}

/** URL ảnh card. */
function cardUrl(cardId: string): string {
  return `${BASE}cards/${cardId}.png`;
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

export default function Game({ speaker, ageMonths, onExit }: GameProps) {
  const [state, setState] = useState<PuzzleState>(() =>
    newPuzzle(initialPieceCount(ageMonths))
  );
  const [piecePositions, setPiecePositions] = useState<PiecePosition[]>(() =>
    initialTrayPositions(state.pieceCount)
  );
  const [lastSay, setLastSay] = useState<string>('');
  const [showStars, setShowStars] = useState(false);
  const [completeAnim, setCompleteAnim] = useState(false);
  const doneHandled = useRef(false);
  const dragRef = useRef<DragState | null>(null);
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

      setTimeout(() => {
        say('puzzle.done');
        // Sau đó nói tên hình
        setTimeout(() => {
          say(cardContentKey(state.cardId));

          // 3s sau → ván mới
          setTimeout(() => {
            setShowStars(false);
            setCompleteAnim(false);
            const next = nextRound(state);
            setState(next);
            setPiecePositions(initialTrayPositions(next.pieceCount));
            doneHandled.current = false;
            say('puzzle.hello');
          }, 3000);
        }, 1500);
      }, 500);
    }
  }, [state, say]);

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
        newPos[pieceIdx] = {
          x: stagePos.x - offsetX,
          y: stagePos.y - offsetY,
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
        const isDragging =
          dragRef.current?.pieceIdx === piece.index && !piece.placed;

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
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className={styles.star}
              style={{
                left: `${10 + i * 10 + Math.random() * 5}%`,
                top: `${40 + Math.random() * 20}%`,
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
