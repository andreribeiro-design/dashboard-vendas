import { parseSalesCsv } from "./utils/salesCsvParser.js";
import { createDashboardStore } from "./state/store.js";
import { calculateSummary, buildMonthlySeries, buildBuyerRanking } from "./utils/metrics.js";
import { renderFilters } from "./components/Filters.js";
import { renderKpiCards } from "./components/KpiCards.js";
import { renderLineChart, renderBuyerRanking } from "./components/Charts.js";
import { renderDataTable } from "./components/DataTable.js";

const STORAGE_KEY = "dashboard-vendas-cache-v1";
let store = null;

function getNodes() {
  return {
    filters: document.getElementById("filters"),
    kpis: document.getElementById("kpi-cards"),
    monthlyChart: document.getElementById("monthly-chart"),
    lineBadge: document.getElementById("line-chart-badge"),
    ranking: document.getElementById("buyer-ranking"),
    table: document.getElementById("data-table"),
    importBtn: document.getElementById("import-sales-button"),
    fileInput: document.getElementById("sales-file-input"),
    status: document.getElementById("import-status"),
    resetBrand: document.getElementById("brand-reset"),
  };
}

function setStatus(message, type = "success") {
  const { status } = getNodes();
  if (!status) return;
  status.textContent = message;
  status.className = `status-pill ${type}`;
}

function keepLastMonths(rows, months = 12) {
  const list = Array.isArray(rows) ? rows : [];
  const codes = [...new Set(list.map((r) => Number(r.codigoMes)).filter(Boolean))].sort((a, b) => a - b);
  const keep = new Set(codes.slice(-months));
  return list.filter((r) => keep.has(Number(r.codigoMes)));
}

async function loadInitialData() {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return keepLastMonths(JSON.parse(cached), 12);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const res = await fetch("./data/Venda_Comprador_Empresa.csv", { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar CSV base (${res.status})`);
  const text = await res.text();

  const parsed = keepLastMonths(parseSalesCsv(text), 12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  return parsed;
}

function render() {
  if (!store) return;
  const nodes = getNodes();
  const { options, filters, filteredData } = store.getView();

  renderFilters(
    nodes.filters,
    options,
    filters,
    (name, value) => { store.setFilter(name, value); render(); },
    () => { store.resetFilters(); render(); }
  );

  const summary = calculateSummary(filteredData);
  const monthly = buildMonthlySeries(filteredData);
  const ranking = buildBuyerRanking(filteredData);

  renderKpiCards(nodes.kpis, summary, monthly);
  renderLineChart(nodes.monthlyChart, nodes.lineBadge, monthly);
  renderBuyerRanking(nodes.ranking, ranking);
  renderDataTable(nodes.table, filteredData);
}

function mergeByImportedMonths(currentRows, importedRows) {
  const importedMonths = new Set((importedRows || []).map((r) => Number(r.codigoMes)).filter(Boolean));
  const base = (currentRows || []).filter((r) => !importedMonths.has(Number(r.codigoMes)));
  return keepLastMonths([...base, ...(importedRows || [])], 12);
}

function bindEvents() {
  const nodes = getNodes();

  nodes.importBtn?.addEventListener("click", () => {
    nodes.fileInput?.click();
  });

  nodes.fileInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = parseSalesCsv(text, store.getData?.() || []);
      const merged = mergeByImportedMonths(store.getData?.() || [], imported);

      store = createDashboardStore(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

      const months = [...new Set(imported.map((r) => r.mes).filter(Boolean))];
      setStatus(`Importado com sucesso (${months.join(", ") || "mês identificado"})`, "success");
      render();
    } catch (error) {
      console.error(error);
      setStatus(`Erro ao importar CSV: ${error.message}`, "error");
    } finally {
      event.target.value = "";
    }
  });

  nodes.resetBrand?.addEventListener("click", async () => {
    localStorage.removeItem(STORAGE_KEY);
    const data = await loadInitialData();
    store = createDashboardStore(data);
    setStatus("Base padrão recarregada", "success");
    render();
  });
}

async function boot() {
  const data = await loadInitialData();
  store = createDashboardStore(data);
  bindEvents();
  render();
  setStatus("Base carregada", "success");
}

window.addEventListener("DOMContentLoaded", () => {
  boot().catch((err) => {
    console.error(err);
    setStatus(`Falha ao iniciar: ${err.message}`, "error");
  });
});
