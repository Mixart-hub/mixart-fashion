export const formatPrice = (price) => {
  if (!price && price !== 0) return '—'
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm"
}

export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('uz-UZ', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

export const formatDateShort = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('uz-UZ', {
    day: 'numeric', month: 'short'
  })
}

export const formatNumber = (n) => {
  if (!n && n !== 0) return '0'
  return new Intl.NumberFormat('uz-UZ').format(n)
}
