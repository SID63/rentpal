import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import EnhancedImageUpload from '../EnhancedImageUpload'
import { useAuth } from '@/contexts/AuthContext'
import * as storageUtils from '@/lib/storage-utils'

// Mock the auth context
vi.mock('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

// Mock the storage utils
vi.mock('@/lib/storage-utils')
const mockStorageUtils = vi.mocked(storageUtils)

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  )
}))

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('EnhancedImageUpload', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  const mockOnImagesChange = vi.fn()

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn()
    })

    mockStorageUtils.validateFile.mockReturnValue({ valid: true })
    mockStorageUtils.uploadFiles.mockResolvedValue({
      success: true,
      results: [
        {
          success: true,
          url: 'https://example.com/image1.jpg',
          path: 'user-123/items/image1.jpg'
        }
      ],
      errors: [],
      successCount: 1,
      failureCount: 0
    })
    mockStorageUtils.createPreviewUrl.mockReturnValue('blob:preview-url')
    mockStorageUtils.cleanupPreviewUrl.mockImplementation(() => {})
    mockStorageUtils.extractFilePathFromUrl.mockReturnValue('user-123/items/image1.jpg')
    mockStorageUtils.deleteFile.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload area for item images', () => {
    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={[]}
        onImagesChange={mockOnImagesChange}
      />
    )

    expect(screen.getByText('Choose Images')).toBeInTheDocument()
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
    expect(screen.getByText(/PNG, JPG, WEBP up to 5 MB each/i)).toBeInTheDocument()
  })

  it('renders upload area for profile avatars', () => {
    render(
      <EnhancedImageUpload
        bucket="avatars"
        images={[]}
        onImagesChange={mockOnImagesChange}
        allowMultiple={false}
      />
    )

    expect(screen.getByText('Choose Profile Photo')).toBeInTheDocument()
    expect(screen.getByText(/PNG, JPG, WEBP up to 2 MB each/i)).toBeInTheDocument()
  })

  it('displays existing images', () => {
    const existingImages = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
    
    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={existingImages}
        onImagesChange={mockOnImagesChange}
      />
    )

    expect(screen.getByText('Uploaded Images (2/10)')).toBeInTheDocument()
    expect(screen.getByText('Main Photo')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('handles file selection and upload', async () => {
    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={[]}
        onImagesChange={mockOnImagesChange}
      />
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByRole('button', { name: /choose images/i })
    
    // Find the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockStorageUtils.uploadFiles).toHaveBeenCalledWith(
        [file],
        'item-images',
        'user-123',
        expect.any(Object)
      )
    })

    await waitFor(() => {
      expect(mockOnImagesChange).toHaveBeenCalledWith(['https://example.com/image1.jpg'])
    })
  })

  it('handles drag and drop', async () => {
    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={[]}
        onImagesChange={mockOnImagesChange}
      />
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const dropZone = screen.getByText(/drag and drop/i).closest('div')

    fireEvent.dragOver(dropZone!)
    expect(dropZone).toHaveClass('border-blue-500')

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] }
    })

    await waitFor(() => {
      expect(mockStorageUtils.uploadFiles).toHaveBeenCalled()
    })
  })

  it('validates files before upload', async () => {
    mockStorageUtils.validateFile.mockReturnValue({
      valid: false,
      error: 'File too large'
    })

    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={[]}
        onImagesChange={mockOnImagesChange}
      />
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/File too large/i)).toBeInTheDocument()
    })

    expect(mockStorageUtils.uploadFiles).not.toHaveBeenCalled()
  })

  it('handles image removal', async () => {
    const existingImages = ['https://example.com/image1.jpg']
    
    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={existingImages}
        onImagesChange={mockOnImagesChange}
      />
    )

    const removeButton = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(mockStorageUtils.deleteFile).toHaveBeenCalledWith(
        'user-123/items/image1.jpg',
        'item-images'
      )
    })

    await waitFor(() => {
      expect(mockOnImagesChange).toHaveBeenCalledWith([])
    })
  })

  it('handles image reordering', () => {
    const existingImages = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
    
    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={existingImages}
        onImagesChange={mockOnImagesChange}
        allowMultiple={true}
      />
    )

    const images = screen.getAllByRole('img')
    const firstImage = images[0].closest('div')
    const secondImage = images[1].closest('div')

    // Simulate drag and drop reordering
    fireEvent.dragStart(firstImage!, {
      dataTransfer: { setData: vi.fn() }
    })
    
    fireEvent.drop(secondImage!, {
      dataTransfer: { getData: vi.fn().mockReturnValue('0') }
    })

    expect(mockOnImagesChange).toHaveBeenCalledWith([
      'https://example.com/image2.jpg',
      'https://example.com/image1.jpg'
    ])
  })

  it('shows upload progress', async () => {
    let progressCallback: ((progress: any) => void) | undefined

    mockStorageUtils.uploadFiles.mockImplementation(async (files, bucket, userId, options) => {
      progressCallback = options?.onProgress
      
      // Simulate progress updates
      if (progressCallback) {
        progressCallback({ completed: 0, total: 1, currentFile: 'test.jpg' })
        progressCallback({ completed: 1, total: 1, currentFile: 'test.jpg' })
      }
      
      return {
        success: true,
        results: [{ success: true, url: 'https://example.com/image1.jpg' }],
        errors: [],
        successCount: 1,
        failureCount: 0
      }
    })

    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={[]}
        onImagesChange={mockOnImagesChange}
        showProgress={true}
      />
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Uploading/i)).toBeInTheDocument()
    })
  })

  it('respects maxImages limit', () => {
    const existingImages = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
    
    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={existingImages}
        onImagesChange={mockOnImagesChange}
        maxImages={2}
      />
    )

    // Should not show upload area when at max capacity
    expect(screen.queryByText('Choose Images')).not.toBeInTheDocument()
    expect(screen.getByText('Uploaded Images (2/2)')).toBeInTheDocument()
  })

  it('disables upload when disabled prop is true', () => {
    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={[]}
        onImagesChange={mockOnImagesChange}
        disabled={true}
      />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeDisabled()
    
    const uploadArea = screen.getByText(/drag and drop/i).closest('div')
    expect(uploadArea).toHaveClass('cursor-not-allowed')
  })

  it('handles upload errors gracefully', async () => {
    mockStorageUtils.uploadFiles.mockResolvedValue({
      success: false,
      results: [],
      errors: ['Upload failed'],
      successCount: 0,
      failureCount: 1
    })

    render(
      <EnhancedImageUpload
        bucket="item-images"
        images={[]}
        onImagesChange={mockOnImagesChange}
      />
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Upload failed/i)).toBeInTheDocument()
    })
  })
})