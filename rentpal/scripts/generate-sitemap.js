#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

/**
 * Generate sitemap.xml for SEO
 */

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rentpal.com'

// Static pages
const staticPages = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/search', priority: 0.8, changefreq: 'daily' },
  { url: '/categories', priority: 0.8, changefreq: 'weekly' },
  { url: '/how-it-works', priority: 0.6, changefreq: 'monthly' },
  { url: '/safety', priority: 0.6, changefreq: 'monthly' },
  { url: '/terms', priority: 0.3, changefreq: 'yearly' },
  { url: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { url: '/contact', priority: 0.5, changefreq: 'monthly' },
  { url: '/about', priority: 0.5, changefreq: 'monthly' },
]

// Generate XML for a single URL
const generateUrlXml = (url, lastmod, changefreq = 'weekly', priority = 0.5) => {
  return `  <url>
    <loc>${siteUrl}${url}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

// Generate sitemap XML
const generateSitemap = (urls) => {
  const urlsXml = urls.map(page => 
    generateUrlXml(page.url, page.lastmod, page.changefreq, page.priority)
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`
}

// Generate sitemap index
const generateSitemapIndex = (sitemaps) => {
  const sitemapsXml = sitemaps.map(sitemap => `  <sitemap>
    <loc>${siteUrl}/${sitemap.filename}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapsXml}
</sitemapindex>`
}

// Mock function to get dynamic data
// In a real app, this would fetch from your database
const getDynamicData = async () => {
  // This would typically be database queries
  return {
    items: [
      { id: '1', title: 'Power Drill', updatedAt: '2024-01-15T00:00:00Z' },
      { id: '2', title: 'Lawn Mower', updatedAt: '2024-01-14T00:00:00Z' },
      { id: '3', title: 'Camera Lens', updatedAt: '2024-01-13T00:00:00Z' },
    ],
    categories: [
      { slug: 'tools', updatedAt: '2024-01-10T00:00:00Z' },
      { slug: 'electronics', updatedAt: '2024-01-10T00:00:00Z' },
      { slug: 'sports', updatedAt: '2024-01-10T00:00:00Z' },
    ],
    users: [
      { id: '1', name: 'John Doe', updatedAt: '2024-01-12T00:00:00Z' },
      { id: '2', name: 'Jane Smith', updatedAt: '2024-01-11T00:00:00Z' },
    ]
  }
}

// Generate SEO-friendly URLs
const generateSeoUrl = {
  item: (id, title) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `/items/${id}/${slug}`
  },
  category: (slug) => `/categories/${slug}`,
  user: (id, name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `/users/${id}/${slug}`
  }
}

// Main function
const main = async () => {
  try {
    console.log('🗺️  Generating sitemaps...')

    // Get dynamic data
    const data = await getDynamicData()

    // Generate static sitemap
    const staticSitemap = generateSitemap(staticPages)
    
    // Generate items sitemap
    const itemPages = data.items.map(item => ({
      url: generateSeoUrl.item(item.id, item.title),
      lastmod: item.updatedAt,
      changefreq: 'weekly',
      priority: 0.7
    }))
    const itemsSitemap = generateSitemap(itemPages)

    // Generate categories sitemap
    const categoryPages = data.categories.map(category => ({
      url: generateSeoUrl.category(category.slug),
      lastmod: category.updatedAt,
      changefreq: 'weekly',
      priority: 0.6
    }))
    const categoriesSitemap = generateSitemap(categoryPages)

    // Generate users sitemap
    const userPages = data.users.map(user => ({
      url: generateSeoUrl.user(user.id, user.name),
      lastmod: user.updatedAt,
      changefreq: 'monthly',
      priority: 0.4
    }))
    const usersSitemap = generateSitemap(userPages)

    // Create public directory if it doesn't exist
    const publicDir = path.join(process.cwd(), 'public')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    // Write sitemap files
    const currentDate = new Date().toISOString()
    
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), staticSitemap)
    fs.writeFileSync(path.join(publicDir, 'sitemap-items.xml'), itemsSitemap)
    fs.writeFileSync(path.join(publicDir, 'sitemap-categories.xml'), categoriesSitemap)
    fs.writeFileSync(path.join(publicDir, 'sitemap-users.xml'), usersSitemap)

    // Generate sitemap index
    const sitemapIndex = generateSitemapIndex([
      { filename: 'sitemap.xml', lastmod: currentDate },
      { filename: 'sitemap-items.xml', lastmod: currentDate },
      { filename: 'sitemap-categories.xml', lastmod: currentDate },
      { filename: 'sitemap-users.xml', lastmod: currentDate },
    ])

    fs.writeFileSync(path.join(publicDir, 'sitemap-index.xml'), sitemapIndex)

    // Generate robots.txt
    const robotsTxt = `User-agent: *
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

Sitemap: ${siteUrl}/sitemap-index.xml
Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/sitemap-items.xml
Sitemap: ${siteUrl}/sitemap-categories.xml
Sitemap: ${siteUrl}/sitemap-users.xml

# Crawl delay for respectful crawling
Crawl-delay: 1`

    fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt)

    console.log('✅ Sitemaps generated successfully!')
    console.log(`📊 Generated sitemaps:`)
    console.log(`   - Static pages: ${staticPages.length} URLs`)
    console.log(`   - Items: ${itemPages.length} URLs`)
    console.log(`   - Categories: ${categoryPages.length} URLs`)
    console.log(`   - Users: ${userPages.length} URLs`)
    console.log(`   - Total: ${staticPages.length + itemPages.length + categoryPages.length + userPages.length} URLs`)

  } catch (error) {
    console.error('❌ Error generating sitemaps:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = {
  generateSitemap,
  generateSitemapIndex,
  generateSeoUrl,
  main
}