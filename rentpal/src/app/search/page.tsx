// Force this route to be dynamic to avoid static/dynamic switching in dev
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Suspense } from 'react'
import SearchPageClient from './SearchPageClient'

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SearchPageClient />
    </Suspense>
  )
}