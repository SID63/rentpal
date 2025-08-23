import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json()
    
    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Return profile data for client-side creation
    const profileData = {
      id: userId,
      email: email,
      full_name: fullName || email.split('@')[0] || 'User',
      avatar_url: null,
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
    
    return NextResponse.json({ 
      success: true, 
      profileData: profileData
    })
    
  } catch (error) {
    console.error('Error preparing profile data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to prepare profile data' },
      { status: 500 }
    )
  }
}