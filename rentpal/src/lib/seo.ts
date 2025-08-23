import { Metadata } from 'next'

/**
 * SEO configuration and utilities
 */

export const siteConfig = {
  name: 'RentPal',
  description: 'Rent and share items with your community. Find tools, equipment, and more from trusted neighbors.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://rentpal.com',
  ogImage: '/images/og-image.jpg',
  twitterHandle: '@rentpal',
  keywords: [
    'rental marketplace',
    'peer-to-peer rental',
    'tool rental',
    'equipment sharing',
    'community sharing',
    'rent items',
    'share economy',
  ],
}

/**
 * Generate metadata for pages
 */
export const generateMetadata = (options: {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  noIndex?: boolean
}): Metadata => {
  const {
    title,
    description = siteConfig.description,
    keywords = siteConfig.keywords,
    image = siteConfig.ogImage,
    url,
    type = 'website',
    publishedTime,
    modifiedTime,
    authors,
    noIndex = false,
  } = options

  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name
  const fullUrl = url ? `${siteConfig.url}${url}` : siteConfig.url
  const fullImage = image.startsWith('http') ? image : `${siteConfig.url}${image}`

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: authors?.map(name => ({ name })),
    robots: noIndex ? 'noindex,nofollow' : 'index,follow',
    
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: siteConfig.name,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title || siteConfig.name,
        },
      ],
      type: type === 'product' ? 'website' : type,
      publishedTime,
      modifiedTime,
    },
    
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullImage],
      creator: siteConfig.twitterHandle,
      site: siteConfig.twitterHandle,
    },
    
    alternates: {
      canonical: fullUrl,
    },
  }
}

/**
 * Generate structured data (JSON-LD)
 */
export const generateStructuredData = {
  website: () => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }),

  organization: () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/images/logo.png`,
    sameAs: [
      // Add social media URLs
      'https://twitter.com/rentpal',
      'https://facebook.com/rentpal',
      'https://instagram.com/rentpal',
    ],
  }),

  product: (item: {
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
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${siteConfig.url}/items/${item.id}`,
    name: item.title,
    description: item.description,
    image: item.images.map(img => img.startsWith('http') ? img : `${siteConfig.url}${img}`),
    category: item.category,
    brand: {
      '@type': 'Brand',
      name: siteConfig.name,
    },
    offers: {
      '@type': 'Offer',
      price: item.dailyRate,
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: item.dailyRate,
        priceCurrency: 'USD',
        unitText: 'DAY',
      },
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Person',
        name: item.owner.name,
      },
      areaServed: {
        '@type': 'City',
        name: `${item.location.city}, ${item.location.state}`,
      },
    },
    aggregateRating: item.rating && item.reviewCount ? {
      '@type': 'AggregateRating',
      ratingValue: item.rating,
      reviewCount: item.reviewCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Condition',
        value: item.condition,
      },
    ],
  }),

  review: (review: {
    id: string
    rating: number
    comment: string
    author: string
    datePublished: string
    itemId: string
    itemName: string
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    '@id': `${siteConfig.url}/reviews/${review.id}`,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.comment,
    author: {
      '@type': 'Person',
      name: review.author,
    },
    datePublished: review.datePublished,
    itemReviewed: {
      '@type': 'Product',
      '@id': `${siteConfig.url}/items/${review.itemId}`,
      name: review.itemName,
    },
  }),

  breadcrumb: (items: Array<{ name: string; url: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  }),

  searchResults: (query: string, results: Array<{
    id: string
    title: string
    description: string
    url: string
  }>) => ({
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: results.length,
      itemListElement: results.map((result, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteConfig.url}${result.url}`,
        name: result.title,
        description: result.description,
      })),
    },
    about: {
      '@type': 'Thing',
      name: query,
    },
  }),
}

/**
 * SEO-friendly URL generation
 */
export const generateSeoUrl = {
  item: (id: string, title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `/items/${id}/${slug}`
  },

  category: (slug: string) => `/categories/${slug}`,

  search: (query: string, filters?: Record<string, unknown>) => {
    const params = new URLSearchParams()
    params.set('q', query)
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.set(key, String(value))
        }
      })
    }
    
    return `/search?${params.toString()}`
  },

  user: (id: string, name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `/users/${id}/${slug}`
  },
}

/**
 * Meta tags for specific pages
 */
export const pageMetadata = {
  home: () => generateMetadata({
    title: 'Rent and Share Items with Your Community',
    description: 'Discover thousands of items available for rent in your area. From tools to electronics, find what you need or earn money by sharing your items.',
    keywords: [...siteConfig.keywords, 'home page', 'rental platform'],
  }),

  search: (query?: string, resultCount?: number) => generateMetadata({
    title: query ? `Search Results for "${query}"` : 'Search Items',
    description: query 
      ? `Found ${resultCount || 0} items matching "${query}". Rent tools, equipment, and more from trusted community members.`
      : 'Search thousands of items available for rent. Find tools, electronics, sports equipment, and more in your area.',
    keywords: [...siteConfig.keywords, 'search', query].filter(Boolean) as string[],
  }),

  item: (item: {
    title: string
    description: string
    category: string
    dailyRate: number
    location: { city: string; state: string }
  }) => generateMetadata({
    title: `Rent ${item.title} - $${item.dailyRate}/day`,
    description: `${item.description.substring(0, 150)}... Available for rent in ${item.location.city}, ${item.location.state}.`,
    keywords: [...siteConfig.keywords, item.category, item.title.split(' ')].flat(),
    type: 'product',
  }),

  category: (category: {
    name: string
    description: string
    itemCount: number
  }) => generateMetadata({
    title: `${category.name} for Rent`,
    description: `Browse ${category.itemCount} ${category.name.toLowerCase()} available for rent. ${category.description}`,
    keywords: [...siteConfig.keywords, category.name.toLowerCase(), 'category'],
  }),

  profile: (user: {
    name: string
    bio?: string
    itemCount: number
    rating: number
    reviewCount: number
  }) => generateMetadata({
    title: `${user.name}'s Profile`,
    description: `${user.bio || `${user.name} has ${user.itemCount} items for rent`}. Rating: ${user.rating}/5 (${user.reviewCount} reviews).`,
    keywords: [...siteConfig.keywords, 'user profile', user.name],
    type: 'article',
  }),

  auth: {
    login: () => generateMetadata({
      title: 'Sign In',
      description: 'Sign in to your RentPal account to start renting and sharing items with your community.',
      noIndex: true,
    }),

    register: () => generateMetadata({
      title: 'Create Account',
      description: 'Join RentPal to rent items from your community and earn money by sharing your own items.',
      noIndex: true,
    }),
  },

  dashboard: () => generateMetadata({
    title: 'Dashboard',
    description: 'Manage your rentals, bookings, and earnings on RentPal.',
    noIndex: true,
  }),
}

/**
 * Sitemap generation utilities
 */
export const generateSitemap = {
  static: () => [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/search', priority: 0.8, changefreq: 'daily' },
    { url: '/categories', priority: 0.8, changefreq: 'weekly' },
    { url: '/how-it-works', priority: 0.6, changefreq: 'monthly' },
    { url: '/safety', priority: 0.6, changefreq: 'monthly' },
    { url: '/terms', priority: 0.3, changefreq: 'yearly' },
    { url: '/privacy', priority: 0.3, changefreq: 'yearly' },
  ],

  dynamic: (data: {
    items: Array<{ id: string; title: string; updatedAt: string }>
    categories: Array<{ slug: string; updatedAt: string }>
    users: Array<{ id: string; name: string; updatedAt: string }>
  }) => [
    ...data.items.map(item => ({
      url: generateSeoUrl.item(item.id, item.title),
      priority: 0.7,
      changefreq: 'weekly' as const,
      lastmod: item.updatedAt,
    })),
    ...data.categories.map(category => ({
      url: generateSeoUrl.category(category.slug),
      priority: 0.6,
      changefreq: 'weekly' as const,
      lastmod: category.updatedAt,
    })),
    ...data.users.map(user => ({
      url: generateSeoUrl.user(user.id, user.name),
      priority: 0.4,
      changefreq: 'monthly' as const,
      lastmod: user.updatedAt,
    })),
  ],
}

/**
 * Robots.txt generation
 */
export const generateRobotsTxt = () => {
  const baseUrl = siteConfig.url
  
  return `User-agent: *
Allow: /

# Disallow admin and private pages
Disallow: /admin/
Disallow: /dashboard/
Disallow: /auth/
Disallow: /api/

# Disallow search result pages with parameters to avoid duplicate content
Disallow: /search?*

# Allow specific search pages
Allow: /search$

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-items.xml
Sitemap: ${baseUrl}/sitemap-categories.xml

# Crawl delay for respectful crawling
Crawl-delay: 1`
}