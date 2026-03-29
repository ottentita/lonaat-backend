-- Insert real affiliate links with auto-generated fields and duplicate prevention
-- Admin User ID: 6dbcf8e6-da7a-4c83-aef1-c4183adfc176

DO $$
DECLARE
  admin_id TEXT := '6dbcf8e6-da7a-4c83-aef1-c4183adfc176';
  inserted_count INT := 0;
  skipped_count INT := 0;
  link_exists BOOLEAN;
  normalized_link TEXT;
BEGIN
  -- Process each affiliate link
  
  -- 1. JVZoo Marketing
  normalized_link := LOWER(TRIM('https://jvz5.com/c/3378503/426415/'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'JVZoo Marketing Tool', 'Professional marketing software and tools', 97.00, normalized_link, 'Marketing', ARRAY['marketing', 'jvzoo', 'tools'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 2. Advanced Bionutritionals - Muscle Mass
  normalized_link := LOWER(TRIM('https://www.advancedbionutritionals.com/DS24/Advanced-Amino/Muscle-Mass-Loss/HD.htm#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Advanced Amino Formula', 'Advanced nutritional supplement for muscle mass', 67.00, normalized_link, 'Health', ARRAY['health', 'nutrition', 'supplements'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 3. Ingenius Wave
  normalized_link := LOWER(TRIM('https://ingeniuswave.com/DSvsl/#aff=Haraplsodha'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Ingenius Wave Program', 'Personal development and mindset training', 47.00, normalized_link, 'Business', ARRAY['business', 'development', 'training'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 4. US Water Revolution
  normalized_link := LOWER(TRIM('https://uswaterrevolution.com/#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Water Purification System', 'Advanced water filtration and purification', 127.00, normalized_link, 'Health', ARRAY['health', 'water', 'purification'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 5. Save Money Guide
  normalized_link := LOWER(TRIM('https://heikoboos.com/save-money#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Money Saving Guide', 'Complete guide to saving money and budgeting', 37.00, normalized_link, 'Finance', ARRAY['finance', 'money', 'savings'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 6. PLR Video Courses
  normalized_link := LOWER(TRIM('http://heikoboos.com/10-mega-plr-video-courses#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'PLR Video Course Bundle', '10 mega PLR video courses with resale rights', 97.00, normalized_link, 'Marketing', ARRAY['marketing', 'plr', 'video'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 7-10. Digistore24 Products
  normalized_link := LOWER(TRIM('https://www.checkout-ds24.com/redir/651003/lonaat/'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Digistore24 Product 651003', 'Premium digital product from Digistore24', 77.00, normalized_link, 'Business', ARRAY['business', 'digital', 'digistore24'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  normalized_link := LOWER(TRIM('https://www.checkout-ds24.com/redir/606273/lonaat/'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Digistore24 Product 606273', 'Premium digital product from Digistore24', 87.00, normalized_link, 'Business', ARRAY['business', 'digital', 'digistore24'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 11. Click Designs
  normalized_link := LOWER(TRIM('https://clickdesigns.com/dg/cd/#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Click Designs Graphics Suite', 'Professional graphic design templates and tools', 67.00, normalized_link, 'Software', ARRAY['software', 'design', 'graphics'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 12-13. More Digistore24
  normalized_link := LOWER(TRIM('https://www.checkout-ds24.com/redir/606481/lonaat/'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Digistore24 Product 606481', 'Premium digital product from Digistore24', 97.00, normalized_link, 'Business', ARRAY['business', 'digital', 'digistore24'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  normalized_link := LOWER(TRIM('https://www.checkout-ds24.com/redir/598501/lonaat/'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Digistore24 Product 598501', 'Premium digital product from Digistore24', 107.00, normalized_link, 'Business', ARRAY['business', 'digital', 'digistore24'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 14. Digital Products Academy
  normalized_link := LOWER(TRIM('http://www.betterdailyguide.site/ds24/digital-products-academy#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Digital Products Academy', 'Learn to create and sell digital products', 147.00, normalized_link, 'Marketing', ARRAY['marketing', 'education', 'digital'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 15. Pineal Guardian
  normalized_link := LOWER(TRIM('https://pinealguardianvip.com/ds/indexts.php#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Pineal Guardian Supplement', 'Natural supplement for pineal gland health', 59.00, normalized_link, 'Health', ARRAY['health', 'supplements', 'wellness'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 16. Modern Remedy
  normalized_link := LOWER(TRIM('https://mdrnremedy.com/#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Modern Remedy Health Solution', 'Modern approach to natural health remedies', 69.00, normalized_link, 'Health', ARRAY['health', 'remedy', 'natural'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 17. Nerve Fresh
  normalized_link := LOWER(TRIM('https://secure.nervefresh24.com/index-nf-ds#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Nerve Fresh Supplement', 'Natural nerve health support supplement', 79.00, normalized_link, 'Health', ARRAY['health', 'nerve', 'supplements'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 18. Neuro Prime
  normalized_link := LOWER(TRIM('https://theneuroprime.com/ds/go/indexvs.php#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Neuro Prime Brain Supplement', 'Advanced brain health and cognitive support', 69.00, normalized_link, 'Health', ARRAY['health', 'brain', 'cognitive'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 19. Dental Sugar Hack
  normalized_link := LOWER(TRIM('https://dentalsugarhack.vip/discovery#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Dental Sugar Hack', 'Revolutionary dental health solution', 49.00, normalized_link, 'Health', ARRAY['health', 'dental', 'wellness'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 20-21. More Digistore24
  normalized_link := LOWER(TRIM('https://www.digistore24.com/redir/466293/lonaat/'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Digistore24 Product 466293', 'Premium digital product from Digistore24', 117.00, normalized_link, 'Business', ARRAY['business', 'digital', 'digistore24'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  normalized_link := LOWER(TRIM('https://www.digistore24.com/redir/501717/lonaat/'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Digistore24 Product 501717', 'Premium digital product from Digistore24', 127.00, normalized_link, 'Business', ARRAY['business', 'digital', 'digistore24'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 22. Zeneara
  normalized_link := LOWER(TRIM('https://zeneara.com/ds/go/indexvs.php#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Zeneara Tinnitus Relief', 'Natural tinnitus and hearing support', 69.00, normalized_link, 'Health', ARRAY['health', 'hearing', 'tinnitus'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 23. Advanced Joint
  normalized_link := LOWER(TRIM('https://www.advancedbionutritionals.com/DS24/Advanced-Joint/Beat-Joint-Pain-With-Cucumbers.htm#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Advanced Joint Support', 'Natural joint pain relief supplement', 67.00, normalized_link, 'Health', ARRAY['health', 'joint', 'pain-relief'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 24. Digistore24 442614
  normalized_link := LOWER(TRIM('https://www.digistore24.com/redir/442614/lonaat/'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Digistore24 Product 442614', 'Premium digital product from Digistore24', 137.00, normalized_link, 'Business', ARRAY['business', 'digital', 'digistore24'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 25. Renew Your Hair
  normalized_link := LOWER(TRIM('https://renewyourhair.com/ds24c/#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Hair Renewal System', 'Natural hair growth and restoration', 59.00, normalized_link, 'Health', ARRAY['health', 'hair', 'beauty'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 26. Chicken Keepers Checklist
  normalized_link := LOWER(TRIM('http://www.betterdailyguide.site/ds24/the-first-time-chicken-keepers-checklist#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Chicken Keepers Guide', 'Complete guide for first-time chicken keepers', 27.00, normalized_link, 'Business', ARRAY['business', 'farming', 'guide'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 27. Sleep Hacking
  normalized_link := LOWER(TRIM('http://www.betterdailyguide.site/sleep-hacking#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Sleep Hacking Guide', 'Optimize your sleep for better health', 37.00, normalized_link, 'Health', ARRAY['health', 'sleep', 'wellness'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 28. Joint Pain Hack
  normalized_link := LOWER(TRIM('https://jointpainhack.com/digi/add-to-cart/#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Joint Pain Hack Solution', 'Natural joint pain relief method', 49.00, normalized_link, 'Health', ARRAY['health', 'joint', 'pain'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 29. Digistore24 419540
  normalized_link := LOWER(TRIM('https://www.digistore24.com/redir/419540/lonaat/'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Digistore24 Product 419540', 'Premium digital product from Digistore24', 147.00, normalized_link, 'Business', ARRAY['business', 'digital', 'digistore24'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 30. Neurovera
  normalized_link := LOWER(TRIM('https://theneurovera.com/ds/go/indexts.php#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Neurovera Brain Support', 'Advanced cognitive and memory support', 69.00, normalized_link, 'Health', ARRAY['health', 'brain', 'memory'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 31. Weight Loss Over 40
  normalized_link := LOWER(TRIM('http://www.weightlossover40.site/#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Weight Loss Over 40 Program', 'Specialized weight loss for people over 40', 47.00, normalized_link, 'Health', ARRAY['health', 'weight-loss', 'fitness'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 32. Mens Mental Health
  normalized_link := LOWER(TRIM('https://millenia-xpose.mykajabi.com/millenia-xpose-s-mens-mental-health-5680d530-79b9-40fe-86c1-2998722f7157#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Mens Mental Health Course', 'Comprehensive mental health program for men', 97.00, normalized_link, 'Health', ARRAY['health', 'mental', 'wellness'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- 33. Skin Reset
  normalized_link := LOWER(TRIM('https://skin-reset.evaglow.beauty/#aff=lonaat'));
  SELECT EXISTS(SELECT 1 FROM products WHERE LOWER("affiliateLink") = normalized_link) INTO link_exists;
  IF NOT link_exists THEN
    INSERT INTO products (id, "userId", name, description, price, "affiliateLink", category, tags, "isActive", featured, "updatedAt")
    VALUES (gen_random_uuid()::text, admin_id, 'Skin Reset Beauty System', 'Complete skin rejuvenation and beauty program', 77.00, normalized_link, 'Health', ARRAY['health', 'beauty', 'skincare'], true, false, CURRENT_TIMESTAMP);
    inserted_count := inserted_count + 1;
  ELSE
    skipped_count := skipped_count + 1;
  END IF;

  -- Log results
  RAISE NOTICE '✅ INSERTION COMPLETE';
  RAISE NOTICE '📊 INSERTED: % new products', inserted_count;
  RAISE NOTICE '⏭️  SKIPPED: % duplicates', skipped_count;
  RAISE NOTICE '📈 TOTAL PROCESSED: %', inserted_count + skipped_count;
END $$;

-- Verify final count
SELECT COUNT(*) as total_products FROM products;
