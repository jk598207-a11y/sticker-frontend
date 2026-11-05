import type { MutableRefObject } from 'react';
import type { Status } from './types';

type ExportReason =
  | 'admin'
  | 'free'
  | 'paid'
  | 'payment_required'
  | null;

export default function ExportPanel({
  rows,
  cols,
  status,
  tileRefs,
  onExport,
  onCreateOrder,
  exportReason,
  freeRemaining,
  hasPaidOrder,
}: {
  rows: number;
  cols: number;
  status: Status;
  tileRefs: MutableRefObject<Map<number, HTMLCanvasElement>>;
  onExport: () => void;
  onCreateOrder: () => void;
  exportReason: ExportReason;
  freeRemaining: number | null;
  hasPaidOrder: boolean;
}) {
  const total = rows * cols;
  const working = status === 'working';

  const handlePrimaryAction = () => {
    // 已經有付款訂單時，優先走下載流程
    if (hasPaidOrder) {
      onExport();
      return;
    }

    // 免費次數用完，而且沒有已付款訂單
    if (exportReason === 'payment_required') {
      onCreateOrder();
      return;
    }

    // 免費 / Admin / paid
    onExport();
  };

  const getButtonText = () => {
    if (working) {
      if (hasPaidOrder) {
        return '準備 ZIP 中…';
      }

      return exportReason === 'payment_required'
        ? '前往結帳中…'
        : '產生 ZIP 中…';
    }

    // 有已付款訂單時優先顯示
    if (hasPaidOrder) {
      return '下載已付款 ZIP';
    }

    if (exportReason === 'admin') {
      return '下載 ZIP';
    }

    if (exportReason === 'free') {
      return `免費下載 ZIP（剩 ${freeRemaining ?? 0} 次）`;
    }

    if (exportReason === 'paid') {
      return '下載已付款 ZIP';
    }

    if (exportReason === 'payment_required') {
      return '付款並下載 ZIP';
    }

    return '檢查匯出資格中…';
  };

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
        {Array.from({ length: total }, (_, index) => (
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
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {exportReason === 'free' && !hasPaidOrder && (
          <p className="text-sm text-ink/60">
            免費匯出剩餘：{freeRemaining ?? 0} / 3 次
          </p>
        )}

        {exportReason === 'payment_required' && !hasPaidOrder && (
          <p className="text-sm text-ink/60">
            免費匯出次數已用完，完成付款後即可下載 ZIP。
          </p>
        )}

        {hasPaidOrder && (
          <p className="text-sm text-ink/60">
            已完成付款，可下載這份 ZIP。
          </p>
        )}

        <button
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          disabled={working || (!hasPaidOrder && exportReason === null)}
          onClick={handlePrimaryAction}
        >
          {getButtonText()}
        </button>
      </div>
    </>
  );
}