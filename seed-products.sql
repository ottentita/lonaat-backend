-- Insert sample affiliate products from Digistore24, AWIN, Admitad
INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured)
SELECT 
  gen_random_uuid()::text,
  (SELECT id FROM users LIMIT 1),
  name,
  description,
  price,
  affiliate_link,
  category,
  tags,
  true,
  false
FROM (VALUES
  ('Digital Marketing Masterclass', 'Complete digital marketing course with SEO, PPC, and social media strategies', 197.00, 'https://digistore24.com/product/123456', 'Education', ARRAY['marketing', 'seo', 'digital']),
  ('WordPress Theme Bundle', 'Professional WordPress themes for business and portfolio websites', 67.00, 'https://digistore24.com/product/789012', 'Software', ARRAY['wordpress', 'themes', 'web']),
  ('Fitness Training Program', 'Complete 12-week fitness and nutrition program', 147.00, 'https://awin.com/product/456789', 'Health', ARRAY['fitness', 'health', 'training']),
  ('Email Marketing Software', 'Automated email marketing platform with analytics', 97.00, 'https://admitad.com/product/321654', 'Software', ARRAY['email', 'marketing', 'automation']),
  ('Graphic Design Templates', 'Professional design templates for social media and marketing', 47.00, 'https://awin.com/product/987654', 'Design', ARRAY['design', 'templates', 'graphics']),
  ('SEO Tools Suite', 'Complete SEO analysis and optimization toolkit', 127.00, 'https://digistore24.com/product/555111', 'Software', ARRAY['seo', 'tools', 'analytics']),
  ('Photography Course Bundle', 'Professional photography training with editing tutorials', 87.00, 'https://awin.com/product/222333', 'Education', ARRAY['photography', 'course', 'editing']),
  ('Business Automation Software', 'Automate your business workflows and processes', 297.00, 'https://admitad.com/product/444555', 'Software', ARRAY['automation', 'business', 'workflow']),
  ('Social Media Management Tool', 'Schedule and manage all your social media accounts', 77.00, 'https://digistore24.com/product/666777', 'Software', ARRAY['social', 'media', 'management']),
  ('Web Hosting Package', 'Premium web hosting with unlimited bandwidth', 157.00, 'https://awin.com/product/888999', 'Hosting', ARRAY['hosting', 'web', 'server']),
  ('Video Editing Course', 'Professional video editing with Adobe Premiere and After Effects', 117.00, 'https://admitad.com/product/111222', 'Education', ARRAY['video', 'editing', 'course']),
  ('E-commerce Store Builder', 'Build your online store with drag-and-drop interface', 187.00, 'https://digistore24.com/product/333444', 'Software', ARRAY['ecommerce', 'store', 'builder'])
) AS v(name, description, price, affiliate_link, category, tags)
ON CONFLICT ("affiliateLink") DO NOTHING
RETURNING id, name, category;
