import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('API: Fetching categories...')
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('API: Categories fetch error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        categories: []
      })
    }

    console.log('API: Categories fetched successfully:', data?.length || 0)
    
    return NextResponse.json({
      success: true,
      categories: data || [],
      count: data?.length || 0
    })
    
  } catch (error) {
    console.error('API: Exception:', error)
    return NextResponse.json({
      success: false,
      error: String(error),
      categories: []
    })
  }
}