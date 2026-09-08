import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import type { ImageRect } from './types';

const STAGE = 320;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function useGridCanvas({ rows, cols, vLines, hLines, onError }: {
  rows: number; cols: number; vLines: number[]; hLines: number[]; onError: (message: string) => void;
}) {
  const stageRef = useRef<HTMLCanvasElement>(null);
  const tileRefs = useRef(new Map<number, HTMLCanvasElement>());
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRectRef = useRef<ImageRect>({ x: 0, y: 0, w: STAGE, h: STAGE });
  const fileRef = useRef<File | null>(null);
  const hasImageRef = useRef(false);

  const renderBase = useCallback((image: HTMLImageElement | null) => {
    if (!renderCanvasRef.current) {
      renderCanvasRef.current = document.createElement('canvas');
      renderCanvasRef.current.width = STAGE; renderCanvasRef.current.height = STAGE;
    }
    const context = renderCanvasRef.current.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, STAGE, STAGE); context.fillStyle = '#d8d6cc'; context.fillRect(0, 0, STAGE, STAGE);
    if (!image) return;
    const scale = Math.min(STAGE / image.width, STAGE / image.height);
    const width = image.width * scale, height = image.height * scale;
    const x = (STAGE - width) / 2, y = (STAGE - height) / 2;
    context.drawImage(image, x, y, width, height);
    imageRectRef.current = { x, y, w: width, h: height };
  }, []);

  const redraw = useCallback(() => {
    const stage = stageRef.current, source = renderCanvasRef.current;
    if (!stage || !source) return;
    const context = stage.getContext('2d'); if (!context) return;
    const image = imageRectRef.current;
    context.clearRect(0, 0, STAGE, STAGE); context.drawImage(source, 0, 0);
    ([['rgba(255,255,255,.95)', 2.5], ['rgba(239,68,68,.85)', 1]] as const).forEach(([color, width]) => {
      context.strokeStyle = color; context.lineWidth = width;
      vLines.forEach((line) => { const x = image.x + line * image.w; context.beginPath(); context.moveTo(x, image.y); context.lineTo(x, image.y + image.h); context.stroke(); });
      hLines.forEach((line) => { const y = image.y + line * image.h; context.beginPath(); context.moveTo(image.x, y); context.lineTo(image.x + image.w, y); context.stroke(); });
    });
    context.strokeStyle = 'rgba(0,0,0,.15)'; context.lineWidth = 1; context.strokeRect(image.x, image.y, image.w, image.h);
    const xBounds = [0, ...vLines.map((line) => Math.round(line * image.w)), image.w].map((value) => image.x + value);
    const yBounds = [0, ...hLines.map((line) => Math.round(line * image.h)), image.h].map((value) => image.y + value);
    let index = 0;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++, index++) {
      const tile = tileRefs.current.get(index), tileContext = tile?.getContext('2d');
      if (!tile || !tileContext) continue;
      const x0 = xBounds[col], x1 = xBounds[col + 1], y0 = yBounds[row], y1 = yBounds[row + 1];
      tileContext.clearRect(0, 0, tile.width, tile.height);
      if (hasImageRef.current && x1 > x0 && y1 > y0) tileContext.drawImage(source, x0, y0, x1 - x0, y1 - y0, 0, 0, tile.width, tile.height);
    }
  }, [cols, hLines, rows, vLines]);

  useEffect(() => { if (!hasImageRef.current) renderBase(null); redraw(); }, [redraw, renderBase]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return onError('請選擇圖片檔案。');
    if (file.size > MAX_FILE_SIZE) return onError('圖片大小不可超過 10 MB。');
    fileRef.current = file;
    const reader = new FileReader();
    reader.onload = () => { const image = new Image(); image.onload = () => { renderBase(image); hasImageRef.current = true; redraw(); }; image.onerror = () => onError('圖片讀取失敗。'); image.src = String(reader.result); };
    reader.readAsDataURL(file);
  };
  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * STAGE, y: (event.clientY - rect.top) / rect.height * STAGE };
  };
  return { stageRef, tileRefs, imageRectRef, fileRef, loadFile, pointFromEvent };
}
