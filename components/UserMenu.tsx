'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearAuth, isLoggedIn, AuthUser } from '@/lib/auth';

export default function UserMenu() {
  const router   = useRouter();
  const pathname = usePathname();
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [open,    setOpen]    = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 每次路由切換都重新讀取登錄狀態
  useEffect(() => {
    setMounted(true);
    if (isLoggedIn()) {
      setUser(getUser());
    } else {
      setUser(null);
    }
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!mounted) return null;

  if (!user) {
    return (
      <div className="flex gap-2">
        <a href="/auth/login"
          className="rounded-full border border-ink/20 px-3 py-1.5 text-sm text-ink/70 hover:border-ink/40">
          登錄
        </a>
        <a href="/auth/register"
          className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white">
          註冊
        </a>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-ink/15 px-3 py-1.5 text-sm hover:border-ink/30">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
          {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
        </div>
        <span className="text-ink/80">{user.name ?? user.email}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-ink/10 bg-white py-1 shadow-lg">
          <div className="border-b border-ink/10 px-4 py-2">
            <p className="text-xs font-medium text-ink">{user.name}</p>
            <p className="text-xs text-ink/50">{user.email}</p>
          </div>
          <a href="/orders"
            className="block px-4 py-2 text-sm text-ink/70 hover:bg-ink/5">
            歷史訂單
          </a>
          <button
            onClick={() => { clearAuth(); setUser(null); setOpen(false); router.push('/auth/login'); }}
            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50">
            登出
          </button>
        </div>
      )}
    </div>
  );
}