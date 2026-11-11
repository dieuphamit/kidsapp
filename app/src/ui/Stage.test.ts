import { describe, it, expect } from 'vitest';
import { clientToStage, fitStage, STAGE_W, STAGE_H } from './Stage';

describe('Stage', () => {
  it('fitStage: ngang thì không xoay, dọc thì xoay', () => {
    expect(fitStage(932, 430).rotate).toBe(false);
    expect(fitStage(430, 932).rotate).toBe(true);
    expect(fitStage(1194, 834).scale).toBeCloseTo(1);
  });
  it('clientToStage: giữa màn hình là giữa khung; góc khung đúng cả khi xoay', () => {
    const land = { ...fitStage(932, 430), vw: 932, vh: 430 };
    expect(clientToStage(466, 215, land)).toEqual({ x: STAGE_W / 2, y: STAGE_H / 2 });
    const port = { ...fitStage(430, 932), vw: 430, vh: 932 };
    const s = port.scale;
    // khung xoay 90° theo chiều kim đồng hồ: góc trên-trái của khung nằm ở góc trên-phải màn hình
    const topLeft = clientToStage(215 + (STAGE_H / 2) * s, 466 - (STAGE_W / 2) * s, port);
    expect(topLeft.x).toBeCloseTo(0);
    expect(topLeft.y).toBeCloseTo(0);
  });
});
