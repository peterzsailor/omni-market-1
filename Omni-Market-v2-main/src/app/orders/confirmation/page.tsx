"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  return <main className="flex min-h-[70vh] items-center justify-center bg-[#fcfcf9] px-4 py-12 text-center text-[#202a22]">
    <section className="w-full max-w-lg rounded-3xl border border-[#e5e7df] bg-white p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#719267]">Order status</p>
      {orderId ? <>
        <div aria-hidden="true" className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#edf2e8] text-2xl text-[#234b35]">✓</div>
        <h1 className="mt-4 text-3xl font-bold">Your order was created</h1>
        <p className="mt-4 leading-7 text-gray-600">Your order reference is shown below. The order is currently unpaid; this does not confirm an M-Pesa payment. Keep the reference for support and check your account for status updates.</p>
        <p className="mt-4 break-all rounded-xl bg-[#f5f6f1] p-3 font-mono text-sm" aria-label="Order reference">{orderId}</p>
        <p className="mt-3 text-sm font-semibold text-amber-800">Payment status: unpaid</p>
      </> : <>
        <h1 className="mt-3 text-3xl font-bold">No order reference found</h1>
        <p className="mt-4 leading-7 text-gray-600">This page only confirms an order when the server returns a real order reference. If you have not submitted an order, no purchase is confirmed.</p>
      </>}
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/explore" className="inline-block rounded-full bg-[#234b35] px-6 py-3 font-semibold text-white">Continue shopping</Link><Link href="/dashboard" className="inline-block rounded-full border border-[#dfe3d9] px-6 py-3 font-semibold text-[#234b35]">View account & orders</Link></div>
    </section>
  </main>;
}

export default function Confirmation() {
  return <Suspense fallback={<main className="flex min-h-[70vh] items-center justify-center px-4"><p className="text-sm text-gray-600">Loading order status…</p></main>}><ConfirmationContent /></Suspense>;
}
