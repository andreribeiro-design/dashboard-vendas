function detectDelimiter(line) {
  const options = ["|", ";", "\t", ","];
  return options
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && insideQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (ch === '"') {
      insideQuotes = !insideQuotes;
    } else if (ch === delimiter && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !insideQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeHeader(value) {
  return normalizeText(value)
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseBrazilianNumber(value) {
  const clean = normalizeText(value)
    .replace(/R\$/gi, "")
    .replace(/%/g, "")
    .replace(/\s/g, "");

  if (!clean) return 0;

  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");

  let normalized = clean;

  if (hasComma && hasDot) {
    // 1.234.567,89 -> 1234567.89
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    // 1234,56 -> 1234.56
    normalized = normalized.replace(",", ".");
  } else if (!hasComma && hasDot) {
    // Pode ser milhar ou decimal já em padrão internacional
    // Mantém como está para Number interpretar
  }

  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function pickValue(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const wanted = normalizeHeader(alias);
    const foundKey = keys.find((key) => normalizeHeader(key) === wanted);
    if (foundKey !== undefined && normalizeText(row[foundKey]) !== "") {
      return row[foundKey];
    }
  }
  return "";
}

function buildCompanyResolver(existingRows, importedRows) {
  const existingCompanies = Array.from(
    new Set(existingRows.map((row) => normalizeText(row.empresa)).filter(Boolean)),
  ).sort();

  const fallbackCompanies =
    existingCompanies.length > 0
      ? existingCompanies
      : ["01-MATRIZ", "02-FILIAL", "03-UNIDADE", "04-UNIDADE", "05-UNIDADE", "06-UNIDADE"];

  const buyerToCompany = new Map(
    existingRows
      .filter((row) => normalizeText(row.comprador) && normalizeText(row.empresa))
      .map((row) => [normalizeText(row.comprador), normalizeText(row.empresa)]),
  );

  importedRows.forEach((row) => {
    const comprador = normalizeText(pickValue(row, ["Comprador"]));
    const empresa = normalizeText(pickValue(row, ["Empresa"]));
    if (comprador && empresa) buyerToCompany.set(comprador, empresa);
  });

  let nextCompanyIndex = 0;

  return (comprador, row) => {
    const explicitCompany = normalizeText(pickValue(row, ["Empresa"]));
    if (explicitCompany) return explicitCompany;

    if (buyerToCompany.has(comprador)) {
      return buyerToCompany.get(comprador);
    }

    const company = fallbackCompanies[nextCompanyIndex % fallbackCompanies.length];
    buyerToCompany.set(comprador, company);
    nextCompanyIndex += 1;
    return company;
  };
}

export function parseSalesCsv(text, existingRows = []) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstLine) throw new Error("Arquivo vazio.");

  const delimiter = detectDelimiter(firstLine);
  const table = parseDelimited(text, delimiter).filter((row) =>
    row.some((cell) => normalizeText(cell)),
  );

  const headers = table.shift()?.map(normalizeHeader) ?? [];
  const rows = table.map((cells) =>
    headers.reduce((record, header, index) => {
      record[header] = cells[index] ?? "";
      return record;
    }, {}),
  );

  const resolveCompany = buildCompanyResolver(existingRows, rows);
  let importedIndex = 0;

  const parsedRows = rows
    .filter((row) => {
      const comprador = normalizeText(pickValue(row, ["Comprador"]));
      const codigoMes = normalizeText(pickValue(row, ["Código Mês", "Codigo Mes"]));
      return comprador && /^\d{6}$/.test(codigoMes);
    })
    .map((row) => {
      importedIndex += 1;

      const comprador = normalizeText(pickValue(row, ["Comprador"]));
      const codigoMes = Number(normalizeText(pickValue(row, ["Código Mês", "Codigo Mes"])));
      const mes = normalizeText(pickValue(row, ["Mês", "Mes"]));
      const empresa = resolveCompany(comprador, row);

      const quantidadeItensVendidos = round(
        parseBrazilianNumber(pickValue(row, ["Quantidade de Itens Vendidos"])),
        0,
      );

      const valorLiquido = round(
        parseBrazilianNumber(pickValue(row, ["Venda Líquida Total", "Venda Liquida Total"])),
      );

      const ticketMedioUnitario = round(
        parseBrazilianNumber(pickValue(row, ["Ticket Médio Unitário", "Ticket Medio Unitario"])),
      );

      const verbasTotais = round(
        parseBrazilianNumber(pickValue(row, ["Verbas Totais", "VERBAS TOTAIS"])),
      );

      const custoFiscal = round(
        parseBrazilianNumber(pickValue(row, ["Custo Fiscal"])),
      );

      const impostos = round(
        parseBrazilianNumber(pickValue(row, ["Impostos"])),
      );

      const margemInformada = parseBrazilianNumber(
        pickValue(row, ["Margem Fiscal %", "MG Fiscal %"]),
      );

      const margemCalculada =
        valorLiquido > 0 ? ((valorLiquido - custoFiscal - impostos) / valorLiquido) * 100 : 0;

      return {
        id: `import-${codigoMes}-${comprador
          .toLocaleLowerCase("pt-BR")
          .replace(/[^a-z0-9]+/gi, "-")}-${importedIndex}`,
        comprador,
        codigoMes,
        mes,
        empresa,
        quantidadeItensVendidos,
        valorLiquido,
        custoFiscal,
        impostos,
        margemFiscalPercentual: round(margemInformada || margemCalculada),
        verbasTotais,
        ticketMedioUnitario,
      };
    });

  if (parsedRows.length === 0) {
    throw new Error("Nenhum registro válido encontrado.");
  }

  return parsedRows;
}
