import { currency, currencyWithCents, number, formatPercent, escapeHtml } from "../utils/formatters.js";

const safe = (v) => (v === null || v === undefined ? "" : String(v));

function groupByBuyer(rows) {
  const map = new Map();

  for (const r of rows) {
    const comprador = safe(r.comprador).trim() || "SEM COMPRADOR";
    if (!map.has(comprador)) {
      map.set(comprador, {
        comprador,
        valorLiquido: 0,
        custoFiscal: 0,
        impostos: 0,
        quantidadeItensVendidos: 0,
        verbasTotais: 0,
      });
    }

    const acc = map.get(comprador);
    acc.valorLiquido += Number(r.valorLiquido || 0);
    acc.custoFiscal += Number(r.custoFiscal || 0);
    acc.impostos += Number(r.impostos || 0);
    acc.quantidadeItensVendidos += Number(r.quantidadeItensVendidos || 0);
    acc.verbasTotais += Number(r.verbasTotais || 0);
  }

  return Array.from(map.values())
    .map((x) => {
      const margemFiscalPercentual =
        x.valorLiquido > 0 ? ((x.valorLiquido - x.custoFiscal - x.impostos) / x.valorLiquido) * 100 : 0;
      const ticketMedioUnitario =
        x.quantidadeItensVendidos > 0 ? x.valorLiquido / x.quantidadeItensVendidos : 0;

      return { ...x, margemFiscalPercentual, ticketMedioUnitario };
    })
    .sort((a, b) => b.valorLiquido - a.valorLiquido);
}

export function renderDataTable(container, data) {
  if (!container) {
    console.error("renderDataTable: container não encontrado");
    return;
  }

  const rows = Array.isArray(data) ? data : [];

  if (!rows.length) {
    container.innerHTML = `
      <header class="panel-header">
        <div>
          <h2>Tabela detalhada</h2>
          <p>Comprador / Mês / Empresa</p>
        </div>
      </header>
      <div class="empty-state">Nenhum dado para os filtros atuais.</div>
    `;
    return;
  }

  const byBuyer = groupByBuyer(rows);
  const topRows = rows.slice(0, 1000);

  const totalGeral = byBuyer.reduce(
    (acc, r) => {
      acc.valorLiquido += r.valorLiquido;
      acc.custoFiscal += r.custoFiscal;
      acc.impostos += r.impostos;
      acc.quantidadeItensVendidos += r.quantidadeItensVendidos;
      acc.verbasTotais += r.verbasTotais;
      return acc;
    },
    { valorLiquido: 0, custoFiscal: 0, impostos: 0, quantidadeItensVendidos: 0, verbasTotais: 0 }
  );

  const margemGeral =
    totalGeral.valorLiquido > 0
      ? ((totalGeral.valorLiquido - totalGeral.custoFiscal - totalGeral.impostos) / totalGeral.valorLiquido) * 100
      : 0;

  const ticketGeral =
    totalGeral.quantidadeItensVendidos > 0
      ? totalGeral.valorLiquido / totalGeral.quantidadeItensVendidos
      : 0;

  container.innerHTML = `
    <header class="panel-header">
      <div>
        <h2>Tabela detalhada</h2>
        <p>Comprador / Mês / Empresa</p>
      </div>
      <span class="metric-badge">${number.format(rows.length)} linhas</span>
    </header>

    <section style="margin-bottom:12px">
      <header class="panel-header" style="margin-bottom:8px">
        <div>
          <h3 style="margin:0">Somatório por comprador</h3>
          <p style="margin:2px 0 0;opacity:.8">${number.format(byBuyer.length)} compradores</p>
        </div>
      </header>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Comprador</th>
              <th class="numeric">Vendas líquidas</th>
              <th class="numeric">Margem fiscal</th>
              <th class="numeric">Itens vendidos</th>
              <th class="numeric">Ticket Médio Unitário</th>
              <th class="numeric">Verbas Totais</th>
            </tr>
          </thead>
          <tbody>
            ${byBuyer.map((r) => `
              <tr>
                <td>${escapeHtml(r.comprador)}</td>
                <td class="numeric">${currency.format(r.valorLiquido)}</td>
                <td class="numeric">${formatPercent(r.margemFiscalPercentual)}</td>
                <td class="numeric">${number.format(r.quantidadeItensVendidos)}</td>
                <td class="numeric">${currencyWithCents.format(r.ticketMedioUnitario)}</td>
                <td class="numeric">${currency.format(r.verbasTotais)}</td>
              </tr>
            `).join("")}
            <tr>
              <td><strong>TOTAL GERAL</strong></td>
              <td class="numeric"><strong>${currency.format(totalGeral.valorLiquido)}</strong></td>
              <td class="numeric"><strong>${formatPercent(margemGeral)}</strong></td>
              <td class="numeric"><strong>${number.format(totalGeral.quantidadeItensVendidos)}</strong></td>
              <td class="numeric"><strong>${currencyWithCents.format(ticketGeral)}</strong></td>
              <td class="numeric"><strong>${currency.format(totalGeral.verbasTotais)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <header class="panel-header" style="margin-bottom:8px">
        <div>
          <h3 style="margin:0">Detalhamento de linhas</h3>
          <p style="margin:2px 0 0;opacity:.8">Exibindo até 1.000 registros</p>
        </div>
      </header>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Comprador</th>
              <th>Empresa</th>
              <th>Mês</th>
              <th class="numeric">Vendas líquidas</th>
              <th class="numeric">Margem fiscal</th>
              <th class="numeric">Itens vendidos</th>
              <th class="numeric">Ticket Médio Unitário</th>
              <th class="numeric">Verbas Totais</th>
            </tr>
          </thead>
          <tbody>
            ${topRows.map((r) => `
              <tr>
                <td>${escapeHtml(safe(r.comprador))}</td>
                <td>${escapeHtml(safe(r.empresa))}</td>
                <td>${escapeHtml(safe(r.mes))}</td>
                <td class="numeric">${currency.format(Number(r.valorLiquido || 0))}</td>
                <td class="numeric">${formatPercent(Number(r.margemFiscalPercentual || 0))}</td>
                <td class="numeric">${number.format(Number(r.quantidadeItensVendidos || 0))}</td>
                <td class="numeric">${currencyWithCents.format(Number(r.ticketMedioUnitario || 0))}</td>
                <td class="numeric">${currency.format(Number(r.verbasTotais || 0))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
