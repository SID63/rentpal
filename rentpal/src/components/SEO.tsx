import Script from 'next/script'
import { generateStructuredData, generateMetadata } from '@/lib/seo'

import type { Metadata } from 'next'

/**
 * SEO component for adding structured data and meta tags
 */
interface SEOProps {
  title?: string
  description?: string
  keywords?: string[]
  structuredData?: Record<string, unknown>
  children?: React.ReactNode
}

export const SEO: React.FC<SEOProps> = ({ title, description, keywords, structuredData, children }) => {
  // Titles and meta should be handled via Next.js Metadata API in app/ router.
  // We only inject structured data here to avoid next/head usage warnings.
  const _meta: Metadata = generateMetadata({ title, description, keywords })
  return (
    <>
      {structuredData && (
        <Script id="seo-structured-data" type="application/ld+json">
          {JSON.stringify(structuredData)}
        </Script>
      )}
      {children}
    </>
  )
}

/**
 * Breadcrumb component with structured data
 */
interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const structuredData = generateStructuredData.breadcrumb(items)

  return (
    <>
      <SEO structuredData={structuredData} />
      <nav className={`flex ${className}`} aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          {items.map((item, index) => (
            <li key={index} className="inline-flex items-center">
              {index > 0 && (
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {index === items.length - 1 ? (
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                  {item.name}
                </span>
              ) : (
                <a
                  href={item.url}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
                >
                  {item.name}
                </a>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}

/**
 * Product structured data component for item pages
 */
interface ProductSEOProps {
  item: {
    id: string
    title: string
    description: string
    images: string[]
    dailyRate: number
    condition: string
    category: string
    location: {
      city: string
      state: string
    }
    owner: {
      name: string
      rating: number
      reviewCount: number
    }
    rating?: number
    reviewCount?: number
  }
}

export const ProductSEO: React.FC<ProductSEOProps> = ({ item }) => {
  const structuredData = generateStructuredData.product(item)

  return <SEO structuredData={structuredData} />
}

/**
 * Review structured data component
 */
interface ReviewSEOProps {
  review: {
    id: string
    rating: number
    comment: string
    author: string
    datePublished: string
    itemId: string
    itemName: string
  }
}

export const ReviewSEO: React.FC<ReviewSEOProps> = ({ review }) => {
  const structuredData = generateStructuredData.review(review)

  return <SEO structuredData={structuredData} />
}

/**
 * Search results structured data component
 */
interface SearchResultsSEOProps {
  query: string
  results: Array<{
    id: string
    title: string
    description: string
    url: string
  }>
}

export const SearchResultsSEO: React.FC<SearchResultsSEOProps> = ({ query, results }) => {
  const structuredData = generateStructuredData.searchResults(query, results)

  return <SEO structuredData={structuredData} />
}

/**
 * Organization structured data component (for layout)
 */
export const OrganizationSEO: React.FC = () => {
  const structuredData = generateStructuredData.organization()

  return <SEO structuredData={structuredData} />
}

/**
 * Website structured data component (for homepage)
 */
export const WebsiteSEO: React.FC = () => {
  const structuredData = generateStructuredData.website()

  return <SEO structuredData={structuredData} />
}

/**
 * FAQ structured data component
 */
interface FAQItem {
  question: string
  answer: string
}

interface FAQSEOProps {
  faqs: FAQItem[]
}

export const FAQSEO: React.FC<FAQSEOProps> = ({ faqs }) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return <SEO structuredData={structuredData} />
}

/**
 * Local business structured data component
 */
interface LocalBusinessSEOProps {
  business: {
    name: string
    description: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
    phone: string
    email: string
    website: string
    hours: Array<{
      day: string
      open: string
      close: string
    }>
    rating?: number
    reviewCount?: number
  }
}

export const LocalBusinessSEO: React.FC<LocalBusinessSEOProps> = ({ business }) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      postalCode: business.address.zipCode,
      addressCountry: business.address.country,
    },
    telephone: business.phone,
    email: business.email,
    url: business.website,
    openingHours: business.hours.map(hour => 
      `${hour.day} ${hour.open}-${hour.close}`
    ),
    aggregateRating: business.rating && business.reviewCount ? {
      '@type': 'AggregateRating',
      ratingValue: business.rating,
      reviewCount: business.reviewCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  }

  return <SEO structuredData={structuredData} />
}

/**
 * Article structured data component
 */
interface ArticleSEOProps {
  article: {
    title: string
    description: string
    author: string
    datePublished: string
    dateModified?: string
    image: string
    url: string
    wordCount?: number
  }
}

export const ArticleSEO: React.FC<ArticleSEOProps> = ({ article }) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    image: article.image,
    url: article.url,
    wordCount: article.wordCount,
    publisher: {
      '@type': 'Organization',
      name: 'RentPal',
      logo: {
        '@type': 'ImageObject',
        url: '/images/logo.png',
      },
    },
  }

  return <SEO structuredData={structuredData} />
}

/**
 * Video structured data component
 */
interface VideoSEOProps {
  video: {
    title: string
    description: string
    thumbnailUrl: string
    uploadDate: string
    duration: string // ISO 8601 duration format (e.g., "PT1M30S")
    contentUrl: string
    embedUrl?: string
  }
}

export const VideoSEO: React.FC<VideoSEOProps> = ({ video }) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    duration: video.duration,
    contentUrl: video.contentUrl,
    embedUrl: video.embedUrl,
  }

  return <SEO structuredData={structuredData} />
}

/**
 * Event structured data component
 */
interface EventSEOProps {
  event: {
    name: string
    description: string
    startDate: string
    endDate?: string
    location: {
      name: string
      address: string
      city: string
      state: string
      zipCode: string
    }
    organizer: string
    url: string
    image?: string
    price?: number
    currency?: string
  }
}

export const EventSEO: React.FC<EventSEOProps> = ({ event }) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    location: {
      '@type': 'Place',
      name: event.location.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location.address,
        addressLocality: event.location.city,
        addressRegion: event.location.state,
        postalCode: event.location.zipCode,
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer,
    },
    url: event.url,
    image: event.image,
    offers: event.price ? {
      '@type': 'Offer',
      price: event.price,
      priceCurrency: event.currency || 'USD',
    } : undefined,
  }

  return <SEO structuredData={structuredData} />
}