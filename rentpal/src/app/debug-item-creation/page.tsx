'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function DebugItemCreationPage() {
  const [profile, setProfile] = useState<any>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      checkProfile()
    }
  }, [user])

  const checkProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        setProfileError(error.message)
      } else {
        setProfile(data)
      }
    } catch (err) {
      setProfileError(String(err))
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
        setProfileError(error.message)
      } else {
        setProfile(data)
        setProfileError(null)
      }
    } catch (err) {
      setProfileError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const testItemCreation = async () => {
    if (!user) return

    setLoading(true)
    setTestResult(null)

    try {
      // Test creating a simple item
      const testItem = {
        owner_id: user.id,
        category_id: '550e8400-e29b-41d4-a716-446655440001', // Electronics
        title: 'Test Item',
        description: 'This is a test item to check if item creation works properly.',
        daily_rate: 25.00,
        security_deposit: 50.00,
        min_rental_duration: 24,
        location_address: '123 Test St',
        location_city: 'Test City',
        location_state: 'CA',
        location_zip: '12345',
        delivery_available: false,
        delivery_fee: 0,
        delivery_radius: 0,
        status: 'active'
      }

      const { data, error } = await supabase
        .from('items')
        .insert(testItem)
        .select()
        .single()

      if (error) {
        setTestResult({ success: false, error: error.message, details: error })
      } else {
        setTestResult({ success: true, item: data })
      }
    } catch (err) {
      setTestResult({ success: false, error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Debug Item Creation</h1>
          
          <div className="space-y-6">
            {/* User Info */}
            <div>
              <h2 className="text-lg font-semibold mb-2">User Info</h2>
              <div className="bg-gray-100 p-4 rounded">
                <p><strong>Logged in:</strong> {user ? 'Yes' : 'No'}</p>
                {user && (
                  <>
                    <p><strong>User ID:</strong> {user.id}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                  </>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Profile Status</h2>
              <div className="bg-gray-100 p-4 rounded">
                {profileError ? (
                  <div className="text-red-600">
                    <p><strong>Profile Error:</strong> {profileError}</p>
                    <button
                      onClick={createProfile}
                      disabled={loading}
                      className="mt-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Profile'}
                    </button>
                  </div>
                ) : profile ? (
                  <div className="text-green-600">
                    <p><strong>Profile exists:</strong> Yes</p>
                    <p><strong>Name:</strong> {profile.full_name}</p>
                    <p><strong>Address:</strong> {profile.address}, {profile.city}, {profile.state}</p>
                  </div>
                ) : (
                  <p>Checking profile...</p>
                )}
              </div>
            </div>

            {/* Test Item Creation */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Test Item Creation</h2>
              <button
                onClick={testItemCreation}
                disabled={loading || !user || !profile}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Create Item'}
              </button>

              {testResult && (
                <div className="mt-4 p-4 rounded bg-gray-100">
                  {testResult.success ? (
                    <div className="text-green-600">
                      <p><strong>Success!</strong> Item created with ID: {testResult.item.id}</p>
                      <p><strong>Title:</strong> {testResult.item.title}</p>
                    </div>
                  ) : (
                    <div className="text-red-600">
                      <p><strong>Failed:</strong> {testResult.error}</p>
                      {testResult.details && (
                        <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
                          {JSON.stringify(testResult.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Instructions:</h3>
              <ol className="text-sm text-yellow-700 space-y-1">
                <li>1. Make sure you're logged in</li>
                <li>2. Create a profile if you don't have one</li>
                <li>3. Test item creation to see if it works</li>
                <li>4. If it works here but not in the form, the issue is with the form validation or image upload</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}