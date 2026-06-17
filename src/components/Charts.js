import { currency, formatPercent, escapeHtml } from "../utils/formatters.js";

function normalizeMonthly(rawSeries) {
  const rows = Array.isArray(rawSeries) ? rawSeries : [];
  const map = new Map();

  for (const r of rows) {
    const codigoMes = Number(r?.codigoMes);
    const mes = String(r?.mes ?? "").trim();
    if (!Number.isFinite(codigoMes) && !mes) continue;

    const key = Number.isFinite(codigoMes) ? String(codigoMes) : mes;
    if (!map.has(key)) {
      map.set(key, {
        codigoMes: Number.isFinite(codigoMes) ? codigoMes : 0,
        mes: mes || key,
        valorLiquido: 0,
        custoFiscal: 0,
        impostos: 0,
        margemWeighted: 0,
        margemWeight: 0
      });
    }

    const acc = map.get(key);
    const vl = Number(r?.valorLiquido || 0);
    const cf = Number(r?.custoFiscal || 0);
    const im = Number(r?.impostos || 0);
    const mg = Number(r?.margemFiscalPercentual || 0);

    acc.valorLiquido += vl;
    acc.custoFiscal += cf;
    acc.impostos += im;
    acc.margemWeighted += mg * (vl || 1);
    acc.margemWeight += (vl || 1);

    if (!acc.mes && mes) acc.mes = mes;
    if (!acc.codigoMes && Number.isFinite(codigoMes)) acc.codigoMes = codigoMes;
  }

  const out = Array.from(map.values())
    .map((m) => {
      let margem = 0;
      if ((m.custoFiscal !== 0 || m.impostos !== 0) && m.valorLiquido > 0) {
        margem = ((m.valorLiquido - m.custoFiscal - m.impostos) / m.valorLiquido) * 100;
      } else if (m.margemWeight > 0) {
        margem = m.margemWeighted / m.margemWeight;
      }
      return {
        codigoMes: Number(m.codigoMes || 0),
        mes: m.mes,
        valorLiquido: m.valorLiquido,
        margemFiscalPercentual: margem
      };
    })
    .sort((a, b) => a.codigoMes - b.codigoMes)
    .slice(-12);

  return out;
}

function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
  if (domainMax === domainMin) {
    const mid = (rangeMin + rangeMax) / 2;
    return () => mid;
  }
  const d = domainMax - domainMin;
  const r = rangeMax - rangeMin;
  return (v) => rangeMin + ((v - domainMin) / d) * r;
}

export function renderLineChart(container, badgeNode, rawSeries) {
  if (!container) return;

  const series = normalizeMonthly(rawSeries);
  container.innerHTML = "";

  if (badgeNode) {
    badgeNode.textContent = series.length ? `Último mês: ${series.at(-1).mes}` : "Sem série";
  }

  if (!series.length) {
    container.innerHTML = '<div class="empty-state">Sem dados para o gráfico.</div>';
    return;
  }

  const width = Math.max(820, Math.floor(container.clientWidth || 980));
  const height = 340;
  const m = { top: 16, right: 62, bottom: 52, left: 72 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  const sales = series.map((d) => Number(d.valorLiquido || 0));
  const margins = series.map((d) => Number(d.margemFiscalPercentual || 0));

  const sMin = 0;
  const sMax = Math.max(...sales, 1) * 1.08;

  const minMargin = Math.min(...margins, 0);
  const maxMargin = Math.max(...margins, 0);
  const pad = Math.max(2, (maxMargin - minMargin) * 0.15);
  const mMin = minMargin - pad;
  const mMax = maxMargin + pad;

  const x = linearScale(0, Math.max(series.length - 1, 1), 0, iw);
  const ySales = linearScale(sMin, sMax, ih, 0);
  const yMargin = linearScale(mMin, mMax, ih, 0);

  const salesPath = series.map((d, i) => `${i ? "L" : "M"} ${x(i).toFixed(2)} ${ySales(Number(d.valorLiquido || 0)).toFixed(2)}`).join(" ");
  const marginPath = series.map((d, i) => `${i ? "L" : "M"} ${x(i).toFixed(2)} ${yMargin(Number(d.margemFiscalPercentual || 0)).toFixed(2)}`).join(" ");

  container.style.position = "relative";
  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução mensal de vendas e margem">
      <g transform="translate(${m.left},${m.top})">
        <line x1="0" y1="${ih}" x2="${iw}" y2="${ih}" class="axis-line"></line>
        <line x1="0" y1="0" x2="0" y2="${ih}" class="axis-line"></line>
        <line x1="${iw}" y1="0" x2="${iw}" y2="${ih}" class="axis-line"></line>

        <path d="${salesPath}" class="sales-line" fill="none"></path>
        <path d="${marginPath}" class="margin-line" fill="none"></path>

        ${series.map((d, i) => `<circle cx="${x(i)}" cy="${ySales(Number(d.valorLiquido || 0))}" r="3.5" fill="var(--cyan)"></circle>`).join("")}
        ${series.map((d, i) => `<circle cx="${x(i)}" cy="${yMargin(Number(d.margemFiscalPercentual || 0))}" r="3.5" fill="var(--green)"></circle>`).join("")}

        ${series.map((d, i) => `<text x="${x(i)}" y="${ih + 22}" text-anchor="middle" class="axis-label">${escapeHtml(d.mes || "")}</text>`).join("")}

        ${series.map((d, i) => {
          const colW = iw / Math.max(series.length, 1);
          const startX = Math.max(0, x(i) - colW / 2);
          return `<rect class="hover-zone" data-idx="${i}" x="${startX}" y="0" width="${colW}" height="${ih}" fill="transparent"></rect>`;
        }).join("")}
      </g>
    </svg>

    <div class="chart-legend">
      <span class="legend-item"><span class="legend-swatch" style="background:var(--cyan)"></span>Faturamento</span>
      <span class="legend-item"><span class="legend-swatch" style="background:var(--green)"></span>Margem</span>
    </div>

    <div class="chart-tooltip" style="position:absolute;display:none;pointer-events:none;z-index:5;background:#0d141d;border:1px solid #2b3b4d;border-radius:8px;padding:8px 10px;color:#e9f1fb;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.35)"></div>
  `;

  const tooltip = container.querySelector(".chart-tooltip");
  const zones = container.querySelectorAll(".hover-zone");

  zones.forEach((zone) => {
    zone.addEventListener("mousemove", (ev) => {
      const idx = Number(zone.getAttribute("data-idx"));
      const d = series[idx];
      if (!d || !tooltip) return;

      tooltip.innerHTML = `
        <strong>${escapeHtml(d.mes || "")}</strong><br>
        Faturamento: ${currency.format(Number(d.valorLiquido || 0))}<br>
        Margem: ${formatPercent(Number(d.margemFiscalPercentual || 0))}
      `;
      tooltip.style.display = "block";

      const rect = container.getBoundingClientRect();
      const left = ev.clientX - rect.left + 12;
      const top = ev.clientY - rect.top - 14;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    zone.addEventListener("mouseleave", () => {
      if (tooltip) tooltip.style.display = "none";
    });
  });
}

export function renderBuyerRanking(container, ranking) {
  if (!container) return;

  const rows = (Array.isArray(ranking) ? ranking : [])
    .filter((r) => r && r.comprador)
    .sort((a, b) => Number(b.valorLiquido || 0) - Number(a.valorLiquido || 0))
    .slice(0, 10);

  if (!rows.length) {
    container.innerHTML = '<div class="empty-state">Sem dados para o ranking.</div>';
    return;
  }

  const totalTop = rows.reduce((s, r) => s + Number(r.valorLiquido || 0), 0) || 1;

  container.innerHTML = `
    <div class="bar-list">
      ${rows.map((r, i) => {
        const venda = Number(r.valorLiquido || 0);
        const share = (venda / totalTop) * 100;
        const empresas = Array.isArray(r.empresas) ? r.empresas : [];
        const empresasTxt = empresas.length > 2 ? `${empresas.slice(0,2).join(", ")} +${empresas.length - 2}` : empresas.join(", ");

        return `
          <div class="bar-row">
            <div class="bar-name">
              <strong>${i + 1}. ${escapeHtml(String(r.comprador))}</strong>
              <span>${escapeHtml(empresasTxt)}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.max(3, share).toFixed(1)}%"></div>
            </div>
            <div class="bar-value">
              <span>${currency.format(venda)}</span>
              <span>${formatPercent(Number(r.margemFiscalPercentual || 0))}</span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
