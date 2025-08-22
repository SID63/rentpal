import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { ItemForm } from '../ItemForm'

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockUpload = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      update: mockUpdate,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/image.jpg' }
        })),
      })),
    },
  },
}))

describe('ItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<ItemForm />)
    
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/condition/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/daily rate/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/security deposit/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<ItemForm />)
    
    const submitButton = screen.getByRole('button', { name: /create listing/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      expect(screen.getByText(/category is required/i)).toBeInTheDocument()
    })
  })

  it('validates numeric fields', async () => {
    const user = userEvent.setup()
    render(<ItemForm />)
    
    const dailyRateInput = screen.getByLabelText(/daily rate/i)
    await user.type(dailyRateInput, '-10')
    
    const submitButton = screen.getByRole('button', { name: /create listing/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/daily rate must be positive/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockInsert.mockResolvedValue({ data: { id: 'new-item-id' }, error: null })
    
    render(<ItemForm />)
    
    // Fill out form
    await user.type(screen.getByLabelText(/title/i), 'Test Item')
    await user.type(screen.getByLabelText(/description/i), 'A test item description')
    await user.selectOptions(screen.getByLabelText(/category/i), 'tools')
    await user.selectOptions(screen.getByLabelText(/condition/i), 'good')
    await user.type(screen.getByLabelText(/daily rate/i), '25')
    await user.type(screen.getByLabelText(/security deposit/i), '50')
    
    const submitButton = screen.getByRole('button', { name: /create listing/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Item',
          description: 'A test item description',
          category: 'tools',
          condition: 'good',
          daily_rate: 25,
          security_deposit: 50,
        })
      )
    })
  })

  it('handles image upload', async () => {
    const user = userEvent.setup()
    mockUpload.mockResolvedValue({ data: { path: 'images/test.jpg' }, error: null })
    
    render(<ItemForm />)
    
    const fileInput = screen.getByLabelText(/upload images/i)
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, file)
    
    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('test.jpg'),
        file,
        expect.any(Object)
      )
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockInsert.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<ItemForm />)
    
    // Fill required fields
    await user.type(screen.getByLabelText(/title/i), 'Test Item')
    await user.type(screen.getByLabelText(/description/i), 'Description')
    await user.selectOptions(screen.getByLabelText(/category/i), 'tools')
    await user.selectOptions(screen.getByLabelText(/condition/i), 'good')
    await user.type(screen.getByLabelText(/daily rate/i), '25')
    
    const submitButton = screen.getByRole('button', { name: /create listing/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/creating listing/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('displays error message on submission failure', async () => {
    const user = userEvent.setup()
    mockInsert.mockResolvedValue({ 
      data: null, 
      error: { message: 'Failed to create listing' } 
    })
    
    render(<ItemForm />)
    
    // Fill required fields
    await user.type(screen.getByLabelText(/title/i), 'Test Item')
    await user.type(screen.getByLabelText(/description/i), 'Description')
    await user.selectOptions(screen.getByLabelText(/category/i), 'tools')
    await user.selectOptions(screen.getByLabelText(/condition/i), 'good')
    await user.type(screen.getByLabelText(/daily rate/i), '25')
    
    const submitButton = screen.getByRole('button', { name: /create listing/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to create listing/i)).toBeInTheDocument()
    })
  })

  it('populates form when editing existing item', () => {
    const existingItem = {
      id: 'existing-id',
      title: 'Existing Item',
      description: 'Existing description',
      category: 'tools',
      condition: 'good' as const,
      daily_rate: 30,
      security_deposit: 60,
    }
    
    render(<ItemForm item={existingItem} />)
    
    expect(screen.getByDisplayValue('Existing Item')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update listing/i })).toBeInTheDocument()
  })
})