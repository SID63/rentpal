'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function SeedPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { user } = useAuth()

  const seedDatabase = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      // Get categories data from API
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (!result.success) {
        setMessage(`✗ Error: ${result.error}`)
        return
      }
      
      // Insert categories using client-side Supabase
      let successCount = 0
      let errorCount = 0
      
      for (const category of result.categories) {
        const { error } = await supabase
          .from('categories')
          .upsert(category, { onConflict: 'id' })
        
        if (error) {
          console.error(`Error inserting category ${category.name}:`, error)
          errorCount++
        } else {
          successCount++
        }
      }
      
      setMessage(`✓ Seeding completed! ${successCount} categories added successfully. ${errorCount > 0 ? `${errorCount} errors.` : ''}`)
      
    } catch (error) {
      setMessage(`✗ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    if (!user) {
      setMessage('✗ Please log in first')
      return
    }

    setLoading(true)
    setMessage('')
    
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (existingProfile) {
        setMessage('✓ Profile already exists')
        return
      }
      
      // Get profile data from API
      const response = await fetch('/api/profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0]
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        setMessage(`✗ Error: ${result.error}`)
        return
      }
      
      // Create profile using client-side Supabase
      const { data, error } = await supabase
        .from('profiles')
        .insert(result.profileData)
        .select()
        .single()
      
      if (error) {
        console.error('Error creating profile:', error)
        setMessage(`✗ Error creating profile: ${error.message}`)
      } else {
        setMessage('✓ Profile created successfully!')
      }
      
    } catch (error) {
      setMessage(`✗ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Setup</h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Seed Categories</h2>
              <p className="text-gray-600 mb-4">
                This will populate the database with initial categories for items.
              </p>
              <button
                onClick={seedDatabase}
                disabled={loading}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Seeding...' : 'Seed Categories'}
              </button>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Create Profile</h2>
              <p className="text-gray-600 mb-4">
                This will create a profile for the current user if one doesn't exist.
              </p>
              <button
                onClick={createProfile}
                disabled={loading || !user}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Profile'}
              </button>
              {!user && (
                <p className="text-red-600 text-sm mt-2">Please log in first</p>
              )}
            </div>

            {message && (
              <div className={`p-4 rounded-md ${
                message.startsWith('✓') 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Instructions:</h3>
              <ol className="text-sm text-yellow-700 space-y-1">
                <li>1. First, click "Seed Categories" to populate the categories table</li>
                <li>2. Then, click "Create Profile" to create your user profile</li>
                <li>3. After both are complete, the edit profile page and item creation should work</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}