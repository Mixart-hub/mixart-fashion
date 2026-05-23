import { Link } from 'react-router-dom'

interface Item { label: string; href?: string }

export default function Breadcrumb({ items }: { items: Item[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-dark-muted mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span>/</span>}
          {item.href
            ? <Link to={item.href} className="hover:text-rose transition-colors">{item.label}</Link>
            : <span className="text-dark font-medium">{item.label}</span>
          }
        </span>
      ))}
    </nav>
  )
}
