import { useRef, useEffect, useState, useCallback } from 'react';
import type { Lang } from '../../core/i18n';
import { LEARN_COLORS, LEARN_HEX, type LearnColor } from '../../core/tokens';
import { contentByKey } from '../../core/content';
import { ClayButton } from '../../ui/ClayButton';
import styles from './DrawPad.module.css';

const content = contentByKey();

type Props = {
  say(key: string): void;
  lang: Lang;
};

export function DrawPad({ say, lang }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState<LearnColor>('red');
  const [erasing, setErasing] = useState(false);

  // Khởi tạo canvas với devicePixelRatio
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Lưu hình cũ nếu có
    let oldData: ImageData | null = null;
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // Đặt kích thước mới
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const newCtx = canvas.getContext('2d');
    if (!newCtx) return;

    newCtx.scale(dpr, dpr);
    ctxRef.current = newCtx;

    // Vẽ lại hình cũ nếu có
    if (oldData) {
      // Tạo canvas tạm để scale
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = oldData.width;
      tempCanvas.height = oldData.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(oldData, 0, 0);
        newCtx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
      }
    }

    // Thiết lập style mặc định
    newCtx.lineWidth = 22;
    newCtx.lineCap = 'round';
    newCtx.lineJoin = 'round';
    newCtx.strokeStyle = LEARN_HEX[selectedColor];
  }, [selectedColor]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  // Cập nhật strokeStyle khi đổi màu
  useEffect(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.strokeStyle = LEARN_HEX[selectedColor];
    }
  }, [selectedColor]);

  const getCanvasPos = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const drawDot = (x: number, y: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    ctx.quadraticCurveTo(from.x, from.y, midX, midY);
    ctx.stroke();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Chỉ chấp nhận pointer đầu tiên
    if (activePointerRef.current !== null) return;

    activePointerRef.current = e.pointerId;
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;

    // Vẽ chấm ngay (phản hồi < 100ms)
    drawDot(pos.x, pos.y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Bỏ qua pointer khác
    if (activePointerRef.current !== e.pointerId) return;
    if (!lastPosRef.current) return;

    const pos = getCanvasPos(e);
    drawLine(lastPosRef.current, pos);
    lastPosRef.current = pos;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    lastPosRef.current = null;
  };

  const handleColorSelect = (color: LearnColor) => {
    setSelectedColor(color);
    say(`color.${color}`);
  };

  const handleErase = () => {
    setErasing(true);
    setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (canvas && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
      setErasing(false);
    }, 400);
  };

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.paperWrapper}>
        <canvas
          ref={canvasRef}
          data-testid="paper"
          className={`${styles.paper} ${erasing ? styles.erasing : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.colors}>
          {LEARN_COLORS.map((color) => {
            const colorKey = `color.${color}`;
            const label = content.get(colorKey)?.[lang] ?? color;
            const isSelected = selectedColor === color;

            return (
              <div
                key={color}
                className={`${styles.colorWrapper} ${isSelected ? styles.selected : ''}`}
              >
                <ClayButton
                  color="peach"
                  size={120}
                  label={label}
                  onPress={() => handleColorSelect(color)}
                >
                  <div
                    className={styles.colorDot}
                    style={{ backgroundColor: LEARN_HEX[color] }}
                  />
                </ClayButton>
              </div>
            );
          })}
        </div>

        <div className={styles.eraseWrapper}>
          <ClayButton color="lilac" size={140} label="Xóa" onPress={handleErase}>
            🧽
          </ClayButton>
        </div>
      </div>
    </div>
  );
}
