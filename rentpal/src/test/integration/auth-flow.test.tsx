import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/contexts/AuthContext'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { AuthGuard } from '@/components/auth/AuthGuard'

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  })

  it('completes full registration and login flow', async () => {
    const user = userEvent.setup()

    // Mock successful registration
    mockSignUp.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null
    })

    // Mock successful login
    mockSignIn.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null
    })

    // Test registration
    render(
      <AuthProvider>
        <RegisterForm />
      </AuthProvider>
    )

    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')

    const registerButton = screen.getByRole('button', { name: /create account/i })
    await user.click(registerButton)

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'John Doe',
          },
        },
      })
    })

    // Test login after registration
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    )

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')

    const loginButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(loginButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('handles authentication state changes correctly', async () => {
    let authStateCallback: any

    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    const TestComponent = () => (
      <AuthProvider>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </AuthProvider>
    )

    render(<TestComponent />)

    // Initially no user, should redirect
    expect(mockPush).toHaveBeenCalledWith('/auth/login')

    // Simulate user login
    const mockUser = { id: '123', email: 'test@example.com' }
    authStateCallback('SIGNED_IN', { user: mockUser })

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    // Simulate user logout
    authStateCallback('SIGNED_OUT', { user: null })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })
  })

  it('persists authentication across page reloads', async () => {
    const mockUser = { id: '123', email: 'test@example.com' }

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })

    const TestComponent = () => (
      <AuthProvider>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </AuthProvider>
    )

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    expect(mockGetUser).toHaveBeenCalled()
  })

  it('handles authentication errors gracefully', async () => {
    const user = userEvent.setup()

    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' }
    })

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    )

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')

    const loginButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })

    // User should still be on login page
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects authenticated users away from auth pages', async () => {
    const mockUser = { id: '123', email: 'test@example.com' }

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles network errors during authentication', async () => {
    const user = userEvent.setup()

    mockSignIn.mockRejectedValue(new Error('Network error'))

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    )

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')

    const loginButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })
})