import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing database connection...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // Test basic connection
    const { count, error } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      })
    }
    
    console.log('Database connection successful, count:', count)
    
    // Try to get actual categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .limit(5)
    
    return NextResponse.json({
      success: true,
      connection: 'OK',
      categoryCount: count || 0,
      sampleCategories: categories || [],
      categoryError: catError?.message || null
    })
    
  } catch (error) {
    console.error('Exception:', error)
    return NextResponse.json({
      success: false,
      error: 'Exception occurred',
      details: String(error)
    })
  }
}