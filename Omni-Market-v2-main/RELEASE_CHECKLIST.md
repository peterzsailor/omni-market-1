# Omni Market release checklist

## Shopping journey
- [ ] Product-card **Add to cart** updates the header count and gives an accessible confirmation.
- [ ] Cart survives refresh and navigation, including corrupted/unavailable local storage scenarios.
- [ ] Quantity controls respect current stock; missing/invalid stock fails safely; remove, undo and clear work.
- [ ] Stale/deactivated listings can be removed; transient refresh failures can be retried.
- [ ] Price changes are shown and acknowledged; a server-side quote mismatch rejects order creation.
- [ ] Checkout receives the intended live product IDs and quantities and preserves the cart on every failure.
- [ ] Repeated submits with the same idempotency key cannot create duplicate orders.
- [ ] Stock is revalidated and reserved atomically by the database transaction.
- [ ] The displayed delivery fee comes from the server and the total includes it; checkout is disabled when fee policy is unconfigured.
- [ ] Confirmation shows a real order reference and never claims that unpaid orders are paid.

## Supabase and trust
- [ ] Apply migrations in chronological order: `202610160001_marketplace.sql`, `202610160002_marketplace_operations.sql`, `202610170001_discovery_trust.sql`, `202610170002_secure_order_totals.sql`, `202610170003_catalogue_expansion.sql`, and `202610170004_trust_operations.sql`.
- [ ] Configure Supabase environment variables, auth redirect URLs, and `OMNI_DELIVERY_FEE_KES` with the actual delivery fee policy.
- [ ] Review RLS policies and public seller-summary fields.
- [ ] Implement and test verified M-Pesa callbacks, payment reconciliation, seller settlements and refunds before electronic payments.
- [ ] Test report submissions, admin moderation, seller verification guard, support case creation, notification visibility and order-status permissions with real Supabase roles.
- [ ] Test `/orders/[id]` and `/seller-studio` with buyer, seller, admin and unauthorized accounts.
- [ ] Define expiry/release handling for stock reserved by abandoned or unpaid orders.

## Quality gates
- [ ] Run `npm ci`, `npm run lint`, and `npm run build` in an environment with registry access.
- [ ] Test desktop, tablet and mobile navigation and checkout.
- [ ] Test guest and authenticated catalogue flows; live order creation should require authentication.
- [ ] Run end-to-end checkout tests with database fixtures and payment sandbox credentials before launch.
- [ ] Confirm `NEXT_PUBLIC_SITE_URL` is the canonical production origin and verify `/sitemap.xml`, `/robots.txt`, Open Graph metadata, and page titles after deployment.
- [ ] Review `FINAL_MASTER_SPEC.md` for explicit integration blockers; do not enable electronic payments before the M-Pesa and settlement checks pass.

## Homepage and header refinement (2026-10-17)

- [x] Split the site header into distinct brand/navigation and search rows to prevent the search button from colliding with Home/navigation pills.
- [x] Keep the global marketplace search available on all routes and route submissions to Explore.
- [x] Rework the homepage into a concise landing page: welcome/search hero, buyer/seller pathways, and factual trust guidance. The shared site footer provides About/discovery/account/help destinations.
- [x] Keep the product catalogue, categories, filtering, sorting, favourites, cart, account and seller tools on their dedicated destinations.
- [x] Keep location selection editable in Explore and persist the user's county/town preference locally.
- [ ] Verify visual layout in real browsers at 320, 360, 375, 390, 768, 1024, 1280 and 1440px.
- [ ] Run `npm ci`, `npm run lint`, and `npm run build` in an environment with package registry access.
- [ ] End-to-end test demo browse/save/cart/checkout/listing journeys and live integrations separately when configured.
