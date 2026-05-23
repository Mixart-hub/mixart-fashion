import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Orders' },
  { to: '/users', label: 'Users' }
]

export default function Sidebar() {
  return (
    <aside style={{ width: 200, background: '#1a1a2e', color: '#fff', padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 700, marginBottom: 24, fontSize: 16 }}>Mixart Admin</div>
      {links.map(l => (
        <NavLink
          key={l.to}
          to={l.to}
          style={({ isActive }) => ({
            color: isActive ? '#e94560' : '#ccc',
            textDecoration: 'none',
            padding: '8px 12px',
            borderRadius: 6,
            background: isActive ? 'rgba(233,69,96,0.1)' : 'transparent'
          })}
        >
          {l.label}
        </NavLink>
      ))}
    </aside>
  )
}
