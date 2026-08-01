import GridCutter from '@/components/GridCutter';

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-accent">LINE 貼圖切割工具</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            上傳圖片，快速切成 LINE 貼圖 ZIP
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/70">
            選擇貼圖張數、拖曳切割線，預覽每張貼圖後匯出 ZIP。後端會產生
            main.png、tab.png 和編號貼圖檔，可作為上傳 LINE Creators Market 的素材基礎。
          </p>
        </header>
        <GridCutter />
      </div>
    </main>
  );
}
