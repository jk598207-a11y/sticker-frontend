export type Status = 'idle' | 'working' | 'done' | 'error';
export type DragTarget = { type: 'v' | 'h'; index: number } | null;

export interface Preset {
  id: string;
  name: string;
  rows: number;
  cols: number;
  isCustom: boolean;
  vLines: number[];
  hLines: number[];
}

export interface ImageRect { x: number; y: number; w: number; h: number; }
