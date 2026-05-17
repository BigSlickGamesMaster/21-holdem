# Payment Gateway Backend Handoff

Last updated: 2026-05-17

This is the backend handoff for hooking up chip purchases through Stripe Checkout.

Do not paste live secret keys into chat, GitHub, screenshots, or tickets. Share live credentials through the Stripe dashboard, a password manager, or the deployment platform secret manager.

## Current Status

Stripe Checkout is implemented in the game backend and frontend.

Main files:

- Backend controller: `game-backend/app/routers/game/shop/lib/controllers.js`
- Backend routes: `game-backend/app/routers/game/shop/index.js`
- Transaction model: `game-backend/app/models/lib/Transaction.js`
- Express raw-body setup: `game-backend/app/routers/index.js`
- Frontend shop API calls: `src/query/shop.query.js`
- Frontend checkout redirect/confirm: `src/views/dashboard/index.jsx`
- Local Docker env wiring: `docker-compose.yml`
- Prod-like Docker env wiring: `deploy/docker-compose.prod-like.yml`

## Required Stripe Credentials

Backend environment:

```env
STRIPE_SECRET_KEY=sk_test_or_sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
STRIPE_SUCCESS_URL=https://YOUR_PLAYER_SITE/lobby?tab=lobby-shop&checkout=success
STRIPE_CANCEL_URL=https://YOUR_PLAYER_SITE/lobby?tab=lobby-shop&checkout=cancel
```

Frontend environment:

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_or_pk_live_...
```

Notes:

- `STRIPE_SECRET_KEY` is backend-only.
- `STRIPE_WEBHOOK_SECRET` is backend-only.
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` is public and goes into the player frontend build.
- Use matching test keys together or matching live keys together. Do not mix `pk_test` with `sk_live`, or `pk_live` with `sk_test`.

## Other Backend Environment Required For Local Startup

The backend also needs the normal app services:

```env
DB_URL=mongodb://mongodb:27017/holdem
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=...
HASH_KEY=...
FRONTEND_URL=https://YOUR_PLAYER_SITE
AWS_REGION=us-east-1
```

`AWS_REGION` is currently required at startup because the S3 helper initializes an AWS client when the backend boots.

## Shop Item Source

Checkout products are not hard-coded in Stripe. The backend reads shop packs from MongoDB:

```js
Setting.aShop[]
```

Each shop item should include:

```js
{
  sTitle: "10,000 Chips",
  nPrice: 9.99,
  nChips: 10000,
  sCurrency: "usd" // optional; falls back to STRIPE_CURRENCY
}
```

The frontend sends only:

```json
{ "nPrice": 9.99 }
```

The backend looks up the matching `Setting.aShop` item by `nPrice`, then creates the Stripe Checkout Session from the trusted backend item.

## Backend Routes

Base path:

```text
/api/v1/shop
```

Routes:

```text
GET  /api/v1/shop
POST /api/v1/shop/buy
GET  /api/v1/shop/confirm?session_id=cs_...
POST /api/v1/shop/stripe/webhook
```

Authenticated routes:

- `GET /api/v1/shop`
- `POST /api/v1/shop/buy`
- `GET /api/v1/shop/confirm`

Unauthenticated route:

- `POST /api/v1/shop/stripe/webhook`

The webhook must be reachable publicly by Stripe.

## Checkout Flow

1. Player opens the shop.
2. Frontend calls `GET /api/v1/shop`.
3. Player chooses a chip pack.
4. Frontend calls `POST /api/v1/shop/buy` with `{ nPrice }`.
5. Backend validates the price against `Setting.aShop`.
6. Backend creates a `Transaction`:

```js
{
  iUserId,
  nAmount: nChips,
  eType: "credit",
  eMode: "stripe",
  eStatus: "Pending",
  sDescription: "Stripe checkout for X chips"
}
```

7. Backend creates a Stripe Checkout Session.
8. Backend stores `sStripeSessionId` on the transaction.
9. Frontend receives `{ sessionId }`.
10. Frontend redirects using `stripe.redirectToCheckout({ sessionId })`.
11. Stripe redirects back to `STRIPE_SUCCESS_URL` with `session_id`.
12. Frontend calls `GET /api/v1/shop/confirm?session_id=...`.
13. Backend retrieves the Stripe session and, if paid, credits chips.
14. Stripe webhook also handles `checkout.session.completed` and credits chips if confirm was not called.

The credit function is idempotent: it only updates transactions still marked `Pending`.

## Stripe Checkout Session Metadata

The backend adds:

```js
metadata: {
  transactionId,
  userId,
  chips,
  price
}
```

This lets the webhook find and complete the matching transaction.

## Transaction Fields Used

Model: `game-backend/app/models/lib/Transaction.js`

Stripe fields:

```js
sStripeSessionId
sStripePaymentIntentId
```

Purchase fields:

```js
iUserId
nAmount        // chip amount credited, not dollar amount
eType          // "credit"
eMode          // "stripe"
eStatus        // "Pending" then "Success"
sDescription
```

Indexes:

```js
Transaction.index({ iUserId: 1, dCreatedDate: 1 });
Transaction.index({ sStripeSessionId: 1 });
```

## Webhook Setup In Stripe

Create a webhook endpoint in Stripe:

```text
https://YOUR_BACKEND_DOMAIN/api/v1/shop/stripe/webhook
```

Required event:

```text
checkout.session.completed
```

Copy the signing secret into:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

The backend uses `stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET)`.

## Local Stripe CLI Test

Install and login:

```bash
stripe login
```

Forward events to local backend:

```bash
stripe listen --forward-to localhost:4000/api/v1/shop/stripe/webhook
```

Copy the printed `whsec_...` into `game-backend/.env` as `STRIPE_WEBHOOK_SECRET`, then restart the backend.

Trigger a test event:

```bash
stripe trigger checkout.session.completed
```

For a full end-to-end test, use the frontend shop and Stripe test card:

```text
4242 4242 4242 4242
Any future expiry
Any CVC
Any ZIP/postcode
```

## Manual API Smoke Test

Use a real player JWT for authenticated routes.

Get shop packs:

```bash
curl -H "Authorization: Bearer PLAYER_JWT" \
  http://localhost:4000/api/v1/shop
```

Create checkout:

```bash
curl -X POST http://localhost:4000/api/v1/shop/buy \
  -H "Authorization: Bearer PLAYER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"nPrice\":9.99}"
```

Expected response:

```json
{
  "message": "Stripe checkout created",
  "data": {
    "sessionId": "cs_test_..."
  }
}
```

Confirm payment after Stripe redirect:

```bash
curl -H "Authorization: Bearer PLAYER_JWT" \
  "http://localhost:4000/api/v1/shop/confirm?session_id=cs_test_..."
```

## Deployment Checklist

1. Set backend env vars:

```env
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_CURRENCY=usd
STRIPE_SUCCESS_URL=...
STRIPE_CANCEL_URL=...
```

2. Set frontend build env var:

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=...
```

3. Rebuild/redeploy player frontend after changing `REACT_APP_STRIPE_PUBLISHABLE_KEY`.
4. Restart/redeploy backend after changing backend Stripe env vars.
5. Create Stripe webhook endpoint pointing at `/api/v1/shop/stripe/webhook`.
6. Make sure `Setting.aShop` has valid `nPrice` and `nChips` values.
7. Run a test purchase with Stripe test keys.
8. Confirm the user chip balance increases.
9. Confirm a `transaction` document changes from `Pending` to `Success`.
10. Confirm duplicate webhook/confirm calls do not double-credit chips.

## Known Follow-Up Work

Recommended backend hardening:

- Store dollar amount separately from chip amount on the transaction.
- Store Stripe checkout amount/currency on the transaction for audit.
- Add a unique index on `sStripeSessionId` once existing data is clean.
- Add explicit failed/cancelled transaction handling.
- Add webhook handling for `checkout.session.expired` and possibly `payment_intent.payment_failed`.
- Add admin visibility for Stripe session/payment intent IDs.
- Add a server-side test that calls `creditStripeTransaction` twice and proves chips are credited once.

## Old/Unused Payment Code

There is older Square/Razorpay code still in the backend:

- `game-backend/app/utils/lib/square.js`
- `game-backend/app/utils/lib/razorpay.js`
- Square routes under `game-backend/app/routers/game/transaction`

The active shop checkout path is Stripe Checkout under `/api/v1/shop`.
