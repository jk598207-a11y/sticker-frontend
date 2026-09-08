'use client';

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { getToken, isLoggedIn } from '@/lib/auth';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl px-6 py-10 text-sm text-ink/60">正在載入結帳頁面…</main>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [message, setMessage] = useState('');
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!isLoggedIn()) {
    router.replace('/auth/login');
    return null;
  }

  if (!orderId) {
    return <main className="mx-auto max-w-3xl px-6 py-10"><h1 className="text-2xl font-semibold">找不到訂單</h1><p className="mt-2 text-sm text-ink/60">請回到首頁重新建立訂單。</p></main>;
  }

  if (!paypalClientId) {
    return <main className="mx-auto max-w-3xl px-6 py-10"><h1 className="text-2xl font-semibold">付款尚未設定</h1><p className="mt-2 text-sm text-ink/60">請在前端 .env.local 設定 NEXT_PUBLIC_PAYPAL_CLIENT_ID。</p></main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">
        結帳
      </h1>

      <div className="rounded-xl border border-ink/10 p-6">
        <p className="mb-6 text-sm text-ink/60">
          請選擇付款方式
        </p>

        <PayPalScriptProvider
          options={{
            clientId: paypalClientId,
            currency: 'TWD',
            intent: 'capture',
          }}
        >
          <PayPalButtons
            createOrder={async () => {
              const token = getToken();

              if (!token) {
                throw new Error('請先登入');
              }

              // 使用首頁已建立的本地訂單；不能在此再建立一筆。
              const paypalResponse = await fetch(
                `${apiBase}/paypal/create-order`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    orderId,
                    currency: 'TWD',
                  }),
                },
              );

              if (!paypalResponse.ok) {
                throw new Error('建立 PayPal 訂單失敗');
              }

              const paypalOrder =
                await paypalResponse.json();

              return paypalOrder.id;
            }}

            onApprove={async (data) => {
              const token = getToken();

              if (!token) {
                throw new Error('請先登入');
              }

              const response = await fetch(
                `${apiBase}/paypal/capture-order`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    orderId: data.orderID,
                  }),
                },
              );

              if (!response.ok) {
                throw new Error('PayPal Capture 失敗');
              }

              await response.json();
              router.push('/orders');
            }}
            onError={() => setMessage('付款服務暫時無法使用，請稍後再試。')}
          />
        </PayPalScriptProvider>
        {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      </div>
    </main>
  );
}
