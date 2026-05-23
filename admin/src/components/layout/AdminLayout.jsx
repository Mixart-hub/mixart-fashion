import React from 'react'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 ml-56 flex flex-col min-h-screen overflow-hidden">
        {children}
      </main>
    </div>
  )
}
