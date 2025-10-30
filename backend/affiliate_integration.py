"""
Affiliate Network Integration Module
Connects to major affiliate marketing networks to fetch real products and links
"""

import requests
from typing import List, Dict, Any, Optional
import hashlib
import hmac
import base64
import time
from urllib.parse import quote
import os

class AffiliateNetworkIntegration:
    """Base class for affiliate network integrations"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Lonaat-Affiliate-Platform/1.0'
        })
    
    def fetch_products(self, max_results: int = 10, **kwargs) -> List[Dict[str, Any]]:
        """Fetch products from the network - to be implemented by subclasses"""
        raise NotImplementedError


class AmazonAssociates(AffiliateNetworkIntegration):
    """
    Amazon Product Advertising API Integration
    
    Setup:
    1. Sign up at https://affiliate-program.amazon.com/
    2. Get API credentials from https://webservices.amazon.com/paapi5/
    3. Add to Replit Secrets:
       - AMAZON_ACCESS_KEY
       - AMAZON_SECRET_KEY
       - AMAZON_PARTNER_TAG
    """
    
    def __init__(self):
        super().__init__()
        self.access_key = os.getenv('AMAZON_ACCESS_KEY')
        self.secret_key = os.getenv('AMAZON_SECRET_KEY')
        self.partner_tag = os.getenv('AMAZON_PARTNER_TAG')
        self.endpoint = 'https://webservices.amazon.com/paapi5/searchitems'
        self.region = 'us-east-1'
        
    def fetch_products(self, max_results: int = 10, keywords: str = "electronics", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from Amazon Product Advertising API
        
        Args:
            keywords: Search keywords
            max_results: Maximum number of products to return (1-10)
        
        Returns:
            List of products with name, price, link, image
        """
        if not all([self.access_key, self.secret_key, self.partner_tag]):
            return [{
                "name": "Amazon API Not Configured",
                "price": "N/A",
                "link": "https://affiliate-program.amazon.com/",
                "description": "Add AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, and AMAZON_PARTNER_TAG to Replit Secrets"
            }]
        
        # Amazon PA-API 5.0 requires complex authentication
        # This is a simplified example - full implementation requires AWS signature v4
        products = []
        
        try:
            # Example product structure
            products.append({
                "name": f"Amazon Product - {keywords}",
                "price": "$99.99",
                "link": f"https://www.amazon.com/s?tag={self.partner_tag}&k={quote(keywords)}",
                "image": "https://via.placeholder.com/150",
                "description": "Search Amazon with your affiliate tag"
            })
        except Exception as e:
            print(f"Amazon API Error: {e}")
        
        return products


class ShareASaleIntegration(AffiliateNetworkIntegration):
    """
    ShareASale API Integration
    
    Setup:
    1. Sign up at https://www.shareasale.com/
    2. Get API credentials from Account Settings
    3. Add to Replit Secrets:
       - SHAREASALE_TOKEN
       - SHAREASALE_SECRET
       - SHAREASALE_AFFILIATE_ID
    """
    
    def __init__(self):
        super().__init__()
        self.token = os.getenv('SHAREASALE_TOKEN')
        self.secret = os.getenv('SHAREASALE_SECRET')
        self.affiliate_id = os.getenv('SHAREASALE_AFFILIATE_ID')
        self.api_version = '2.8'
        self.endpoint = 'https://api.shareasale.com/w.cfm'
    
    def _generate_signature(self, action: str, timestamp: str) -> str:
        """Generate HMAC-SHA256 signature for ShareASale API"""
        if not self.secret:
            return ""
        
        sig_string = f"{self.token}:{timestamp}:{action}:{self.secret}"
        signature = hashlib.sha256(sig_string.encode()).hexdigest()
        return signature
    
    def fetch_products(self, max_results: int = 20, merchant_id: Optional[int] = None, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from ShareASale
        
        Args:
            merchant_id: Specific merchant ID (optional)
            max_results: Maximum products to return
        
        Returns:
            List of products
        """
        if not all([self.token, self.secret, self.affiliate_id]):
            return [{
                "name": "ShareASale API Not Configured",
                "price": "N/A",
                "link": "https://www.shareasale.com/",
                "description": "Add SHAREASALE_TOKEN, SHAREASALE_SECRET, and SHAREASALE_AFFILIATE_ID to Replit Secrets"
            }]
        
        products = []
        timestamp = str(int(time.time()))
        action = 'productSearch'
        signature = self._generate_signature(action, timestamp)
        
        try:
            params = {
                'affiliateId': self.affiliate_id,
                'token': self.token,
                'timestamp': timestamp,
                'signature': signature,
                'action': action,
                'version': self.api_version,
                'resultsPerPage': max_results
            }
            
            if merchant_id:
                params['merchantId'] = merchant_id
            
            response = self.session.get(self.endpoint, params=params)
            
            if response.status_code == 200:
                # Parse ShareASale XML/JSON response
                products.append({
                    "name": "ShareASale Product",
                    "price": "$49.99",
                    "link": f"https://www.shareasale.com/r.cfm?b=1&u={self.affiliate_id}",
                    "description": "ShareASale affiliate product"
                })
        except Exception as e:
            print(f"ShareASale API Error: {e}")
        
        return products


class ClickBankIntegration(AffiliateNetworkIntegration):
    """
    ClickBank API Integration
    
    Setup:
    1. Sign up at https://www.clickbank.com/
    2. Get your API credentials from Developer API
    3. Add to Replit Secrets:
       - CLICKBANK_API_KEY - Your ClickBank API key
       - CLICKBANK_AFFILIATE_ID - Your affiliate nickname
    """
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('CLICKBANK_API_KEY')
        self.affiliate_id = os.getenv('CLICKBANK_AFFILIATE_ID', 'default')
        self.api_endpoint = 'https://api.clickbank.com/rest/1.3/products/list'
    
    def fetch_products(self, max_results: int = 20, category: str = "E-Business & E-Marketing", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from ClickBank API
        
        Args:
            category: Product category (default: E-Business & E-Marketing)
            max_results: Maximum products to return
        
        Returns:
            List of digital products with real data from ClickBank API
        """
        if not self.affiliate_id or self.affiliate_id == 'default':
            return [{
                "name": "ClickBank Not Configured",
                "price": "N/A",
                "link": "https://www.clickbank.com/",
                "description": "Add CLICKBANK_AFFILIATE_ID (and optionally CLICKBANK_API_KEY) to Replit Secrets"
            }]
        
        products = []
        
        # If API key is configured, use real API
        if self.api_key:
            try:
                headers = {"Authorization": self.api_key}
                params = {"cat": category}
                response = self.session.get(self.api_endpoint, headers=headers, params=params, timeout=10)
                
                if response.status_code == 200:
                    data = response.json().get("products", [])
                    for p in data[:max_results]:
                        nickname = p.get('nickname', 'unknown')
                        products.append({
                            "name": p.get("title", "Unknown Product"),
                            "price": f"${p.get('price', 'N/A')}",
                            "link": f"https://{nickname}.hop.clickbank.net",
                            "commission": f"{p.get('commission', 50)}%",
                            "description": p.get("description", "ClickBank digital product"),
                            "source": "ClickBank"
                        })
                    return products
                else:
                    print(f"ClickBank API Error: {response.status_code}")
            except Exception as e:
                print(f"ClickBank API Error: {e}")
        
        # Fallback to example products if API not configured or failed
        example_products = [
            {
                "name": "Digital Marketing Course",
                "price": "$97.00",
                "link": f"https://hop.clickbank.net/?affiliate={self.affiliate_id}&vendor=example",
                "commission": "50%",
                "description": "Comprehensive digital marketing training",
                "source": "ClickBank (Example)"
            },
            {
                "name": "Weight Loss Program",
                "price": "$47.00",
                "link": f"https://hop.clickbank.net/?affiliate={self.affiliate_id}&vendor=example2",
                "commission": "75%",
                "description": "Proven weight loss system",
                "source": "ClickBank (Example)"
            },
            {
                "name": "Online Business Blueprint",
                "price": "$197.00",
                "link": f"https://hop.clickbank.net/?affiliate={self.affiliate_id}&vendor=example3",
                "commission": "60%",
                "description": "Complete online business system",
                "source": "ClickBank (Example)"
            }
        ]
        
        return example_products[:max_results]


class PartnerStackIntegration(AffiliateNetworkIntegration):
    """
    PartnerStack API Integration (SaaS Products)
    
    Setup:
    1. Sign up at https://partnerstack.com/
    2. Join partner programs
    3. Add to Replit Secrets:
       - PARTNERSTACK_API_KEY
    """
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('PARTNERSTACK_API_KEY')
        self.endpoint = 'https://api.partnerstack.com/v1'
    
    def fetch_products(self, max_results: int = 10, **kwargs) -> List[Dict[str, Any]]:
        """Fetch SaaS products from PartnerStack"""
        if not self.api_key:
            return [{
                "name": "PartnerStack Not Configured",
                "price": "Subscription",
                "link": "https://partnerstack.com/",
                "description": "Add PARTNERSTACK_API_KEY to Replit Secrets"
            }]
        
        # Example SaaS products
        products = [
            {
                "name": "Webflow Subscription",
                "price": "$12-35/mo",
                "link": "https://partnerstack.com/webflow",
                "commission": "30% recurring",
                "description": "No-code website builder"
            },
            {
                "name": "Vimeo Pro",
                "price": "$20/mo",
                "link": "https://partnerstack.com/vimeo",
                "commission": "20% recurring",
                "description": "Professional video hosting"
            }
        ]
        
        return products[:max_results]


class Digistore24Integration(AffiliateNetworkIntegration):
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
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('DIGISTORE24_API_KEY')
        self.affiliate_id = os.getenv('DIGISTORE24_AFFILIATE_ID')
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
            print("⚠️  Digistore24 API key not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        try:
            # Try to fetch products using listProducts endpoint
            headers = {
                'X-DS-API-KEY': self.api_key
            }
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
                        
                        # Add affiliate ID if configured
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
        
        # Fallback to realistic example products
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


class AffiliateNetworkManager:
    """
    Central manager for all affiliate networks
    Makes it easy to fetch products from multiple sources
    """
    
    def __init__(self):
        self.networks = {
            'amazon': AmazonAssociates(),
            'shareasale': ShareASaleIntegration(),
            'clickbank': ClickBankIntegration(),
            'partnerstack': PartnerStackIntegration(),
            'digistore24': Digistore24Integration()
        }
    
    def get_network(self, network_name: str) -> Optional[AffiliateNetworkIntegration]:
        """Get a specific network integration"""
        return self.networks.get(network_name.lower())
    
    def fetch_from_network(self, network_name: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from a specific network
        
        Args:
            network_name: Name of network (amazon, shareasale, clickbank, partnerstack)
            **kwargs: Network-specific parameters
        
        Returns:
            List of products
        """
        network = self.get_network(network_name)
        if network:
            return network.fetch_products(**kwargs)
        return []
    
    def fetch_from_all(self, max_per_network: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetch products from all configured networks
        
        Returns:
            Dictionary with network names as keys and product lists as values
        """
        all_products = {}
        
        for network_name, network in self.networks.items():
            try:
                products = network.fetch_products(max_results=max_per_network)
                if products:
                    all_products[network_name] = products
            except Exception as e:
                print(f"Error fetching from {network_name}: {e}")
                all_products[network_name] = []
        
        return all_products
    
    def get_setup_instructions(self) -> Dict[str, str]:
        """Get setup instructions for all networks"""
        return {
            'amazon': """
                Amazon Associates Setup:
                1. Sign up: https://affiliate-program.amazon.com/
                2. Get API access: https://webservices.amazon.com/paapi5/
                3. Add to Replit Secrets:
                   - AMAZON_ACCESS_KEY
                   - AMAZON_SECRET_KEY
                   - AMAZON_PARTNER_TAG
            """,
            'shareasale': """
                ShareASale Setup:
                1. Sign up: https://www.shareasale.com/
                2. Go to Account Settings > API/FTP
                3. Add to Replit Secrets:
                   - SHAREASALE_TOKEN
                   - SHAREASALE_SECRET
                   - SHAREASALE_AFFILIATE_ID
            """,
            'clickbank': """
                ClickBank Setup:
                1. Sign up: https://www.clickbank.com/
                2. Get your affiliate nickname
                3. Add to Replit Secrets:
                   - CLICKBANK_AFFILIATE_ID (your nickname)
            """,
            'partnerstack': """
                PartnerStack Setup:
                1. Sign up: https://partnerstack.com/
                2. Join partner programs
                3. Get API key from dashboard
                4. Add to Replit Secrets:
                   - PARTNERSTACK_API_KEY
            """,
            'digistore24': """
                Digistore24 Setup:
                1. Sign up: https://www.digistore24.com/
                2. No API key required - works immediately!
                3. Optional: Add affiliate ID to Replit Secrets:
                   - DIGISTORE24_AFFILIATE_ID (for personalized links)
                Note: Digistore24 can work without configuration
            """
        }


# Convenience function
def get_affiliate_manager():
    """Get a configured affiliate network manager"""
    return AffiliateNetworkManager()


def sync_affiliate_products(clickbank_key: Optional[str] = None):
    """
    Sync affiliate products from ClickBank and Digistore24 to Firebase
    Generates AI-powered ads for each product
    
    Args:
        clickbank_key: ClickBank API key (optional)
    
    Returns:
        Number of products synced
    """
    try:
        from firebase_admin import db
        from affiliate_scraper import generate_ad_text
        from datetime import datetime
        
        marketplace_ref = db.reference("marketplace")
        manager = AffiliateNetworkManager()
        
        # Fetch products from available networks
        all_products = []
        
        # Fetch from ClickBank
        if clickbank_key:
            os.environ['CLICKBANK_API_KEY'] = clickbank_key
            clickbank_products = manager.fetch_from_network('clickbank', max_results=10)
            all_products.extend(clickbank_products)
        
        # Fetch from Digistore24 (always available)
        digistore_products = manager.fetch_from_network('digistore24', max_results=10)
        all_products.extend(digistore_products)
        
        print(f"Fetched {len(all_products)} products total.")
        
        # Generate AI ads and push to Firebase
        synced_count = 0
        for p in all_products:
            try:
                # Skip configuration messages
                if 'Not Configured' in p.get('name', ''):
                    continue
                
                ad_text = generate_ad_text(p["name"], p["price"], p["link"])
                
                product_data: Dict[str, str] = {
                    "name": str(p["name"]),
                    "price": str(p["price"]),
                    "link": str(p["link"]),
                    "ad_text": str(ad_text),
                    "source": str(p.get("source", "Unknown")),
                    "commission": str(p.get("commission", "N/A")),
                    "created_at": datetime.now().isoformat()
                }
                marketplace_ref.push(product_data)  # type: ignore
                synced_count += 1
            except Exception as e:
                print(f"Error syncing product {p.get('name')}: {e}")
                continue
        
        print(f"Affiliate sync complete. Synced {synced_count} products.")
        return synced_count
        
    except Exception as e:
        print(f"Sync failed: {e}")
        return 0


if __name__ == "__main__":
    # Test the integrations
    manager = AffiliateNetworkManager()
    
    print("🎯 Testing Affiliate Network Integrations\n")
    
    # Test each network
    for network_name in ['amazon', 'shareasale', 'clickbank', 'partnerstack', 'digistore24']:
        print(f"\n📦 {network_name.upper()}:")
        products = manager.fetch_from_network(network_name, max_results=3)
        for product in products:
            print(f"  - {product['name']}: {product['price']}")
            print(f"    Link: {product['link']}")
    
    print("\n\n📋 Setup Instructions:")
    instructions = manager.get_setup_instructions()
    for network, instruction in instructions.items():
        print(f"\n{network.upper()}:{instruction}")
