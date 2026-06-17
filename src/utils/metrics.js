function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
    return groups;
  }, new Map());
}

function sum(items, field) {
  return items.reduce((total, item) => total + Number(item[field] || 0), 0);
}

export function calculateSummary(data) {
  const valorLiquido = sum(data, "valorLiquido");
  const custoFiscal = sum(data, "custoFiscal");
  const impostos = sum(data, "impostos");
  const quantidadeItensVendidos = sum(data, "quantidadeItensVendidos");
  const verbasTotais = sum(data, "verbasTotais");
  const contagemProdutos = sum(data, "contagemProdutos");

  const margemFiscalPercentual =
    valorLiquido > 0 ? ((valorLiquido - custoFiscal - impostos) / valorLiquido) * 100 : 0;

  const ticketMedioUnitario =
    quantidadeItensVendidos > 0 ? valorLiquido / quantidadeItensVendidos : 0;

  return {
    valorLiquido,
    custoFiscal,
    impostos,
    quantidadeItensVendidos,
    margemFiscalPercentual,
    verbasTotais,
    contagemProdutos,
    ticketMedioUnitario,
    registros: data.length,
  };
}

export function buildMonthlySeries(data) {
  const grouped = groupBy(data, (item) => `${item.codigoMes}|${item.mes}`);

  return Array.from(grouped.entries())
    .map(([key, rows]) => {
      const [codigoMes, mes] = key.split("|");
      return {
        codigoMes: Number(codigoMes),
        mes,
        ...calculateSummary(rows),
      };
    })
    .sort((a, b) => a.codigoMes - b.codigoMes);
}

export function buildBuyerRanking(data) {
  const grouped = groupBy(data, (item) => item.comprador);

  return Array.from(grouped.entries())
    .map(([comprador, rows]) => ({
      comprador,
      empresas: Array.from(new Set(rows.map((row) => row.empresa))).sort(),
      ...calculateSummary(rows),
    }))
    .sort((a, b) => b.valorLiquido - a.valorLiquido);
}

export function compareLastTwo(series, field) {
  if (!series || series.length < 2) return null;

  const current = Number(series.at(-1)?.[field]);
  const previous = Number(series.at(-2)?.[field]);

  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;

  return ((current - previous) / Math.abs(previous)) * 100;
}
