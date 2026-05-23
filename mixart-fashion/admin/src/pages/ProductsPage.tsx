import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const token = () => localStorage.getItem('adminToken') || ''

interface Product { id: string; name: string; price: number; stock: number; category?: string; isActive: boolean }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({ name: '', price: '', stock: '', category: '' })

  useEffect(() => {
    fetch(`${BASE}/products`).then(r => r.json()).then(setProducts)
  }, [])

  async function create() {
    const p = await fetch(`${BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...form, price: Number(form.price) * 100, stock: Number(form.stock) })
    }).then(r => r.json())
    setProducts(prev => [...prev, p])
    setForm({ name: '', price: '', stock: '', category: '' })
  }

  return (
    <div>
      <h2>Products</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {(['name','price','stock','category'] as const).map(f => (
          <input key={f} placeholder={f} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} style={{ padding: 8 }} />
        ))}
        <button onClick={create} style={{ padding: '8px 16px' }}>Add Product</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{['Name','Category','Price','Stock'].map(h => <th key={h} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td style={{ padding: 8 }}>{p.name}</td>
              <td style={{ padding: 8 }}>{p.category}</td>
              <td style={{ padding: 8 }}>{(p.price / 100).toLocaleString()} UZS</td>
              <td style={{ padding: 8 }}>{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
