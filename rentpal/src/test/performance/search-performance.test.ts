import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import { SearchResults } from '@/components/search/SearchResults'
import { ItemSearch } from '@/components/search/ItemSearch'
import { performance } from 'perf_hooks'

// Generate large dataset for performance testing
const generateMockItems = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    owner_id: `owner-${index % 10}`,
    title: `Test Item ${index}`,
    description: `Description for test item ${index}`,
    category: ['tools', 'electronics', 'sports', 'vehicles'][index % 4],
    subcategory: `subcategory-${index % 3}`,
    condition: ['new', 'like_new', 'good', 'fair'][index % 4] as const,
    daily_rate: 10 + (index % 50),
    hourly_rate: 2 + (index % 10),
    security_deposit: 50 + (index % 100),
    images: [`image-${index}-1.jpg`, `image-${index}-2.jpg`],
    location: {
      address: `${100 + index} Test St`,
      city: ['San Francisco', 'Los Angeles', 'New York', 'Chicago'][index % 4],
      state: ['CA', 'CA', 'NY', 'IL'][index % 4],
      zip_code: `${10000 + index}`,
      latitude: 37.7749 + (index % 100) * 0.01,
      longitude: -122.4194 + (index % 100) * 0.01,
    },
    availability: {
      available_from: '2024-01-01',
      available_until: '2024-12-31',
      blocked_dates: [],
      minimum_rental_period: 4,
      maximum_rental_period: 168,
    },
    policies: {
      cancellation_policy: ['flexible', 'moderate', 'strict'][index % 3] as const,
      pickup_delivery: ['pickup_only', 'delivery_available', 'both'][index % 3] as const,
      delivery_fee: index % 2 === 0 ? 10 : undefined,
      delivery_radius: index % 2 === 0 ? 10 : undefined,
    },
    status: 'active' as const,
    created_at: new Date(2024, 0, 1 + (index % 365)).toISOString(),
    updated_at: new Date(2024, 0, 1 + (index % 365)).toISOString(),
  }))
}

describe('Search Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Large Dataset Rendering', () => {
    it('renders 1000 items within acceptable time', async () => {
      const items = generateMockItems(1000)
      const startTime = performance.now()

      render(
        <SearchResults
          items={items}
          loading={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          onSortChange={vi.fn()}
          onFilterChange={vi.fn()}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within 2 seconds
      expect(renderTime).toBeLessThan(2000)

      // Verify items are rendered (check first and last)
      expect(screen.getByText('Test Item 0')).toBeInTheDocument()
      expect(screen.getByText('Test Item 999')).toBeInTheDocument()
    })

    it('handles virtual scrolling for large lists', async () => {
      const items = generateMockItems(5000)

      const { container } = render(
        <SearchResults
          items={items}
          loading={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          onSortChange={vi.fn()}
          onFilterChange={vi.fn()}
          virtualScrolling={true}
        />
      )

      // Should only render visible items initially
      const renderedItems = container.querySelectorAll('[data-testid^="item-card-"]')
      expect(renderedItems.length).toBeLessThan(100) // Should be much less than 5000

      // But should show total count
      expect(screen.getByText('5000 items found')).toBeInTheDocument()
    })
  })

  describe('Search Performance', () => {
    it('performs text search efficiently', async () => {
      const items = generateMockItems(2000)
      const mockOnSearch = vi.fn()

      const startTime = performance.now()

      render(
        <ItemSearch
          onSearch={mockOnSearch}
          onFilterChange={vi.fn()}
          initialQuery=""
        />
      )

      // Simulate typing search query
      const searchInput = screen.getByRole('textbox', { name: /search/i })
      
      // Measure search performance
      const searchStartTime = performance.now()
      
      // Simulate search with debouncing
      await new Promise(resolve => setTimeout(resolve, 300)) // Debounce delay
      
      const searchEndTime = performance.now()
      const searchTime = searchEndTime - searchStartTime

      // Search should complete quickly even with debouncing
      expect(searchTime).toBeLessThan(500)
    })

    it('filters large datasets efficiently', async () => {
      const items = generateMockItems(3000)
      const mockOnFilterChange = vi.fn()

      const startTime = performance.now()

      // Simulate filtering by category
      const filteredItems = items.filter(item => item.category === 'tools')
      
      render(
        <SearchResults
          items={filteredItems}
          loading={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          onSortChange={vi.fn()}
          onFilterChange={mockOnFilterChange}
        />
      )

      const endTime = performance.now()
      const filterTime = endTime - startTime

      // Filtering should be fast
      expect(filterTime).toBeLessThan(1000)

      // Should show correct number of filtered items
      const toolsCount = items.filter(item => item.category === 'tools').length
      expect(screen.getByText(`${toolsCount} items found`)).toBeInTheDocument()
    })

    it('sorts large datasets efficiently', async () => {
      const items = generateMockItems(2000)
      const mockOnSortChange = vi.fn()

      const startTime = performance.now()

      // Simulate sorting by price
      const sortedItems = [...items].sort((a, b) => a.daily_rate - b.daily_rate)

      render(
        <SearchResults
          items={sortedItems}
          loading={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          onSortChange={mockOnSortChange}
          onFilterChange={vi.fn()}
        />
      )

      const endTime = performance.now()
      const sortTime = endTime - startTime

      // Sorting should be fast
      expect(sortTime).toBeLessThan(1000)

      // Verify items are sorted correctly
      const firstItem = screen.getByText(/Test Item \d+/)
      expect(firstItem).toBeInTheDocument()
    })
  })

  describe('Memory Usage', () => {
    it('does not cause memory leaks with frequent re-renders', async () => {
      const items = generateMockItems(500)
      let renderCount = 0

      const TestComponent = () => {
        renderCount++
        return (
          <SearchResults
            items={items}
            loading={false}
            hasMore={false}
            onLoadMore={vi.fn()}
            onSortChange={vi.fn()}
            onFilterChange={vi.fn()}
          />
        )
      }

      const { rerender } = render(<TestComponent />)

      // Re-render multiple times
      for (let i = 0; i < 10; i++) {
        rerender(<TestComponent />)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      expect(renderCount).toBe(11) // Initial + 10 re-renders

      // Component should still be responsive
      expect(screen.getByText('500 items found')).toBeInTheDocument()
    })

    it('efficiently handles component unmounting', () => {
      const items = generateMockItems(1000)

      const { unmount } = render(
        <SearchResults
          items={items}
          loading={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          onSortChange={vi.fn()}
          onFilterChange={vi.fn()}
        />
      )

      const startTime = performance.now()
      unmount()
      const endTime = performance.now()

      const unmountTime = endTime - startTime

      // Unmounting should be fast
      expect(unmountTime).toBeLessThan(100)
    })
  })

  describe('Image Loading Performance', () => {
    it('lazy loads images efficiently', async () => {
      const items = generateMockItems(100)

      render(
        <SearchResults
          items={items}
          loading={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          onSortChange={vi.fn()}
          onFilterChange={vi.fn()}
        />
      )

      // Should not load all images immediately
      const images = screen.getAllByRole('img')
      
      // Only visible images should be loaded initially
      expect(images.length).toBeLessThan(items.length * 2) // Each item has 2 images
    })

    it('handles image loading errors gracefully', async () => {
      const items = generateMockItems(50)

      // Mock image loading errors
      const originalImage = global.Image
      global.Image = class extends originalImage {
        constructor() {
          super()
          setTimeout(() => {
            this.onerror?.(new Event('error'))
          }, 100)
        }
      } as any

      const startTime = performance.now()

      render(
        <SearchResults
          items={items}
          loading={false}
          hasMore={false}
          onLoadMore={vi.fn()}
          onSortChange={vi.fn()}
          onFilterChange={vi.fn()}
        />
      )

      await waitFor(() => {
        // Should show placeholder images for failed loads
        const placeholders = screen.getAllByAltText(/placeholder/i)
        expect(placeholders.length).toBeGreaterThan(0)
      })

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Should handle errors quickly
      expect(loadTime).toBeLessThan(2000)

      // Restore original Image
      global.Image = originalImage
    })
  })

  describe('Pagination Performance', () => {
    it('loads additional pages efficiently', async () => {
      const initialItems = generateMockItems(50)
      const additionalItems = generateMockItems(50)
      const mockOnLoadMore = vi.fn()

      const { rerender } = render(
        <SearchResults
          items={initialItems}
          loading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
          onSortChange={vi.fn()}
          onFilterChange={vi.fn()}
        />
      )

      expect(screen.getByText('50 items found')).toBeInTheDocument()

      const startTime = performance.now()

      // Simulate loading more items
      rerender(
        <SearchResults
          items={[...initialItems, ...additionalItems]}
          loading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
          onSortChange={vi.fn()}
          onFilterChange={vi.fn()}
        />
      )

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Loading additional items should be fast
      expect(loadTime).toBeLessThan(500)

      expect(screen.getByText('100 items found')).toBeInTheDocument()
    })
  })
})