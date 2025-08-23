// Script to seed categories into Supabase database
// Run with: node scripts/seed-categories.js

const { createClient } = require('@supabase/supabase-js')

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

const supabase = createClient(supabaseUrl, supabaseKey)

const categories = [
  // Main categories
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Electronics', slug: 'electronics', description: 'Cameras, audio equipment, gaming consoles, and more', parent_id: null, icon_url: '/icons/electronics.svg', sort_order: 1, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Tools & Equipment', slug: 'tools-equipment', description: 'Power tools, hand tools, construction equipment', parent_id: null, icon_url: '/icons/tools.svg', sort_order: 2, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Sports & Recreation', slug: 'sports-recreation', description: 'Sports equipment, outdoor gear, fitness equipment', parent_id: null, icon_url: '/icons/sports.svg', sort_order: 3, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Transportation', slug: 'transportation', description: 'Bikes, scooters, car accessories', parent_id: null, icon_url: '/icons/transportation.svg', sort_order: 4, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Home & Garden', slug: 'home-garden', description: 'Appliances, furniture, gardening tools', parent_id: null, icon_url: '/icons/home.svg', sort_order: 5, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Events & Parties', slug: 'events-parties', description: 'Party supplies, decorations, event equipment', parent_id: null, icon_url: '/icons/events.svg', sort_order: 6, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Fashion & Accessories', slug: 'fashion-accessories', description: 'Clothing, jewelry, bags, special occasion wear', parent_id: null, icon_url: '/icons/fashion.svg', sort_order: 7, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Books & Media', slug: 'books-media', description: 'Books, movies, music, educational materials', parent_id: null, icon_url: '/icons/books.svg', sort_order: 8, is_active: true },

  // Electronics subcategories
  { id: '550e8400-e29b-41d4-a716-446655440101', name: 'Cameras & Photography', slug: 'cameras-photography', description: 'DSLR cameras, lenses, tripods, lighting equipment', parent_id: '550e8400-e29b-41d4-a716-446655440001', icon_url: null, sort_order: 1, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440102', name: 'Audio Equipment', slug: 'audio-equipment', description: 'Speakers, microphones, headphones, mixing boards', parent_id: '550e8400-e29b-41d4-a716-446655440001', icon_url: null, sort_order: 2, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440103', name: 'Gaming Consoles', slug: 'gaming-consoles', description: 'PlayStation, Xbox, Nintendo, gaming accessories', parent_id: '550e8400-e29b-41d4-a716-446655440001', icon_url: null, sort_order: 3, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440104', name: 'Computers & Tablets', slug: 'computers-tablets', description: 'Laptops, tablets, monitors, keyboards', parent_id: '550e8400-e29b-41d4-a716-446655440001', icon_url: null, sort_order: 4, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440105', name: 'Drones & RC', slug: 'drones-rc', description: 'Drones, remote control cars, helicopters', parent_id: '550e8400-e29b-41d4-a716-446655440001', icon_url: null, sort_order: 5, is_active: true },

  // Tools & Equipment subcategories
  { id: '550e8400-e29b-41d4-a716-446655440201', name: 'Power Tools', slug: 'power-tools', description: 'Drills, saws, sanders, grinders', parent_id: '550e8400-e29b-41d4-a716-446655440002', icon_url: null, sort_order: 1, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440202', name: 'Hand Tools', slug: 'hand-tools', description: 'Wrenches, screwdrivers, hammers, measuring tools', parent_id: '550e8400-e29b-41d4-a716-446655440002', icon_url: null, sort_order: 2, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440203', name: 'Construction Equipment', slug: 'construction-equipment', description: 'Ladders, scaffolding, concrete mixers', parent_id: '550e8400-e29b-41d4-a716-446655440002', icon_url: null, sort_order: 3, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440204', name: 'Automotive Tools', slug: 'automotive-tools', description: 'Car jacks, tire tools, diagnostic equipment', parent_id: '550e8400-e29b-41d4-a716-446655440002', icon_url: null, sort_order: 4, is_active: true },
  { id: '550e8400-e29b-41d4-a716-446655440205', name: 'Yard & Garden Tools', slug: 'yard-garden-tools', description: 'Lawn mowers, trimmers, leaf blowers', parent_id: '550e8400-e29b-41d4-a716-446655440002', icon_url: null, sort_order: 5, is_active: true },

  // Add more categories as needed...
]

async function seedCategories() {
  try {
    console.log('Starting to seed categories...')
    
    // Insert categories in batches to avoid conflicts
    for (const category of categories) {
      const { data, error } = await supabase
        .from('categories')
        .upsert(category, { onConflict: 'id' })
      
      if (error) {
        console.error(`Error inserting category ${category.name}:`, error)
      } else {
        console.log(`✓ Inserted category: ${category.name}`)
      }
    }
    
    console.log('Categories seeded successfully!')
  } catch (error) {
    console.error('Error seeding categories:', error)
  }
}

seedCategories()