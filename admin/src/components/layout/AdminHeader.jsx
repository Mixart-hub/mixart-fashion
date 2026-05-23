import React from 'react'
import { Bell, Download, Calendar } from 'lucide-react'

export default function AdminHeader({ title, showDatePicker = false, showExport = false, onExport }) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-xl font-serif font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {showDatePicker && (
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Calendar size={15} />
            <span>So'nggi 30 kun</span>
          </button>
        )}
        {showExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} />
            <span>Yuklash</span>
          </button>
        )}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={18} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-8 h-8 bg-primary text-white font-bold text-xs rounded-full flex items-center justify-center">
          MA
        </div>
      </div>
    </header>
  )
}
