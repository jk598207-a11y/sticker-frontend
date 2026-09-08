'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser, isLoggedIn, AuthUser } from '@/lib/auth';

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  zipUrl?: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending:       '待處理',
  paid:          '已付款',
  in_production: '生產中',
  shipped:       '已出貨',
};

const STATUS_COLOR: Record<string, string> = {
  pending:       'bg-yellow-100 text-yellow-700',
  paid:          'bg-blue-100 text-blue-700',
  in_production: 'bg-purple-100 text-purple-700',
  shipped:       'bg-green-100 text-green-700',
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [user,    setUser]    = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/auth/login');
      return;
    }

    setUser(getUser());

    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
    fetch(`${apiBase}/orders`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('載入失敗，請稍後再試。');
        setLoading(false);
      });
  }, [router]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">歷史訂單</h1>
      <p className="mb-8 text-sm text-ink/55">{user?.email}</p>

      {loading && <p className="text-sm text-ink/50">載入中...</p>}
      {error   && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="rounded-xl border border-ink/10 px-6 py-12 text-center">
          <p className="text-sm text-ink/50">還沒有任何訂單記錄</p>
          <a href="/" className="mt-4 inline-block text-sm text-accent underline underline-offset-2">
            去製作貼圖
          </a>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id}
              className="rounded-xl border border-ink/10 px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-ink/40">
                  {new Intl.DateTimeFormat(undefined, {
                     dateStyle: 'medium', 
                     timeStyle: 'short' }).format(new Date(order.createdAt))}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink/70">
                訂單編號：<span className="font-mono text-xs">{order.id}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}