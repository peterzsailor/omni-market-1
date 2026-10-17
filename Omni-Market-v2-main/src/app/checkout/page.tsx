"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Product = {
  id: number | string;
  name: string;
  price: number;
  image: string;
  stock?: number;
};

type DbProduct = {
  id: string;
  name: string;
  price_kes: number;
  image_urls?: string[] | null;
  stock?: number | null;
};

const normalizeLiveProduct = (p: DbProduct): Product => ({
  id: p.id,
  name: p.name,
  price: p.price_kes,
  image: p.image_urls?.[0] || "/product-placeholder.svg",
  stock: p.stock ?? undefined,
});

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

const money = (amount: number) => `KSh ${amount.toLocaleString("en-KE")}`;

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<string[]>([]);
  const [catalogue, setCatalogue] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [county, setCounty] = useState("Nairobi");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [staleIds, setStaleIds] = useState<string[]>([]);
  const [refreshErrors, setRefreshErrors] = useState<string[]>([]);
  const [changedPrices, setChangedPrices] = useState<string[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryFeeReady, setDeliveryFeeReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCart() {
      try {
        const saved = localStorage.getItem("omni-market-cart");
        const parsed: unknown = saved ? JSON.parse(saved) : [];

        const ids: string[] = Array.isArray(parsed)
          ? parsed
              .filter(
                (id): id is string | number =>
                  typeof id === "string" || typeof id === "number"
              )
              .map((id) => String(id))
          : [];

        const liveIds = [
          ...new Set(
            ids.filter((id) =>
              /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)
            )
          ),
        ];

        const results = await Promise.all(
          liveIds.map(async (id) => {
            try {
              const response = await fetch(
                `/api/products?id=${encodeURIComponent(id)}`,
                { cache: "no-store" }
              );

              if (response.status === 404) {
                return { id, kind: "stale" as const };
              }

              if (!response.ok) {
                return { id, kind: "error" as const };
              }

              const data = await response.json();
              const p = data.product as DbProduct | undefined;

              if (
                !p ||
                !Number.isSafeInteger(p.price_kes) ||
                p.price_kes < 1 ||
                !Number.isSafeInteger(p.stock) ||
                (p.stock ?? -1) < 0
              ) {
                return { id, kind: "stale" as const };
              }

              return {
                id,
                kind: "product" as const,
                product: normalizeLiveProduct(p),
              };
            } catch {
              return { id, kind: "error" as const };
            }
          })
        );

        if (!active) return;

        const live = results
          .filter(
            (r): r is Extract<typeof r, { kind: "product" }> =>
              r.kind === "product"
          )
          .map((r) => r.product);

        setStaleIds([
          ...ids.filter((id) => !isUuid(id)),
          ...results
            .filter((r) => r.kind === "stale")
            .map((r) => String(r.id)),
        ]);

        setRefreshErrors(
          results
            .filter((r) => r.kind === "error")
            .map((r) => String(r.id))
        );

        let snapshots: Record<string, unknown> = {};

        try {
          const raw: unknown = JSON.parse(
            localStorage.getItem("omni-market-cart-prices") || "{}"
          );

          if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            snapshots = raw as Record<string, unknown>;
          }
        } catch {
          // Price snapshots are optional.
        }

        setChangedPrices(
          live
            .filter(
              (p) =>
                typeof snapshots[String(p.id)] === "number" &&
                snapshots[String(p.id)] !== p.price
            )
            .map((p) => String(p.id))
        );

        setCart(ids.map((id) => String(id)));
        setCatalogue(live);

        try {
          const quoteResponse = await fetch("/api/orders", {
            cache: "no-store",
          });
          const quote = await quoteResponse.json();

          if (
            quoteResponse.ok &&
            Number.isSafeInteger(quote.deliveryFeeKes) &&
            quote.deliveryFeeKes >= 0
          ) {
            setDeliveryFee(quote.deliveryFeeKes);
          }
        } catch {
          // Checkout remains disabled without a server quote.
        }

        setDeliveryFeeReady(true);
      } catch {
        if (active) {
          setCart([]);
          setCatalogue([]);
          setDeliveryFeeReady(true);
        }
      } finally {
        if (active) setLoaded(true);
      }
    }

    loadCart();

    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(
    () =>
      catalogue
        .map((product) => ({
          ...product,
          quantity: cart.filter((id) => id === String(product.id)).length,
        }))
        .filter((product) => product.quantity > 0),
    [cart, catalogue]
  );

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (submitting) return;

    if (
      deliveryFee === null ||
      staleIds.length > 0 ||
      refreshErrors.length > 0 ||
      changedPrices.length > 0 ||
      items.some(
        (item) =>
          !isUuid(String(item.id)) ||
          !Number.isSafeInteger(item.stock) ||
          (item.stock ?? 0) < item.quantity
      )
    ) {
      setMessage(
        "Your cart contains sample/demo or unavailable listings, listings that could not be refreshed, changed prices, or quantities above stock. Return to the cart, remove or resolve those items, then try again. Your cart has not been changed."
      );
      return;
    }

    const itemPayload = items.map((item) => ({
      product_id: String(item.id),
      quantity: item.quantity,
      expected_price_kes: item.price,
    }));

    const key = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(key);
    setSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemPayload,
          customer_name: customerName,
          phone,
          email,
          delivery_address: address,
          county,
          delivery_notes: deliveryNotes,
          idempotency_key: key,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || typeof result.orderId !== "string") {
        setMessage(
          typeof result.error === "string"
            ? result.error
            : "We could not place the order. Your cart has been preserved."
        );
        return;
      }

      const purchased = new Set(items.map((item) => String(item.id)));
      const remaining = cart.filter((id) => !purchased.has(id));

      try {
        localStorage.setItem(
          "omni-market-cart",
          JSON.stringify(remaining)
        );
        window.dispatchEvent(
          new CustomEvent("omni-cart-change", { detail: remaining })
        );
      } catch {
        setMessage(
          "Your order was created, but we could not update browser storage. Please review your order history."
        );
      }

      router.push(
        `/orders/confirmation?orderId=${encodeURIComponent(result.orderId)}`
      );
    } catch {
      setMessage(
        "Checkout could not reach the server. Your cart has been preserved; retry when your connection is stable."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fcfcf9]">
        <p className="text-sm text-gray-500">Loading your order...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfcf9] px-4 py-8 text-[#202a22] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-2xl font-black tracking-tight text-[#234b35]"
        >
          Omni<span className="text-[#a2bd70]"> </span>Market
        </Link>

        <div className="mt-8">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-[#234b35]"
          >
            ← Continue shopping
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Checkout
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Confirm your items and enter your delivery details.
          </p>
        </div>

        {items.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-[#e6e8df] bg-white p-8 text-center">
            <h2 className="text-xl font-semibold">
              {staleIds.length || refreshErrors.length
                ? "Your cart needs attention"
                : "Your cart is empty"}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {staleIds.length || refreshErrors.length
                ? "Some saved items are demo listings, unavailable, or could not be refreshed. Review your cart and remove or retry those items before checkout."
                : "Add products to your cart before checking out."}
            </p>
            <Link
              href={
                staleIds.length || refreshErrors.length ? "/cart" : "/explore"
              }
              className="mt-5 inline-flex rounded-full bg-[#234b35] px-5 py-3 text-sm font-semibold text-white"
            >
              {staleIds.length || refreshErrors.length
                ? "Review cart"
                : "Browse products"}
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-3xl border border-[#e6e8df] bg-white p-5 sm:p-8"
            >
              <section>
                <h2 className="text-lg font-semibold">
                  Contact information
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Full name *
                    <input
                      required
                      autoComplete="name"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#dfe3d9] px-4 py-3 font-normal outline-none focus:border-[#719267]"
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Phone number *
                    <input
                      required
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      pattern="(\+254|0)[0-9]{9}"
                      title="Enter a Kenyan number, such as 0712345678 or +254712345678"
                      className="mt-2 w-full rounded-xl border border-[#dfe3d9] px-4 py-3 font-normal outline-none focus:border-[#719267]"
                      placeholder="0712345678"
                    />
                  </label>

                  <label className="text-sm font-medium sm:col-span-2">
                    Email address
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#dfe3d9] px-4 py-3 font-normal outline-none focus:border-[#719267]"
                      placeholder="you@example.com"
                    />
                  </label>
                </div>
              </section>

              <section className="border-t border-[#e6e8df] pt-6">
                <h2 className="text-lg font-semibold">Delivery details</h2>

                <div className="mt-5 space-y-4">
                  <label className="block text-sm font-medium">
                    County *
                    <select
                      required
                      value={county}
                      onChange={(event) => setCounty(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#dfe3d9] bg-white px-4 py-3 font-normal outline-none focus:border-[#719267]"
                    >
                      <option value="Baringo">Baringo</option>
                      <option value="Bomet">Bomet</option>
                      <option value="Bungoma">Bungoma</option>
                      <option value="Busia">Busia</option>
                      <option value="Elgeyo Marakwet">Elgeyo Marakwet</option>
                      <option value="Embu">Embu</option>
                      <option value="Garissa">Garissa</option>
                      <option value="Homa Bay">Homa Bay</option>
                      <option value="Isiolo">Isiolo</option>
                      <option value="Kajiado">Kajiado</option>
                      <option value="Kakamega">Kakamega</option>
                      <option value="Kericho">Kericho</option>
                      <option value="Kiambu">Kiambu</option>
                      <option value="Kilifi">Kilifi</option>
                      <option value="Kirinyaga">Kirinyaga</option>
                      <option value="Kisii">Kisii</option>
                      <option value="Kisumu">Kisumu</option>
                      <option value="Kitui">Kitui</option>
                      <option value="Kwale">Kwale</option>
                      <option value="Laikipia">Laikipia</option>
                      <option value="Lamu">Lamu</option>
                      <option value="Machakos">Machakos</option>
                      <option value="Makueni">Makueni</option>
                      <option value="Mandera">Mandera</option>
                      <option value="Marsabit">Marsabit</option>
                      <option value="Meru">Meru</option>
                      <option value="Migori">Migori</option>
                      <option value="Mombasa">Mombasa</option>
                      <option value="Murang'a">Murang'a</option>
                      <option value="Nairobi">Nairobi</option>
                      <option value="Nakuru">Nakuru</option>
                      <option value="Nandi">Nandi</option>
                      <option value="Narok">Narok</option>
                      <option value="Nyamira">Nyamira</option>
                      <option value="Nyandarua">Nyandarua</option>
                      <option value="Nyeri">Nyeri</option>
                      <option value="Samburu">Samburu</option>
                      <option value="Siaya">Siaya</option>
                      <option value="Taita Taveta">Taita Taveta</option>
                      <option value="Tana River">Tana River</option>
                      <option value="Tharaka Nithi">Tharaka Nithi</option>
                      <option value="Trans Nzoia">Trans Nzoia</option>
                      <option value="Turkana">Turkana</option>
                      <option value="Uasin Gishu">Uasin Gishu</option>
                      <option value="Vihiga">Vihiga</option>
                      <option value="Wajir">Wajir</option>
                      <option value="West Pokot">West Pokot</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium">
                    Delivery address or collection point *
                    <textarea
                      required
                      rows={3}
                      autoComplete="street-address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="mt-2 w-full resize-y rounded-xl border border-[#dfe3d9] px-4 py-3 font-normal outline-none focus:border-[#719267]"
                      placeholder="Estate, building, street, campus, or agreed collection point"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Delivery notes (optional)
                    <textarea
                      rows={2}
                      value={deliveryNotes}
                      onChange={(event) => setDeliveryNotes(event.target.value)}
                      className="mt-2 w-full resize-y rounded-xl border border-[#dfe3d9] px-4 py-3 font-normal outline-none focus:border-[#719267]"
                      placeholder="Any helpful delivery instructions"
                    />
                  </label>
                </div>
              </section>

              <section className="border-t border-[#e6e8df] pt-6">
                <h2 className="text-lg font-semibold">Payment</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  This checkout creates an order only when the server and
                  delivery-fee policy are configured. Payment is recorded as
                  unpaid; M-Pesa is not integrated and this page does not claim
                  that payment succeeded.
                </p>
              </section>

              {(!deliveryFeeReady ||
                deliveryFee === null ||
                staleIds.length > 0 ||
                refreshErrors.length > 0 ||
                changedPrices.length > 0) && (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
                >
                  <p className="font-semibold">
                    {deliveryFee === null
                      ? "Checkout is not ready"
                      : "Your cart needs attention"}
                  </p>
                  {deliveryFee === null && (
                    <p className="mt-1">
                      The server has not provided a delivery fee quote. Your
                      cart is safe; checkout is disabled until delivery pricing
                      is configured.
                    </p>
                  )}
                  {staleIds.length > 0 && (
                    <p className="mt-1">
                      Some items are demo listings or are no longer available.
                      Remove them from your{" "}
                      <Link className="underline" href="/cart">
                        cart
                      </Link>{" "}
                      before checkout.
                    </p>
                  )}
                  {refreshErrors.length > 0 && (
                    <p className="mt-1">
                      Some listings could not be refreshed. Retry after
                      checking your connection.
                    </p>
                  )}
                  {changedPrices.length > 0 && (
                    <p className="mt-1">
                      A product price has changed. Review and accept the
                      current price in your{" "}
                      <Link className="underline" href="/cart">
                        cart
                      </Link>
                      .
                    </p>
                  )}
                </div>
              )}

              {message && (
                <p
                  role="status"
                  className="rounded-xl bg-[#edf2e8] p-4 text-sm leading-6 text-[#234b35]"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  deliveryFee === null ||
                  !deliveryFeeReady ||
                  staleIds.length > 0 ||
                  refreshErrors.length > 0 ||
                  changedPrices.length > 0 ||
                  items.some(
                    (item) =>
                      !isUuid(String(item.id)) ||
                      !Number.isSafeInteger(item.stock) ||
                      (item.stock ?? 0) < item.quantity
                  )
                }
                className="w-full rounded-full bg-[#234b35] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#315e43] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Placing order…" : "Place order (payment unpaid)"}
              </button>
            </form>

            <aside className="h-fit rounded-3xl border border-[#e6e8df] bg-white p-5 sm:p-8">
              <h2 className="text-lg font-semibold">Your order</h2>

              <div className="mt-5 space-y-5">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-16 w-16 rounded-xl bg-gray-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span>Quantity: {item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = cart.filter(
                              (id) => id !== String(item.id)
                            );
                            setCart(next);
                            try {
                              localStorage.setItem(
                                "omni-market-cart",
                                JSON.stringify(next)
                              );
                              window.dispatchEvent(
                                new CustomEvent("omni-cart-change", {
                                  detail: next,
                                })
                              );
                            } catch {
                              setMessage(
                                "Could not save cart changes. Please check browser storage."
                              );
                            }
                          }}
                          className="font-semibold underline underline-offset-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {money(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 border-t border-[#e6e8df] pt-5">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-500">Delivery</span>
                  <span className="font-semibold">
                    {deliveryFee === null
                      ? "Unavailable"
                      : money(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#e6e8df] pt-4">
                  <span className="font-semibold">
                    Total payable (unpaid)
                  </span>
                  <span className="text-xl font-bold">
                    {money(subtotal + (deliveryFee ?? 0))}
                  </span>
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-gray-500">
                Delivery is currently a configured flat fee. The server
                recalculates item prices and stock before creating the order.
                Payment remains unpaid until a supported payment method is
                verified.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}