'use client'

import { useSimpleCategories } from '@/hooks/useSimpleCategories'

export default function TestCategoriesPage() {
  const { categories, loading, error } = useSimpleCategories()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories Test</h1>
          
          <div className="space-y-4">
            <div>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
              <p><strong>Categories Count:</strong> {categories.length}</p>
            </div>

            {categories.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Categories:</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <div key={category.id} className="p-2 border rounded">
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-gray-600">{category.description}</div>
                      <div className="text-xs text-gray-400">
                        Parent: {category.parent_id || 'None'} | Sort: {category.sort_order}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && categories.length === 0 && !error && (
              <div className="text-yellow-600">
                No categories found. The database might be empty.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}