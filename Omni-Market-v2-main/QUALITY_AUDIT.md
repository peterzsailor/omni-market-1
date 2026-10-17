# Omni Market quality audit and repair log

This document records the concrete repairs made in the consolidated project and distinguishes verified checks from checks that still require a fully installed environment.

## Repairs in this revision

- Fixed a React Hooks Rules violation in `src/app/products/[id]/page.tsx`: the recently-viewed effect now runs before conditional loading/not-found returns, so hook order is stable across renders.
- Removed the experimental `cacheComponents` and `partialPrefetching` Next.js flags from `next.config.ts` while the app is brought back to a predictable, testable baseline. The existing Tailwind/Turbopack CSS rule is retained.
- Removed duplicate “Support centre” navigation in the site footer.
- Hardened the Supabase auth callback against external redirect targets (including protocol-relative `//host` URLs and backslash variants).
- Added ownership verification before a support case can reference an order, preventing a user from attaching another customer’s order ID to their case.
- Changed checkout to display only live UUID-backed listings; sample catalogue IDs are treated as items requiring cart cleanup instead of being shown as purchasable checkout lines.
- Added `npm run verify:project`, a repeatable static inventory check for required page routes, API/database RPC references, environment documentation, and lockfile coverage.

## Known launch blockers / incomplete integrations

- The homepage and sample product catalogue still use demonstration listings. These must not be mistaken for real seller inventory.
- Checkout requires `OMNI_DELIVERY_FEE_KES`, authentication, and real UUID-backed listings. Orders created by the current flow remain unpaid.
- M-Pesa STK push, signed/verified payment callbacks, settlement reconciliation, seller payouts, and real refunds are not implemented. Do not enable live payment collection.
- Order status history is not connected to a courier provider's live scan events.
- Multi-seller order fulfilment has restrictions; full split fulfilment and settlement are not complete.
- Supabase migrations have not been executed against a real test project in this environment. Review and apply them in order on a disposable staging project first.
- `npm run verify:project` passed; a TypeScript/TSX syntax transpile passed for all 54 source files; local import resolution found zero unresolved imports. These checks do not perform semantic type checking.
- A complete dependency install, `npm run build`, `npm run lint`, database integration tests, and browser end-to-end tests remain required. `npm ci` could not finish because package downloads failed with DNS/network `EAI_AGAIN` errors in this environment. No full build or live database test is claimed as passed.

## Required release gates

1. Copy `.env.example` to `.env.local` and set valid staging Supabase credentials and a deliberate delivery fee.
2. Apply every migration in `supabase/migrations` in filename order to a disposable staging database; verify policies with customer, seller, and admin accounts.
3. Run `npm ci`, `npm run verify:project`, `npm run lint`, and `npm run build` with the complete dependency tree installed.
4. Test sign-up/sign-in, listing CRUD, filtering, wishlist/cart persistence, stock race conditions, duplicate checkout submission, cancellation stock restoration, reviews, reports, support cases, and role boundaries.
5. Keep payment disabled until M-Pesa verification, idempotent callback processing, reconciliation, refund logic, and seller settlement are independently implemented and tested.
6. Complete accessibility, responsive, security, and browser tests before production release.


## Responsive and county-discovery revision (2026-10-17)

- Consolidated the global palette around forest, ivory, amber and coral; dark theme now uses a readable forest action colour and the PWA theme metadata matches the new palette.
- Reworked the header breakpoints: compact mobile header and search, navigation drawer through tablet widths, and full desktop navigation only at wide viewports. Added wrapping/min-width safeguards for common layout primitives.
- Added a canonical 47-county Kenya dataset, optional saved county/town preference, county and locality filters in Explore, county capture for new listings, and migration `202610170005_county_location.sql` with optional coordinates and an index.
- Added a Safari/iOS Home Screen installation guide and clearer offline status copy.
- Added `.env.example` because the repository verifier required it. Updated the canonical site URL and PWA theme colors.
- `npm run verify:project`: PASS after changes. `node_modules` could not be installed in this environment (package installation repeatedly timed out), so a Next.js production build, TypeScript check, real browser viewport tests, live Supabase/RLS tests, and checkout/order end-to-end tests could not be honestly reported as passing. Configure Supabase and apply all migrations in order before deploying. The current project still does not include a live M-Pesa payment integration; online payments must remain clearly unpaid until verified server callbacks are implemented.
