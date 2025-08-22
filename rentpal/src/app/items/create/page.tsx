import ItemForm from '@/components/items/ItemForm'
import AuthGuard from '@/components/auth/AuthGuard'

export default function CreateItemPage() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <ItemForm />
      </div>
    </AuthGuard>
  )
}