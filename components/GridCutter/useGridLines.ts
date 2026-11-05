import { useCallback, useRef, useState } from 'react';
import type { DragTarget, ImageRect, Preset } from './types';

export const COUNT_OPTIONS = [8, 16, 24, 32, 40] as const;
const COUNT_GRID: Record<number, readonly [number, number]> = {
  8: [2, 4], 16: [4, 4], 24: [4, 6], 32: [4, 8], 40: [5, 8],
};

const evenSplit = (count: number) => Array.from({ length: count - 1 }, (_, i) => (i + 1) / count);

export function useGridLines() {
  const [count, setCount] = useState(40);
  const [isCustom, setIsCustom] = useState(false);
  const [customRows, setCustomRows] = useState(6);
  const [customCols, setCustomCols] = useState(6);
  const [vLines, setVLines] = useState(() => evenSplit(8));
  const [hLines, setHLines] = useState(() => evenSplit(5));
  const dragRef = useRef<DragTarget>(null);

  const rows = isCustom ? customRows : COUNT_GRID[count][0];
  const cols = isCustom ? customCols : COUNT_GRID[count][1];
  const applyGrid = useCallback((nextRows: number, nextCols: number) => {
    setVLines(evenSplit(nextCols));
    setHLines(evenSplit(nextRows));
  }, []);

  const selectCount = (nextCount: number) => {
    const [nextRows, nextCols] = COUNT_GRID[nextCount];
    setCount(nextCount); setIsCustom(false); applyGrid(nextRows, nextCols);
  };
  const selectCustom = () => { setIsCustom(true); applyGrid(customRows, customCols); };
  const changeCustom = (axis: 'rows' | 'cols', rawValue: number) => {
    const value = Math.min(20, Math.max(1, rawValue || 1));
    if (axis === 'rows') { setCustomRows(value); if (isCustom) applyGrid(value, customCols); }
    else { setCustomCols(value); if (isCustom) applyGrid(customRows, value); }
  };

  const findLine = (x: number, y: number, image: ImageRect): DragTarget => {
    const tolerance = 12;
    const vertical = vLines.findIndex((line) => Math.abs(x - (image.x + line * image.w)) < tolerance);
    if (vertical >= 0) return { type: 'v', index: vertical };
    const horizontal = hLines.findIndex((line) => Math.abs(y - (image.y + line * image.h)) < tolerance);
    return horizontal >= 0 ? { type: 'h', index: horizontal } : null;
  };
  const pointerDown = (x: number, y: number, image: ImageRect) => {
    dragRef.current = findLine(x, y, image);
    return Boolean(dragRef.current);
  };
  const pointerMove = (x: number, y: number, image: ImageRect) => {
    if (!dragRef.current) {
      const hit = findLine(x, y, image);
      return hit?.type === 'v' ? 'col-resize' : hit ? 'row-resize' : 'default';
    }
    const position = dragRef.current.type === 'v' ? (x - image.x) / image.w : (y - image.y) / image.h;
    const update = dragRef.current.type === 'v' ? setVLines : setHLines;
    const index = dragRef.current.index;
    update((previous) => {
      const next = [...previous], gap = 0.02;
      next[index] = Math.min((index === next.length - 1 ? 1 : next[index + 1]) - gap, Math.max((index === 0 ? 0 : next[index - 1]) + gap, position));
      return next;
    });
    return dragRef.current.type === 'v' ? 'col-resize' : 'row-resize';
  };
  const applyPreset = (
  preset: Pick<
    Preset,
    'rows' | 'cols' | 'isCustom' | 'vLines' | 'hLines'
  >,
) => {
    setIsCustom(preset.isCustom);
    if (preset.isCustom) { setCustomRows(preset.rows); setCustomCols(preset.cols); }
    else if (COUNT_GRID[preset.rows * preset.cols]) setCount(preset.rows * preset.cols);
    setVLines(preset.vLines); setHLines(preset.hLines);
  };

  return { count, isCustom, customRows, customCols, rows, cols, totalCount: rows * cols, vLines, hLines, applyGrid, selectCount, selectCustom, changeCustom, applyPreset, pointerDown, pointerMove, pointerUp: () => { dragRef.current = null; } };
}
