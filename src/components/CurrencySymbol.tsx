import SarSymbol from './SarSymbol'

export default function CurrencySymbol({
  currency,
  className = '',
}: {
  currency?: string | null
  className?: string
}) {
  const normalizedCurrency = (currency || 'EGP').toUpperCase()

  if (normalizedCurrency === 'SAR') {
    return <SarSymbol className={className} />
  }

  if (normalizedCurrency === 'EGP') {
    return <span className={className}>ج.م</span>
  }

  return <span className={className}>{normalizedCurrency}</span>
}
