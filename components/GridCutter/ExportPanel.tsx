import type { MutableRefObject } from 'react';
import type { Status } from './types';

export default function ExportPanel({
  rows,
  cols,
  status,
  tileRefs,
  onExport,
  onCreateOrder,
}: {
  rows: number;
  cols: number;
  status: Status;
  tileRefs: MutableRefObject<Map<number, HTMLCanvasElement>>;
  onExport: () => void;
  onCreateOrder: () => void;
}) {
  const total = rows * cols;

  return (
    <>
      <p className="mb-2 text-sm font-medium text-ink/70">
        分割預覽：共 {total} 張
      </p>

      <div
        className="mb-6 grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {Array.from(
          { length: total },
          (_, index) => (
            <canvas
              key={`${rows}-${cols}-${index}`}
              width={64}
              height={64}
              className="tile-canvas aspect-square w-full rounded-md"
              ref={(element) => {
                if (element) {
                  tileRefs.current.set(index, element);
                } else {
                  tileRefs.current.delete(index);
                }
              }}
            />
          ),
        )}
      </div>

      <div className="mt-6 space-y-2">
        {/* 建立訂單並前往結帳 */}
        <button
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          disabled={status === 'working'}
          onClick={onCreateOrder}
        >
          {status === 'working'
            ? '建立訂單中…'
            : '建立訂單並前往結帳'}
        </button>

        {/* 匯出 ZIP */}
        <button
          className="w-full rounded-lg border border-ink/20 bg-white px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-ink/5 disabled:opacity-60"
          disabled={status === 'working'}
          onClick={onExport}
        >
          {status === 'working'
            ? '產生 ZIP 中…'
            : '匯出 ZIP'}
        </button>
      </div>
    </>
  );
}

