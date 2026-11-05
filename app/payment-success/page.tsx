'use client';

import { useRouter } from 'next/navigation';

export default function PaymentSuccessPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border border-ink/10 p-8 text-center">
        <h1 className="text-2xl font-semibold">
          付款成功
        </h1>

        <p className="mt-3 text-sm text-ink/60">
          已取得 1 次 ZIP 匯出資格。
        </p>

        <button
          className="mt-8 w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white"
          onClick={() => {
            router.push('/?payment-success');
          }}
        >
          返回貼圖工具
        </button>
      </div>
    </main>
  );
}