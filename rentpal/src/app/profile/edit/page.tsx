import ProfileEdit from '@/components/profile/ProfileEdit'
import AuthGuard from '@/components/auth/AuthGuard'

export default function ProfileEditPage() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <ProfileEdit />
      </div>
    </AuthGuard>
  )
}