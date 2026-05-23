import { useToast } from '../../store/toast'

const icons: Record<string, string> = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠'
}
const colors: Record<string, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-rose-pale border-rose text-rose-dark',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div key={t.id} className={`border rounded-xl p-4 flex items-center gap-3 shadow-lg animate-slide-down ${colors[t.type]}`}>
          <span className="text-lg font-bold">{icons[t.type]}</span>
          <p className="flex-1 text-sm font-medium">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  )
}
