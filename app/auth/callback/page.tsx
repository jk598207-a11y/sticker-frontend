'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveAuth } from '@/lib/auth';

export default function CallbackPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { router.push('/auth/login'); return; }

    // 用 token 去後端取用戶資料
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
    fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((user) => {
        saveAuth(token, user);
        router.push('/');
      })
      .catch(() => router.push('/auth/login'));
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper">
      <p className="text-sm text-ink/55">登錄中，請稍候...</p>
    </main>
  );
}