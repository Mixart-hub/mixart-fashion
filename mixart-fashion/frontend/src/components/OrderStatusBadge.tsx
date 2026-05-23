import { useTranslation } from 'react-i18next'

const colors: Record<string, string> = {
  PENDING:    'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED:  'bg-blue-50 text-blue-700 border-blue-200',
  PROCESSING: 'bg-purple-50 text-purple-700 border-purple-200',
  SHIPPED:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED:  'bg-green-50 text-green-700 border-green-200',
  CANCELLED:  'bg-red-50 text-red-700 border-red-200',
}
const icons: Record<string, string> = {
  PENDING: '⏳', CONFIRMED: '✅', PROCESSING: '🔄',
  SHIPPED: '🚚', DELIVERED: '📬', CANCELLED: '❌'
}

export default function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${colors[status] || 'bg-gray-50 text-gray-600'}`}>
      {icons[status]} {t(`orders.status.${status}`, status)}
    </span>
  )
}
