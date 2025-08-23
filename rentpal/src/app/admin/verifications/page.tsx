'use client'

import { useState, useEffect } from 'react'
import { adminService, AdminUser } from '@/lib/admin'
import AdminLayout from '@/components/admin/AdminLayout'
import UserVerification from '@/components/admin/UserVerification'

export default function AdminVerificationsPage() {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentAdmin()
  }, [])

  const loadCurrentAdmin = async () => {
    try {
      const admin = await adminService.getCurrentAdmin()
      setCurrentAdmin(admin)
    } catch (error) {
      console.error('Failed to load admin:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!currentAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <UserVerification currentAdmin={currentAdmin} />
    </AdminLayout>
  )
}