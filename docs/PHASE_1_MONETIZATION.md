# Phase 1 — Monetization Core (Freeze)

This document records the Phase 1 freeze for the monetization core: subscription plans, trial flow, token system, crypto payment approval, and smoke tests. Changes to the items listed under "Frozen" must not be made without an explicit Phase 2 plan and review.

## 1. Plan Structure
- Free Trial:
  - New users receive a free trial period (configured to 30 days by default).
  - Trial includes a starter token allocation (default: 400 tokens).
- Basic (Starter):
  - Monthly plan identified as `STARTER`.
  - Monthly token allotment: 400 tokens (see monthlyTokens verification below).
- Pro:
  - Higher-tier plan (not modified in Phase 1). Implementation exists; do not alter without Phase 2.

## 2. Token Allocation Rules
- On trial start or plan activation, user receives a token credit according to the plan's `monthlyTokens` or configured trial allocation.
- Activating a plan sets or extends `subscriptionEndsAt` and updates `tokenBalance` with the plan allocation if appropriate.
- Admin-approved crypto payments call `activatePlan(userId, planId)` which persists the activation and token allocation.

## 3. Token Deduction Rules
- Token consumption is enforced via the transactional token service (`requireTokens` / deduct flow).
- Deductions occur inside a Prisma transaction to prevent race conditions and double-spends.
- If insufficient tokens, the service throws and the operation is aborted; caller must handle errors and respond to the user accordingly.
- Token service exposes atomic helpers: `addTokens`, `deductTokens`, and `requireTokens` (transactional safety guaranteed).

## 4. Subscription Activation Flow
1. User initiates a crypto payment (server returns `reference`, `network`, `walletAddress`, instructions).
2. User submits txHash via `/crypto/confirm` (user-side confirmation endpoint).
3. Admin reviews and approves payment via admin-only endpoint (requires ADMIN role).
4. On admin approval the system: records `txHash`, creates a Subscription record, sets `planId` on user, sets `subscriptionEndsAt`, and grants plan tokens.

## 5. Expiry Handling
- `trialEndsAt` and `subscriptionEndsAt` are stored on the `User` model.
- A background job `subscriptionCleanup` runs periodically to:
  - Expire trials and subscriptions that have passed their `*EndsAt` timestamps.
  - (Optional) Zero or mark token balances according to business rules — Phase 1 sets expired subscriptions to inactive and preserves balances only if policy allows.
- The `subscriptionGuard` middleware enforces access rules based on trial/subscription status and token balance.

## 6. Extension Handling
- Activating a new plan while an active subscription exists extends `subscriptionEndsAt` by the plan duration.
- Re-activation logic merges expiry windows rather than replacing them unexpectedly.
- Admin activation can be used to grant immediate access and tokens (used for crypto approval flow).

## 7. Smoke Test Locations
- End-to-end subscription smoke test (create -> confirm -> admin approve): `tests/smoke/subscription.e2e.js`
- Token deduction transactional test: `tests/smoke/token.deduction.js`

## 8. What Is Frozen (must not be changed in Phase 1)
- Core authentication rewrite (bcrypt + JWT) and `auth` routes behavior.
- `User` schema additions used by monetization: `tokenBalance`, `trialEndsAt`, `subscriptionEndsAt`, `planId`.
- `tokenService` transactional behavior and public helpers.
- `subscriptionGuard` middleware logic and enforcement on AI routes.
- Crypto payment endpoints flow: create -> confirm -> admin-approve -> activatePlan.
- Smoke tests under `tests/smoke/` (must remain intact and runnable).
- Any removal of these items requires an explicit plan and Phase 2 change request.

## 9. Operational Notes
- Logging: production code retains `console.error` for errors; non-critical `console.log` has been removed from core runtime paths.
- Dev utility scripts (under `src/scripts/`) remain available for local debugging and are not part of the frozen surface area, but they must not be used to alter frozen core logic without coordination.

---

File created: docs/PHASE_1_MONETIZATION.md
