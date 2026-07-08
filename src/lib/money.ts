export function formatPHP(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-PH").format(Number(value ?? 0));
}