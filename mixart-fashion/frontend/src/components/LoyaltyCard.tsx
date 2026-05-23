import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../store/auth'

interface LoyaltyData {
  points: number
  transactions: Array<{ id: string; points: number; type: string; note?: string; createdAt: string }>
}

export default function LoyaltyCard() {
  const { user } = useAuth()
  const [data, setData] = useState<LoyaltyData | null>(null)

  useEffect(() => {
    if (!user) return
    api.get<LoyaltyData>('/loyalty').then(setData).catch(() => {})
  }, [user])

  if (!data) return null

  const typeIcon: Record<string, string> = { EARNED: '➕', SPENT: '➖', BONUS: '🎁', EXPIRED: '⌛' }
  const typeColor: Record<string, string> = {
    EARNED: 'text-green-600', SPENT: 'text-red-500', BONUS: 'text-amber-600', EXPIRED: 'text-gray-400'
  }

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-rose to-rose-dark p-6 text-white">
        <p className="text-sm opacity-80 font-medium">Bonus ballaringiz</p>
        <p className="text-4xl font-serif font-bold mt-1">{data.points}</p>
        <p className="text-sm opacity-70 mt-1">≈ {Math.floor(data.points / 10).toLocaleString()} so'm chegirma</p>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-dark mb-3">So'nggi harakatlar</p>
        {data.transactions.length === 0 ? (
          <p className="text-sm text-dark-muted">Harakatlar yo'q</p>
        ) : (
          <div className="space-y-2">
            {data.transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{typeIcon[tx.type]}</span>
                  <span className="text-sm text-dark-muted">{tx.note || tx.type}</span>
                </div>
                <span className={`text-sm font-semibold ${typeColor[tx.type]}`}>
                  {tx.points > 0 ? '+' : ''}{tx.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
