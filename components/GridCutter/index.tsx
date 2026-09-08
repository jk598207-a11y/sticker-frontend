'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ExportPanel from './ExportPanel';
import PresetPanel from './PresetPanel';
import { COUNT_OPTIONS, useGridLines } from './useGridLines';
import { useGridCanvas } from './useGridCanvas';
import { usePresets } from './usePresets';
import type { Status } from './types';

export default function GridControl() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [cursor, setCursor] = useState('default');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const notify = (text: string, isError = false) => { setStatus(isError ? 'error' : 'done'); setMessage(text); };
  const grid = useGridLines();
  const canvas = useGridCanvas({ ...grid, onError: (text) => notify(text, true) });
  const presets = usePresets({ getGrid: () => ({ rows: grid.rows, cols: grid.cols, isCustom: grid.isCustom, vLines: grid.vLines, hLines: grid.hLines }), onApply: grid.applyPreset, onMessage: notify });


  // =========================
  // 建立自己的訂單
  // =========================
  const createOrder = async () => {
    const token = localStorage.getItem('sticker_token');

    if (!token) {
      return notify('請先登入。', true);
    }

    try {
      setStatus('working');
      setMessage('正在建立訂單…');

      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

      const response = await fetch(`${apiBase}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('建立訂單失敗');
      }

      const order = await response.json();

      // 建立成功後，以同一筆訂單前往結帳，避免重複下單。
      router.push(`/checkout?orderId=${order.id}`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : '建立訂單失敗。',
        true,
      );
    }
  };
    // 匯出 ZIP
  const exportZip = async () => {
    if (!canvas.fileRef.current) return notify('請先上傳圖片。', true);
    setStatus('working'); setMessage('正在產生 ZIP…');
    try {
      const form = new FormData();
      form.append('image', canvas.fileRef.current); form.append('rows', String(grid.rows)); form.append('cols', String(grid.cols));
      form.append('vLines', JSON.stringify(grid.vLines)); form.append('hLines', JSON.stringify(grid.hLines)); form.append('isCustom', String(grid.isCustom));
      const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
      const token = localStorage.getItem('sticker_token');
      const response = await fetch(`${apiBase}/stickers/generate-pack`, { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error((await response.text()) || `匯出失敗 (${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = 'sticker-pack.zip'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      notify('已下載 sticker-pack.zip。');
    } catch (error) { notify(error instanceof Error ? error.message : '匯出失敗。', true); }
  };

  return <div className="grid gap-8 md:grid-cols-2">
    <section>
      <div className={`mb-4 cursor-pointer rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${isDragOver ? 'border-accent bg-accent/5' : 'border-ink/25'}`} onClick={() => fileInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={(event) => { event.preventDefault(); setIsDragOver(false); const file = event.dataTransfer.files?.[0]; if (file) canvas.loadFile(file); }}>
        <p className="text-sm font-medium">點擊或拖曳圖片到此處</p><p className="mt-1 text-xs text-ink/55">支援圖片檔案，大小不得超過 10 MB</p>
        <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) canvas.loadFile(file); }} />
      </div>
      <p className="mb-2 text-sm font-medium text-ink/70">選擇分割張數</p><div className="mb-2 flex flex-wrap gap-2">{COUNT_OPTIONS.map((count) => <button key={count} className={`rounded-full border px-3 py-1.5 text-sm ${!grid.isCustom && count === grid.count ? 'border-accent bg-accent text-paper' : 'border-ink/20 text-ink/70'}`} onClick={() => grid.selectCount(count)}>{count} 張</button>)}<button className={`rounded-full border px-3 py-1.5 text-sm ${grid.isCustom ? 'border-accent bg-accent text-paper' : 'border-ink/20 text-ink/70'}`} onClick={grid.selectCustom}>自訂</button></div>
      {grid.isCustom && <div className="mb-4 flex items-center gap-3 rounded-xl border border-ink/15 bg-ink/5 px-4 py-3"><span className="text-sm">列</span><input className="w-16 rounded-lg border px-2 py-1 text-center" type="number" min={1} max={20} value={grid.customRows} onChange={(event) => grid.changeCustom('rows', Number(event.target.value))} /><span>×</span><span className="text-sm">欄</span><input className="w-16 rounded-lg border px-2 py-1 text-center" type="number" min={1} max={20} value={grid.customCols} onChange={(event) => grid.changeCustom('cols', Number(event.target.value))} /><span className="text-sm">= {grid.totalCount} 張</span></div>}
      <div className="mb-1 flex items-center justify-between"><p className="text-sm font-medium text-ink/70">拖曳紅線調整切割位置</p><button className="text-xs underline" onClick={() => grid.applyGrid(grid.rows, grid.cols)}>重設格線</button></div><p className="mb-2 text-xs text-ink/40">可直接拖曳紅色格線微調位置。</p>
      <canvas ref={canvas.stageRef} width={320} height={320} className="touch-none rounded-xl border border-ink/10" style={{ width: '100%', height: 'auto', cursor }} onPointerDown={(event) => { const point = canvas.pointFromEvent(event); if (grid.pointerDown(point.x, point.y, canvas.imageRectRef.current)) event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { const point = canvas.pointFromEvent(event); setCursor(grid.pointerMove(point.x, point.y, canvas.imageRectRef.current)); }} onPointerUp={grid.pointerUp} onPointerCancel={grid.pointerUp} />
    </section>
    <section><ExportPanel rows={grid.rows} cols={grid.cols} status={status} tileRefs={canvas.tileRefs} onExport={exportZip} onCreateOrder={createOrder} /><PresetPanel presets={presets.presets} onLoad={presets.load} onSave={presets.save} onApply={presets.apply} onDelete={presets.remove} />{message && <p className={`mt-3 text-sm ${status === 'error' ? 'text-red-600' : 'text-ink/65'}`}>{message}</p>}{grid.isCustom && <p className="mt-3 text-xs text-amber-600">自訂張數不一定符合 LINE 貼圖套組規範，請在匯出前確認需求。</p>}</section>
  </div>;
}
