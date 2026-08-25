export function formatMoney(value: number) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0'

  return amount.toLocaleString('en-US', {
    useGrouping: false,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}
