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

export function formatCompactCurrency(value) {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000) {
    return `${decimal.format(value / 1_000_000_000)} bi`;
  }

  if (absolute >= 1_000_000) {
    return `${decimal.format(value / 1_000_000)} mi`;
  }

  if (absolute >= 1_000) {
    return `${decimal.format(value / 1_000)} mil`;
  }

  return currency.format(value);
}

export function formatPercent(value) {
  return `${decimal.format(value)}%`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
