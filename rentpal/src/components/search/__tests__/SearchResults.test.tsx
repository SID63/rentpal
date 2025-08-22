import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { SearchResults } from '../SearchResults'
import { mockItem } from '@/test/utils/test-utils'

const mockItems = [
  mockItem,
  {
    ...mockItem,
    id: 'item-2',
    title: 'Another Test Item',
    daily_rate: 35.00,
    category: 'electronics',
  },
  {
    ...mockItem,
    id: 'item-3',
    title: 'Third Test Item',
    daily_rate: 15.00,
    category: 'sports',
  },
]

const mockOnLoadMore = vi.fn()
const mockOnSortChange = vi.fn()
const mockOnFilterChange = vi.fn()

describe('SearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search results correctly', () => {
    render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.getByText('3 items found')).toBeInTheDocument()
    mockItems.forEach(item => {
      expect(screen.getByText(item.title)).toBeInTheDocument()
    })
  })

  it('shows loading state', () => {
    render(
      <SearchResults
        items={[]}
        loading={true}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows empty state when no items found', () => {
    render(
      <SearchResults
        items={[]}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.getByText(/no items found/i)).toBeInTheDocument()
    expect(screen.getByText(/try adjusting your search/i)).toBeInTheDocument()
  })

  it('handles sort change', async () => {
    const user = userEvent.setup()
    render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    const sortSelect = screen.getByRole('combobox', { name: /sort by/i })
    await user.selectOptions(sortSelect, 'price-low')

    expect(mockOnSortChange).toHaveBeenCalledWith('price-low')
  })

  it('loads more items when load more button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    const loadMoreButton = screen.getByRole('button', { name: /load more/i })
    await user.click(loadMoreButton)

    expect(mockOnLoadMore).toHaveBeenCalled()
  })

  it('shows load more button only when hasMore is true', () => {
    const { rerender } = render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()

    rerender(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('displays items in grid layout', () => {
    render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    const grid = screen.getByRole('grid')
    expect(grid).toBeInTheDocument()
    expect(grid.children).toHaveLength(mockItems.length)
  })

  it('shows view toggle buttons', () => {
    render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument()
  })

  it('toggles between grid and list view', async () => {
    const user = userEvent.setup()
    render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
      />
    )

    const listViewButton = screen.getByRole('button', { name: /list view/i })
    await user.click(listViewButton)

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('shows filter summary when filters are applied', () => {
    render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
        appliedFilters={{
          category: 'tools',
          priceRange: [10, 50],
          location: 'San Francisco',
        }}
      />
    )

    expect(screen.getByText(/filters applied/i)).toBeInTheDocument()
    expect(screen.getByText('tools')).toBeInTheDocument()
    expect(screen.getByText('$10 - $50')).toBeInTheDocument()
    expect(screen.getByText('San Francisco')).toBeInTheDocument()
  })

  it('allows clearing individual filters', async () => {
    const user = userEvent.setup()
    render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
        appliedFilters={{
          category: 'tools',
          priceRange: [10, 50],
        }}
      />
    )

    const clearCategoryButton = screen.getByRole('button', { name: /clear category filter/i })
    await user.click(clearCategoryButton)

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      category: null,
      priceRange: [10, 50],
    })
  })

  it('shows pagination when enabled', () => {
    render(
      <SearchResults
        items={mockItems}
        loading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
        onSortChange={mockOnSortChange}
        onFilterChange={mockOnFilterChange}
        pagination={{
          currentPage: 2,
          totalPages: 5,
          onPageChange: vi.fn(),
        }}
      />
    )

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument()
  })
})