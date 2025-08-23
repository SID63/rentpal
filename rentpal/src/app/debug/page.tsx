'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/hooks/useDatabase'

export default function DebugPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { categories: hookCategories, loading: hookLoading, error: hookError } = useCategories()

  const testDirectQuery = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Testing direct category query...')
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      
      if (error) {
        console.error('Direct query error:', error)
        setError(`Direct query error: ${error.message}`)
      } else {
        console.log('Direct query success:', data)
        setCategories(data || [])
      }
    } catch (err) {
      console.error('Exception:', err)
      setError(`Exception: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testProfileQuery = async () => {
    if (!user) return
    
    try {
      console.log('Testing profile query for user:', user.id)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error('Profile query error:', error)
      } else {
        console.log('Profile query success:', data)
        setProfile(data)
      }
    } catch (err) {
      console.error('Profile exception:', err)
    }
  }

  const seedCategories = async () => {
    setLoading(true)
    setError(null)
    
    const testCategories = [
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Electronics', slug: 'electronics', description: 'Cameras, audio equipment, gaming consoles, and more', parent_id: null, icon_url: '/icons/electronics.svg', sort_order: 1, is_active: true },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Tools & Equipment', slug: 'tools-equipment', description: 'Power tools, hand tools, construction equipment', parent_id: null, icon_url: '/icons/tools.svg', sort_order: 2, is_active: true },
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Sports & Recreation', slug: 'sports-recreation', description: 'Sports equipment, outdoor gear, fitness equipment', parent_id: null, icon_url: '/icons/sports.svg', sort_order: 3, is_active: true }
    ]
    
    try {
      let successCount = 0
      for (const category of testCategories) {
        const { error } = await supabase
          .from('categories')
          .upsert(category, { onConflict: 'id' })
        
        if (error) {
          console.error(`Error inserting ${category.name}:`, error)
        } else {
          successCount++
          console.log(`✓ Inserted ${category.name}`)
        }
      }
      
      setError(`Seeded ${successCount}/${testCategories.length} categories`)
      await testDirectQuery()
    } catch (err) {
      setError(`Seeding error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
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
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single()
      
      if (error) {
        console.error('Profile creation error:', error)
        setError(`Profile error: ${error.message}`)
      } else {
        console.log('Profile created:', data)
        setProfile(data)
        setError('Profile created successfully!')
      }
    } catch (err) {
      setError(`Profile exception: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      testProfileQuery()
    }
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Debug</h1>
          
          <div className="space-y-6">
            {/* User Info */}
            <div>
              <h2 className="text-lg font-semibold mb-2">User Info</h2>
              <div className="bg-gray-100 p-4 rounded">
                <pre>{JSON.stringify(user, null, 2)}</pre>
              </div>
            </div>

            {/* Profile Info */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Profile Info</h2>
              <div className="bg-gray-100 p-4 rounded">
                <pre>{JSON.stringify(profile, null, 2)}</pre>
              </div>
              <button
                onClick={createProfile}
                disabled={loading || !user}
                className="mt-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Create/Update Profile
              </button>
            </div>

            {/* Categories from Hook */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Categories from Hook</h2>
              <p>Loading: {hookLoading ? 'Yes' : 'No'}</p>
              <p>Error: {hookError || 'None'}</p>
              <p>Count: {hookCategories.length}</p>
              <div className="bg-gray-100 p-4 rounded max-h-40 overflow-y-auto">
                <pre>{JSON.stringify(hookCategories, null, 2)}</pre>
              </div>
            </div>

            {/* Direct Categories Query */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Direct Categories Query</h2>
              <button
                onClick={testDirectQuery}
                disabled={loading}
                className="mb-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Test Direct Query
              </button>
              <button
                onClick={seedCategories}
                disabled={loading}
                className="mb-2 ml-2 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                Seed Categories
              </button>
              <p>Count: {categories.length}</p>
              <div className="bg-gray-100 p-4 rounded max-h-40 overflow-y-auto">
                <pre>{JSON.stringify(categories, null, 2)}</pre>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className={`p-4 rounded-md ${
                error.includes('successfully') || error.includes('Seeded')
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}