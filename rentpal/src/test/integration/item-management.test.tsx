import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { ItemForm } from '@/components/items/ItemForm'
import { ItemDetails } from '@/components/items/ItemDetails'
import { mockUser, mockProfile, mockItem } from '@/test/utils/test-utils'

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: 'https://example.com/image.jpg' },
      })),
    })),
  },
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Item Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: false,
    })
  })

  describe('Item Creation Flow', () => {
    it('completes full item creation process', async () => {
      const user = userEvent.setup()

      // Mock successful item creation
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockItem,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      // Mock successful image upload
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'items/image1.jpg' },
          error: null,
        }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/image1.jpg' },
        })),
      })

      render(<ItemForm />)

      // Fill out basic information
      await user.type(screen.getByLabelText(/title/i), mockItem.title)
      await user.type(screen.getByLabelText(/description/i), mockItem.description)
      await user.selectOptions(screen.getByLabelText(/category/i), mockItem.category)
      await user.selectOptions(screen.getByLabelText(/condition/i), mockItem.condition)

      // Set pricing
      await user.type(screen.getByLabelText(/daily rate/i), mockItem.daily_rate.toString())
      await user.type(screen.getByLabelText(/hourly rate/i), mockItem.hourly_rate!.toString())
      await user.type(screen.getByLabelText(/security deposit/i), mockItem.security_deposit!.toString())

      // Set location
      await user.type(screen.getByLabelText(/address/i), mockItem.location.address)
      await user.type(screen.getByLabelText(/city/i), mockItem.location.city)
      await user.selectOptions(screen.getByLabelText(/state/i), mockItem.location.state)
      await user.type(screen.getByLabelText(/zip code/i), mockItem.location.zip_code)

      // Upload images
      const imageInput = screen.getByLabelText(/upload images/i)
      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' })
      await user.upload(imageInput, file)

      // Set availability
      await user.type(screen.getByLabelText(/available from/i), '2024-01-01')
      await user.type(screen.getByLabelText(/minimum rental period/i), '4')

      // Set policies
      await user.selectOptions(screen.getByLabelText(/cancellation policy/i), 'moderate')
      await user.selectOptions(screen.getByLabelText(/pickup\/delivery/i), 'both')
      await user.type(screen.getByLabelText(/delivery fee/i), '10')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create listing/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('item_listings')
        expect(mockQuery.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            title: mockItem.title,
            description: mockItem.description,
            category: mockItem.category,
            condition: mockItem.condition,
            daily_rate: mockItem.daily_rate,
            owner_id: mockUser.id,
          })
        )
      })

      // Should redirect to item details
      expect(mockPush).toHaveBeenCalledWith(`/items/${mockItem.id}`)
    })

    it('handles validation errors during creation', async () => {
      const user = userEvent.setup()
      render(<ItemForm />)

      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /create listing/i })
      await user.click(submitButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
        expect(screen.getByText(/category is required/i)).toBeInTheDocument()
      })

      // Form should not be submitted
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('handles image upload errors', async () => {
      const user = userEvent.setup()

      // Mock image upload failure
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' },
        }),
      })

      render(<ItemForm />)

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'Test Item')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.selectOptions(screen.getByLabelText(/category/i), 'tools')
      await user.selectOptions(screen.getByLabelText(/condition/i), 'good')
      await user.type(screen.getByLabelText(/daily rate/i), '25')

      // Try to upload image
      const imageInput = screen.getByLabelText(/upload images/i)
      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' })
      await user.upload(imageInput, file)

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Item Editing Flow', () => {
    it('loads existing item data for editing', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockItem,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      render(<ItemForm itemId={mockItem.id} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue(mockItem.title)).toBeInTheDocument()
        expect(screen.getByDisplayValue(mockItem.description)).toBeInTheDocument()
        expect(screen.getByDisplayValue(mockItem.daily_rate.toString())).toBeInTheDocument()
      })
    })

    it('updates existing item successfully', async () => {
      const user = userEvent.setup()

      // Mock loading existing item
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockItem,
          error: null,
        }),
      }

      // Mock updating item
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockItem, title: 'Updated Title' },
          error: null,
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery) // First call for loading
        .mockReturnValueOnce(mockUpdateQuery) // Second call for updating

      render(<ItemForm itemId={mockItem.id} />)

      // Wait for item to load
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockItem.title)).toBeInTheDocument()
      })

      // Update title
      const titleInput = screen.getByDisplayValue(mockItem.title)
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')

      // Submit update
      const updateButton = screen.getByRole('button', { name: /update listing/i })
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockUpdateQuery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Updated Title',
          })
        )
      })
    })
  })

  describe('Item Viewing Flow', () => {
    it('displays item details with all information', () => {
      render(<ItemDetails item={mockItem} />)

      // Check all item information is displayed
      expect(screen.getByText(mockItem.title)).toBeInTheDocument()
      expect(screen.getByText(mockItem.description)).toBeInTheDocument()
      expect(screen.getByText(`$${mockItem.daily_rate}/day`)).toBeInTheDocument()
      expect(screen.getByText(mockItem.condition)).toBeInTheDocument()
      expect(screen.getByText(mockItem.location.city)).toBeInTheDocument()
    })

    it('handles booking initiation from item details', async () => {
      const user = userEvent.setup()
      render(<ItemDetails item={mockItem} />)

      const bookButton = screen.getByRole('button', { name: /book now/i })
      await user.click(bookButton)

      expect(mockPush).toHaveBeenCalledWith(`/items/${mockItem.id}/book`)
    })

    it('shows contact owner option for authenticated users', () => {
      render(<ItemDetails item={mockItem} />)

      expect(screen.getByRole('button', { name: /contact owner/i })).toBeInTheDocument()
    })

    it('prevents booking for item owners', () => {
      const ownItem = { ...mockItem, owner_id: mockUser.id }
      render(<ItemDetails item={ownItem} />)

      expect(screen.queryByRole('button', { name: /book now/i })).not.toBeInTheDocument()
      expect(screen.getByText(/this is your listing/i)).toBeInTheDocument()
    })
  })

  describe('Item Deletion Flow', () => {
    it('deletes item successfully', async () => {
      const user = userEvent.setup()

      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      render(<ItemForm itemId={mockItem.id} />)

      // Wait for item to load
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockItem.title)).toBeInTheDocument()
      })

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete listing/i })
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockQuery.delete).toHaveBeenCalled()
        expect(mockQuery.eq).toHaveBeenCalledWith('id', mockItem.id)
      })

      // Should redirect to dashboard
      expect(mockPush).toHaveBeenCalledWith('/dashboard/listings')
    })

    it('prevents deletion of items with active bookings', async () => {
      const user = userEvent.setup()

      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Cannot delete item with active bookings' },
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      render(<ItemForm itemId={mockItem.id} />)

      const deleteButton = screen.getByRole('button', { name: /delete listing/i })
      await user.click(deleteButton)

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText(/cannot delete item with active bookings/i)).toBeInTheDocument()
      })
    })
  })
})