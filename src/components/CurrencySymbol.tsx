import SarSymbol from './SarSymbol'

// The platform displays every price/revenue figure in Saudi Riyal, regardless
// of what currency value is stored on the underlying record (payment
// processing currency is a separate, unrelated concern from display).
export default function CurrencySymbol({
  className = '',
}: {
  currency?: string | null
  className?: string
}) {
  return <SarSymbol className={className} />
}
