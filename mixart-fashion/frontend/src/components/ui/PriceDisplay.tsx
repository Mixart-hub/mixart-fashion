import { useTranslation } from 'react-i18next'

interface Props {
  price: number
  comparePrice?: number
  className?: string
  large?: boolean
}

export default function PriceDisplay({ price, comparePrice, className = '', large }: Props) {
  const { t } = useTranslation()
  const fmt = (v: number) => v.toLocaleString('uz-UZ')
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className={`font-semibold text-dark ${large ? 'text-2xl' : 'text-base'}`}>
        {fmt(price)} {t('common.sum')}
      </span>
      {comparePrice && comparePrice > price && (
        <span className={`text-dark-muted line-through ${large ? 'text-lg' : 'text-sm'}`}>
          {fmt(comparePrice)} {t('common.sum')}
        </span>
      )}
      {comparePrice && comparePrice > price && (
        <span className="badge-rose text-xs">
          -{Math.round((1 - price / comparePrice) * 100)}%
        </span>
      )}
    </div>
  )
}
