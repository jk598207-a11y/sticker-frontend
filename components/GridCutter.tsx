'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STAGE = 320;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const COUNT_OPTIONS = [8, 16, 24, 32, 40] as const;
const COUNT_GRID: Record<number, [number, number]> = {
  8:  [2, 4],
  16: [4, 4],
  24: [4, 6],
  32: [4, 8],
  40: [5, 8],
};

type DragTarget = { type: 'v' | 'h'; index: number } | null;

function evenSplit(n: number): number[] {
  const lines: number[] = [];
  for (let i = 1; i < n; i++) lines.push(i / n);
  return lines;
}

interface ImageRect { x: number; y: number; w: number; h: number; }

export default function GridCutter() {
  const [count, setCount]           = useState<number>(40);
  const [isCustom, setIsCustom]     = useState(false);
  const [customRows, setCustomRows] = useState(6);
  const [customCols, setCustomCols] = useState(6);

  const rows = isCustom ? customRows : COUNT_GRID[count][0];
  const cols = isCustom ? customCols : COUNT_GRID[count][1];

  const [vLines, setVLines] = useState<number[]>(() => evenSplit(COUNT_GRID[40][1]));
  const [hLines, setHLines] = useState<number[]>(() => evenSplit(COUNT_GRID[40][0]));
  const [isDragOver,    setIsDragOver]    = useState(false);
  const [status,        setStatus]        = useState<'idle'|'working'|'done'|'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [cursor,        setCursor]        = useState('default');

  const stageRef        = useRef<HTMLCanvasElement | null>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef    = useRef<HTMLInputElement  | null>(null);
  const tileRefs        = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const fileRef         = useRef<File | null>(null);
  const dragRef         = useRef<DragTarget>(null);
  const hasImageRef     = useRef(false);
  const imgRectRef      = useRef<ImageRect>({ x: 0, y: 0, w: STAGE, h: STAGE });

  if (!renderCanvasRef.current && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = STAGE; c.height = STAGE;
    renderCanvasRef.current = c;
  }

  const renderBase = useCallback((img: HTMLImageElement | null) => {
    const canvas = renderCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, STAGE, STAGE);
    ctx.fillStyle = '#d8d6cc';
    ctx.fillRect(0, 0, STAGE, STAGE);
    if (!img) return;
    const scale = Math.min(STAGE / img.width, STAGE / img.height);
    const sw = img.width * scale;
    const sh = img.height * scale;
    const ox = (STAGE - sw) / 2;
    const oy = (STAGE - sh) / 2;
    ctx.drawImage(img, ox, oy, sw, sh);
    imgRectRef.current = { x: ox, y: oy, w: sw, h: sh };
  }, []);

  const drawStage = useCallback(() => {
    const stage  = stageRef.current;
    const render = renderCanvasRef.current;
    if (!stage || !render) return;
    const ctx = stage.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, STAGE, STAGE);
    ctx.drawImage(render, 0, 0);
    const { x: ix, y: iy, w: iw, h: ih } = imgRectRef.current;
    const drawLines = (color: string, width: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      vLines.forEach((f) => {
        const x = ix + f * iw;
        ctx.beginPath(); ctx.moveTo(x, iy); ctx.lineTo(x, iy + ih); ctx.stroke();
      });
      hLines.forEach((f) => {
        const y = iy + f * ih;
        ctx.beginPath(); ctx.moveTo(ix, y); ctx.lineTo(ix + iw, y); ctx.stroke();
      });
    };
    drawLines('rgba(255,255,255,0.95)', 2.5);
    drawLines('rgba(239,68,68,0.85)', 1.0);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    ctx.strokeRect(ix, iy, iw, ih);
  }, [vLines, hLines]);

  const drawTiles = useCallback(() => {
    const render = renderCanvasRef.current;
    if (!render) return;
    const { x: ix, y: iy, w: iw, h: ih } = imgRectRef.current;
    const xBounds = [0, ...vLines.map((f) => Math.round(f * iw)), iw].map(v => ix + v);
    const yBounds = [0, ...hLines.map((f) => Math.round(f * ih)), ih].map(v => iy + v);
    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const canvas = tileRefs.current.get(n++);
        if (!canvas) continue;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        const x0 = xBounds[c], x1 = xBounds[c + 1];
        const y0 = yBounds[r], y1 = yBounds[r + 1];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (hasImageRef.current && x1 - x0 > 0 && y1 - y0 > 0) {
          ctx.drawImage(render, x0, y0, x1 - x0, y1 - y0, 0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [vLines, hLines, rows, cols]);

  useEffect(() => {
    if (!hasImageRef.current) renderBase(null);
    drawStage();
    drawTiles();
  }, [drawStage, drawTiles, renderBase]);

  const applyGrid = (r: number, c: number) => {
    setVLines(evenSplit(c));
    setHLines(evenSplit(r));
  };

  const handleSetCount = (n: number) => {
    setCount(n);
    setIsCustom(false);
    const [r, c] = COUNT_GRID[n];
    applyGrid(r, c);
  };

  const handleSetCustom = () => {
    setIsCustom(true);
    applyGrid(customRows, customCols);
  };

  const handleCustomChange = (type: 'rows' | 'cols', raw: number) => {
    const val = Math.min(20, Math.max(1, raw || 1));
    if (type === 'rows') {
      setCustomRows(val);
      if (isCustom) applyGrid(val, customCols);
    } else {
      setCustomCols(val);
      if (isCustom) applyGrid(customRows, val);
    }
  };

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus('error'); setStatusMessage('請選擇圖片檔案。'); return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus('error'); setStatusMessage('圖片大小不可超過 10 MB。'); return;
    }
    fileRef.current = file;
    setStatus('idle'); setStatusMessage('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        renderBase(img);
        hasImageRef.current = true;
        drawStage(); drawTiles();
      };
      img.onerror = () => { setStatus('error'); setStatusMessage('圖片讀取失敗。'); };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const canvasCoordsFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width)  * STAGE,
      y: ((e.clientY - rect.top)  / rect.height) * STAGE,
    };
  };

  const findLine = (canvasX: number, canvasY: number): DragTarget => {
    const { x: ix, y: iy, w: iw, h: ih } = imgRectRef.current;
    const tol = 12;
    for (let i = 0; i < vLines.length; i++)
      if (Math.abs(canvasX - (ix + vLines[i] * iw)) < tol) return { type: 'v', index: i };
    for (let j = 0; j < hLines.length; j++)
      if (Math.abs(canvasY - (iy + hLines[j] * ih)) < tol) return { type: 'h', index: j };
    return null;
  };

  const stageToImgFraction = (canvasX: number, canvasY: number) => {
    const { x: ix, y: iy, w: iw, h: ih } = imgRectRef.current;
    return { fx: (canvasX - ix) / iw, fy: (canvasY - iy) / ih };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasCoordsFromEvent(e);
    const hit = findLine(x, y);
    if (hit) { dragRef.current = hit; e.currentTarget.setPointerCapture(e.pointerId); }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasCoordsFromEvent(e);
    if (!dragRef.current) {
      const hit = findLine(x, y);
      setCursor(hit ? (hit.type === 'v' ? 'col-resize' : 'row-resize') : 'default');
      return;
    }
    const { fx, fy } = stageToImgFraction(x, y);
    const minGap = 0.02;
    if (dragRef.current.type === 'v') {
      setVLines((prev) => {
        const next = [...prev]; const i = dragRef.current!.index;
        const lo = (i === 0 ? 0 : next[i - 1]) + minGap;
        const hi = (i === next.length - 1 ? 1 : next[i + 1]) - minGap;
        next[i] = Math.min(hi, Math.max(lo, fx));
        return next;
      });
    } else {
      setHLines((prev) => {
        const next = [...prev]; const j = dragRef.current!.index;
        const lo = (j === 0 ? 0 : next[j - 1]) + minGap;
        const hi = (j === next.length - 1 ? 1 : next[j + 1]) - minGap;
        next[j] = Math.min(hi, Math.max(lo, fy));
        return next;
      });
    }
  };

  const onPointerUp = () => { dragRef.current = null; };

  const handleExport = async () => {
    if (!fileRef.current) { setStatus('error'); setStatusMessage('請先上傳一張圖片。'); return; }
    setStatus('working'); setStatusMessage('正在產生 ZIP...');
    try {
      const form = new FormData();
      form.append('image',    fileRef.current);
      form.append('rows',     String(rows));
      form.append('cols',     String(cols));
      form.append('vLines',   JSON.stringify(vLines));
      form.append('hLines',   JSON.stringify(hLines));
      form.append('isCustom', isCustom ? 'true' : 'false');
      const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
     const token = typeof window !== 'undefined' ? localStorage.getItem('sticker_token') : null;
const res = await fetch(`${apiBase}/stickers/generate-pack`, {
  method: 'POST',
  body: form,
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});
      if (!res.ok) { const t = await res.text(); throw new Error(t || `後端錯誤 (${res.status})`); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'sticker-pack.zip';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setStatus('done'); setStatusMessage('已下載 sticker-pack.zip。');
    } catch (err) {
      setStatus('error'); setStatusMessage(err instanceof Error ? err.message : '匯出失敗。');
    }
  };

  const totalCount = rows * cols;

  const tileCanvases = Array.from({ length: totalCount }, (_, i) => (
    <canvas
      key={`${rows}-${cols}-${i}`} width={64} height={64}
      className="tile-canvas aspect-square w-full rounded-md"
      ref={(el) => { if (el) tileRefs.current.set(i, el); else tileRefs.current.delete(i); }}
    />
  ));

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section>
        <div
          className={`mb-4 cursor-pointer rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${isDragOver ? 'border-accent bg-accent/5' : 'border-ink/25'}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) loadFile(f); }}
        >
          <p className="text-sm font-medium">點擊或拖曳圖片到這裡</p>
          <p className="mt-1 text-xs text-ink/55">支援常見圖片格式，單檔上限 10 MB</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
        </div>

        <p className="mb-2 text-sm font-medium text-ink/70">選擇貼圖張數</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {COUNT_OPTIONS.map((n) => (
            <button key={n} onClick={() => handleSetCount(n)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${!isCustom && n === count ? 'border-accent bg-accent text-paper' : 'border-ink/20 text-ink/70 hover:border-ink/40'}`}>
              {n} 張
            </button>
          ))}
          <button onClick={handleSetCustom}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${isCustom ? 'border-accent bg-accent text-paper' : 'border-ink/20 text-ink/70 hover:border-ink/40'}`}>
            自訂
          </button>
        </div>

        {isCustom && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-ink/15 bg-ink/5 px-4 py-3">
            <span className="text-sm text-ink/60">行數</span>
            <input type="number" min={1} max={20} value={customRows}
              onChange={(e) => handleCustomChange('rows', Number(e.target.value))}
              className="w-16 rounded-lg border border-ink/20 bg-white px-2 py-1 text-center text-sm" />
            <span className="text-sm text-ink/40">×</span>
            <span className="text-sm text-ink/60">列數</span>
            <input type="number" min={1} max={20} value={customCols}
              onChange={(e) => handleCustomChange('cols', Number(e.target.value))}
              className="w-16 rounded-lg border border-ink/20 bg-white px-2 py-1 text-center text-sm" />
            <span className="text-sm font-medium text-ink/60">= {totalCount} 張</span>
          </div>
        )}

        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium text-ink/70">拖曳線條調整切割範圍</p>
          <button onClick={() => applyGrid(rows, cols)}
            className="text-xs text-ink/45 underline underline-offset-2 hover:text-ink/70">
            重置均分
          </button>
        </div>
        <p className="mb-2 text-xs text-ink/40">移到紅線上出現 ↔ ↕ 游標即可拖曳</p>
        <canvas
          ref={stageRef} width={STAGE} height={STAGE}
          className="touch-none rounded-xl border border-ink/10"
          style={{ width: '100%', height: 'auto', cursor }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-ink/70">
          貼圖預覽，共 {totalCount} 張
          {isCustom && <span className="ml-2 text-xs text-ink/40">（自訂 {rows} 行 × {cols} 列）</span>}
        </p>
        <div className="mb-6 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {tileCanvases}
        </div>

        <button onClick={handleExport} disabled={status === 'working'}
          className="w-full rounded-lg bg-line06 px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60">
          {status === 'working' ? '產生中...' : '匯出 ZIP'}
        </button>

        {statusMessage && (
          <p className={`mt-3 text-sm ${status === 'error' ? 'text-red-600' : 'text-ink/65'}`}>
            {statusMessage}
          </p>
        )}

        {isCustom && (
          <p className="mt-3 text-xs text-amber-600">
            ⚠ 自訂張數（{totalCount} 張）不在 LINE 官方規格內，ZIP 仍可匯出但送審時 LINE 可能不接受。
          </p>
        )}

        <p className="mt-3 text-xs text-ink/45">
          ZIP 內含 main.png、tab.png，以及 01.png 到 {String(totalCount).padStart(2, '0')}.png。
          使用前請先啟動後端 API（預設 http://localhost:4000）。
        </p>
      </section>
    </div>
  );
}