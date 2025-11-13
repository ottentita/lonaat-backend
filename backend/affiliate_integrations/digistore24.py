"""
Digistore24 API Integration

Setup:
1. Sign up at https://www.digistore24.com/
2. Get API credentials from Settings → Account Access → API Keys
3. Add to Replit Secrets:
   - DIGISTORE24_API_KEY (required)
   - DIGISTORE24_AFFILIATE_ID (your affiliate ID)

Documentation: https://dev.digistore24.com
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class Digistore24Integration(AffiliateNetworkIntegration):
    """Digistore24 API Integration for European digital products"""
    
    def __init__(self):
        super().__init__()
        # Note: User's secret is DIGISTORE_API_KEY (without "24")
        self.api_key = os.getenv('DIGISTORE_API_KEY')
        self.affiliate_id = os.getenv('DIGISTORE_AFFILIATE_ID')
        self.base_url = 'https://www.digistore24.com/api/call/'
    
    def fetch_products(self, max_results: int = 20, category: str = "Software", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from Digistore24 API
        
        Args:
            category: Product category (Software, Business, Health, etc.)
            max_results: Maximum products to return
        
        Returns:
            List of digital products from Digistore24
        """
        if not self.api_key:
            self._warn_once("⚠️  Digistore24 API key not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        try:
            headers = {'X-DS-API-KEY': self.api_key}
            response = self.session.get(
                f'{self.base_url}listProducts',
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('result') == 'success':
                    product_list = data.get('data', {}).get('products', [])
                    
                    for p in product_list[:max_results]:
                        product_id = p.get('product_id', '')
                        affiliate_link = f"https://www.digistore24.com/product/{product_id}"
                        
                        if self.affiliate_id:
                            affiliate_link += f"?affid={self.affiliate_id}"
                        
                        products.append({
                            "name": p.get('name', 'Unknown Product'),
                            "price": p.get('price_text', 'N/A'),
                            "link": affiliate_link,
                            "commission": f"{p.get('commission_percentage', 50)}%",
                            "description": p.get('description', 'Digital product from Digistore24'),
                            "source": "Digistore24"
                        })
                    
                    if products:
                        return products
                else:
                    print(f"Digistore24 API returned error: {data.get('result')}")
            else:
                print(f"Digistore24 API Error: HTTP {response.status_code}")
        except Exception as e:
            print(f"Digistore24 API Error: {str(e)}")
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example products for demo purposes"""
        return [
            {
                "name": "Complete Affiliate Marketing Course",
                "price": "$197",
                "link": "https://www.digistore24.com/",
                "commission": "50%",
                "description": "Master affiliate marketing with proven strategies and case studies",
                "source": "Digistore24 (Demo)",
                "category": "Marketing"
            },
            {
                "name": "AI Content Generator Pro",
                "price": "$67",
                "link": "https://www.digistore24.com/",
                "commission": "40%",
                "description": "Generate high-quality content using advanced AI technology",
                "source": "Digistore24 (Demo)",
                "category": "Software"
            },
            {
                "name": "Email Marketing Masterclass",
                "price": "$97/year",
                "link": "https://www.digistore24.com/",
                "commission": "50%",
                "description": "Build profitable email lists and automate your campaigns",
                "source": "Digistore24 (Demo)",
                "category": "Marketing"
            },
            {
                "name": "SEO Optimization Toolkit",
                "price": "$47",
                "link": "https://www.digistore24.com/",
                "commission": "45%",
                "description": "Complete suite of tools for dominating search engine rankings",
                "source": "Digistore24 (Demo)",
                "category": "Software"
            },
            {
                "name": "Social Media Growth Formula",
                "price": "$77",
                "link": "https://www.digistore24.com/",
                "commission": "60%",
                "description": "Explosive growth strategies for Instagram, TikTok, and YouTube",
                "source": "Digistore24 (Demo)",
                "category": "Marketing"
            },
            {
                "name": "Online Course Creator Bundle",
                "price": "$147",
                "link": "https://www.digistore24.com/",
                "commission": "50%",
                "description": "Everything you need to create and launch profitable online courses",
                "source": "Digistore24 (Demo)",
                "category": "Education"
            }
        ]
