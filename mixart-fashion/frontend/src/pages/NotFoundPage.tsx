import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 text-center">
        <div>
          <p className="font-display text-9xl text-cream-dark font-light">404</p>
          <h1 className="section-title mt-4 mb-3">{t('common.page_not_found')}</h1>
          <p className="text-dark-muted mb-8">Bu sahifa mavjud emas yoki o'chirilgan</p>
          <Link to="/"><Button size="lg">Bosh sahifaga qaytish</Button></Link>
        </div>
      </div>
    </Layout>
  )
}
