import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { profileImageService } from '@/lib/profile-image-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = profileImageService.validateProfileImage(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Upload image
    const result = await profileImageService.uploadProfileImage(file, user.id)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      message: 'Profile image uploaded successfully'
    })

  } catch (error) {
    console.error('Profile image upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Remove profile image
    const result = await profileImageService.removeProfileImage(user.id)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to remove image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profile image removed successfully'
    })

  } catch (error) {
    console.error('Profile image removal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'cleanup') {
      // Cleanup orphaned images for the current user
      const result = await profileImageService.cleanupOrphanedImages(user.id)
      
      return NextResponse.json({
        success: true,
        cleaned: result.cleaned,
        errors: result.errors,
        message: `Cleaned up ${result.cleaned} orphaned images`
      })
    }

    if (action === 'default') {
      // Get default avatar URL
      const defaultUrl = profileImageService.getDefaultAvatarUrl(
        user.id,
        user.user_metadata?.full_name
      )
      
      return NextResponse.json({
        success: true,
        url: defaultUrl
      })
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Profile image API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}