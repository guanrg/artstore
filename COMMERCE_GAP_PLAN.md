# Commerce Gap Plan (AU-Only)

## Current baseline
- Stack: Next.js storefront + Medusa backend + Strapi CMS
- Market: Australia only (AUD + AU region)
- Core flow available: browse -> product detail -> cart -> checkout -> order

## Missing / weak areas

### P0 (must-have)
- Password reset flow (request token, reset page, submit new password)
- Auth protection hardening:
  - Rate limiting on login/register endpoints
  - Generic auth error messages (no account-type leakage)
- Checkout robustness:
  - Stock validation before final place-order
  - Better payment failure handling / retry UX
- Order communication:
  - Customer email confirmation for order placed
  - Admin notification for new order

### P1 (high value)
- Product discovery:
  - Search, sort, pagination
  - Category/tag filter pages
- Customer account:
  - Edit profile
  - Change password
  - Better order detail timeline/status
- AU commerce details:
  - GST display policy consistency
  - AU phone/postcode validation

### P2 (operations / growth)
- SEO:
  - sitemap.xml / robots.txt
  - Product structured data (JSON-LD)
- Analytics:
  - conversion funnel events (view product, add cart, checkout start, purchase)
- CMS integration:
  - richer article list/detail page integration

### P3 (advanced)
- Returns/refunds self-service
- Saved payment method
- Wishlist
- Back-in-stock notification

## Delivery batches

### Batch A (recommended first)
1. Password reset flow
2. Login/register rate limit
3. Checkout stock re-check + better error messages
4. Basic order confirmation notification

### Batch B
1. Product search/sort/pagination
2. Category landing pages
3. Profile edit + password change

### Batch C
1. SEO pack (sitemap/robots/JSON-LD)
2. Analytics event hooks
3. CMS article detail enhancements

## Definition of done (all batches)
- Lint/typecheck pass
- Manual happy-path test:
  - register/login/logout
  - add-to-cart/update/remove
  - checkout complete
  - account order history
- No auth information leakage in UI messages

