# Supabase setup checklist

1. Create a Supabase project and copy its Project URL and publishable/anon key into `.env.local` (use `.env.example` as the template).
2. Apply migrations in order: `202610160001_marketplace.sql`, `202610160002_marketplace_operations.sql`, `202610170001_discovery_trust.sql`, `202610170002_secure_order_totals.sql`, `202610170003_catalogue_expansion.sql`, and `202610170004_trust_operations.sql`.
3. Configure `OMNI_DELIVERY_FEE_KES` on the server to the actual flat delivery fee in KSh. The order endpoint refuses to create orders if this is missing or invalid.
4. In Authentication → URL Configuration, set Site URL to your deployed origin and add redirect URLs for `/auth/callback` (local development: `http://localhost:3000/auth/callback`).
5. Enable Email provider and configure SMTP for production confirmation and password-reset mail.
6. Verify that `product-images` storage bucket exists and the migration's storage policies were applied.
7. Create an account through `/register`, confirm email if enabled, then visit `/sell`. New listings are inserted as `pending`; use the restricted `/admin` workspace to moderate them after assigning the first admin account through a trusted process.
8. Test order creation through the checkout UI using active live products and an authenticated session. The API expects unique product UUIDs, quantities, server-fresh `expected_price_kes` quotes, and an idempotency UUID. Never accept a browser-supplied total as authoritative.

## Before production

- Replace or clearly label sample products across the homepage and category suggestions before launch; sample IDs cannot be purchased.
- Test admin provisioning/moderation, seller order visibility/status transitions, location-aware delivery pricing if needed, stock reservation expiry, refunds and support-case permissions.
- Integrate M-Pesa Daraja using server-only credentials, signed/validated callbacks, and idempotent payment records. Do not mark an order paid based on client input.
- Add rate limiting, abuse prevention, image moderation, audit logs, backups, monitoring, automated tests and legal review.


## Additional marketplace operations tables

After the base marketplace migration, also apply `supabase/migrations/202610160002_marketplace_operations.sql`. This adds notification records, order event history, payment transaction records, disputes, seller reviews and product reports. Payment transaction writes and moderation resolution are intentionally restricted to trusted server-side code; do not expose a Supabase service-role key to the browser. This migration also tightens profile role changes so seller onboarding uses the approved RPC rather than client-supplied signup metadata.


The trust operations migration adds `/admin`, `/seller-studio`, `/support`, `/notifications`, and `/orders/[id]`. These provide a moderation/support foundation and order status history, but not a payment provider, courier integration, seller payouts or an approved legal refund policy.
