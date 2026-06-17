function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function injectTabStyles() {
  if (document.getElementById("stock-tab-styles")) return;
  const style = document.createElement("style");
  style.id = "stock-tab-styles";
  style.textContent = `
    .tabs-wrap { display:flex; gap:8px; margin:8px 0 12px; }
    .tab-btn {
      border:1px solid var(--border,#2b3440); background:var(--surface,#171c22); color:var(--text,#eef2f6);
      border-radius:10px; padding:8px 12px; font-weight:700; cursor:pointer;
    }
    .tab-btn.active { background:var(--cyan,#58c4dd); color:#06202b; border-color:transparent; }

    .stock-panel { background:var(--surface,#171c22); border:1px solid var(--border,#2b3440); border-radius:12px; padding:14px; }
    .stock-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:12px; }
    .stock-card { background:var(--surface,#171c22); border:1px solid var(--border,#2b3440); border-radius:12px; padding:12px; }
    .stock-card .label { font-size:12px; color:#9fb0c6; text-transform:uppercase; font-weight:800; }
    .stock-card .value { font-size:24px; font-weight:900; margin-top:6px; }

    .stock-filters {
      display:grid; grid-template-columns:repeat(3,minmax(180px,1fr)); gap:10px;
      background:var(--surface,#171c22); border:1px solid var(--border,#2b3440); border-radius:12px; padding:12px; margin-bottom:12px;
    }
    .stock-field { display:grid; gap:6px; }
    .stock-field label { font-size:12px; color:#9fb0c6; font-weight:700; text-transform:uppercase; }
    .stock-select, .stock-reset {
      min-height:38px; border:1px solid var(--border,#2b3440); border-radius:10px;
      background:var(--surface2,#1f2630); color:var(--text,#eef2f6); padding:0 10px;
    }
    .stock-reset { font-weight:700; cursor:pointer; }

    .stock-table-wrap { overflow:auto; border:1px solid var(--border,#2b3440); border-radius:10px; margin-top:10px; }
    .stock-table { width:100%; min-width:980px; border-collapse:collapse; }
    .stock-table th, .stock-table td { padding:10px 12px; border-bottom:1px solid var(--border,#2b3440); }
    .stock-table th { text-align:left; font-size:12px; text-transform:uppercase; color:#c7d2e0; }

    .stock-empty { padding:20px; border:1px dashed var(--border,#2b3440); border-radius:10px; color:#9fb0c6; text-align:center; }
    .stock-note { color:#9fb0c6; font-size:12px; margin-top:6px; }

    @media (max-width:980px){ .stock-grid{grid-template-columns:repeat(2,minmax(0,1fr));} .stock-filters{grid-template-columns:1fr 1fr;} }
    @media (max-width:640px){ .stock-grid{grid-template-columns:1fr;} .stock-filters{grid-template-columns:1fr;} }
  `;
  document.head.appendChild(style);
}

function detectDelimiter(line) {
  const semi = (line.match(/;/g) || []).length;
  const comma = (line.match(/,/g) || []).length;
  return semi >= comma ? ";" : ",";
}

function parsePtNumber(value) {
  const s = String(value ?? "").trim();
  if (!s) return 0;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
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

function normalize(s) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findColumn(headers, candidates) {
  const nHeaders = headers.map(normalize);
  for (const c of candidates) {
    const t = normalize(c);
    const idx = nHeaders.findIndex((h) => h.includes(t));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

function formatBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function formatInt(v) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v || 0);
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

function setupTabs() {
  const appShell = document.querySelector(".app-shell") || document.querySelector("main");
  if (!appShell) return null;

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

  const firstNode = salesNodes[0];
  const tabs = document.createElement("div");
  tabs.className = "tabs-wrap";
  tabs.innerHTML = `
    <button class="tab-btn active" id="tab-sales" type="button">Vendas</button>
    <button class="tab-btn" id="tab-stock" type="button">Estoque</button>
  `;
  firstNode.parentNode.insertBefore(tabs, firstNode);

  const viewSales = document.createElement("section");
  viewSales.id = "view-sales";
  const viewStock = document.createElement("section");
  viewStock.id = "view-stock";
  viewStock.style.display = "none";

  firstNode.parentNode.insertBefore(viewSales, firstNode);
  firstNode.parentNode.insertBefore(viewStock, firstNode.nextSibling);
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

function renderStock(viewStock, allRows) {
  viewStock.innerHTML = "";
  if (!allRows.length) {
    viewStock.innerHTML = `<div class="stock-empty">Arquivo de estoque vazio ou inválido.</div>`;
    return;
  }

  const headers = Object.keys(allRows[0]);

  const colEmpresa   = findColumn(headers, ["empresa", "filial", "loja", "unidade"]);
  const colComprador = findColumn(headers, ["comprador", "buyer"]);
  const colSku       = findColumn(headers, ["sku", "cod", "codigo", "produto", "item"]);
  const colQty       = findColumn(headers, ["estoque", "saldo", "qtd", "quantidade"]);
  const colValor     = findColumn(headers, ["valor", "custo", "preco", "preço", "total"]);

  const state = { empresa: "all", comprador: "all" };

  const filtersEl = document.createElement("section");
  filtersEl.className = "stock-filters";

  const bodyEl = document.createElement("div");
  viewStock.appendChild(filtersEl);
  viewStock.appendChild(bodyEl);

  function getFilteredRows() {
    return allRows.filter((r) => {
      const okEmpresa = state.empresa === "all" || String(r[colEmpresa] ?? "") === state.empresa;
      const okComprador = state.comprador === "all" || String(r[colComprador] ?? "") === state.comprador;
      return okEmpresa && okComprador;
    });
  }

  function buildOptions(rows, column) {
    if (!column) return [];
    return [...new Set(rows.map((r) => String(r[column] ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function option(value, label, selected) {
    const sel = String(value) === String(selected) ? "selected" : "";
    return `<option value="${escapeHtml(value)}" ${sel}>${escapeHtml(label)}</option>`;
  }

  function renderFilters() {
    const baseRowsForComprador = state.empresa === "all"
      ? allRows
      : allRows.filter((r) => String(r[colEmpresa] ?? "") === state.empresa);

    const empresas = buildOptions(allRows, colEmpresa);
    const compradores = buildOptions(baseRowsForComprador, colComprador);

    if (state.comprador !== "all" && !compradores.includes(state.comprador)) {
      state.comprador = "all";
    }

    const showEmpresa = Boolean(colEmpresa);
    const showComprador = Boolean(colComprador);

    filtersEl.innerHTML = `
      <div class="stock-field">
        <label>Empresa</label>
        <select id="stock-filter-empresa" class="stock-select" ${showEmpresa ? "" : "disabled"}>
          ${option("all", showEmpresa ? "Todas" : "Coluna não encontrada", state.empresa)}
          ${showEmpresa ? empresas.map((v) => option(v, v, state.empresa)).join("") : ""}
        </select>
      </div>

      <div class="stock-field">
        <label>Comprador</label>
        <select id="stock-filter-comprador" class="stock-select" ${showComprador ? "" : "disabled"}>
          ${option("all", showComprador ? "Todos" : "Coluna não encontrada", state.comprador)}
          ${showComprador ? compradores.map((v) => option(v, v, state.comprador)).join("") : ""}
        </select>
      </div>

      <div class="stock-field">
        <label>&nbsp;</label>
        <button id="stock-reset-filters" class="stock-reset" type="button">Limpar filtros</button>
      </div>
    `;

    filtersEl.querySelector("#stock-filter-empresa")?.addEventListener("change", (e) => {
      state.empresa = e.target.value;
      renderFilters();
      renderBody();
    });

    filtersEl.querySelector("#stock-filter-comprador")?.addEventListener("change", (e) => {
      state.comprador = e.target.value;
      renderBody();
    });

    filtersEl.querySelector("#stock-reset-filters")?.addEventListener("click", () => {
      state.empresa = "all";
      state.comprador = "all";
      renderFilters();
      renderBody();
    });
  }

  function renderBody() {
    const rows = getFilteredRows();

    const totalLinhas = rows.length;
    const totalSkus = colSku ? new Set(rows.map((r) => String(r[colSku] || "").trim()).filter(Boolean)).size : rows.length;
    const totalQtd = colQty ? rows.reduce((s, r) => s + parsePtNumber(r[colQty]), 0) : 0;
    const totalValor = colValor ? rows.reduce((s, r) => s + parsePtNumber(r[colValor]), 0) : 0;

    const showHeaders = headers.slice(0, 12);
    const tableRows = rows.slice(0, 1000).map((r) =>
      `<tr>${showHeaders.map((h) => `<td>${escapeHtml(r[h] ?? "")}</td>`).join("")}</tr>`
    ).join("");

    bodyEl.innerHTML = `
      <div class="stock-grid">
        <article class="stock-card"><div class="label">Linhas</div><div class="value">${formatInt(totalLinhas)}</div></article>
        <article class="stock-card"><div class="label">SKUs</div><div class="value">${formatInt(totalSkus)}</div></article>
        <article class="stock-card"><div class="label">Quantidade em estoque</div><div class="value">${formatInt(totalQtd)}</div></article>
        <article class="stock-card"><div class="label">Valor total estimado</div><div class="value">${formatBRL(totalValor)}</div></article>
      </div>

      <section class="stock-panel">
        <header class="panel-header">
          <div>
            <h2>Estoque atual</h2>
            <p>Fonte: data/Estoque_Atual</p>
          </div>
          <span class="metric-badge">${formatInt(totalLinhas)} registros</span>
        </header>

        ${rows.length ? `
          <div class="stock-table-wrap">
            <table class="stock-table">
              <thead><tr>${showHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
          <div class="stock-note">Exibindo até 1.000 linhas.</div>
        ` : `<div class="stock-empty">Sem dados para os filtros selecionados.</div>`}
      </section>
    `;
  }

  renderFilters();
  renderBody();
}

async function initStockTab() {
  injectTabStyles();
  const viewStock = setupTabs();
  if (!viewStock) return;

  viewStock.innerHTML = `<div class="stock-empty">Carregando arquivo de estoque...</div>`;
  try {
    const text = await fetchStockFile();
    const rows = parseCsv(text);
    renderStock(viewStock, rows);
  } catch (err) {
    viewStock.innerHTML = `<div class="stock-empty">Falha ao carregar estoque: ${escapeHtml(err.message)}</div>`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(initStockTab, 80);
});
