"""
Affiliate Network Manager - Master Controller
Central management for all affiliate network integrations
"""

from typing import List, Dict, Any, Optional
from affiliate_integrations import (
    AmazonAssociates,
    ClickBankIntegration,
    Digistore24Integration,
    CJAffiliateIntegration,
    ImpactIntegration
)


class AffiliateNetworkManager:
    """
    Central manager for all affiliate networks
    Makes it easy to fetch products from multiple sources
    """
    
    def __init__(self):
        self.networks = {
            'amazon': AmazonAssociates(),
            'cj': CJAffiliateIntegration(),
            'shareasale': CJAffiliateIntegration(),
            'clickbank': ClickBankIntegration(),
            'impact': ImpactIntegration(),
            'partnerstack': ImpactIntegration(),
            'digistore24': Digistore24Integration()
        }
    
    def get_network(self, network_name: str):
        """Get a specific network integration by name"""
        return self.networks.get(network_name.lower())
    
    def fetch_from_network(self, network_name: str, max_results: int = 10, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from a specific network
        
        Args:
            network_name: Name of the network (amazon, clickbank, etc.)
            max_results: Maximum number of products to return
            **kwargs: Additional parameters for the specific network
        
        Returns:
            List of products
        """
        network = self.get_network(network_name)
        if network:
            return network.fetch_products(max_results=max_results, **kwargs)
        return []
    
    def fetch_all(self, max_per_network: int = 5) -> List[Dict[str, Any]]:
        """
        Fetch products from all configured networks
        
        Args:
            max_per_network: Maximum products per network
        
        Returns:
            Combined list of products from all networks
        """
        all_products = []
        for network_name, network in self.networks.items():
            try:
                products = network.fetch_products(max_results=max_per_network)
                all_products.extend(products)
            except Exception as e:
                print(f"Error fetching from {network_name}: {e}")
        
        return all_products
    
    def get_available_networks(self) -> List[str]:
        """Get list of all available network names"""
        return list(self.networks.keys())
    
    def search_products(self, keyword: str, max_results: int = 20) -> List[Dict[str, Any]]:
        """
        Search for products across all networks
        
        Args:
            keyword: Search keyword
            max_results: Total maximum results
        
        Returns:
            Combined search results from all networks
        """
        results = []
        per_network = max(2, max_results // len(self.networks))
        
        for network_name, network in self.networks.items():
            try:
                products = network.fetch_products(
                    max_results=per_network,
                    keywords=keyword,
                    category=keyword
                )
                results.extend(products)
            except Exception as e:
                print(f"Search error in {network_name}: {e}")
        
        return results[:max_results]
    
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
            'cj': """
                CJ Affiliate Setup:
                1. Sign up: https://www.cj.com/
                2. Go to Account Settings > API/FTP
                3. Add to Replit Secrets:
                   - CJ_API_TOKEN
                   - CJ_API_SECRET
                   - CJ_AFFILIATE_ID
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
            'impact': """
                Impact Partnership Cloud Setup:
                1. Sign up: https://impact.com/
                2. Join partner programs
                3. Get API key from dashboard
                4. Add to Replit Secrets:
                   - IMPACT_API_KEY
                   - IMPACT_ACCOUNT_SID
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
                2. Get API key from Settings → Account Access → API Keys
                3. Add to Replit Secrets:
                   - DIGISTORE24_API_KEY (required)
                   - DIGISTORE24_AFFILIATE_ID (optional, for personalized links)
            """
        }


manager = AffiliateNetworkManager()


def get_affiliate_manager() -> AffiliateNetworkManager:
    """Get the global affiliate manager instance"""
    return manager


def sync_affiliate_products(clickbank_key: Optional[str] = None):
    """
    Sync affiliate products from all networks to Firebase
    Generates AI-powered ads for each product
    
    Args:
        clickbank_key: ClickBank API key (optional)
    
    Returns:
        Number of products synced
    """
    import os
    from typing import Dict
    
    try:
        from firebase_admin import db
        from affiliate_scraper import generate_ad_text
        from datetime import datetime
        
        marketplace_ref = db.reference("marketplace")
        
        all_products = []
        
        if clickbank_key:
            os.environ['CLICKBANK_API_KEY'] = clickbank_key
            clickbank_products = manager.fetch_from_network('clickbank', max_results=10)
            all_products.extend(clickbank_products)
        
        digistore_products = manager.fetch_from_network('digistore24', max_results=10)
        all_products.extend(digistore_products)
        
        print(f"Fetched {len(all_products)} products total.")
        
        synced_count = 0
        for p in all_products:
            try:
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
                    "description": str(p.get("description", "")),
                    "synced_at": datetime.utcnow().isoformat()
                }
                
                product_id = p["name"].replace(" ", "_").replace("/", "_")[:50]
                marketplace_ref.child(product_id).set(product_data)
                synced_count += 1
                
            except Exception as e:
                print(f"Error syncing product {p.get('name', 'Unknown')}: {e}")
        
        print(f"Affiliate sync complete. Synced {synced_count} products.")
        return synced_count
        
    except Exception as e:
        print(f"Sync error: {e}")
        return 0
