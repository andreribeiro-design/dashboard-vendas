function buildRowKey(row) {
  return `${row.codigoMes}|${row.comprador}|${row.empresa}`;
}

export function createDashboardStore(initialData) {
  let data = [...initialData];
  const filters = {
    comprador: "all",
    codigoMes: "all",
    empresa: "all",
  };

  function getOptions() {
    const compradores = Array.from(new Set(data.map((item) => item.comprador))).sort();
    const empresas = Array.from(new Set(data.map((item) => item.empresa))).sort();
    const meses = Array.from(
      new Map(data.map((item) => [item.codigoMes, { codigoMes: item.codigoMes, mes: item.mes }]))
        .values(),
    ).sort((a, b) => a.codigoMes - b.codigoMes);

    return { compradores, empresas, meses };
  }

  function getFilteredData() {
    return data.filter((item) => {
      const buyerMatch = filters.comprador === "all" || item.comprador === filters.comprador;
      const monthMatch = filters.codigoMes === "all" || item.codigoMes === Number(filters.codigoMes);
      const companyMatch = filters.empresa === "all" || item.empresa === filters.empresa;

      return buyerMatch && monthMatch && companyMatch;
    });
  }

  return {
    getData() {
      return [...data];
    },
    mergeImportedData(importedRows) {
      const importedKeys = new Set(importedRows.map(buildRowKey));
      data = data
        .filter((row) => !importedKeys.has(buildRowKey(row)))
        .concat(importedRows)
        .sort((a, b) => a.codigoMes - b.codigoMes || a.comprador.localeCompare(b.comprador, "pt-BR"));

      return {
        importedRows: importedRows.length,
        totalRows: data.length,
        months: Array.from(new Set(importedRows.map((row) => row.mes))).sort(),
      };
    },
    setFilter(name, value) {
      filters[name] = value;
    },
    resetFilters() {
      filters.comprador = "all";
      filters.codigoMes = "all";
      filters.empresa = "all";
    },
    getView() {
      return {
        filters: { ...filters },
        options: getOptions(),
        filteredData: getFilteredData(),
      };
    },
  };
}
