import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

async function seed() {
  

  const offers = [
    {
      title: 'Amazing Gadget Offer',
      name: 'Amazing Gadget Offer',
      slug: 'amazing-gadget-offer',
      description: 'High converting gadget offer',
      url: 'https://example.com/gadget',
      payout: 3.5,
      network: 'ExampleNet',
      externalOfferId: 'EXT-GADGET-001',
      networkName: 'ExampleNet',
      trackingUrl: 'https://track.example.com/clk?offer=EXT-GADGET-001'
    },
    {
      title: 'Cool App Signup',
      name: 'Cool App Signup',
      slug: 'cool-app-signup',
      description: 'Mobile app trial signup',
      url: 'https://example.com/app',
      payout: 1.2,
      network: 'AppNet',
      externalOfferId: 'EXT-APP-001',
      networkName: 'AppNet',
      trackingUrl: 'https://track.appnet.com/clk?offer=EXT-APP-001'
    },
    {
      title: 'Subscription Box',
      name: 'Subscription Box',
      slug: 'subscription-box',
      description: 'Monthly box subscription',
      url: 'https://example.com/box',
      payout: 5.0,
      network: 'BoxNet',
      externalOfferId: 'EXT-BOX-001',
      networkName: 'BoxNet',
      trackingUrl: 'https://track.boxnet.com/clk?offer=EXT-BOX-001'
    },
    // example Digistore offer uses placeholder value so that /track builds URL from ENV
    {
      title: 'Digistore Demo Offer',
      name: 'Digistore Demo Offer',
      slug: 'digi-demo',
      description: 'Sample Digistore product',
      url: 'https://digistore.example.com',
      payout: 2.0,
      network: 'digistore24',
      externalOfferId: 'DS-123',
      networkName: 'digistore24',
      trackingUrl: 'digistore24'
    }
  ]

  for (const o of offers) {
      if (o.externalOfferId) {
        // Upsert by externalOfferId to avoid unique constraint failures
        await prisma.offer.upsert({
          where: { externalOfferId: o.externalOfferId },
          create: o as any,
          update: {
            title: o.title,
            name: (o as any).name || o.title,
            slug: (o as any).slug,
            description: o.description,
            url: o.url,
            payout: o.payout,
            network: o.network,
            networkName: o.networkName,
            trackingUrl: o.trackingUrl,
            isActive: (o as any).isActive ?? true,
          },
        })
        
      } else {
        const exists = await prisma.offer.findFirst({ where: { title: o.title } })
        if (!exists) {
          await prisma.offer.create({ data: o as any })
          
        } else {
          
        }
      }
  }

  // Seed a few marketplace products so frontend marketplace shows real data
  const products = [
    {
      name: 'Wireless Headphones',
      description: 'Noise-cancelling over-ear headphones',
      price: 79.99,
      image_url: 'https://via.placeholder.com/300x200.png?text=Headphones',
      affiliate_link: 'https://example.com/product/headphones',
      network: 'admitad',
      category: 'Electronics',
      is_active: true
    },
    {
      name: 'Pro Task Manager App',
      description: 'Productivity app subscription (1 year)',
      price: 29.99,
      image_url: 'https://via.placeholder.com/300x200.png?text=App',
      affiliate_link: 'https://example.com/product/app',
      network: 'digistore24',
      category: 'Software',
      is_active: true
    },
    {
      name: 'Yoga Starter Kit',
      description: 'Home yoga kit with mat and accessories',
      price: 49.0,
      image_url: 'https://via.placeholder.com/300x200.png?text=Yoga+Kit',
      affiliate_link: 'https://example.com/product/yoga',
      network: 'awin',
      category: 'Health',
      is_active: true
    }
  ]

  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } })
    if (!exists) {
      await prisma.product.create({ data: p as any })
      
    } else {
      await prisma.product.update({ where: { id: exists.id }, data: p as any })
      
    }
  }

  // Seed a few real estate properties for marketplace testing
  const properties = [
    {
      title: 'Modern 2-Bed Apartment in Downtown',
      description: 'Bright, fully-furnished 2 bedroom apartment close to transit and shops.',
      property_type: 'Apartment',
      transaction_type: 'sale',
      price: 120000,
      currency: 'USD',
      location: 'Downtown',
      region: 'Central',
      city: 'Metropolis',
      bedrooms: 2,
      bathrooms: 1,
      area_sqft: 850,
      image_url: 'https://via.placeholder.com/800x600.png?text=Apartment',
      is_active: true,
      status: 'approved'
    },
    {
      title: 'Cozy Family Home with Garden',
      description: '3 bed, 2 bath family house with a large garden and garage.',
      property_type: 'House',
      transaction_type: 'sale',
      price: 250000,
      currency: 'USD',
      location: 'Green Acres',
      region: 'North',
      city: 'Pleasantville',
      bedrooms: 3,
      bathrooms: 2,
      area_sqft: 1600,
      image_url: 'https://via.placeholder.com/800x600.png?text=House',
      is_active: true,
      status: 'approved'
    },
    {
      title: 'Beachfront Studio with Sea View',
      description: 'Compact studio perfect for holidays or short-term rental with ocean views.',
      property_type: 'Studio',
      transaction_type: 'rent',
      price: 950,
      currency: 'USD',
      location: 'Seaside',
      region: 'Coastal',
      city: 'Oceanview',
      bedrooms: 0,
      bathrooms: 1,
      area_sqft: 320,
      image_url: 'https://via.placeholder.com/800x600.png?text=Studio',
      is_active: true,
      status: 'approved'
    }
  ]

  for (const pr of properties) {
    const exists = await prisma.realEstateProperty.findFirst({ where: { title: pr.title } })
    if (!exists) {
      await prisma.realEstateProperty.create({ data: pr as any })
      
    } else {
      await prisma.realEstateProperty.update({ where: { id: exists.id }, data: pr as any })
      
    }
  }

  // Seed a few land registry records
  const lands = [
    {
      title_number: 'CM-LOT-0001',
      land_name: 'Seaside Plot A',
      current_owner: 'Alice Johnson',
      region: 'Coastal',
      city: 'Oceanview',
      town: 'Seaside',
      area_sqm: 500,
      polygon_coords: JSON.stringify([{ lat: 4.0, lng: 9.5 }, { lat: 4.001, lng: 9.501 }, { lat: 4.002, lng: 9.499 }]),
      polygon_wkt: null,
      center_lat: 4.001,
      center_lng: 9.5,
      land_use: 'residential',
      status: 'verified',
      verification_status: 'approved',
      purchase_price: 150000,
      currency: 'XAF'
    },
    {
      title_number: 'CM-LOT-0002',
      land_name: 'Green Acres Field',
      current_owner: 'Baba Kouma',
      region: 'North',
      city: 'Pleasantville',
      town: 'Green Acres',
      area_sqm: 2000,
      polygon_coords: JSON.stringify([{ lat: 6.5, lng: 12.1 }, { lat: 6.501, lng: 12.102 }, { lat: 6.502, lng: 12.098 }]),
      polygon_wkt: null,
      center_lat: 6.501,
      center_lng: 12.1,
      land_use: 'agricultural',
      status: 'verified',
      verification_status: 'approved',
      purchase_price: 300000,
      currency: 'XAF'
    },
    {
      title_number: 'CM-LOT-0003',
      land_name: 'Downtown Lot 3',
      current_owner: 'Central Holdings',
      region: 'Central',
      city: 'Metropolis',
      town: 'Downtown',
      area_sqm: 750,
      polygon_coords: JSON.stringify([{ lat: 3.8, lng: 11.5 }, { lat: 3.801, lng: 11.501 }, { lat: 3.802, lng: 11.499 }]),
      polygon_wkt: null,
      center_lat: 3.801,
      center_lng: 11.5,
      land_use: 'commercial',
      status: 'verified',
      verification_status: 'approved',
      purchase_price: 500000,
      currency: 'XAF'
    }
  ]

  for (const l of lands) {
    const exists = await prisma.land.findFirst({ where: { title_number: l.title_number } })
    if (!exists) {
      const created = await prisma.land.create({ data: l as any })
      await prisma.landOwnership.create({ data: {
        land_id: created.id,
        owner_name: l.current_owner,
        user_id: null,
        ownership_type: 'full',
        status: 'active',
        acquired_date: new Date(),
        acquired_price: l.purchase_price,
        currency: l.currency,
        seller_name: null,
        verification: 'verified'
      } })
      
    } else {
      
    }
  }

  
  // Additional realistic test data

  // Create 3 users
  const usersData = [
    { name: 'Test User One', email: `user1+${Date.now()}@example.com`, password: 'Password1!' },
    { name: 'Test User Two', email: `user2+${Date.now()}@example.com`, password: 'Password2!' },
    { name: 'Test User Three', email: `user3+${Date.now()}@example.com`, password: 'Password3!' }
  ]

  const createdUsers = [] as any[]
  for (const u of usersData) {
    const hash = await bcrypt.hash(u.password, 10)
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (!existing) {
      const cu = await prisma.user.create({ data: { name: u.name, email: u.email, password: hash } as any })
      createdUsers.push(cu)
      
    } else {
      createdUsers.push(existing)
      
    }
  }

  // Create 5 products
  const productNames = ['Alpha Widget', 'Beta Gadget', 'Gamma Tool', 'Delta Accessory', 'Epsilon Service']
  const createdProducts = [] as any[]
  for (const name of productNames) {
    const p = await prisma.product.create({ data: { name, description: `${name} description`, price: Math.floor(Math.random()*200)+10, image_url: null, affiliate_link: null, network: 'test', category: 'Test' } as any })
    createdProducts.push(p)
    
  }

  // Ensure there's at least one offer to attach clicks to
  const offer = await prisma.offer.findFirst()

  // Create 10 clicks distributed across created users
  const clicks = [] as any[]
  for (let i = 0; i < 10; i++) {
    const user = createdUsers[i % createdUsers.length]
    const timeBucket = Math.floor(Date.now() / 5000)
    const click = await prisma.click.create({ data: {
      offerId: offer ? offer.id : 1,
      adId: offer ? offer.id : 1,
      userId: user.id,
      timeBucket,
      clickId: `clk_${Date.now()}_${i}`,
      clickToken: `ctok_${Math.random().toString(36).slice(2,10)}`,
      ip: `192.168.1.${10 + i}`,
      userAgent: 'Mozilla/5.0 (Test)',
      user_id: user.id
    } })
    clicks.push(click)
  }
  

  // Create 5 commission records linked to users (and some linked to clicks)
  const commissions = [] as any[]
  for (let i = 0; i < 5; i++) {
    const user = createdUsers[i % createdUsers.length]
    const relatedClick = clicks[i] || null
    const commission = await prisma.commission.create({ data: {
      user_id: user.id,
      click_id: relatedClick ? relatedClick.id : undefined,
      network: 'testnet',
      amount: (Math.random() * 50 + 5).toFixed(2),
      status: 'approved',
      product_id: createdProducts[i % createdProducts.length].id
    } as any })
    commissions.push(commission)
  }
  

  // Create 2 completed payments
  const payments = [] as any[]
  for (let i = 0; i < 2; i++) {
    const user = createdUsers[0]
    const payment = await prisma.payment.create({ data: {
      userId: user.id,
      amount: (Math.random()*300 + 20).toFixed(2),
      currency: 'USD',
      status: 'completed',
      provider: 'stripe',
      transactionId: `txn_${Date.now()}_${i}`
    } as any })
    payments.push(payment)
  }
  
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
