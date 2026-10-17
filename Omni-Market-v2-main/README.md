# Omni Market

A Kenyan buy-and-sell marketplace built with Next.js App Router, React, TypeScript, Tailwind CSS and Supabase.

## Quick start

1. Install Node.js 20.9+ and dependencies:
   ```bash
   npm ci
   ```
2. Create a project at https://supabase.com.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key) from Supabase Project Settings → API.
4. Apply Supabase migrations in this order using the Supabase SQL Editor or Supabase CLI: `202610160001_marketplace.sql`, `202610160002_marketplace_operations.sql`, `202610170001_discovery_trust.sql`, then `202610170002_secure_order_totals.sql`, then `202610170003_catalogue_expansion.sql`, then `202610170004_trust_operations.sql`, then `202610170005_county_location.sql`.
5. In Supabase Authentication settings, configure the site URL and allowed redirect URL, including `http://localhost:3000/auth/callback` for local development. Enable email/password authentication.
6. Set `OMNI_DELIVERY_FEE_KES` to your actual flat delivery fee in `.env.local` and the production server environment. Leave it unset until you have chosen the fee policy; order creation is intentionally disabled without it.
7. Start the app:
   ```bash
   npm run dev
   ```

## Supabase integration included

- Supabase SSR browser/server clients and session-refresh proxy.
- Email/password registration, sign-in, email-confirmation callback and password-reset email.
- Profiles created by a database trigger; customer/seller roles, with no client ability to grant admin privileges.
- Seller onboarding, product photo uploads to a private-per-user folder path in the public-read `product-images` bucket, and persisted listings submitted in `pending` moderation status.
- A persistent products API (`GET /api/products`) with validated keyword, category, condition, location, brand, availability, delivery/pickup, JSON product attributes, seller storefront, min/max price, sorting and pagination filters. It returns seller trust summaries without exposing private profile fields.
- The Explore and category pages query live active Supabase listings when configured, with an explicit sample-catalogue fallback when the backend is not reachable. Search supports filters, typo suggestions for sample-catalogue searches, device-local saved searches, and recently viewed products.
- Product detail pages can load live UUID listings, show confirmed seller verification/review/order summary when available, and preserve clear unavailable/error states.
- A device-local wishlist at `/wishlist`, with save/remove controls on product cards and product detail pages.
- Cart refreshes live listings, flags stale products and price changes, safely handles missing/invalid stock, and requires price-change acknowledgement before checkout.
- Authenticated order API (`POST /api/orders`) validates the requested quote against current database prices, calculates totals server-side, locks stock, prevents duplicate orders with an idempotency key, and creates an unpaid order. A configured server-side delivery fee is required.
- User dashboard reading persisted listings, orders and saved-item counts.
- Row Level Security for customer/seller data and storage uploads.

## Important configuration and launch notes

- **This is integration-ready source, not a connected live Supabase project.** No project URL/key was supplied, so you must configure `.env.local` and apply the migration before these services can connect.
- The homepage featured section and checkout's sample product catalogue still contain demo products. Explore/category/detail views can read live listings, but the full transaction lifecycle must be tested and completed before enabling live checkout.
- M-Pesa is not integrated. The order API does not charge customers; payment initiation and verified Daraja callbacks/webhooks must be implemented server-side before accepting electronic payments. Never trust a browser payment-success redirect.
- The admin workspace at `/admin` is restricted by both server-side role checks and database functions. Create the first administrator manually through a trusted SQL/admin process; never expose a service-role key to the browser.
- Configure Supabase SMTP for reliable confirmation/reset email delivery, production redirect URLs, backups, monitoring, abuse protection/rate limits, and legal policy review before launch.
- Order creation is transactional and idempotent. Set `OMNI_DELIVERY_FEE_KES` to the actual flat delivery fee before creating orders. The API deliberately refuses to create orders if this value is missing or invalid. Location-specific delivery pricing would need a server-side quote policy before launch.

## Multi-page experience and navigation

The storefront has been refactored from a long single-page scroll into dedicated, linkable pages with a shared sticky navigation, active route states, mobile menu, search entry point, lightweight page transitions, and a consistent footer.

- `/` — focused landing page with a short introduction, category shortcuts and a small featured selection.
- `/explore` — full catalogue with live client-side keyword search, category/condition/location filters, max-price filter and sorting.
- `/categories` and `/category/[slug]` — category directory and dedicated category listings.
- `/products/[id]` — product detail pages and related product discovery.
- `/checkout` and `/orders/confirmation` — checkout and order confirmation flow.
- `/login`, `/register`, `/dashboard` — account access and account dashboard.
- `/sell` — seller listing flow.
- `/contact`, `/privacy`, `/terms`, `/refunds` — support and policy pages.

The previous long-form homepage source is preserved in `src/legacy/home-legacy.tsx` for reference, but is not registered as a route.

## Verification note

The code has been refactored and packaged, but a production build could not be verified in this environment because dependency installation did not complete successfully. Run `npm ci` followed by `npm run build` in an environment with package registry access before deployment.


## Premium theme and installable PWA

- Omni Market includes a light/dark theme toggle; the selected theme is saved locally and defaults to the system preference on first visit.
- The web app manifest, branded SVG icon, service worker and offline fallback are included. Serve the app over HTTPS (or localhost) for installation. Use the browser menu or the **Install app** prompt when available.
- The service worker caches the app shell and visited same-origin pages/assets so previously visited screens can reopen offline. New pages and fresh catalogue data need a connection until visited/cached. Authentication, Supabase reads/writes, photo uploads, live stock, order submission and payments remain online-only; this is an offline-capable PWA, not a full offline replica of the server/database.
- Sellers can select up to five actual JPG/PNG/WebP product photos, preview them before submission, and upload them to the Supabase `product-images` bucket. A branded local illustration is used when a catalogue image is missing or fails to load; it is not presented as an actual item photo.
- Apply migrations in order: `supabase/migrations/202610160001_marketplace.sql`, `supabase/migrations/202610160002_marketplace_operations.sql`, `supabase/migrations/202610170001_discovery_trust.sql`, then `supabase/migrations/202610170002_secure_order_totals.sql`, `supabase/migrations/202610170003_catalogue_expansion.sql`, `supabase/migrations/202610170004_trust_operations.sql`, and `supabase/migrations/202610170005_county_location.sql`. The migrations add notifications, payment transaction records, order events, disputes, seller reviews and product reports, tighten role changes, and add canonical county plus optional coordinates for listings.

### PWA and offline smoke test

1. Configure Supabase and run `npm run dev` on localhost, or deploy over HTTPS.
2. Open the site and browse the home and explore pages while online.
3. Install from the browser's install menu when supported.
4. Enable airplane mode and reopen the installed app. Previously cached pages should load; uncached data and all server actions should show as unavailable until connectivity returns.
5. Test both themes, keyboard focus, mobile navigation, image previews, and reduced-motion preferences.

### Shopping bag update

- `/cart` now provides a persistent browser-local shopping bag with quantity controls, remove/clear actions, subtotal calculation, empty state, and a checkout hand-off.
- Product cards now include **Add to cart** with an immediate confirmation; the shared header updates its cart count without a page refresh.
- The cart is still a browser-local convenience, not a reservation of stock. Stock is checked and reserved only in the database order transaction. M-Pesa and verified payment callbacks are not implemented; orders created through this flow remain unpaid.

## Secure cart and checkout follow-up

- The cart stores product IDs as repeated IDs for quantities; browser prices are only snapshots for displaying price changes and are never sent as authoritative order prices.
- Checkout submits unique live product IDs and quantities to `POST /api/orders`. The database RPC locks active listings, recalculates prices, validates stock, aggregates repeated product IDs, reserves stock, creates order items, and uses an idempotency key.
- Apply migrations in order: `202610160001_marketplace.sql`, `202610160002_marketplace_operations.sql`, `202610170001_discovery_trust.sql`, then `202610170002_secure_order_totals.sql`, then `202610170003_catalogue_expansion.sql`, then `202610170004_trust_operations.sql`, then `202610170005_county_location.sql`.
- Set `OMNI_DELIVERY_FEE_KES` in the server environment to the real delivery-fee policy (integer KSh) before enabling order creation. Checkout intentionally refuses to create an order if this is missing or invalid; do not set a placeholder just to enable checkout.
- Live order creation requires a signed-in customer. Demo/sample product IDs are for display only and are blocked from order submission. M-Pesa is not integrated; created orders remain unpaid and must not be presented as paid.
- Price-change acknowledgement, stale-listing handling, and server-side stock validation are safeguards, but a full production release still needs real-device/end-to-end tests and payment-provider integration/callback verification.


## Broader marketplace discovery update

- Category directory now includes electronics, fashion, books, furniture, home & living, sports, beauty & personal care, baby & kids, automotive, office & business, toys & hobbies, and other goods. These are browse categories; they do not imply that every category already has active inventory.
- Product records can store optional brand, safe public category-specific attributes (`attributes` JSONB), and seller-supported fulfilment options (`delivery_options`). Apply `202610170003_catalogue_expansion.sql` before using these fields. Listing-form support for editing these new fields should be completed before asking sellers to populate them.
- `/seller/[id]` provides a public storefront for a seller UUID and displays only currently active products returned by the public catalogue API.
- Explore can save search filters and show recently viewed products on the same device. This is device-local convenience, not cross-device synced history. Typo suggestions are currently based on sample catalogue names/categories; server-side fuzzy search for the full live catalogue remains future work.
- Brand, availability, delivery/pickup and generic category-specific attribute filters are supported by the API and Explore UI when the relevant metadata has been entered. The delivery option is a seller-declared fulfilment preference; it is not a delivery quote or a promise of service in a given location.
- Seller reputation currently displays only existing verified/order/review summary data. TrustScore scoring, response-time/cancellation metrics, messaging, personalized recommendations, seller analytics, M-Pesa, order tracking, dispute resolution and refunds require additional backend and operational work.


## Trust, support and seller operations update

- `/admin` provides an admin-only moderation queue for pending listings, product/seller reports, support cases and a read-only recent-orders view. Database functions check the admin role before privileged actions.
- Product detail pages and live seller storefronts expose report controls; duplicate reports by the same account are rejected.
- `/support` creates a persistent support case with a generated case number for authenticated users. Delivered single-seller orders can submit one verified-purchase review through `/orders/[id]`. `/notifications` displays server-generated notifications, and `/orders/[id]` shows the saved order/item snapshot, payment status, order events and a link to support.
- `/seller-studio` shows the seller's inventory and order lines and supports limited status transitions for single-seller orders. Multi-seller order fulfilment remains restricted pending a dedicated per-seller fulfilment model.
- `202610170004_trust_operations.sql` adds seller reports, support cases, admin-only moderation/verification functions and seller order-status controls. Apply it after the first five migrations. Privileged verification fields are protected from ordinary profile edits.
- This does not integrate M-Pesa, payment reconciliation, actual seller payouts, automated email/SMS, or a legally approved refund process. No order is marked paid by these features. Configure provider callbacks and settlement controls before taking real payments.


## Quality audit and release readiness

See [`QUALITY_AUDIT.md`](./QUALITY_AUDIT.md) for repairs made in the latest revision, known launch blockers, and mandatory release gates. The project is not represented as production-ready until build, database, payment, and end-to-end checks have passed.


### Static project verification

Run `npm run verify:project` to check the required page-route inventory, database RPC references against the migrations, environment variable documentation, and dependency lockfile coverage. This static check is useful during development but does not replace a successful Next.js build, live Supabase policy tests, or browser end-to-end tests. See `QUALITY_AUDIT.md` for the exact release gates.

## County discovery update

The listing form and Explore filters use the canonical 47-county dataset in `src/lib/kenya-locations.ts`. Listing records store a county separately from the seller-entered town/locality, with optional coordinate fields reserved for future distance ranking. Apply migration `202610170005_county_location.sql` before deploying this version. The county preference is optional and saved locally; device GPS is not required. Existing listings are not automatically assigned a county because guessing from a free-text town could mislabel seller locations. Sellers should update/relist existing inventory with an accurate county before county-filtered discovery can include it.

## UI refinement update (2026-10-17)

- Rebuilt the site header into separate brand/search/utility and desktop-navigation rows to prevent search, Search button, and navigation pills from colliding at intermediate desktop widths.
- Updated search wording to “Search phones, sofas, sneakers…” and added a homepage search experience with popular query shortcuts.
- Reworked the homepage around product discovery, categories, and explicit listing/fulfilment caveats. Demo seller data is not presented as a real verification or buyer-protection guarantee.
- Standardized product imagery aspect ratios and reinforced mobile touch/layout safeguards.

Run `npm ci`, then `npm run verify:project`, `npm run lint`, and `npm run build` before deployment. Browser-based responsive and end-to-end tests are still required.
