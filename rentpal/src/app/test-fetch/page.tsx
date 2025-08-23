'use client'

import { useState } from 'react'

export default function TestFetchPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testFetch = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing fetch to /api/categories...')
      const response = await fetch('/api/categories')
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      const data = await response.json()
      console.log('Response data:', data)
      
      setResult(data)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Fetch</h1>
          
          <button
            onClick={testFetch}
            disabled={loading}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Fetch Categories'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
              Error: {error}
            </div>
          )}

          {result && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">Result:</h2>
              <div className="bg-gray-100 p-4 rounded">
                <p><strong>Success:</strong> {result.success ? 'Yes' : 'No'}</p>
                <p><strong>Count:</strong> {result.count}</p>
                <p><strong>Categories Length:</strong> {result.categories?.length || 0}</p>
                {result.categories && result.categories.length > 0 && (
                  <div className="mt-2">
                    <p><strong>First Category:</strong> {result.categories[0].name}</p>
                    <p><strong>Sample Categories:</strong></p>
                    <ul className="list-disc list-inside">
                      {result.categories.slice(0, 5).map((cat: any) => (
                        <li key={cat.id}>{cat.name} (Parent: {cat.parent_id || 'None'})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}