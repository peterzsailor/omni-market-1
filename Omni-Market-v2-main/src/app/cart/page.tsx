"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Minus, Plus, RefreshCw, ShoppingBag, Trash2 } from "lucide-react";
import { money } from "@/lib/products";

type Product = { id: string; name: string; price: number; image: string; condition?: string; location?: string; stock: number };
type CartLine = { id: string; quantity: number; product?: Product; oldPrice?: number; unavailable?: boolean; error?: boolean };
type LiveProduct = { id: string; name: string; price_kes: number; image_urls?: string[] | null; condition?: string; location?: string; stock?: number | null };
const CART_KEY = "omni-market-cart";
const PRICE_KEY = "omni-market-cart-prices";
const demos: Product[] = [
  { id: "1", name: "Wireless headphones", price: 2499, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=360&q=80", condition: "Good", location: "Nairobi", stock: 6 },
  { id: "2", name: "Everyday sneakers", price: 3200, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=360&q=80", condition: "New", location: "Nairobi", stock: 9 },
  { id: "3", name: "Minimal desk lamp", price: 1850, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=360&q=80", condition: "Good", location: "Kiambu", stock: 4 },
  { id: "4", name: "Classic wristwatch", price: 2750, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=360&q=80", condition: "Like new", location: "Nairobi", stock: 3 },
  { id: "5", name: "Study essentials", price: 1200, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=360&q=80", condition: "New", location: "Nairobi", stock: 7 },
  { id: "6", name: "Wireless game controller", price: 2100, image: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=360&q=80", condition: "Good", location: "Mombasa", stock: 5 },
  { id: "7", name: "Everyday backpack", price: 1600, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=360&q=80", condition: "New", location: "Nairobi", stock: 8 },
  { id: "8", name: "Football", price: 950, image: "https://images.unsplash.com/photo-1614632537190-23e4b2e69c29?auto=format&fit=crop&w=360&q=80", condition: "Good", location: "Kisumu", stock: 12 },
];
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export default function CartPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [fetchFailed, setFetchFailed] = useState<string[]>([]);
  const [oldPrices, setOldPrices] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<{ ids: string[]; label: string } | null>(null);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    setUnavailable(current => current.filter(id => next.includes(id)));
    setFetchFailed(current => current.filter(id => next.includes(id)));
    try { localStorage.setItem(CART_KEY, JSON.stringify(next)); window.dispatchEvent(new CustomEvent("omni-cart-change", { detail: next })); }
    catch { setNotice("Your browser could not save the bag. Check storage settings and try again."); }
  }, []);

  const refresh = useCallback(async (cartIds: string[], initial = false) => {
    if (!initial) setRefreshing(true);
    const liveIds = [...new Set(cartIds.filter(isUuid))];
    const results = await Promise.all(liveIds.map(async id => {
      try {
        const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (response.status === 404) return { id, kind: "unavailable" as const };
        if (!response.ok) return { id, kind: "error" as const };
        const json = await response.json(); const p = json.product as LiveProduct | undefined;
        if (!p || !Number.isSafeInteger(p.stock) || (p.stock ?? -1) < 0 || !Number.isSafeInteger(p.price_kes) || p.price_kes < 1) return { id, kind: "unavailable" as const };
        return { id, kind: "product" as const, product: { id: p.id, name: p.name, price: p.price_kes, image: p.image_urls?.[0] || "/product-placeholder.svg", condition: p.condition, location: p.location, stock: p.stock as number } };
      } catch { return { id, kind: "error" as const }; }
    }));
    const priceCache: Record<string, number> = {};
    try { const raw: unknown = JSON.parse(localStorage.getItem(PRICE_KEY) || "{}"); if (raw && typeof raw === "object" && !Array.isArray(raw)) for (const [key, value] of Object.entries(raw)) if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) priceCache[key] = value; } catch { /* ignore corrupted price cache */ }
    const products = results.filter((r): r is Extract<typeof r, { kind: "product" }> => r.kind === "product").map(r => r.product);
    const missing = results.filter(r => r.kind === "unavailable").map(r => r.id);
    const errors = results.filter(r => r.kind === "error").map(r => r.id);
    const previous: Record<string, number> = {};
    for (const product of [...demos, ...products]) {
      const old = priceCache[product.id];
      if (old !== undefined && old !== product.price) previous[product.id] = old;
      if (old === undefined) priceCache[product.id] = product.price;
    }
    try { localStorage.setItem(PRICE_KEY, JSON.stringify(priceCache)); } catch { /* snapshots are a convenience, not the price authority */ }
    setLiveProducts(products); setUnavailable(missing); setFetchFailed(errors); setOldPrices(previous);
    setRefreshing(false); setLoaded(true);
  }, []);

  useEffect(() => {
    let active = true;
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      const cartIds = Array.isArray(raw) ? raw.filter((id): id is string | number => typeof id === "string" || typeof id === "number").map(String).filter(id => id.length > 0 && id.length <= 100) : [];
      setIds(cartIds);
      void refresh(cartIds, true).then(() => { if (!active) return; });
    } catch { setIds([]); setLoaded(true); }
    return () => { active = false; };
  }, [refresh]);

  const allProducts = useMemo(() => [...demos, ...liveProducts], [liveProducts]);
  const lines = useMemo<CartLine[]>(() => [...new Set(ids)].map(id => {
    const product = allProducts.find(p => p.id === id);
    const quantity = ids.filter(value => value === id).length;
    if (product) return { id, quantity, product, oldPrice: oldPrices[id] };
    return { id, quantity, unavailable: unavailable.includes(id), error: fetchFailed.includes(id) };
  }), [ids, allProducts, oldPrices, unavailable, fetchFailed]);
  const subtotal = lines.reduce((sum, line) => sum + (line.product && !oldPrices[line.id] ? line.product.price * line.quantity : 0), 0);
  const hasUnknown = lines.some(line => !line.product || line.oldPrice !== undefined || line.quantity > (line.product?.stock ?? 0) || (isUuid(line.id) === false));

  function changeQuantity(id: string, delta: number) {
    const line = lines.find(item => item.id === id); if (!line?.product) return;
    const nextQty = Math.max(0, Math.min(line.quantity + delta, line.product.stock));
    if (nextQty < line.quantity) setUndo({ ids, label: `${line.product.name} quantity updated` });
    persist([...ids.filter(item => item !== id), ...Array.from({ length: nextQty }, () => id)]);
  }
  function remove(id: string) {
    setUndo({ ids, label: "Item removed from your cart" });
    persist(ids.filter(item => item !== id));
  }
  function acceptPrice(id: string) {
    const line = lines.find(item => item.id === id); if (!line?.product) return;
    const next = { ...oldPrices }; delete next[id]; setOldPrices(next);
    try { const raw: unknown = JSON.parse(localStorage.getItem(PRICE_KEY) || "{}"); const prices = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {}; prices[id] = line.product.price; localStorage.setItem(PRICE_KEY, JSON.stringify(prices)); } catch { setNotice("Could not save your price confirmation. Please refresh and try again."); setOldPrices(oldPrices); }
  }

  if (!loaded) return <main className="mx-auto flex min-h-[55vh] max-w-5xl items-center justify-center px-4"><p className="text-sm text-[var(--muted)]" role="status">Loading your cart…</p></main>;
  return <main className="mx-auto min-h-[65vh] max-w-6xl px-4 py-8 text-[var(--text)] sm:px-6 sm:py-12">
    <Link href="/explore" className="text-sm font-semibold text-[var(--brand)]">← Continue shopping</Link>
    <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">Your selection</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Shopping cart <span className="text-lg font-medium text-[var(--muted)]">({ids.length})</span></h1></div>{ids.length > 0 && <button type="button" onClick={() => { if (window.confirm("Remove all items from your cart?")) { setUndo({ ids, label: "Cart cleared" }); persist([]); } }} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"><Trash2 size={15}/> Clear cart</button>}</div>
    {notice && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
    {undo && <p role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-3 text-sm">{undo.label}<button type="button" onClick={() => { persist(undo.ids); setUndo(null); }} className="font-semibold underline">Undo</button></p>}
    {fetchFailed.length > 0 && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><span>Some live listings could not be refreshed. We have not marked them sold.</span><button type="button" disabled={refreshing} onClick={() => void refresh(ids)} className="inline-flex items-center gap-2 font-semibold underline disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""}/> Retry</button></div>}
    {lines.length === 0 ? <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] px-6 py-14 text-center"><ShoppingBag className="mx-auto text-[var(--muted)]" size={36}/><h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2><p className="mt-2 text-sm text-[var(--muted)]">When you find something you like, add it here and review it before checkout.</p><Link href="/explore" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white">Continue shopping <ArrowRight size={16}/></Link></section> : <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
      <section id="cart-items" className="space-y-3">{lines.map(line => <article key={line.id} className="flex gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
        {line.product ? <Link href={`/products/${line.id}`} className="shrink-0"><img src={line.product.image} alt={line.product.name} className="h-24 w-24 rounded-xl bg-[var(--surface-2)] object-cover sm:h-28 sm:w-28"/></Link> : <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-xs text-[var(--muted)] sm:h-28 sm:w-28">Listing unavailable</div>}
        <div className="flex min-w-0 flex-1 flex-col"><div className="flex items-start justify-between gap-3"><div className="min-w-0">{line.product ? <Link href={`/products/${line.id}`} className="font-semibold hover:underline">{line.product.name}</Link> : <p className="font-semibold">{line.error ? "Listing could not be checked" : "This listing is no longer available"}</p>}<p className="mt-1 text-xs text-[var(--muted)]">{line.product ? `${line.product.condition || "Condition listed on product page"}${line.product.location ? ` · ${line.product.location}` : ""}` : line.error ? "Retry refreshing the cart before removing this item." : "Remove it to continue to checkout."}</p></div>{line.product && <p className="shrink-0 text-sm font-bold">{money(line.product.price * line.quantity)}</p>}</div>
          {line.product && line.oldPrice !== undefined && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><p>Price changed from {money(line.oldPrice)} to {money(line.product.price)} each. Confirm the new price before continuing.</p><button type="button" onClick={() => acceptPrice(line.id)} className="mt-2 font-semibold underline">Accept updated price</button></div>}
          {line.product && line.quantity > line.product.stock && <p role="alert" className="mt-2 text-sm font-medium text-red-700">Only {line.product.stock} currently available. Reduce quantity to continue.</p>}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">{line.product && <div className="flex items-center gap-2 rounded-full border border-[var(--line)] p-1"><button type="button" onClick={() => changeQuantity(line.id, -1)} aria-label={`Decrease ${line.product.name} quantity`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-2)]"><Minus size={14}/></button><span className="min-w-4 text-center text-sm font-semibold">{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.id, 1)} disabled={line.quantity >= line.product.stock} aria-label={`Increase ${line.product.name} quantity`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-2)] disabled:opacity-40"><Plus size={14}/></button></div>}<button type="button" onClick={() => remove(line.id)} className="text-xs font-semibold text-[var(--muted)] underline underline-offset-2 hover:text-red-600">Remove</button></div>
        </div></article>)}</section>
      <aside className="h-fit rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><h2 className="text-lg font-bold">Order summary</h2><div className="mt-5 flex justify-between gap-4 text-sm"><span className="text-[var(--muted)]">Subtotal (current confirmed prices)</span><span className="font-semibold">{money(subtotal)}</span></div><div className="mt-3 flex justify-between gap-4 text-sm"><span className="text-[var(--muted)]">Delivery</span><span className="text-[var(--muted)]">Calculated at checkout</span></div><div className="mt-5 flex justify-between gap-4 border-t border-[var(--line)] pt-4"><span className="font-semibold">Total before delivery</span><span className="text-xl font-bold">{money(subtotal)}</span></div><Link aria-disabled={hasUnknown || refreshing} href={hasUnknown || refreshing ? "#cart-items" : "/checkout"} onClick={e => { if (hasUnknown || refreshing) { e.preventDefault(); setNotice("Resolve unavailable listings, accept price changes, and correct quantities before checkout. Demo listings cannot be purchased."); } }} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white ${hasUnknown || refreshing ? "cursor-not-allowed bg-gray-400" : "bg-[var(--brand)] hover:opacity-90"}`}>Proceed to checkout <ArrowRight size={16}/></Link><p className="mt-4 text-xs leading-5 text-[var(--muted)]">Delivery is calculated at checkout. Prices are refreshed from the catalogue; demo listings are for preview only. Live checkout requires sign-in and server-side order validation.</p></aside>
    </div>}
  </main>;
}
