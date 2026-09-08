import GridCutter from '@/components/GridCutter';

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-2xl border border-ink/10 bg-white px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-accent">
            <span className="rounded-full bg-accent/10 px-2.5 py-1">LINE 貼圖製作工具</span>
            <span className="text-ink/45">PNG · ZIP · 可調整格線</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            把一張圖片，做成一組貼圖。
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
            上傳圖片後調整切割線，即時確認每張預覽，再下載可用於 LINE Creators Market 的貼圖 ZIP。
          </p>
          <ol className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            {[
              ['01', '上傳圖片', '支援 10 MB 內的圖片檔'],
              ['02', '調整切割線', '選擇張數並微調格線'],
              ['03', '下載或結帳', '匯出 ZIP，或建立訂單付款'],
            ].map(([step, title, detail]) => (
              <li key={step} className="rounded-xl bg-paper px-4 py-3">
                <span className="text-xs font-semibold text-accent">{step}</span>
                <p className="mt-1 font-medium">{title}</p>
                <p className="mt-0.5 text-xs text-ink/55">{detail}</p>
              </li>
            ))}
          </ol>
        </header>
        <GridCutter />
      </div>
    </main>
  );
}
