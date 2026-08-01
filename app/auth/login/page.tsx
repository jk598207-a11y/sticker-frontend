'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? '登錄失敗');
      saveAuth(data.accessToken, data.user);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登錄失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">登錄</h1>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-ink/70">Email</label>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="your@email.com"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm text-ink/70">密碼</label>
          <input
            type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="至少 8 個字元"
          />
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleLogin} disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60">
          {loading ? '登錄中...' : '登錄'}
        </button>

        <p className="mt-4 text-center text-sm text-ink/55">
          還沒有帳號？{' '}
          <a href="/auth/register" className="text-accent underline underline-offset-2">
            註冊
          </a>
        </p>
      </div>
    </main>
  );
}