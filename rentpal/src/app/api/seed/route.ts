import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Return the categories data for client-side seeding
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
    
    return NextResponse.json({ 
      success: true, 
      categories: categories
    })
    
  } catch (error) {
    console.error('Error getting seed data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get seed data' },
      { status: 500 }
    )
  }
}