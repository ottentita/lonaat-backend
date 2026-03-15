# Affiliate Networks Integration Guide

## Overview
Lonaat platform supports **21 affiliate marketing networks** covering e-commerce, SaaS, digital products, CPA offers, and more.

## Network Status

### ✅ Production-Ready Networks
These networks have full API implementations and can fetch real products when configured:

1. **ClickBank** - Digital products (50-75% commissions)
2. **Digistore24** - Digital products & courses
3. **CJ Affiliate** - 20K+ merchants (Barnes & Noble, NordVPN)
4. **Impact** - Major brands (Adidas, Lenovo, Levi's)
5. **ShareASale** - 30K+ merchants across all verticals
6. **Amazon Associates** - Vast product selection (requires PA-API 5.0)

### 🚧 Demo/Stub Networks (API Implementation Pending)
These networks have proper integration structure but currently return demo products until API implementations are completed:

**E-Commerce Networks:**
- **Rakuten Advertising** - Premium brands (Walmart, Best Buy, Macy's)
- **Awin** - 25K+ brands, strong in UK/Europe
- **FlexOffers** - 12K+ advertisers
- **eBay Partner Network** - Millions of products (1-4% commission)
- **Etsy Affiliate** - Handcrafted & vintage products

**Influencer/D2C Networks:**
- **Shopify Collabs** - Shopify brand partnerships (requires 1K+ followers)
- **GiddyUp** - Direct-to-consumer performance marketing

**Software & Digital:**
- **Avangate (2Checkout)** - Software products (up to 85% commission)

**CPA/Performance Networks:**
- **ClickDealer** - 13K+ offers, 40 verticals, 180+ GEOs
- **Mobidea** - Mobile CPA offers (CPI, trials)
- **TerraLeads** - Health/nutra specialist
- **MaxWeb** - Top-tier iGaming/finance offers
- **LeadBit** - Multi-vertical international CPA/CPL
- **MoreNiche** - Adult/dating niche (30-40% recurring)

## Setup Instructions

### For Production-Ready Networks
1. Sign up at the network's website (see URLs in `affiliate_manager.py`)
2. Get API credentials from account dashboard
3. Add credentials to Replit Secrets (see required keys below)
4. Products will automatically fetch from real APIs

### For Demo Networks
1. Currently using realistic example products
2. To implement live API:
   - Add API credentials to Replit Secrets
   - Implement API calling logic in respective `fetch_products()` method
   - Follow existing pattern from ClickBank/Digistore24 integrations

## Required API Secrets by Network

```python
# E-Commerce
AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG
RAKUTEN_API_KEY, RAKUTEN_SID, RAKUTEN_MID
AWIN_API_TOKEN, AWIN_PUBLISHER_ID
FLEXOFFERS_API_KEY, FLEXOFFERS_PUBLISHER_ID
EBAY_APP_ID, EBAY_CAMPAIGN_ID, EBAY_AFFILIATE_ID
ETSY_AFFILIATE_ID, ETSY_API_KEY

# SaaS & Software
CJ_API_TOKEN, CJ_API_SECRET, CJ_AFFILIATE_ID
SHAREASALE_TOKEN, SHAREASALE_SECRET, SHAREASALE_AFFILIATE_ID
IMPACT_API_KEY, IMPACT_ACCOUNT_SID
PARTNERSTACK_API_KEY
AVANGATE_API_KEY, AVANGATE_AFFILIATE_CODE

# Digital Products
CLICKBANK_AFFILIATE_ID, CLICKBANK_API_KEY
DIGISTORE24_API_KEY, DIGISTORE24_AFFILIATE_ID

# Influencer/D2C
SHOPIFY_COLLABS_ACCESS_TOKEN
GIDDYUP_API_KEY, GIDDYUP_PARTNER_ID

# CPA Networks
CLICKDEALER_API_KEY, CLICKDEALER_AFFILIATE_ID
MOBIDEA_API_KEY, MOBIDEA_AFFILIATE_ID
TERRALEADS_API_KEY, TERRALEADS_AFFILIATE_ID
MAXWEB_API_KEY, MAXWEB_AFFILIATE_ID
LEADBIT_API_KEY, LEADBIT_AFFILIATE_ID
MORENICHE_API_KEY, MORENICHE_AFFILIATE_ID
```

## Usage Examples

```python
from affiliate_manager import manager

# Fetch from specific network
products = manager.fetch_from_network('amazon', max_results=10, keywords='laptops')

# Fetch from all networks
all_products = manager.fetch_all(max_per_network=5)

# Search across networks
results = manager.search_products('fitness', max_results=20)

# Get available networks
networks = manager.get_available_networks()
print(f"Total networks: {len(networks)}")  # 21

# Get setup instructions
instructions = manager.get_setup_instructions()
```

## Adding Custom Networks

To add a new affiliate network:

1. Create new file in `backend/affiliate_integrations/your_network.py`
2. Inherit from `AffiliateNetworkIntegration` base class
3. Implement `fetch_products()` method
4. Add `_get_example_products()` for fallback data
5. Export in `__init__.py`
6. Register in `affiliate_manager.py`

Example structure:
```python
class YourNetworkIntegration(AffiliateNetworkIntegration):
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('YOUR_API_KEY')
    
    def fetch_products(self, max_results=20, **kwargs):
        if not self.api_key:
            self._warn_once("⚠️ API not configured. Using demo products.")
            return self._get_example_products()[:max_results]
        
        # Implement API calling logic here
        products = []
        try:
            response = self.session.get(self.endpoint, ...)
            # Parse and transform response
        except Exception as e:
            print(f"API Error: {e}")
        
        return products if products else self._get_example_products()[:max_results]
    
    def _get_example_products(self):
        return [...]  # Realistic demo products
```

## Commission Rates by Network Type

| Network Type | Typical Commission | Payment Model |
|-------------|-------------------|---------------|
| Amazon Associates | 1-10% | Per sale |
| Digital Products (ClickBank) | 50-85% | Per sale |
| SaaS (PartnerStack, Impact) | 20-30% | Recurring |
| CPA Networks | $2-500 | Per action/lead |
| Fashion/Retail | 5-15% | Per sale |
| Software (Avangate) | 50-85% | Per sale |

## Support & Resources

For API documentation and setup guides, visit each network's developer portal (URLs in setup instructions).

For questions about implementing specific network APIs, consult the existing production-ready integrations in `backend/affiliate_integrations/`.
