import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDatabase } from '../useDatabase'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

describe('useDatabase hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
    })
    
    mockSelect.mockReturnThis()
    mockInsert.mockReturnThis()
    mockUpdate.mockReturnThis()
    mockDelete.mockReturnThis()
    mockEq.mockReturnThis()
  })

  it('fetches data successfully', async () => {
    const mockData = [{ id: '1', name: 'Test Item' }]
    mockSelect.mockResolvedValue({ data: mockData, error: null })

    const { result } = renderHook(() => useDatabase('items'))

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    expect(mockFrom).toHaveBeenCalledWith('items')
    expect(mockSelect).toHaveBeenCalledWith('*')
  })

  it('handles fetch errors', async () => {
    const mockError = { message: 'Database error' }
    mockSelect.mockResolvedValue({ data: null, error: mockError })

    const { result } = renderHook(() => useDatabase('items'))

    await waitFor(() => {
      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toEqual(mockError)
    })
  })

  it('shows loading state initially', () => {
    mockSelect.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { result } = renderHook(() => useDatabase('items'))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('applies filters when provided', async () => {
    const mockData = [{ id: '1', category: 'tools' }]
    mockSelect.mockResolvedValue({ data: mockData, error: null })

    const filters = { category: 'tools', status: 'active' }
    const { result } = renderHook(() => useDatabase('items', filters))

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData)
    })

    expect(mockEq).toHaveBeenCalledWith('category', 'tools')
    expect(mockEq).toHaveBeenCalledWith('status', 'active')
  })

  it('refetches data when filters change', async () => {
    const mockData1 = [{ id: '1', category: 'tools' }]
    const mockData2 = [{ id: '2', category: 'electronics' }]
    
    mockSelect
      .mockResolvedValueOnce({ data: mockData1, error: null })
      .mockResolvedValueOnce({ data: mockData2, error: null })

    const { result, rerender } = renderHook(
      ({ filters }) => useDatabase('items', filters),
      { initialProps: { filters: { category: 'tools' } } }
    )

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1)
    })

    rerender({ filters: { category: 'electronics' } })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2)
    })

    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('provides insert function', async () => {
    const newItem = { name: 'New Item', category: 'tools' }
    const insertedItem = { id: '123', ...newItem }
    
    mockInsert.mockResolvedValue({ data: insertedItem, error: null })
    mockSelect.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useDatabase('items'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const insertResult = await result.current.insert(newItem)

    expect(mockInsert).toHaveBeenCalledWith(newItem)
    expect(insertResult.data).toEqual(insertedItem)
  })

  it('provides update function', async () => {
    const updates = { name: 'Updated Item' }
    const updatedItem = { id: '123', ...updates }
    
    mockUpdate.mockResolvedValue({ data: updatedItem, error: null })
    mockSelect.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useDatabase('items'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updateResult = await result.current.update('123', updates)

    expect(mockUpdate).toHaveBeenCalledWith(updates)
    expect(mockEq).toHaveBeenCalledWith('id', '123')
    expect(updateResult.data).toEqual(updatedItem)
  })

  it('provides delete function', async () => {
    mockDelete.mockResolvedValue({ data: null, error: null })
    mockSelect.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useDatabase('items'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const deleteResult = await result.current.remove('123')

    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', '123')
    expect(deleteResult.error).toBeNull()
  })

  it('refreshes data after successful operations', async () => {
    const initialData = [{ id: '1', name: 'Item 1' }]
    const updatedData = [{ id: '1', name: 'Updated Item 1' }]
    
    mockSelect
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockResolvedValueOnce({ data: updatedData, error: null })
    
    mockUpdate.mockResolvedValue({ data: { id: '1', name: 'Updated Item 1' }, error: null })

    const { result } = renderHook(() => useDatabase('items'))

    await waitFor(() => {
      expect(result.current.data).toEqual(initialData)
    })

    await result.current.update('1', { name: 'Updated Item 1' })

    await waitFor(() => {
      expect(result.current.data).toEqual(updatedData)
    })

    expect(mockSelect).toHaveBeenCalledTimes(2)
  })
})