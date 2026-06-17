import { escapeHtml } from "../utils/formatters.js";

function option(value, label, selectedValue) {
  const selected = String(value) === String(selectedValue) ? "selected" : "";
  return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`;
}

export function renderFilters(container, options, filters, onChange, onReset) {
  if (!container) return;

  const empresas = options?.empresas ?? [];
  const compradores = options?.compradores ?? [];
  const meses = options?.meses ?? [];

  container.innerHTML = `
    <div class="filters">
      <div class="field">
        <label for="filter-empresa">Empresa</label>
        <select id="filter-empresa" class="select">
          ${option("all", "Todas", filters.empresa)}
          ${empresas.map((e) => option(e, e, filters.empresa)).join("")}
        </select>
      </div>

      <div class="field">
        <label for="filter-comprador">Comprador</label>
        <select id="filter-comprador" class="select">
          ${option("all", "Todos", filters.comprador)}
          ${compradores.map((c) => option(c, c, filters.comprador)).join("")}
        </select>
      </div>

      <div class="field">
        <label for="filter-mes">Mês</label>
        <select id="filter-mes" class="select">
          ${option("all", "Todos", filters.codigoMes)}
          ${meses.map((m) => option(String(m.codigoMes), m.mes, filters.codigoMes)).join("")}
        </select>
      </div>

      <div class="field">
        <label>&nbsp;</label>
        <button id="reset-filters" class="reset-button" type="button">Limpar filtros</button>
      </div>
    </div>
  `;

  container.querySelector("#filter-empresa")?.addEventListener("change", (e) => onChange("empresa", e.target.value));
  container.querySelector("#filter-comprador")?.addEventListener("change", (e) => onChange("comprador", e.target.value));
  container.querySelector("#filter-mes")?.addEventListener("change", (e) => onChange("codigoMes", e.target.value));
  container.querySelector("#reset-filters")?.addEventListener("click", onReset);
}
