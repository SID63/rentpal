const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const categories = [
    // Main categories
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Electronics', slug: 'electronics', description: 'Cameras, audio equipment, gaming consoles, and more', parent_id: null, icon_url: '/icons/electronics.svg', sort_order: 1, is_active: true },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Tools & Equipment', slug: 'tools-equipment', description: 'Power tools, hand tools, construction equipment', parent_id: null, icon_url: '/icons/tools.svg', sort_order: 2, is_active: true },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Sports & Recreation', slug: 'sports-recreation', description: 'Sports equipment, outdoor gear, fitness equipment', parent_id: null, icon_url: '/icons/sports.svg', sort_order: 3, is_active: true },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Transportation', slug: 'transportation', description: 'Bikes, scooters, car accessories', parent_id: null, icon_url: '/icons/transportation.svg', sort_order: 4, is_active: true },
    { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Home & Garden', slug: 'home-garden', description: 'Appliances, furniture, gardening tools', parent_id: null, icon_url: '/icons/home.svg', sort_order: 5, is_active: true },
    { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Events & Parties', slug: 'events-parties', description: 'Party supplies, decorations, event equipment', parent_id: null, icon_url: '/icons/events.svg', sort_order: 6, is_active: true },

    // Electronics subcategories
    { id: '550e8400-e29b-41d4-a716-446655440101', name: 'Cameras & Photography', slug: 'cameras-photography', description: 'DSLR cameras, lenses, tripods, lighting equipment', parent_id: '550e8400-e29b-41d4-a716-446655440001', icon_url: null, sort_order: 1, is_active: true },
    { id: '550e8400-e29b-41d4-a716-446655440102', name: 'Audio Equipment', slug: 'audio-equipment', description: 'Speakers, microphones, headphones, mixing boards', parent_id: '550e8400-e29b-41d4-a716-446655440001', icon_url: null, sort_order: 2, is_active: true },
    { id: '550e8400-e29b-41d4-a716-446655440103', name: 'Gaming Consoles', slug: 'gaming-consoles', description: 'PlayStation, Xbox, Nintendo, gaming accessories', parent_id: '550e8400-e29b-41d4-a716-446655440001', icon_url: null, sort_order: 3, is_active: true },

    // Tools subcategories
    { id: '550e8400-e29b-41d4-a716-446655440201', name: 'Power Tools', slug: 'power-tools', description: 'Drills, saws, sanders, grinders', parent_id: '550e8400-e29b-41d4-a716-446655440002', icon_url: null, sort_order: 1, is_active: true },
    { id: '550e8400-e29b-41d4-a716-446655440202', name: 'Hand Tools', slug: 'hand-tools', description: 'Wrenches, screwdrivers, hammers, measuring tools', parent_id: '550e8400-e29b-41d4-a716-446655440002', icon_url: null, sort_order: 2, is_active: true },

    // Sports subcategories
    { id: '550e8400-e29b-41d4-a716-446655440301', name: 'Outdoor Adventure', slug: 'outdoor-adventure', description: 'Camping gear, hiking equipment, climbing gear', parent_id: '550e8400-e29b-41d4-a716-446655440003', icon_url: null, sort_order: 1, is_active: true },
    { id: '550e8400-e29b-41d4-a716-446655440302', name: 'Water Sports', slug: 'water-sports', description: 'Kayaks, paddleboards, snorkeling gear', parent_id: '550e8400-e29b-41d4-a716-446655440003', icon_url: null, sort_order: 2, is_active: true }
]

async function seedCategories() {
    console.log('Seeding categories...')

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
}

async function checkAndCreateProfile() {
    console.log('Checking for user profile...')

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        console.log('No authenticated user found. Please log in first.')
        return
    }

    console.log(`Found user: ${user.email}`)

    // Check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (existingProfile) {
        console.log('Profile already exists')
        return
    }

    // Create profile
    const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        phone: null,
        address: '123 Main St',
        city: 'Sample City',
        state: 'CA',
        zip_code: '12345',
        bio: null,
        verification_status: 'unverified',
        rating: 0,
        total_reviews: 0,
        latitude: null,
        longitude: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)

    if (error) {
        console.error('Error creating profile:', error)
    } else {
        console.log('✓ Created user profile')
    }
}

async function main() {
    try {
        await seedCategories()
        await checkAndCreateProfile()
        console.log('✓ Seeding completed successfully!')
    } catch (error) {
        console.error('Error during seeding:', error)
    }
}

main()