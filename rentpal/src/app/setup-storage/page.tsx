'use client'

import { useState } from 'react'

interface BucketResult {
  name: string
  status: 'created' | 'exists' | 'error'
  error?: string
}

interface PolicyResult {
  bucket: string
  policy: string
  status: 'created' | 'exists' | 'error'
  error?: string
}

interface StorageSetupResult {
  success: boolean
  message: string
  results: BucketResult[]
  policies: PolicyResult[]
}

export default function SetupStoragePage() {
  const [result, setResult] = useState<StorageSetupResult | null>(null)
  const [loading, setLoading] = useState(false)

  const setupStorage = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/setup-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: String(error),
        results: [],
        policies: []
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Setup Storage Buckets & RLS Policies</h1>
          
          <div className="space-y-6">
            <div>
              <p className="text-gray-600 mb-4">
                This will create the necessary storage buckets and verify RLS policies in your Supabase project for secure image uploads.
              </p>
              
              <button
                onClick={setupStorage}
                disabled={loading}
                className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Setup Storage & Policies'}
              </button>
            </div>

            {result && (
              <div className={`p-4 rounded-md ${
                result.success 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <h3 className="font-medium mb-2">
                  {result.success ? 'Setup Complete!' : 'Setup Issues Found'}
                </h3>
                <p className="mb-4">{result.message}</p>
                
                {result.results && result.results.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Storage Buckets:</h4>
                    <ul className="space-y-1">
                      {result.results.map((bucket, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            bucket.status === 'created' ? 'bg-green-500' :
                            bucket.status === 'exists' ? 'bg-blue-500' :
                            'bg-red-500'
                          }`}></span>
                          <span className="font-mono text-sm">{bucket.name}</span>
                          <span className="text-sm">
                            {bucket.status === 'created' ? '(created)' :
                             bucket.status === 'exists' ? '(already exists)' :
                             `(error: ${bucket.error})`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.policies && result.policies.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">RLS Policies:</h4>
                    <div className="space-y-2">
                      {['item-images', 'avatars'].map(bucketName => {
                        const bucketPolicies = result.policies.filter(p => p.bucket === bucketName)
                        const hasErrors = bucketPolicies.some(p => p.status === 'error')
                        
                        return (
                          <div key={bucketName} className="border-l-2 border-gray-200 pl-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`inline-block w-2 h-2 rounded-full ${
                                hasErrors ? 'bg-red-500' : 'bg-green-500'
                              }`}></span>
                              <span className="font-mono text-sm font-medium">{bucketName}</span>
                            </div>
                            <ul className="text-xs space-y-1 ml-4">
                              {bucketPolicies.map((policy, idx) => (
                                <li key={idx} className="flex items-center space-x-2">
                                  <span className={`inline-block w-1 h-1 rounded-full ${
                                    policy.status === 'exists' ? 'bg-blue-400' :
                                    policy.status === 'created' ? 'bg-green-400' :
                                    'bg-red-400'
                                  }`}></span>
                                  <span>{policy.policy}</span>
                                  {policy.status === 'error' && policy.error && (
                                    <span className="text-red-600">({policy.error})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">What this does:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Creates an "item-images" bucket for item photos (5MB limit)</li>
                <li>• Creates an "avatars" bucket for profile pictures (2MB limit)</li>
                <li>• Verifies RLS policies for secure access control</li>
                <li>• Allows public read access and authenticated user uploads</li>
              </ul>
            </div>

            {result && result.policies && result.policies.some(p => p.status === 'error') && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-md">
                <h3 className="text-sm font-medium text-orange-800 mb-2">Manual Setup Required:</h3>
                <p className="text-sm text-orange-700 mb-2">
                  RLS policies need to be created manually. Please run the following SQL in your Supabase SQL editor:
                </p>
                <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
                  <div>-- Run this SQL in your Supabase project:</div>
                  <div>-- Go to SQL Editor in your Supabase dashboard</div>
                  <div>-- Copy and paste the contents of supabase/storage_policies.sql</div>
                  <div>-- Or run: psql -f supabase/storage_policies.sql</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}