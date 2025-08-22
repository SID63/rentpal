import CategoryGrid from '@/components/categories/CategoryGrid'

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Browse Categories
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover items to rent from our community. From electronics to outdoor gear, 
            find exactly what you need for your next project or adventure.
          </p>
        </div>

        {/* Category Grid */}
        <CategoryGrid 
          showSubcategories={true}
          linkToSearch={true}
          className="max-w-6xl mx-auto"
        />

        {/* Call to Action */}
        <div className="text-center mt-12 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="text-gray-600 mb-6">
            Try our search feature or browse all available items in your area.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/search"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Search All Items
            </a>
            <a
              href="/items/create"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              List Your Item
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}