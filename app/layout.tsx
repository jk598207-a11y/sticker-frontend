import type { Metadata } from 'next';
import './globals.css';
import UserMenu from '@/components/UserMenu';

export const metadata: Metadata = {
  title: '貼圖製作工具',
  description: '上傳照片，拖曳格線裁切成符合LINE規格的貼圖包',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <nav className="flex items-center justify-between border-b border-ink/10 px-6 py-3 md:px-12">
          <a href="/" className="text-sm font-medium text-accent">
            LINE 貼圖切割工具
          </a>
          <UserMenu />
        </nav>
        {children}
      </body>
    </html>
  );
}