"""
Affiliate Product Scraper with OpenAI Integration
"""
import requests
from bs4 import BeautifulSoup
import os
from openai import OpenAI

def get_openai_client():
    """
    Get OpenAI client with secure API key from environment variable
    """
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError(
            "OpenAI API key not found. Please add OPENAI_API_KEY to your Replit Secrets."
        )
    return OpenAI(api_key=api_key)

def fetch_affiliate_products(affiliate_url):
    """
    Scrape or fetch product data from an affiliate marketplace
    
    Args:
        affiliate_url: URL of the affiliate marketplace
        
    Returns:
        List of product dictionaries with name, price, and link
    """
    try:
        response = requests.get(affiliate_url, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        products = []
        # Adjust selector based on the actual website structure
        for item in soup.select('.product')[:10]:
            try:
                title_elem = item.select_one('.title')
                price_elem = item.select_one('.price')
                link_elem = item.select_one('a')
                
                # Skip if any required element is missing
                if not title_elem or not price_elem or not link_elem:
                    continue
                
                name = title_elem.get_text(strip=True)
                price = price_elem.get_text(strip=True)
                link = link_elem.get('href')
                
                if not link:
                    continue
                
                products.append({
                    "name": name,
                    "price": price,
                    "link": str(link)
                })
            except (AttributeError, TypeError):
                continue
                
        return products
    except Exception as e:
        print(f"Error fetching products: {e}")
        return []

def generate_product_description(product_name, model="gpt-4o-mini"):
    """
    Generate marketing description for a product using OpenAI
    
    Args:
        product_name: Name of the product
        model: OpenAI model to use
        
    Returns:
        Generated description string
    """
    try:
        client = get_openai_client()
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a marketing expert. Create compelling product descriptions for affiliate marketing."
                },
                {
                    "role": "user",
                    "content": f"Write a short, engaging product description for: {product_name}"
                }
            ],
            max_tokens=150
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating description: {e}")
        return f"Great product: {product_name}"

def generate_ad_text(product_name, product_price, link, model="gpt-4o-mini"):
    """
    Use AI to create ad captions automatically
    
    Args:
        product_name: Name of the product
        product_price: Price of the product
        link: Affiliate link to the product
        model: OpenAI model to use
        
    Returns:
        Generated ad text string
    """
    try:
        client = get_openai_client()
        
        prompt = f"""
Write a short, catchy ad for {product_name} priced at {product_price}.
Include a call to action and mention the link {link}.
The ad should sound fun and persuasive.
"""
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a creative copywriter specializing in affiliate marketing ads."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=200
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating ad text: {e}")
        return f"Check out {product_name} for just {product_price}! Get yours now: {link}"

def analyze_product_with_ai(product_data):
    """
    Use OpenAI to analyze and enhance product data
    
    Args:
        product_data: Dictionary with product information
        
    Returns:
        Enhanced product data with AI-generated content
    """
    try:
        description = generate_product_description(product_data.get('name', ''))
        product_data['ai_description'] = description
        return product_data
    except Exception as e:
        print(f"Error analyzing product: {e}")
        return product_data
