"""
Affiliate Network Manager - Master Controller
Production-ready with ONLY Digistore24 and Awin integrations
NOTE: Other networks (CJ, ClickBank, Amazon, etc.) have been removed per requirements
"""

from typing import List, Dict, Any, Optional
from affiliate_integrations import (
    Digistore24Integration,
    AwinIntegration,
    MyLeadIntegration,
    PartnerStackIntegration
)


class AffiliateNetworkManager:
    """
    Central manager for affiliate networks
    Production version: Digistore24, Awin, MyLead, and PartnerStack
    """
    
    def __init__(self):
        self.networks = {
            'digistore24': Digistore24Integration(),
            'awin': AwinIntegration(),
            'mylead': MyLeadIntegration(),
            'partnerstack': PartnerStackIntegration()
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
            'mylead': "MyLead: https://mylead.global/ | Secrets: MYLEAD_API_EMAIL, MYLEAD_API_PASSWORD, MYLEAD_API_BASE",
            'amazon': "Amazon Associates: https://affiliate-program.amazon.com/ | Secrets: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG",
            'cj': "CJ Affiliate: https://www.cj.com/ | Secrets: CJ_API_TOKEN, CJ_API_SECRET, CJ_AFFILIATE_ID",
            'shareasale': "ShareASale: https://www.shareasale.com/ | Secrets: SHAREASALE_TOKEN, SHAREASALE_SECRET, SHAREASALE_AFFILIATE_ID",
            'clickbank': "ClickBank: https://www.clickbank.com/ | Secrets: CLICKBANK_AFFILIATE_ID",
            'impact': "Impact: https://impact.com/ | Secrets: IMPACT_API_KEY, IMPACT_ACCOUNT_SID",
            'partnerstack': "PartnerStack: https://partnerstack.com/ | Secrets: PARTNERSTACK_API_KEY",
            'digistore24': "Digistore24: https://www.digistore24.com/ | Secrets: DIGISTORE24_API_KEY, DIGISTORE24_AFFILIATE_ID",
            'rakuten': "Rakuten Advertising: https://rakutenadvertising.com/ | Secrets: RAKUTEN_API_KEY, RAKUTEN_SID, RAKUTEN_MID",
            'awin': "Awin: https://www.awin.com/ | Secrets: AWIN_API_TOKEN, AWIN_PUBLISHER_ID",
            'flexoffers': "FlexOffers: https://www.flexoffers.com/ | Secrets: FLEXOFFERS_API_KEY, FLEXOFFERS_PUBLISHER_ID",
            'ebay': "eBay Partner Network: https://partnernetwork.ebay.com/ | Secrets: EBAY_APP_ID, EBAY_CAMPAIGN_ID",
            'shopify': "Shopify Collabs: https://www.shopify.com/collabs | Secrets: SHOPIFY_COLLABS_ACCESS_TOKEN",
            'moreniche': "MoreNiche: https://www.moreniche.com/ | Secrets: MORENICHE_API_KEY, MORENICHE_AFFILIATE_ID",
            'avangate': "Avangate (2Checkout): https://www.2checkout.com/ | Secrets: AVANGATE_API_KEY, AVANGATE_AFFILIATE_CODE",
            'etsy': "Etsy Affiliate: https://www.etsy.com/affiliates | Secrets: ETSY_AFFILIATE_ID, ETSY_API_KEY",
            'clickdealer': "ClickDealer: https://www.clickdealer.com/ | Secrets: CLICKDEALER_API_KEY, CLICKDEALER_AFFILIATE_ID",
            'mobidea': "Mobidea: https://www.mobidea.com/ | Secrets: MOBIDEA_API_KEY, MOBIDEA_AFFILIATE_ID",
            'terraleads': "TerraLeads: https://terraleads.com/ | Secrets: TERRALEADS_API_KEY, TERRALEADS_AFFILIATE_ID",
            'maxweb': "MaxWeb: https://maxweb.com/ | Secrets: MAXWEB_API_KEY, MAXWEB_AFFILIATE_ID",
            'leadbit': "LeadBit: https://leadbit.com/ | Secrets: LEADBIT_API_KEY, LEADBIT_AFFILIATE_ID",
            'giddyup': "GiddyUp: https://www.giddyup.io/ | Secrets: GIDDYUP_API_KEY, GIDDYUP_PARTNER_ID"
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
