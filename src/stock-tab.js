function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectDelimiter(line) {
  const semi = (line.match(/;/g) || []).length;
  const comma = (line.match(/,/g) || []).length;
  return semi >= comma ? ";" : ",";
}

function parsePtNumber(v) {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatInt(v) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v || 0);
}

function formatNumber(v) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v || 0);
}

function parseCsv(text) {
  const raw = text.replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const delim = detectDelimiter(lines[0]);
  const headers = lines[0].split(delim).map((h) => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim);
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = (cols[idx] ?? "").trim()));
    rows.push(obj);
  }
  return rows;
}

function findColumn(headers, aliases) {
  const nHeaders = headers.map(norm);
  for (const a of aliases) {
    const t = norm(a);
    const idx = nHeaders.findIndex((h) => h === t || h.includes(t));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

function injectStyles() {
  if (document.getElementById("stock-tab-styles-v2")) return;
  const style = document.createElement("style");
  style.id = "stock-tab-styles-v2";
  style.textContent = `
    .tabs-wrap{display:flex;gap:8px;margin:8px 0 12px}
    .tab-btn{border:1px solid var(--border,#2b3440);background:var(--surface,#171c22);color:var(--text,#eef2f6);border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer}
    .tab-btn.active{background:var(--cyan,#58c4dd);color:#06202b;border-color:transparent}

    .stock-filters{
      display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:10px;
      background:var(--surface,#171c22);border:1px solid var(--border,#2b3440);border-radius:12px;padding:12px;margin-bottom:12px;
    }
    .stock-field{display:grid;gap:6px}
    .stock-field label{font-size:12px;color:#9fb0c6;font-weight:700;text-transform:uppercase}
    .stock-select,.stock-reset{
      min-height:38px;border:1px solid var(--border,#2b3440);border-radius:10px;
      background:var(--surface2,#1f2630);color:var(--text,#eef2f6);padding:0 10px;
    }
    .stock-reset{font-weight:700;cursor:pointer}

    .stock-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:12px}
    .stock-card{background:var(--surface,#171c22);border:1px solid var(--border,#2b3440);border-radius:12px;padding:12px}
    .stock-card .label{font-size:12px;color:#9fb0c6;text-transform:uppercase;font-weight:800}
    .stock-card .value{font-size:24px;font-weight:900;margin-top:6px}

    .stock-panel{background:var(--surface,#171c22);border:1px solid var(--border,#2b3440);border-radius:12px;padding:14px}
    .stock-table-wrap{overflow:auto;border:1px solid var(--border,#2b3440);border-radius:10px;margin-top:10px}
    .stock-table{width:100%;min-width:760px;border-collapse:collapse}
    .stock-table th,.stock-table td{padding:10px 12px;border-bottom:1px solid var(--border,#2b3440)}
    .stock-table th{text-align:left;font-size:12px;text-transform:uppercase;color:#c7d2e0}
    .stock-table td.numeric,.stock-table th.numeric{text-align:right}
    .stock-empty{padding:20px;border:1px dashed var(--border,#2b3440);border-radius:10px;color:#9fb0c6;text-align:center}
    .stock-note{color:#9fb0c6;font-size:12px;margin-top:8px}

    @media (max-width:900px){.stock-kpis{grid-template-columns:1fr 1fr}.stock-filters{grid-template-columns:1fr 1fr}}
    @media (max-width:640px){.stock-kpis,.stock-filters{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function setupTabs() {
  if (document.getElementById("view-sales") && document.getElementById("view-stock")) {
    return document.getElementById("view-stock");
  }

  const salesNodes = [
    document.getElementById("filters"),
    document.getElementById("kpi-cards"),
    document.querySelector(".visual-grid"),
    document.getElementById("data-table")
  ].filter(Boolean);

  if (!salesNodes.length) return null;

  const first = salesNodes[0];
  const tabs = document.createElement("div");
  tabs.className = "tabs-wrap";
  tabs.innerHTML = `
    <button class="tab-btn active" id="tab-sales" type="button">Vendas</button>
    <button class="tab-btn" id="tab-stock" type="button">Estoque</button>
  `;
  first.parentNode.insertBefore(tabs, first);

  const viewSales = document.createElement("section");
  viewSales.id = "view-sales";
  const viewStock = document.createElement("section");
  viewStock.id = "view-stock";
  viewStock.style.display = "none";

  first.parentNode.insertBefore(viewSales, first);
  first.parentNode.insertBefore(viewStock, first.nextSibling);

  salesNodes.forEach((n) => viewSales.appendChild(n));

  const bSales = tabs.querySelector("#tab-sales");
  const bStock = tabs.querySelector("#tab-stock");

  bSales.addEventListener("click", () => {
    bSales.classList.add("active");
    bStock.classList.remove("active");
    viewSales.style.display = "";
    viewStock.style.display = "none";
  });

  bStock.addEventListener("click", () => {
    bStock.classList.add("active");
    bSales.classList.remove("active");
    viewStock.style.display = "";
    viewSales.style.display = "none";
  });

  return viewStock;
}

async function fetchStockFile() {
  const candidates = ["./data/Estoque_Atual.csv", "./data/Estoque_Atual.txt", "./data/Estoque_Atual"];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.text();
    } catch {}
  }
  throw new Error("Arquivo não encontrado em data/: Estoque_Atual(.csv/.txt)");
}

function renderStock(viewStock, allRows) {
  viewStock.innerHTML = "";

  if (!Array.isArray(allRows) || !allRows.length) {
    viewStock.innerHTML = `<div class="stock-empty">Arquivo de estoque vazio ou inválido.</div>`;
    return;
  }

  const headers = Object.keys(allRows[0]);

  const colComprador = findColumn(headers, ["Comprador", "buyer"]);
  const colEmpresa = findColumn(headers, ["Empresa", "Filial", "Loja", "Unidade"]);
  const colEstoque = findColumn(headers, ["Estoque Gerencial", "Estoque", "Saldo", "Quantidade", "Qtd"]);

  const state = { comprador: "all", empresa: "all" };

  const filtersWrap = document.createElement("section");
  filtersWrap.className = "stock-filters";
  const bodyWrap = document.createElement("div");

  viewStock.appendChild(filtersWrap);
  viewStock.appendChild(bodyWrap);

  function uniqueValues(rows, col) {
    if (!col) return [];
    return [...new Set(rows.map((r) => String(r[col] ?? "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function getFiltered() {
    return allRows.filter((r) => {
      const okC = state.comprador === "all" || String(r[colComprador] ?? "") === state.comprador;
      const okE = state.empresa === "all" || String(r[colEmpresa] ?? "") === state.empresa;
      return okC && okE;
    });
  }

  function renderFilters() {
    const compradoresBase = state.empresa === "all"
      ? allRows
      : allRows.filter((r) => String(r[colEmpresa] ?? "") === state.empresa);

    const compradores = uniqueValues(compradoresBase, colComprador);
    const empresas = uniqueValues(allRows, colEmpresa);

    if (state.comprador !== "all" && !compradores.includes(state.comprador)) {
      state.comprador = "all";
    }

    const opt = (val, txt, selected) =>
      `<option value="${esc(val)}" ${val === selected ? "selected" : ""}>${esc(txt)}</option>`;

    filtersWrap.innerHTML = `
      <div class="stock-field">
        <label>Comprador</label>
        <select id="stock-filter-comprador" class="stock-select" ${colComprador ? "" : "disabled"}>
          ${opt("all", colComprador ? "Todos" : "Coluna não encontrada", state.comprador)}
          ${colComprador ? compradores.map((v) => opt(v, v, state.comprador)).join("") : ""}
        </select>
      </div>

      <div class="stock-field">
        <label>Empresa</label>
        <select id="stock-filter-empresa" class="stock-select" ${colEmpresa ? "" : "disabled"}>
          ${opt("all", colEmpresa ? "Todas" : "Coluna não encontrada", state.empresa)}
          ${colEmpresa ? empresas.map((v) => opt(v, v, state.empresa)).join("") : ""}
        </select>
      </div>

      <div class="stock-field">
        <label>&nbsp;</label>
        <button id="stock-reset-filters" class="stock-reset" type="button">Limpar filtros</button>
      </div>
    `;

    filtersWrap.querySelector("#stock-filter-comprador")?.addEventListener("change", (e) => {
      state.comprador = e.target.value;
      renderBody();
    });

    filtersWrap.querySelector("#stock-filter-empresa")?.addEventListener("change", (e) => {
      state.empresa = e.target.value;
      renderFilters();
      renderBody();
    });

    filtersWrap.querySelector("#stock-reset-filters")?.addEventListener("click", () => {
      state.comprador = "all";
      state.empresa = "all";
      renderFilters();
      renderBody();
    });
  }

  function renderBody() {
    const rows = getFiltered();

    const totalLinhas = rows.length;
    const totalCompradores = colComprador
      ? new Set(rows.map((r) => String(r[colComprador] ?? "").trim()).filter(Boolean)).size
      : 0;
    const totalEstoque = colEstoque
      ? rows.reduce((s, r) => s + parsePtNumber(r[colEstoque]), 0)
      : 0;

    const tableRows = rows.slice(0, 1000).map((r) => {
      const comprador = colComprador ? r[colComprador] : "";
      const empresa = colEmpresa ? r[colEmpresa] : "";
      const estoque = colEstoque ? parsePtNumber(r[colEstoque]) : 0;

      return `
        <tr>
          <td>${esc(comprador)}</td>
          <td>${esc(empresa)}</td>
          <td class="numeric">${formatNumber(estoque)}</td>
        </tr>
      `;
    }).join("");

    bodyWrap.innerHTML = `
      <div class="stock-kpis">
        <article class="stock-card">
          <div class="label">Linhas</div>
          <div class="value">${formatInt(totalLinhas)}</div>
        </article>
        <article class="stock-card">
          <div class="label">Compradores</div>
          <div class="value">${formatInt(totalCompradores)}</div>
        </article>
        <article class="stock-card">
          <div class="label">Estoque Gerencial (Total)</div>
          <div class="value">${formatNumber(totalEstoque)}</div>
        </article>
      </div>

      <section class="stock-panel">
        <header class="panel-header">
          <div>
            <h2>Estoque atual</h2>
            <p>Colunas: Comprador, Empresa, Estoque Gerencial</p>
          </div>
          <span class="metric-badge">${formatInt(totalLinhas)} registros</span>
        </header>

        ${rows.length ? `
          <div class="stock-table-wrap">
            <table class="stock-table">
              <thead>
                <tr>
                  <th>Comprador</th>
                  <th>Empresa</th>
                  <th class="numeric">Estoque Gerencial</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
          <div class="stock-note">Exibindo até 1.000 linhas após os filtros.</div>
        ` : `<div class="stock-empty">Sem dados para os filtros selecionados.</div>`}
      </section>
    `;
  }

  renderFilters();
  renderBody();
}

async function initStockTab() {
  injectStyles();
  const viewStock = setupTabs();
  if (!viewStock) return;

  viewStock.innerHTML = `<div class="stock-empty">Carregando estoque...</div>`;

  try {
    const text = await fetchStockFile();
    const rows = parseCsv(text);
    renderStock(viewStock, rows);
  } catch (e) {
    viewStock.innerHTML = `<div class="stock-empty">Falha ao carregar estoque: ${esc(e.message)}</div>`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(initStockTab, 80);
});
