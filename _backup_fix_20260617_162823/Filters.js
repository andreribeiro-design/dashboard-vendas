import { escapeHtml } from "../utils/formatters.js";

function buildOptions(values, currentValue, allLabel = "Todos") {
  const options = [`<option value="all">${escapeHtml(allLabel)}</option>`];

  for (const item of values) {
    const value = String(item);
    const selected = String(currentValue) === value ? "selected" : "";
    options.push(`<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(value)}</option>`);
  }

  return options.join("");
}

export function renderFilters(container, options, filters, onChange, onReset) {
  const { compradores = [], empresas = [], meses = [] } = options;

  container.innerHTML = `
    <div class="filters">
      <div class="field">
        <label for="filter-empresa">Empresa</label>
        <select id="filter-empresa" class="select">
          ${buildOptions(empresas, filters.empresa, "Todas")}
        </select>
      </div>

      <div class="field">
        <label for="filter-comprador">Comprador</label>
        <select id="filter-comprador" class="select">
          ${buildOptions(compradores, filters.comprador, "Todos")}
        </select>
      </div>

      <div class="field">
        <label for="filter-mes">Mês</label>
        <select id="filter-mes" class="select">
          <option value="all">Todos</option>
          ${meses
            .map(
              (m) => {
                const value = String(m.codigoMes);
                const selected = String(filters.codigoMes) === value ? "selected" : "";
                return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(m.mes)}</option>`;
              }
            )
            .join("")}
        </select>
      </div>

      <div class="field">
        <label>&nbsp;</label>
        <button id="reset-filters" class="reset-button" type="button">Limpar filtros</button>
      </div>
    </div>
  `;

  container.querySelector("#filter-empresa")?.addEventListener("change", (e) => {
    onChange("empresa", e.target.value);
  });

  container.querySelector("#filter-comprador")?.addEventListener("change", (e) => {
    onChange("comprador", e.target.value);
  });

  container.querySelector("#filter-mes")?.addEventListener("change", (e) => {
    onChange("codigoMes", e.target.value);
  });

  container.querySelector("#reset-filters")?.addEventListener("click", () => {
    onReset();
  });
}