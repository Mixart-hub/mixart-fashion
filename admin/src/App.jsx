import React from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Staff from './pages/Staff'
import Settings from './pages/Settings'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Categories from './pages/Categories'
import Discounts from './pages/Discounts'
import ActivityLog from './pages/ActivityLog'
import Marketing from './pages/Marketing'
import Branches from './pages/Branches'
import POS from './pages/POS'

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>

export default function App() {
  return (
    <Routes>
      <Route path="/login"      element={<Login />} />
      <Route path="/"           element={<P><Dashboard /></P>} />
      <Route path="/orders"     element={<P><Orders /></P>} />
      <Route path="/products"   element={<P><Products /></P>} />
      <Route path="/categories" element={<P><Categories /></P>} />
      <Route path="/inventory"  element={<P><Inventory /></P>} />
      <Route path="/staff"      element={<P><Staff /></P>} />
      <Route path="/settings"   element={<P><Settings /></P>} />
      <Route path="/customers"  element={<P><Customers /></P>} />
      <Route path="/reports"    element={<P><Reports /></P>} />
      <Route path="/discounts"  element={<P><Discounts /></P>} />
      <Route path="/activity"   element={<P><ActivityLog /></P>} />
      <Route path="/marketing"  element={<P><Marketing /></P>} />
      <Route path="/branches"   element={<P><Branches /></P>} />
      <Route path="/pos"        element={<P><POS /></P>} />
      <Route path="*"           element={<P><Dashboard /></P>} />
    </Routes>
  )
}
