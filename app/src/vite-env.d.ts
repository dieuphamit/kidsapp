/// <reference types="vite/client" />

interface Window {
  __behocTap?: (id: string) => void;
  /** e2e: vị trí/hướng/mode của các con vật đi dạo và toạ độ trên canvas (xem WanderProbe) */
  __behocWander?: () => Record<string, { x: number; z: number; yaw: number; mode: string; sx: number; sy: number }>;
}
