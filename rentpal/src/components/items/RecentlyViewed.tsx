'use client'

import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import Link from 'next/link'
import FavoriteButton from '@/components/favorites/FavoriteButton'
import Image from 'next/image'

interface RecentlyViewedProps {
  className?: string
  maxItems?: number
}

export default function RecentlyViewed({ className = "", maxItems = 6 }: RecentlyViewedProps) {
  const { recentlyViewed, removeFromRecentlyViewed, clearRecentlyViewed } = useRecentlyViewed()

  const displayItems = recentlyViewed.slice(0, maxItems)

  if (displayItems.length === 0) {
    return null
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Recently Viewed</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {recentlyViewed.length} item{recentlyViewed.length !== 1 ? 's' : ''}
          </span>
          {recentlyViewed.length > 0 && (
            <button
              onClick={clearRecentlyViewed}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {displayItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden group">
            <div className="relative">
              <Link href={`/items/${item.id}`}>
                {item.images && item.images.length > 0 ? (
                  <Image
                    src={item.images[0].image_url}
                    alt={item.title}
                    width={300}
                    height={128}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </Link>
              
              {/* Actions */}
              <div className="absolute top-2 right-2 flex space-x-1">
                <FavoriteButton
                  itemId={item.id}
                  initialIsFavorited={item.is_favorited}
                  size="sm"
                />
                <button
                  onClick={() => removeFromRecentlyViewed(item.id)}
                  className="w-6 h-6 p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                  title="Remove from recently viewed"
                >
                  <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-3">
              <Link href={`/items/${item.id}`}>
                <h3 className="font-medium text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
              </Link>
              
              <p className="text-xs text-gray-500 mt-1">{item.category?.name}</p>
              
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="font-bold text-gray-900 text-sm">
                    {formatPrice(item.daily_rate)}
                  </span>
                  <span className="text-xs text-gray-500">/day</span>
                </div>
                
                {item.rating > 0 && (
                  <div className="flex items-center">
                    <svg className="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-xs text-gray-600">{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {recentlyViewed.length > maxItems && (
        <div className="text-center mt-4">
          <Link
            href="/profile/history"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View all {recentlyViewed.length} recently viewed items
          </Link>
        </div>
      )}
    </div>
  )
}