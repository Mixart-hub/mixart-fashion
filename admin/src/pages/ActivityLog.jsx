import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import AdminHeader from '../components/layout/AdminHeader'
import Pagination from '../components/ui/Pagination'
import { Activity, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { activityAPI } from '../services/api'

const ACTION_COLORS = {
  PUSH_SENT: 'bg-blue-100 text-blue-700',
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  ORDER: 'bg-orange-100 text-orange-700',
}

const ACTION_LABELS = [
  'Barchasi', 'PUSH_SENT', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ORDER',
]

const PER_PAGE = 30

export default function ActivityLog() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (p = page, act = action) => {
    setLoading(true)
    try {
      const params = { page: p, limit: PER_PAGE }
      if (act) params.action = act
      const res = await activityAPI.list(params)
      setRows(res.rows || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 1)
    } catch { toast.error('Yuklanmadi') }
    finally { setLoading(false) }
  }, [page, action])

  useEffect(() => { load(1, action) }, [action])
  useEffect(() => { load(page, action) }, [page])

  const refresh = async () => {
    setRefreshing(true)
    await load(page, action)
    setRefreshing(false)
    toast.success('Yangilandi')
  }

  const fmtDate = (s) => {
    if (!s) return '—'
    const d = new Date(s)
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <AdminLayout>
      <AdminHeader title="Faoliyat jurnali" />
      <div className="p-6 flex-1 overflow-y-auto space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {ACTION_LABELS.map(a => (
              <button
                key={a}
                onClick={() => { setPage(1); setAction(a === 'Barchasi' ? '' : a) }}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                  (a === 'Barchasi' ? !action : action === a)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
                }`}
              >{a}</button>
            ))}
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Yangilash
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-4 px-4 py-3 animate-pulse">
                  <div className="w-20 h-5 bg-gray-100 rounded" />
                  <div className="flex-1 h-5 bg-gray-50 rounded" />
                  <div className="w-32 h-5 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
              <Activity size={48} className="text-gray-200" />
              <p className="text-sm">Faoliyat topilmadi</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    {['Harakat', 'Foydalanuvchi', 'Ob\'ekt', 'Tafsilot', 'Vaqt'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${ACTION_COLORS[row.action] || 'bg-gray-100 text-gray-600'}`}>
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.user_name || row.user_id || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{row.entity_type || '—'}{row.entity_id ? ` #${row.entity_id}` : ''}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{row.details || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} onChange={setPage} />
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
