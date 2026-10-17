# Omni Market — Final Consolidated Website Package

This is the single canonical project package for Omni Market. It consolidates the original Next.js/Supabase project and the subsequent multi-page UX, PWA, cart/checkout reliability, discovery/catalogue, seller storefront, secure order totals, and trust/operations updates. Do not combine it with older ZIPs; use this project as the source of truth.

## Product direction

Omni Market is a Kenya-focused marketplace for new and pre-loved goods, with KSh pricing and room for county/location-aware discovery. Keep the existing brand and visual direction: compact header, prominent search, concise hero, distinct pages, responsive product grids, accessible controls, and a usable mobile shopping flow.

## Consolidated route inventory

- `/` — compact marketplace homepage and featured discovery
- `/explore`, `/categories`, `/category/[slug]` — catalogue, category discovery and filters
- `/products/[id]`, `/seller/[id]` — product detail and seller storefront
- `/cart`, `/checkout`, `/orders/confirmation`, `/orders/[id]` — cart, checkout, confirmation and order tracking
- `/wishlist`, `/dashboard` — saved products and account/order dashboard
- `/login`, `/register`, `/auth/callback`, `/auth/signout` — authentication lifecycle
- `/sell`, `/seller-studio` — listing submission and seller operations
- `/admin` — restricted moderation and marketplace operations
- `/support`, `/notifications`, `/contact`, `/refunds`, `/privacy`, `/terms` — support, notices and policy pages
- `/api/products`, `/api/orders`, `/api/reports`, `/api/reviews`, `/api/support`, `/api/seller/order-status`, `/api/admin/operations` — server routes
- `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` — SEO and PWA endpoints

## Included implementation

- Shared site header/footer, responsive layout and installed PWA/offline assets.
- Product discovery, category routes, product detail, seller pages, wishlist, cart and checkout foundations.
- Server-side order-total and delivery-fee validation, stock reservation safeguards, duplicate-order protections where implemented, and order confirmation that does not equate an unpaid order with a paid order.
- Supabase authentication helpers and ordered database migrations with RLS-oriented marketplace, catalogue, discovery, order and trust operations.
- Seller reporting, buyer/seller reports, moderation queues, seller verification levels, support cases, notifications, seller order actions, order tracking views, and reviews constrained to qualifying delivered purchases.
- Environment template and setup, release and operations documentation.
- Dynamic sitemap and robots metadata; private/customer/operations paths are excluded from crawler indexing.

## Launch-critical external work / explicit limits

This package is consolidated source code, not proof that external services are configured or that production is launch-ready. Before taking real payments:

1. Configure a real Supabase project, environment variables, auth redirects, and apply every migration in timestamp order.
2. Set and validate the actual delivery-fee policy; order creation is expected to stay disabled until configured.
3. Implement and independently test a real M-Pesa/payment provider flow: server-side initiation, signed/verified callbacks, transaction-to-order/amount matching, retry/reconciliation, idempotency, and payment state transitions.
4. Define and implement marketplace fees, seller settlements/payouts, cancellation/refund processing, dispute workflow, and stock expiry/release for abandoned unpaid orders.
5. Connect real courier/dispatch events if live shipment scans are required. Current order tracking reflects application order status and is not a courier integration.
6. Configure production admin access through a trusted out-of-band process; never promote a user from an untrusted browser request.
7. Run dependency installation, lint, full Next.js build/typecheck, migration execution against a test Supabase project, and buyer/seller/admin/unauthorized end-to-end tests on desktop and mobile.
8. Add a chosen analytics/error-monitoring provider and privacy-compliant consent/configuration if required. No analytics provider or live payment credentials are fabricated in this source.

Keep electronic payments disabled until the payment and settlement checklist above passes. Do not show a seller as verified unless an authorized admin has recorded the appropriate verification level. Do not represent illustrative, seeded or unverified inventory as live stock.

## Environment

Copy `.env.example` to `.env.local` and fill in the Supabase project URL and public anon key. Set `NEXT_PUBLIC_SITE_URL` to the canonical production origin when deploying, and set `OMNI_DELIVERY_FEE_KES` only after the real fee policy has been decided. Never put service-role keys, payment secrets, or callback secrets in `NEXT_PUBLIC_*` variables or commit them.

## Canonical commands

```bash
npm ci
npm run lint
npm run build
npm run dev
```

Deploy the `omni-market-updated` project directory to Vercel. Apply migrations from `supabase/migrations/` in chronological order and follow `SUPABASE_SETUP.md` and `RELEASE_CHECKLIST.md`.
