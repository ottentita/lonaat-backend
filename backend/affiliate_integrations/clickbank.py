"""
ClickBank API Integration

Setup:
1. Sign up at https://www.clickbank.com/
2. Get your affiliate nickname
3. Add to Replit Secrets:
   - CLICKBANK_AFFILIATE_ID - Your affiliate nickname (optional, defaults to 'lonaat')

Note: This integration uses ClickBank's public marketplace feed - no API key needed!
"""

import os
from typing import List, Dict, Any
from xml.etree import ElementTree
from . import AffiliateNetworkIntegration


class ClickBankIntegration(AffiliateNetworkIntegration):
    """ClickBank Integration using public marketplace feed"""
    
    def __init__(self):
        super().__init__()
        self.affiliate_id: str = os.getenv('CLICKBANK_AFFILIATE_ID') or 'lonaat'
        self.marketplace_feed = 'https://accounts.clickbank.com/feeds/marketplace_feed_v2.xml'
    
    def fetch_products(self, max_results: int = 20, category: str = None, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch real products from ClickBank public marketplace feed
        
        Args:
            category: Product category filter (optional)
            max_results: Maximum products to return
        
        Returns:
            List of real ClickBank digital products
        """
        if not self.affiliate_id or self.affiliate_id == 'default':
            self._warn_once("⚠️  ClickBank affiliate ID not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/xml, text/xml, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive'
            }
            
            response = self.session.get(
                self.marketplace_feed, 
                headers=headers,
                timeout=15,
                allow_redirects=True
            )
            
            if response.status_code == 200:
                tree = ElementTree.fromstring(response.text)
                
                for item in tree.findall(".//site"):
                    vendor_id = item.findtext("Id", "")
                    product_category = item.findtext("Category", "")
                    
                    if category and category.lower() not in product_category.lower():
                        continue
                    
                    title = item.findtext("Title", "Unknown Product")
                    commission_rate = item.findtext("CommissionRate", "50")
                    initial_sale = item.findtext("InitialSale", "N/A")
                    
                    products.append({
                        "network": "ClickBank",
                        "product_id": vendor_id,
                        "name": title,
                        "price": f"${initial_sale}" if initial_sale != "N/A" else "Varies",
                        "category": product_category,
                        "commission": f"{commission_rate}%",
                        "affiliate_link": f"https://hop.clickbank.net/?affiliate={self.affiliate_id}&vendor={vendor_id}",
                        "link": f"https://hop.clickbank.net/?affiliate={self.affiliate_id}&vendor={vendor_id}",
                        "image": item.findtext("ImageUrl", "https://via.placeholder.com/150"),
                        "description": f"{title} - ClickBank digital product with {commission_rate}% commission",
                        "source": "ClickBank"
                    })
                    
                    if len(products) >= max_results:
                        break
                
                if products:
                    print(f"✅ Fetched {len(products)} real ClickBank products from marketplace feed")
                    return products
                else:
                    self._warn_once("⚠️  ClickBank marketplace feed returned no products. Using demo products.")
            elif response.status_code == 403:
                self._warn_once("⚠️  ClickBank marketplace feed access restricted (HTTP 403). Using demo products with your affiliate links.")
            else:
                self._warn_once(f"⚠️  ClickBank marketplace feed error (HTTP {response.status_code}). Using demo products.")
                
        except Exception as e:
            self._warn_once(f"⚠️  ClickBank marketplace feed error: {str(e)}. Using demo products.")
        
        return self._get_demo_products_with_affiliate_links()[:max_results]
    
    def _get_demo_products_with_affiliate_links(self) -> List[Dict[str, Any]]:
        """Get demo products with real affiliate links"""
        base_products = self._get_example_products()
        
        for product in base_products:
            vendor_id = product.get('vendor_id', 'example')
            product['link'] = f"https://hop.clickbank.net/?affiliate={self.affiliate_id}&vendor={vendor_id}"
            product['affiliate_link'] = product['link']
        
        return base_products
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example ClickBank products with vendor IDs"""
        return [
            {
                "name": "The 12 Week Entrepreneur",
                "price": "$97",
                "vendor_id": "12wkent",
                "link": "https://www.clickbank.com/",
                "commission": "50%",
                "description": "Complete program to launch your online business in 12 weeks",
                "source": "ClickBank (Demo)",
                "category": "E-Business"
            },
            {
                "name": "Social Media Marketing Academy",
                "price": "$47",
                "vendor_id": "socmed",
                "link": "https://www.clickbank.com/",
                "commission": "75%",
                "description": "Master Instagram, Facebook, and TikTok marketing strategies",
                "source": "ClickBank (Demo)",
                "category": "Marketing"
            },
            {
                "name": "Passive Income Blueprint 2025",
                "price": "$197",
                "vendor_id": "passinc",
                "link": "https://www.clickbank.com/",
                "commission": "60%",
                "description": "Build multiple streams of passive income online",
                "source": "ClickBank (Demo)",
                "category": "E-Business"
            },
            {
                "name": "Conversion Copywriting Secrets",
                "price": "$67",
                "vendor_id": "copysec",
                "link": "https://www.clickbank.com/",
                "commission": "50%",
                "description": "Write sales copy that converts visitors into customers",
                "source": "ClickBank (Demo)",
                "category": "Marketing"
            },
            {
                "name": "YouTube Channel Growth System",
                "price": "$77",
                "vendor_id": "ytgrow",
                "link": "https://www.clickbank.com/",
                "commission": "55%",
                "description": "Grow your YouTube channel to 100K subscribers",
                "source": "ClickBank (Demo)",
                "category": "Marketing"
            },
            {
                "name": "Affiliate Marketing Mastery",
                "price": "$147",
                "vendor_id": "affmas",
                "link": "https://www.clickbank.com/",
                "commission": "65%",
                "description": "Proven affiliate marketing system generating $10K+ per month",
                "source": "ClickBank (Demo)",
                "category": "E-Business"
            }
        ]
