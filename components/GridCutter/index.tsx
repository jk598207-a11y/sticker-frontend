'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import {
  loadExportDraft,
  saveExportDraft,
} from '@/lib/export-draft';

import ExportPanel from './ExportPanel';
import PresetPanel from './PresetPanel';

import {
  COUNT_OPTIONS,
  useGridLines,
} from './useGridLines';

import { useGridCanvas } from './useGridCanvas';
import { usePresets } from './usePresets';

import type { Status } from './types';

type ExportReason =
  | 'admin'
  | 'free'
  | 'paid'
  | 'payment_required'
  | null;

type ExportEligibility = {
  canExport: boolean;
  reason: Exclude<ExportReason, null>;
  freeRemaining: number | null;
  orderId?: string;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (
    options?: {
      suggestedName?: string;

      types?: Array<{
        description: string;

        accept: Record<
          string,
          string[]
        >;
      }>;
    },
  ) => Promise<{
    createWritable: () => Promise<{
      write: (
        data: Blob,
      ) => Promise<void>;

      close: () => Promise<void>;
    }>;
  }>;
};

export default function GridControl() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const paymentStatus =
    searchParams.get('payment');

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [
    isDragOver,
    setIsDragOver,
  ] = useState(false);

  const [cursor, setCursor] =
    useState('default');

  const [status, setStatus] =
    useState<Status>('idle');

  const [message, setMessage] =
    useState('');

  const [
    exportReason,
    setExportReason,
  ] =
    useState<ExportReason>(null);

  const [
    freeRemaining,
    setFreeRemaining,
  ] =
    useState<number | null>(null);

  // 目前後端確認可使用的付款訂單
  const [
    exportOrderId,
    setExportOrderId,
  ] =
    useState<string | null>(null);

  const notify = (
    text: string,
    isError = false,
  ) => {
    setStatus(
      isError ? 'error' : 'done',
    );

    setMessage(text);
  };

  const grid = useGridLines();

  const canvas = useGridCanvas({
    ...grid,

    onError: (text) =>
      notify(text, true),
  });

  const presets = usePresets({
    getGrid: () => ({
      rows: grid.rows,
      cols: grid.cols,

      isCustom:
        grid.isCustom,

      vLines:
        grid.vLines,

      hLines:
        grid.hLines,
    }),

    onApply:
      grid.applyPreset,

    onMessage:
      notify,
  });

  // =====================================
  // 查詢目前匯出資格
  // =====================================
  const loadExportEligibility =
    useCallback(async () => {
      const token =
        localStorage.getItem(
          'sticker_token',
        );

      if (!token) {
        setExportReason(null);

        setFreeRemaining(null);

        setExportOrderId(null);

        return;
      }

      try {
        const apiBase =
          process.env
            .NEXT_PUBLIC_API_BASE ??
          'http://localhost:4000';

        const response =
          await fetch(
            `${apiBase}/exports/eligibility`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        if (!response.ok) {
          throw new Error(
            '無法取得匯出資格',
          );
        }

        const data:
          ExportEligibility =
          await response.json();

        setExportReason(
          data.reason,
        );

        setFreeRemaining(
          data.freeRemaining,
        );

        /*
         * ★ 重要
         *
         * orderId 完全相信後端。
         *
         * 後端沒有回 orderId，
         * 就把以前殘留的付款 ID 清掉。
         *
         * 避免：
         *
         * 舊 orderId
         * → exportUsed=true
         * → 又拿去下載
         * → 403
         */
        setExportOrderId(
          data.orderId ?? null,
        );
      } catch (error) {
        console.error(
          '取得匯出資格失敗：',
          error,
        );

        setExportReason(null);

        setFreeRemaining(null);

        setExportOrderId(null);
      }
    }, []);

  // 頁面進來時先查一次資格
  useEffect(() => {
    void loadExportEligibility();
  }, [loadExportEligibility]);

  // =====================================
  // 還原付款前圖片 / 格線
  // =====================================
  useEffect(() => {
    const restoreDraft =
      async () => {
        try {
          const draft =
            await loadExportDraft();

          if (!draft) {
            return;
          }

          /*
           * ★ 不再從 draft 還原 orderId
           *
           * orderId 必須由
           * /exports/eligibility
           * 決定。
           *
           * draft 只負責圖片與格線。
           */

          canvas.loadFile(
            draft.file,
          );

          grid.applyPreset({
            rows:
              draft.rows,

            cols:
              draft.cols,

            isCustom:
              draft.isCustom,

            vLines:
              draft.vLines,

            hLines:
              draft.hLines,
          });
        } catch (error) {
          console.error(
            '還原匯出草稿失敗：',
            error,
          );
        }
      };

    void restoreDraft();

    // 保持原本行為，只在進頁面時還原
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================
  // PayPal 付款成功
  // =====================================
  useEffect(() => {
    if (
      paymentStatus !==
      'success'
    ) {
      return;
    }

    setStatus('done');

    setMessage(
      '付款成功，已取得 1 次 ZIP 匯出資格。',
    );

    /*
     * 付款成功後重新向後端查。
     *
     * 後端會找到：
     *
     * status = paid
     * exportUsed = false
     *
     * 並回傳 orderId。
     */
    void loadExportEligibility();
  }, [
    paymentStatus,
    loadExportEligibility,
  ]);

  // =====================================
  // 建立付款訂單
  // =====================================
  const createOrder =
    async () => {
      const token =
        localStorage.getItem(
          'sticker_token',
        );

      if (!token) {
        return notify(
          '請先登入。',
          true,
        );
      }

      if (
        !canvas.fileRef.current
      ) {
        return notify(
          '請先上傳圖片。',
          true,
        );
      }

      try {
        setStatus('working');

        setMessage(
          '正在建立訂單…',
        );

        const apiBase =
          process.env
            .NEXT_PUBLIC_API_BASE ??
          'http://localhost:4000';

        const response =
          await fetch(
            `${apiBase}/orders`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        if (!response.ok) {
          throw new Error(
            '建立訂單失敗',
          );
        }

        const order =
          await response.json();

        /*
         * 先暫時記住訂單。
         *
         * 真正付款成功後，
         * 還是會由 eligibility
         * 再確認一次。
         */
        setExportOrderId(
          order.id,
        );

        // 保存付款前圖片與格線
        await saveExportDraft({
          orderId:
            order.id,

          file:
            canvas.fileRef
              .current,

          rows:
            grid.rows,

          cols:
            grid.cols,

          vLines:
            grid.vLines,

          hLines:
            grid.hLines,

          isCustom:
            grid.isCustom,
        });

        router.push(
          `/checkout?orderId=${order.id}`,
        );
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : '建立訂單失敗。',
          true,
        );
      }
    };

  // =====================================
  // 匯出 ZIP
  // =====================================
  const exportZip =
    async () => {
      if (
        !canvas.fileRef.current
      ) {
        return notify(
          '請先上傳圖片。',
          true,
        );
      }

      const token =
        localStorage.getItem(
          'sticker_token',
        );

      if (!token) {
        return notify(
          '請先登入後再匯出。',
          true,
        );
      }

      // ===================================
      // 沒有任何匯出資格
      // → 建立新訂單
      // ===================================
      if (
        exportReason ===
        'payment_required'
      ) {
        return createOrder();
      }

      /*
       * ★ 只有後端認定目前是 paid
       * 才能使用 orderId。
       *
       * 不再從 IndexedDB
       * 無條件找舊 orderId。
       */
      const orderIdToUse =
        exportReason === 'paid'
          ? exportOrderId
          : null;

      if (
        exportReason === 'paid' &&
        !orderIdToUse
      ) {
        return notify(
          '找不到目前可使用的付款訂單，請重新整理頁面後再試。',
          true,
        );
      }

      try {
        setStatus('working');

        if (
          exportReason === 'paid'
        ) {
          setMessage(
            '正在準備已付款 ZIP…',
          );
        } else {
          setMessage(
            '正在產生 ZIP…',
          );
        }

        const form =
          new FormData();

        form.append(
          'image',
          canvas.fileRef.current,
        );

        form.append(
          'rows',
          String(grid.rows),
        );

        form.append(
          'cols',
          String(grid.cols),
        );

        form.append(
          'vLines',
          JSON.stringify(
            grid.vLines,
          ),
        );

        form.append(
          'hLines',
          JSON.stringify(
            grid.hLines,
          ),
        );

        form.append(
          'isCustom',
          String(
            grid.isCustom,
          ),
        );

        /*
         * ★ 只有 paid 狀態
         * 才把 orderId 傳給後端。
         */
        if (
          exportReason ===
            'paid' &&
          orderIdToUse
        ) {
          form.append(
            'orderId',
            orderIdToUse,
          );
        }

        const apiBase =
          process.env
            .NEXT_PUBLIC_API_BASE ??
          'http://localhost:4000';

        const response =
          await fetch(
            `${apiBase}/stickers/generate-pack`,
            {
              method:
                'POST',

              body:
                form,

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        if (!response.ok) {
          const errorText =
            await response.text();

          throw new Error(
            errorText ||
              `匯出失敗 (${response.status})`,
          );
        }

        const blob =
          await response.blob();

        // ===================================
        // 付費 ZIP
        // ===================================
        if (
          exportReason ===
            'paid' &&
          orderIdToUse
        ) {
          const pickerWindow =
            window as SaveFilePickerWindow;

          /*
           * showSaveFilePicker
           * 目前主要使用 Chrome / Edge。
           *
           * 我們需要它的原因：
           *
           * 一般 <a download>
           * 無法知道使用者最後
           * 是「存檔」還是「取消」。
           */
          if (
            !pickerWindow
              .showSaveFilePicker
          ) {
            throw new Error(
              '付費 ZIP 儲存目前請使用 Chrome 或 Edge。',
            );
          }

          try {
            const fileHandle =
              await pickerWindow.showSaveFilePicker(
                {
                  suggestedName:
                    'sticker-pack.zip',

                  types: [
                    {
                      description:
                        'ZIP 壓縮檔',

                      accept: {
                        'application/zip':
                          [
                            '.zip',
                          ],
                      },
                    },
                  ],
                },
              );

            const writable =
              await fileHandle.createWritable();

            // 真正寫入檔案
            await writable.write(
              blob,
            );

            // 真正完成寫入
            await writable.close();
          } catch (error) {
            // =================================
            // 使用者按「取消」
            // =================================
            if (
              error instanceof
                DOMException &&
              error.name ===
                'AbortError'
            ) {
              /*
               * 不呼叫：
               *
               * /exports/complete-paid
               *
               * 所以資料庫：
               *
               * exportUsed = false
               *
               * 下次還能下載同一份。
               */
              setStatus('done');

              setMessage(
                '已取消儲存，這次付款下載資格沒有被使用。',
              );

              return;
            }

            throw error;
          }

          // =================================
          // 到這裡才代表真的存檔成功
          // =================================

          const completeResponse =
            await fetch(
              `${apiBase}/exports/complete-paid`,
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json',

                  Authorization:
                    `Bearer ${token}`,
                },

                body:
                  JSON.stringify({
                    orderId:
                      orderIdToUse,
                  }),
              },
            );

          if (
            !completeResponse.ok
          ) {
            const errorText =
              await completeResponse.text();

            throw new Error(
              errorText ||
                'ZIP 已儲存，但更新付款資格失敗。',
            );
          }

          /*
           * 後端現在：
           *
           * exportUsed = true
           *
           * 這筆付款正式用掉。
           */
          setExportOrderId(
            null,
          );

          setStatus('done');

          setMessage(
            'ZIP 已成功儲存。',
          );

          /*
           * 再向後端查一次。
           *
           * 如果沒有其他
           * exportUsed=false
           * 的 paid order，
           *
           * 就會回：
           *
           * payment_required
           */
          await loadExportEligibility();

          return;
        }

        // ===================================
        // 免費 / Admin
        // ===================================
        /*
         * 免費與 Admin
         * 目前維持原本下載方式。
         *
         * 這次主要處理的是：
         *
         * 付費下載取消
         * 不可以吃掉付款資格。
         */

        const url =
          URL.createObjectURL(
            blob,
          );

        const link =
          document.createElement(
            'a',
          );

        link.href =
          url;

        link.download =
          'sticker-pack.zip';

        document.body.appendChild(
          link,
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
          url,
        );

        notify(
          '已下載 sticker-pack.zip。',
        );

        await loadExportEligibility();
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : '匯出失敗。',
          true,
        );
      }
    };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section>
        {/* 上傳圖片 */}
        <div
          className={`mb-4 cursor-pointer rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
            isDragOver
              ? 'border-accent bg-accent/5'
              : 'border-ink/25'
          }`}
          onClick={() =>
            fileInputRef.current?.click()
          }
          onDragOver={(event) => {
            event.preventDefault();

            setIsDragOver(true);
          }}
          onDragLeave={() =>
            setIsDragOver(false)
          }
          onDrop={(event) => {
            event.preventDefault();

            setIsDragOver(false);

            const file =
              event.dataTransfer
                .files?.[0];

            if (file) {
              canvas.loadFile(
                file,
              );
            }
          }}
        >
          <p className="text-sm font-medium">
            點擊或拖曳圖片到此處
          </p>

          <p className="mt-1 text-xs text-ink/55">
            支援圖片檔案，大小不得超過 10 MB
          </p>

          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(
              event,
            ) => {
              const file =
                event.target
                  .files?.[0];

              if (file) {
                canvas.loadFile(
                  file,
                );
              }
            }}
          />
        </div>

        {/* 選擇分割張數 */}
        <p className="mb-2 text-sm font-medium text-ink/70">
          選擇分割張數
        </p>

        <div className="mb-2 flex flex-wrap gap-2">
          {COUNT_OPTIONS.map(
            (count) => (
              <button
                key={count}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  !grid.isCustom &&
                  count ===
                    grid.count
                    ? 'border-accent bg-accent text-paper'
                    : 'border-ink/20 text-ink/70'
                }`}
                onClick={() =>
                  grid.selectCount(
                    count,
                  )
                }
              >
                {count} 張
              </button>
            ),
          )}

          <button
            className={`rounded-full border px-3 py-1.5 text-sm ${
              grid.isCustom
                ? 'border-accent bg-accent text-paper'
                : 'border-ink/20 text-ink/70'
            }`}
            onClick={
              grid.selectCustom
            }
          >
            自訂
          </button>
        </div>

        {/* 自訂列欄 */}
        {grid.isCustom && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-ink/15 bg-ink/5 px-4 py-3">
            <span className="text-sm">
              列
            </span>

            <input
              className="w-16 rounded-lg border px-2 py-1 text-center"
              type="number"
              min={1}
              max={20}
              value={
                grid.customRows
              }
              onChange={(
                event,
              ) =>
                grid.changeCustom(
                  'rows',
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
            />

            <span>×</span>

            <span className="text-sm">
              欄
            </span>

            <input
              className="w-16 rounded-lg border px-2 py-1 text-center"
              type="number"
              min={1}
              max={20}
              value={
                grid.customCols
              }
              onChange={(
                event,
              ) =>
                grid.changeCustom(
                  'cols',
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
            />

            <span className="text-sm">
              ={' '}
              {grid.totalCount}{' '}
              張
            </span>
          </div>
        )}

        {/* 格線控制 */}
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium text-ink/70">
            拖曳紅線調整切割位置
          </p>

          <button
            className="text-xs underline"
            onClick={() =>
              grid.applyGrid(
                grid.rows,
                grid.cols,
              )
            }
          >
            重設格線
          </button>
        </div>

        <p className="mb-2 text-xs text-ink/40">
          可直接拖曳紅色格線微調位置。
        </p>

        {/* 主 Canvas */}
        <canvas
          ref={canvas.stageRef}
          width={320}
          height={320}
          className="touch-none rounded-xl border border-ink/10"
          style={{
            width: '100%',
            height: 'auto',
            cursor,
          }}
          onPointerDown={(
            event,
          ) => {
            const point =
              canvas.pointFromEvent(
                event,
              );

            if (
              grid.pointerDown(
                point.x,
                point.y,
                canvas
                  .imageRectRef
                  .current,
              )
            ) {
              event.currentTarget.setPointerCapture(
                event.pointerId,
              );
            }
          }}
          onPointerMove={(
            event,
          ) => {
            const point =
              canvas.pointFromEvent(
                event,
              );

            setCursor(
              grid.pointerMove(
                point.x,
                point.y,
                canvas
                  .imageRectRef
                  .current,
              ),
            );
          }}
          onPointerUp={
            grid.pointerUp
          }
          onPointerCancel={
            grid.pointerUp
          }
        />
      </section>

      <section>
        <ExportPanel
          rows={grid.rows}
          cols={grid.cols}
          status={status}
          tileRefs={
            canvas.tileRefs
          }
          onExport={
            exportZip
          }
          onCreateOrder={
            createOrder
          }
          exportReason={
            exportReason
          }
          freeRemaining={
            freeRemaining
          }
          hasPaidOrder={Boolean(
            exportOrderId,
          )}
        />

        <PresetPanel
          presets={
            presets.presets
          }
          onLoad={
            presets.load
          }
          onSave={
            presets.save
          }
          onApply={
            presets.apply
          }
          onDelete={
            presets.remove
          }
        />

        {message && (
          <p
            className={`mt-3 text-sm ${
              status === 'error'
                ? 'text-red-600'
                : 'text-ink/65'
            }`}
          >
            {message}
          </p>
        )}

        {grid.isCustom && (
          <p className="mt-3 text-xs text-amber-600">
            自訂張數不一定符合 LINE
            貼圖套組規範，請在匯出前確認需求。
          </p>
        )}
      </section>
    </div>
  );
}