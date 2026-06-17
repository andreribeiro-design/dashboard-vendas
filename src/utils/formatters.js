export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export const currencyWithCents = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const number = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPercent(value) {
  return `${decimal.format(Number(value || 0))}%`;
}

export function formatCompactCurrency(value) {
  const n = Number(value || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) return `R$ ${decimal.format(n / 1_000_000_000)} bi`;
  if (abs >= 1_000_000) return `R$ ${decimal.format(n / 1_000_000)} mi`;
  if (abs >= 1_000) return `R$ ${decimal.format(n / 1_000)} mil`;
  return currencyWithCents.format(n);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
