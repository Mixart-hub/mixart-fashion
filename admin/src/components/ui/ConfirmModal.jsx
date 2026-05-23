import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({ open, title = "O'chirishni tasdiqlaysizmi?", description, onConfirm, onCancel, confirmLabel = "O'chirish", loading = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <button onClick={onCancel} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg">
          <X size={16} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{title}</div>
            {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'O\'chirilmoqda...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
