import { currency, currencyWithCents, decimal, formatPercent, number } from "../utils/formatters.js";
import { compareLastTwo } from "../utils/metrics.js";

function renderDelta(value) {
  if (value === null) return '<span class="delta">sem base</span>';
  const className = value < 0 ? "delta negative" : "delta";
  const signal = value > 0 ? "+" : "";
  return `<span class="${className}">${signal}${decimal.format(value)}%</span>`;
}

export function renderKpiCards(container, summary, monthlySeries) {
  if (!container) return;

  const cards = [
    {
      label: "Vendas líquidas",
      icon: "R$",
      value: currency.format(summary.valorLiquido),
      delta: compareLastTwo(monthlySeries, "valorLiquido"),
      footer: `${number.format(summary.registros)} registros`,
    },
    {
      label: "Margem fiscal",
      icon: "%",
      value: formatPercent(summary.margemFiscalPercentual),
      delta: compareLastTwo(monthlySeries, "margemFiscalPercentual"),
      footer: `${currency.format(summary.custoFiscal + summary.impostos)} custo + impostos`,
    },
    {
      label: "Itens vendidos",
      icon: "#",
      value: number.format(summary.quantidadeItensVendidos),
      delta: compareLastTwo(monthlySeries, "quantidadeItensVendidos"),
      footer: `${number.format(summary.contagemProdutos)} SKUs`,
    },
    {
      label: "Ticket médio unitário",
      icon: "T",
      value: currencyWithCents.format(summary.ticketMedioUnitario),
      delta: compareLastTwo(monthlySeries, "ticketMedioUnitario"),
      footer: "Valor líquido por item",
    },
    {
      label: "Verbas totais",
      icon: "V",
      value: currency.format(summary.verbasTotais),
      delta: compareLastTwo(monthlySeries, "verbasTotais"),
      footer: `${number.format(summary.registros)} registros`,
    },
  ];

  container.innerHTML = cards.map((card) => `
    <article class="kpi-card">
      <div class="kpi-topline">
        <span class="kpi-label">${card.label}</span>
        <span class="kpi-icon">${card.icon}</span>
      </div>
      <strong class="kpi-value">${card.value}</strong>
      <div class="kpi-footer">
        <span>${card.footer}</span>
        ${renderDelta(card.delta)}
      </div>
    </article>
  `).join("");
}
