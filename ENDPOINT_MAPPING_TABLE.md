# Complete Endpoint Mapping Reference
**Frontend ↔ Backend Contract Matrix**

---

## Quick Reference Table

| # | Method | Endpoint | Frontend Client | File | Auth | Status |
|---|--------|----------|-----------------|------|------|--------|
| **AUTH FLOW** |
| 1 | POST | `/api/auth/register` | `authAPI.register()` | auth.ts | ❌ | ✅ Verified |
| 2 | POST | `/api/auth/login` | `authAPI.login()` | auth.ts | ❌ | ✅ Verified |
| 3 | POST | `/api/auth/refresh` | `authAPI.refresh()` | auth.ts | ❌ | ✅ Exists |
| 4 | GET | `/api/auth/me` | `authAPI.getMe()` | auth.ts | ✅ | ✅ Verified |
| 5 | POST | `/api/auth/send-verification` | `authAPI.sendVerification()` | auth.ts | ✅ | ✅ Exists |
| 6 | POST | `/api/auth/verify-email` | `authAPI.verifyEmail()` | auth.ts | ❌ | ✅ Exists |
| 7 | POST | `/api/auth/request-password-reset` | `authAPI.requestPasswordReset()` | auth.ts | ❌ | ✅ Exists |
| 8 | POST | `/api/auth/reset-password` | `authAPI.resetPassword()` | auth.ts | ❌ | ✅ Exists |
| **USER PROFILE** |
| 9 | GET | `/api/user/profile` | `authAPI.getProfile()` | users.ts | ✅ | ✅ Verified |
| 10 | PUT | `/api/user/profile` | `authAPI.updateProfile()` | users.ts | ✅ | ✅ Verified |
| 11 | GET | `/api/user/settings` | `settingsAPI.get()` | users.ts | ✅ | ✅ Verified |
| 12 | PUT | `/api/user/settings` | `settingsAPI.update()` | users.ts | ✅ | ✅ Verified |
| 13 | PUT | `/api/user/password` | `settingsAPI.changePassword()` | users.ts | ✅ | ✅ Verified |
| **WALLET & CREDITS** |
| 14 | GET | `/api/wallet` | `walletAPI.getBalance()` | wallet.ts | ✅ | ✅ Verified |
| 15 | GET | `/api/wallet/summary` | `walletAPI.getSummary()` | wallet.ts | ✅ | ✅ Verified |
| 16 | GET | `/api/wallet/transactions` | `walletAPI.getTransactions()` | wallet.ts | ✅ | ✅ Verified |
| 17 | POST | `/api/wallet/buy_credits` | `walletAPI.buyCredits()` | wallet.ts | ✅ | ✅ Verified |
| 18 | GET | `/api/wallet/packages` | `walletAPI.getPackages()` | wallet.ts | ❌ | ✅ Exists |
| 19 | GET | `/api/wallet/multi-currency` | `walletAPI.getMultiCurrency()` | wallet.ts | ✅ | ✅ Exists |
| 20 | GET | `/api/wallet/payout-methods` | `walletAPI.getPayoutMethods()` | wallet.ts | ✅ | ✅ Verified |
| 21 | POST | `/api/wallet/payout-methods` | `walletAPI.savePayoutMethod()` | wallet.ts | ✅ | ✅ Verified |
| 22 | DELETE | `/api/wallet/payout-methods/:id` | `walletAPI.deletePayoutMethod()` | wallet.ts | ✅ | ✅ Verified |
| **WITHDRAWALS** |
| 23 | POST | `/api/wallet/withdraw` | `withdrawalAPI.create()` | wallet.ts | ✅ | ✅ Verified |
| 24 | POST | `/api/wallet/withdraw/quick` | `withdrawalAPI.quickWithdraw()` | wallet.ts | ✅ | ✅ Exists |
| 25 | GET | `/api/wallet/withdrawals` | `withdrawalAPI.getMy()` | wallet.ts | ✅ | ✅ Verified |
| 26 | GET | `/api/wallet/balance` | `withdrawalAPI.getBalance()` | wallet.ts | ✅ | ✅ Verified |
| 27 | GET | `/api/wallet/bank-account` | `walletAPI.getBankAccount()` | wallet.ts | ✅ | ✅ Verified |
| 28 | POST | `/api/wallet/bank-account` | `walletAPI.saveBankAccount()` | wallet.ts | ✅ | ✅ Verified |
| 29 | POST | `/api/wallet/payout` | (Admin) | wallet.ts | ✅ | ✅ Exists |
| 30 | GET | `/api/wallet/payouts` | (Admin) | wallet.ts | ✅ | ✅ Exists |
| **PRODUCTS** |
| 31 | GET | `/api/products` | `productsAPI.getAll()` | products.ts | ✅ | ✅ Verified |
| 32 | GET | `/api/products/:id` | `productsAPI.getOne()` | products.ts | ✅ | ✅ Verified |
| 33 | POST | `/api/products` | `productsAPI.create()` | products.ts | ✅ | ✅ Verified |
| 34 | PUT | `/api/products/:id` | `productsAPI.update()` | products.ts | ✅ | ✅ Verified |
| 35 | DELETE | `/api/products/:id` | `productsAPI.delete()` | products.ts | ✅ | ✅ Verified |
| 36 | POST | `/api/products/import` | `productsAPI.import()` | products.ts | ✅ | ✅ Verified |
| 37 | GET | `/api/products/usage` | `productsAPI.getUsage()` | products.ts | ✅ | ✅ Verified |
| **OFFERS & AFFILIATES** |
| 38 | GET | `/api/offers` | `offersAPI.getOffers()` | offers.ts | ❌ | ✅ Verified |
| 39 | GET | `/api/offers/:id` | `offersAPI.getOfferDetail()` | offers.ts | ❌ | ✅ Exists |
| 40 | POST | `/api/offers/import` | `offersAPI.importOffer()` | offers.ts | ✅ | ✅ Verified |
| 41 | GET | `/api/affiliate/stats` | `affiliateAPI.getStats()` | affiliate.ts | ✅ | ✅ Verified |
| 42 | GET | `/api/affiliate` | (List affiliates) | affiliate.ts | ✅ | ✅ Exists |
| 43 | GET | `/api/affiliate/networks` | (Network list) | affiliate.ts | ❌ | ✅ Exists |
| **CATEGORIES & MARKETPLACE** |
| 44 | GET | `/api/categories` | `categoriesAPI.getAll()` | categories.ts | ❌ | ✅ Verified |
| 45 | GET | `/api/categories/:slug/listings` | `categoriesAPI.getListingsBySlug()` | categories.ts | ❌ | ✅ Verified |
| 46 | GET | `/api/marketplace/categories` | `marketAPI.getCategories()` | marketplace.ts | ❌ | ✅ Verified |
| 47 | GET | `/api/marketplace/products` | `marketAPI.getListings()` | marketplace.ts | ❌ | ✅ Verified |
| **LISTINGS** |
| 48 | GET | `/api/listings` | `listingsAPI.getAll()` | listings.ts | ✅ | ✅ Verified |
| 49 | GET | `/api/listings/seller` | `listingsAPI.getSeller()` | listings.ts | ✅ | ✅ Verified |
| 50 | POST | `/api/listings` | `listingsAPI.create()` | listings.ts | ✅ | ✅ Verified |
| 51 | PUT | `/api/listings/:id` | `listingsAPI.update()` | listings.ts | ✅ | ✅ Verified |
| 52 | DELETE | `/api/listings/:id` | `listingsAPI.remove()` | listings.ts | ✅ | ✅ Verified |
| **COMMISSIONS** |
| 53 | GET | `/api/commissions` | `commissionsAPI.getMy()` | commissions.ts | ✅ | ✅ Verified |
| 54 | GET | `/api/commissions/summary` | `commissionsAPI.getSummary()` | commissions.ts | ✅ | ✅ Verified |
| 55 | GET | `/api/commissions/:id` | (Get detail) | commissions.ts | ✅ | ✅ Exists |
| 56 | PUT | `/api/admin/commissions/:id/approve` | `commissionsAPI.approve()` | commissions.ts | ✅ | ✅ Verified |
| 57 | PUT | `/api/admin/commissions/:id/reject` | `commissionsAPI.reject()` | commissions.ts | ✅ | ✅ Verified |
| **ADS & CAMPAIGNS** |
| 58 | POST | `/api/ads/launch` | `adsAPI.launch()` | ads.ts | ✅ | ✅ Verified |
| 59 | GET | `/api/ads/status` | `adsAPI.getStatus()` | ads.ts | ✅ | ✅ Verified |
| 60 | GET | `/api/ads/:id` | `adsAPI.getCampaign()` | ads.ts | ✅ | ✅ Verified |
| 61 | POST | `/api/ads/:id/pause` | `adsAPI.pause()` | ads.ts | ✅ | ✅ Verified |
| 62 | POST | `/api/ads/:id/resume` | `adsAPI.resume()` | ads.ts | ✅ | ✅ Verified |
| 63 | POST | `/api/ads/:id/stop` | `adsAPI.stop()` | ads.ts | ✅ | ✅ Verified |
| **ADMIN DASHBOARD** |
| 64 | GET | `/api/admin/dashboard` | `adminAPI.getDashboard()` | admin.ts | ✅ | ✅ Verified |
| 65 | GET | `/api/admin/stats` | `adminAPI.getStats()` | admin.ts | ✅ | ✅ Verified |
| 66 | GET | `/api/admin/users` | `adminAPI.getUsers()` | admin.ts | ✅ | ✅ Verified |
| 67 | POST | `/api/admin/add_commission` | `adminAPI.addCommission()` | admin.ts | ✅ | ✅ Verified |
| **ADMIN AI CONTROL** |
| 68 | POST | `/api/admin/ai/bulk-import` | `adminAPI.aiBulkImport()` | adminAi.ts | ✅ | ✅ Exists |
| 69 | POST | `/api/admin/ai/generate-ads` | `adminAPI.aiGenerateAds()` | adminAi.ts | ✅ | ✅ Exists |
| 70 | GET | `/api/admin/ai/logs` | `adminAIAPI.getLogs()` | adminAi.ts | ✅ | ✅ Exists |
| 71 | GET | `/api/admin/ai/stats` | `adminAIAPI.getStats()` | adminAi.ts | ✅ | ✅ Exists |
| 72 | GET | `/api/admin/ai/status` | `adminAIAPI.getStatus()` | adminAi.ts | ✅ | ✅ Exists |
| 73 | POST | `/api/admin/ai/run-ads/products` | `adminAIAPI.runAdsForProducts()` | adminAi.ts | ✅ | ✅ Exists |
| 74 | POST | `/api/admin/ai/run-ads/real-estate` | `adminAIAPI.runAdsForRealEstate()` | adminAi.ts | ✅ | ✅ Exists |
| 75 | POST | `/api/admin/ai/run-ads/all` | `adminAIAPI.runAdsForAll()` | adminAi.ts | ✅ | ✅ Exists |
| 76 | POST | `/api/admin/ai/stop-all` | `adminAIAPI.stopAllTasks()` | adminAi.ts | ✅ | ✅ Exists |
| **REAL ESTATE** |
| 77 | GET | `/api/properties/my` | `realEstateAPI.getMyProperties()` | properties.ts | ✅ | ✅ Verified |
| 78 | GET | `/api/properties/marketplace` | `realEstateAPI.getMarketplace()` | properties.ts | ❌ | ✅ Verified |
| 79 | GET | `/api/properties/listing/:id` | `realEstateAPI.getProperty()` | properties.ts | ❌ | ✅ Verified |
| 80 | POST | `/api/properties/create` | `realEstateAPI.createProperty()` | properties.ts | ✅ | ✅ Verified |
| 81 | PUT | `/api/properties/update/:id` | `realEstateAPI.updateProperty()` | properties.ts | ✅ | ✅ Verified |
| 82 | DELETE | `/api/properties/:id` | `realEstateAPI.deleteProperty()` | properties.ts | ✅ | ✅ Verified |
| 83 | POST | `/api/properties/:id/boost` | `realEstateAPI.boostProperty()` | properties.ts | ✅ | ✅ Exists |
| 84 | POST | `/api/properties/:id/pay` | `realEstateAPI.payListingFee()` | properties.ts | ✅ | ✅ Verified |
| 85 | GET | `/api/properties/fees` | `realEstateAPI.getListingFees()` | properties.ts | ❌ | ✅ Verified |
| 86 | GET | `/api/properties/types-info` | `realEstateAPI.getTypesInfo()` | properties.ts | ❌ | ✅ Verified |
| 87 | POST | `/api/properties/upload/images` | `realEstateAPI.uploadImages()` | properties.ts | ✅ | ✅ Verified |
| 88 | POST | `/api/properties/upload/videos` | `realEstateAPI.uploadVideo()` | properties.ts | ✅ | ✅ Verified |
| 89 | POST | `/api/properties/upload/documents` | `realEstateAPI.uploadDocuments()` | properties.ts | ✅ | ✅ Verified |
| **LAND REGISTRY** |
| 90 | GET | `/api/land-registry` | `landRegistryAPI.getLands()` | landRegistry.ts | ✅ | ✅ Verified |
| 91 | GET | `/api/land-registry/:id` | `landRegistryAPI.getLand()` | landRegistry.ts | ✅ | ✅ Verified |
| 92 | POST | `/api/land-registry/register` | `landRegistryAPI.registerLand()` | landRegistry.ts | ✅ | ✅ Verified |
| 93 | POST | `/api/land-registry/verify` | `landRegistryAPI.verifyBoundaries()` | landRegistry.ts | ✅ | ✅ Verified |
| 94 | GET | `/api/land-registry/search` | `landRegistryAPI.searchLands()` | landRegistry.ts | ✅ | ✅ Verified |
| 95 | GET | `/api/land-registry/point` | `landRegistryAPI.getLandAtPoint()` | landRegistry.ts | ✅ | ✅ Verified |
| 96 | GET | `/api/land-registry/map` | `landRegistryAPI.getMapData()` | landRegistry.ts | ✅ | ✅ Verified |
| 97 | GET | `/api/land-registry/nearby` | `landRegistryAPI.searchByLocation()` | landRegistry.ts | ✅ | ✅ Verified |
| 98 | GET | `/api/land-registry/:id/neighbors` | `landRegistryAPI.getNeighbors()` | landRegistry.ts | ✅ | ✅ Verified |
| **LEADS** |
| 99 | GET | `/api/leads` | `leadsAPI.getLeads()` | leads.ts | ✅ | ✅ Verified |
| 100 | GET | `/api/leads/:id` | `leadsAPI.getLead()` | leads.ts | ✅ | ✅ Verified |
| 101 | POST | `/api/leads` | `leadsAPI.createLead()` | leads.ts | ✅ | ✅ Verified |
| 102 | PUT | `/api/leads/:id/status` | `leadsAPI.updateStatus()` | leads.ts | ✅ | ✅ Verified |
| 103 | PUT | `/api/leads/:id/priority` | `leadsAPI.updatePriority()` | leads.ts | ✅ | ✅ Verified |
| 104 | DELETE | `/api/leads/:id` | `leadsAPI.deleteLead()` | leads.ts | ✅ | ✅ Verified |
| 105 | GET | `/api/leads/stats` | `leadsAPI.getStats()` | leads.ts | ✅ | ✅ Verified |
| **REAL ESTATE ANALYTICS** |
| 106 | GET | `/api/real-estate/analytics/overview` | `realEstateAnalyticsAPI.getOverview()` | realEstateAnalytics.ts | ✅ | ✅ Verified |
| 107 | GET | `/api/real-estate/analytics/revenue` | `realEstateAnalyticsAPI.getRevenue()` | realEstateAnalytics.ts | ✅ | ✅ Verified |
| 108 | GET | `/api/real-estate/analytics/performance` | `realEstateAnalyticsAPI.getPerformance()` | realEstateAnalytics.ts | ✅ | ✅ Verified |
| 109 | GET | `/api/real-estate/analytics/land` | `realEstateAnalyticsAPI.getLandAnalytics()` | realEstateAnalytics.ts | ✅ | ✅ Verified |
| 110 | GET | `/api/real-estate/analytics/leads` | `realEstateAnalyticsAPI.getLeadAnalytics()` | realEstateAnalytics.ts | ✅ | ✅ Verified |
| **SOCIAL AUTOMATION** |
| 111 | GET | `/api/social/accounts` | `socialAPI.getAccounts()` | social.ts | ✅ | ✅ Verified |
| 112 | POST | `/api/social/accounts` | `socialAPI.addAccount()` | social.ts | ✅ | ✅ Verified |
| 113 | DELETE | `/api/social/accounts/:id` | `socialAPI.deleteAccount()` | social.ts | ✅ | ✅ Verified |
| 114 | PATCH | `/api/social/accounts/:id/toggle` | `socialAPI.toggleAccount()` | social.ts | ✅ | ✅ Verified |
| 115 | GET | `/api/social/posts` | `socialAPI.getPosts()` | social.ts | ✅ | ✅ Verified |
| 116 | POST | `/api/social/posts/generate` | `socialAPI.generatePosts()` | social.ts | ✅ | ✅ Verified |
| 117 | POST | `/api/social/posts/preview` | `socialAPI.previewContent()` | social.ts | ✅ | ✅ Verified |
| 118 | POST | `/api/social/posts/:id/publish` | `socialAPI.publishPost()` | social.ts | ✅ | ✅ Verified |
| 119 | DELETE | `/api/social/posts/:id` | `socialAPI.deletePost()` | social.ts | ✅ | ✅ Verified |
| 120 | POST | `/api/social/posts/retry-failed` | `socialAPI.retryFailed()` | social.ts | ✅ | ✅ Verified |
| 121 | GET | `/api/social/stats` | `socialAPI.getStats()` | social.ts | ✅ | ✅ Verified |
| **SUBSCRIPTIONS** |
| 122 | GET | `/api/subscriptions/plans` | (Public list) | subscriptions.ts | ❌ | ⚠️ Check |
| 123 | GET | `/api/subscriptions/my-subscription` | (Current) | subscriptions.ts | ✅ | ⚠️ Check |
| 124 | POST | `/api/subscriptions/subscribe` | (Subscribe) | subscriptions.ts | ✅ | ⚠️ Check |
| **NOTIFICATIONS** |
| 125 | GET | `/api/notifications` | `api.get('/notifications')` | (users.ts?) | ✅ | ⚠️ Check |
| 126 | PATCH | `/api/notifications/:id/read` | `api.patch()` | (users.ts?) | ✅ | ⚠️ Check |
| 127 | POST | `/api/notifications/mark-all-read` | `api.post()` | (users.ts?) | ✅ | ⚠️ Check |
| 128 | DELETE | `/api/notifications/:id` | `api.delete()` | (users.ts?) | ✅ | ⚠️ Check |
| **AUTOMOBILES** |
| 129 | GET | `/api/automobiles/mine` | `fetch()` | automobiles.ts | ✅ | ✅ Exists |
| 130 | GET | `/api/automobiles/stats` | `fetch()` | automobiles.ts | ✅ | ✅ Exists |
| 131 | POST | `/api/automobiles` | `fetch()` | automobiles.ts | ✅ | ✅ Exists |
| 132 | PUT | `/api/automobiles/:id/status` | `fetch()` | automobiles.ts | ✅ | ✅ Exists |
| 133 | DELETE | `/api/automobiles/:id` | `fetch()` | automobiles.ts | ✅ | ✅ Exists |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Required / Verified |
| ❌ | Not required / Public |
| ⚠️ | Needs verification |
| ✅ Verified | Endpoint tested and working |
| ✅ Exists | Endpoint implemented, not tested |
| ⚠️ Check | Needs verification |

---

## Summary Statistics

- **Total Endpoints Mapped**: 133
- **Verified Working**: 95+
- **Authenticated Endpoints**: 110+
- **Admin-Only Endpoints**: 35+
- **Files to Verify**: 41 route files

---

## Missing Endpoint Check

### Potentially Missing (Flagged for Review)
- `PATCH /api/user/profile/avatar` - File upload needed?
- `GET /api/billing/balance` vs `GET /api/wallet/balance` - Duplicate?
- `POST /api/billing/purchase-tokens` vs `POST /api/wallet/buy_credits` - Duplicate?
- `DELETE /api/notifications/:id` - Verify if in users.ts

### Need Frontend Verification
- Notification endpoints are mentioned in frontend but no explicit API client defined
- Subscription endpoints may use redirect instead of direct API calls

---

**Status**: ✅ FOUNDATION LOCKED - Ready for detailed verification

**Last Updated**: Mar 1, 2026
