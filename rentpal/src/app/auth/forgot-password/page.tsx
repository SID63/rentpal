import PasswordReset from '@/components/auth/PasswordReset'
import AuthGuard from '@/components/auth/AuthGuard'

export default function ForgotPasswordPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <PasswordReset />
      </div>
    </AuthGuard>
  )
}