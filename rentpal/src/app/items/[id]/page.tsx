import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import ItemDetails from '@/components/items/ItemDetails'
import { ProductSEO } from '@/components/SEO'

// Prevent Next from trying to prerender/collect data at build time
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Basic SSR metadata generation for product page
  try {
    const { itemService } = await import('@/lib/database')
    const { id } = await params
    const item = await itemService.getItemById(id)
    if (!item) return pageMetadata.item({
      title: 'Item', description: 'Item not found', category: 'item', dailyRate: 0, location: { city: '', state: '' }
    })
    return pageMetadata.item({
      title: item.title,
      description: item.description || '',
      category: item.category?.name || 'item',
      dailyRate: item.daily_rate,
      location: { city: item.location_city || '', state: item.location_state || '' }
    })
  } catch {
    return pageMetadata.item({
      title: 'Item', description: 'Item details', category: 'item', dailyRate: 0, location: { city: '', state: '' }
    })
  }
}

export default async function Page({ params }: Props) {
  const { itemService } = await import('@/lib/database')
  const { id } = await params
  const item = await itemService.getItemById(id)
  if (!item) return null
  const product = {
    id: item.id,
    title: item.title,
    description: item.description || '',
    images: (item.images || []).map((i) => i.image_url),
    dailyRate: item.daily_rate,
    condition: 'Used',
    category: item.category?.name || 'item',
    location: { city: item.location_city || '', state: item.location_state || '' },
    owner: { name: item.owner?.full_name || 'Owner', rating: item.owner?.rating || 0, reviewCount: item.owner?.total_reviews || 0 },
    rating: item.rating,
    reviewCount: item.total_reviews,
  }
  return (
    <>
      <ProductSEO item={product} />
      {/* Hydrate client component */}
      <ItemDetails item={item} />
    </>
  )
}