import { ReactNode } from 'react'
import Footer from './Footer'
import ToastContainer from './ui/Toast'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      <Footer />
      <ToastContainer />
    </div>
  )
}
