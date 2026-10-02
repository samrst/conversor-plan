/**
 * Exporter Service
 * Generates and downloads the official standardized Macro Excel (.xlsx) file
 * matching 100% of the visual and structural design from the updated 'modelo final po.xlsx' (13 columns with Categoria).
 * 100% Client-side.
 */

import { MODELO_FINAL_PO_BASE64 } from './excel-template.js';

export class ExporterService {
  /**
   * Helper to escape XML special characters
   * @param {any} val 
   * @returns {string}
   */
  static escapeXml(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Parses percentage value to decimal (e.g. "85.5%" or 85.5 -> 0.855)
   * @param {any} val 
   * @returns {number}
   */
  static parsePercentDecimal(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') {
      return val > 1 ? val / 100 : val;
    }
    const cleanStr = String(val).replace('%', '').replace(',', '.').trim();
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return 0;
    return num > 1 ? num / 100 : num;
  }

  /**
   * Generates and downloads an XLSX file conforming to 'modelo final po.xlsx'.
   * @param {string[]} columns - Ordered column headers (13 columns)
   * @param {Array<Record<string, any>>} rows - Processed rows
   * @param {string} fileName - Desired file name without extension
   */
  static async exportToXLSX(columns, rows, fileName = 'SAEP - Prova Objetiva') {
    try {
      // 1. Check if JSZip is available for high-fidelity template reproduction
      if (window.JSZip) {
        await this.exportWithTemplate(rows, fileName);
        return;
      }
    } catch (err) {
      console.warn('Falha na exportação via modelo template JSZip, utilizando fallback SheetJS:', err);
    }

    // 2. Fallback to SheetJS if JSZip or template fails
    this.exportWithSheetJS(columns, rows, fileName);
  }

  /**
   * High-Fidelity Template-based XLSX generation using 'modelo final po.xlsx'
   * Preserves:
   * - Banner Row 1: 'SAEP - Prova Objetiva' (height 82.5pt, blue fill, Calibri 48pt) + Embedded SENAI Logo image
   * - Header Row 2: Exact 13 columns with TableStyleMedium9 header formatting
   * - Data Rows: Rows 3 to N+2 formatted with numbers and percentages
   * - Totals Row: Row N+3 with exact =SUBTOTAL(109,Tabela1[...]) and =SUBTOTAL(101,Tabela1[...]) formulas
   * - Columns Widths: Exact widths matching official template
   * - All 3 Sheets: 'Worksheet', 'Listagem de dados ', 'Associação'
   */
  static async exportWithTemplate(rows, fileName) {
    const zip = new window.JSZip();

    // Load template from embedded Base64 (guaranteed offline availability)
    const zipInstance = await zip.loadAsync(MODELO_FINAL_PO_BASE64, { base64: true });

    const numRows = rows.length;
    const totalRowIdx = numRows + 3; // Header=2, Data=3..(numRows+2), Totals=(numRows+3)

    // 1. Update Table Definition: xl/tables/table1.xml
    const table1File = zipInstance.file('xl/tables/table1.xml');
    if (table1File) {
      let table1Xml = await table1File.async('text');
      table1Xml = table1Xml.replace(/ref="A2:M\d+"/, `ref="A2:M${totalRowIdx}"`);
      table1Xml = table1Xml.replace(/<autoFilter ref="A2:M\d+"/, `<autoFilter ref="A2:M${totalRowIdx - 1}"`);
      zipInstance.file('xl/tables/table1.xml', table1Xml);
    }

    // 2. Build SheetData for xl/worksheets/sheet1.xml
    const r1Xml = '<row r="1" spans="1:15" s="12" customFormat="1" ht="82.5" customHeight="1"><c r="A1" s="11" t="inlineStr"><is><t xml:space="preserve">                    SAEP - Prova Objetiva</t></is></c></row>';

    const headers = [
      { coord: 'A2', name: 'Departamento Regional (DR)' },
      { coord: 'B2', name: 'Unidade operacional (Escola)' },
      { coord: 'C2', name: 'Curso' },
      { coord: 'D2', name: 'Categoria' },
      { coord: 'E2', name: 'Modalidade' },
      { coord: 'F2', name: 'Turma' },
      { coord: 'G2', name: 'Alunos ' },
      { coord: 'H2', name: 'Alunos Aptos/Agendados' },
      { coord: 'I2', name: 'Alunos Inaptos/Não Agendados' },
      { coord: 'J2', name: 'Presentes' },
      { coord: 'K2', name: 'Presentes (%)' },
      { coord: 'L2', name: 'Ausentes' },
      { coord: 'M2', name: 'Ausentes (%)' }
    ];

    const r2Cells = headers
      .map((h) => `<c r="${h.coord}" s="1" t="inlineStr"><is><t>${this.escapeXml(h.name)}</t></is></c>`)
      .join('');
    const r2Xml = `<row r="2" spans="1:15" s="1" customFormat="1" ht="16.5" customHeight="1">${r2Cells}</row>`;

    let totAlunos = 0;
    let totAptosAgendados = 0;
    let totInaptosNaoAgendados = 0;
    let totPresentes = 0;
    let totAusentes = 0;

    const dataRowsXml = [];

    rows.forEach((row, idx) => {
      const rNum = idx + 3;

      const dr = row['Departamento Regional (DR)'] || 'SENAI-BA';
      const unidade = row['Unidade operacional (Escola)'] || '';
      const curso = row['Curso'] || '';
      const categoria = row['Categoria'] || 'CHP';
      const modalidade = row['Modalidade'] || 'Presencial';
      const turma = row['Turma'] || '';

      const alunos = parseInt(row['Alunos'] !== undefined ? row['Alunos'] : row['Alunos '] || 0, 10) || 0;
      const aptosAgendados = parseInt(row['Alunos Aptos/Agendados'] !== undefined ? row['Alunos Aptos/Agendados'] : row['Alunos Aptos'] || 0, 10) || 0;
      const inaptosNaoAgendados = parseInt(row['Alunos Inaptos/Não Agendados'] !== undefined ? row['Alunos Inaptos/Não Agendados'] : row['Alunos Inaptos'] || 0, 10) || 0;
      const presentes = parseInt(row['Presentes'] || 0, 10) || 0;
      const ausentes = parseInt(row['Ausentes'] || 0, 10) || 0;

      const presDec = this.parsePercentDecimal(row['Presentes (%)']);
      const ausDec = this.parsePercentDecimal(row['Ausentes (%)']);

      totAlunos += alunos;
      totAptosAgendados += aptosAgendados;
      totInaptosNaoAgendados += inaptosNaoAgendados;
      totPresentes += presentes;
      totAusentes += ausentes;

      const rowCells = [
        `<c r="A${rNum}" t="inlineStr"><is><t>${this.escapeXml(dr)}</t></is></c>`,
        `<c r="B${rNum}" t="inlineStr"><is><t>${this.escapeXml(unidade)}</t></is></c>`,
        `<c r="C${rNum}" t="inlineStr"><is><t>${this.escapeXml(curso)}</t></is></c>`,
        `<c r="D${rNum}" t="inlineStr"><is><t>${this.escapeXml(categoria)}</t></is></c>`,
        `<c r="E${rNum}" t="inlineStr"><is><t>${this.escapeXml(modalidade)}</t></is></c>`,
        `<c r="F${rNum}" t="inlineStr"><is><t>${this.escapeXml(turma)}</t></is></c>`,
        `<c r="G${rNum}" s="7"><v>${alunos}</v></c>`,
        `<c r="H${rNum}" s="5"><v>${aptosAgendados}</v></c>`,
        `<c r="I${rNum}" s="9"><v>${inaptosNaoAgendados}</v></c>`,
        `<c r="J${rNum}" s="5"><v>${presentes}</v></c>`,
        `<c r="K${rNum}" s="5"><v>${presDec.toFixed(4)}</v></c>`,
        `<c r="L${rNum}" s="5"><v>${ausentes}</v></c>`,
        `<c r="M${rNum}" s="5"><v>${ausDec.toFixed(4)}</v></c>`
      ].join('');

      dataRowsXml.push(`<row r="${rNum}" spans="1:15" ht="15.75" customHeight="1">${rowCells}</row>`);
    });

    const avgPresPct = totAptosAgendados > 0 ? totPresentes / totAptosAgendados : 0;
    const avgAusPct = totAptosAgendados > 0 ? totAusentes / totAptosAgendados : 0;

    const rTot = totalRowIdx;
    const totCells = [
      `<c r="A${rTot}" s="6" t="inlineStr"><is><t>Total</t></is></c>`,
      `<c r="F${rTot}" s="7"/>`,
      `<c r="G${rTot}" s="7"><f>SUBTOTAL(109,Tabela1[[Alunos ]])</f><v>${totAlunos}</v></c>`,
      `<c r="H${rTot}" s="5"><f>SUBTOTAL(109,Tabela1[Alunos Aptos/Agendados])</f><v>${totAptosAgendados}</v></c>`,
      `<c r="I${rTot}" s="5"><f>SUBTOTAL(109,Tabela1[Alunos Inaptos/Não Agendados])</f><v>${totInaptosNaoAgendados}</v></c>`,
      `<c r="J${rTot}" s="5"><f>SUBTOTAL(109,Tabela1[Presentes])</f><v>${totPresentes}</v></c>`,
      `<c r="K${rTot}" s="5"><f>SUBTOTAL(101,Tabela1[Presentes (%)])</f><v>${avgPresPct.toFixed(4)}</v></c>`,
      `<c r="L${rTot}" s="5"><f>SUBTOTAL(109,Tabela1[Ausentes])</f><v>${totAusentes}</v></c>`,
      `<c r="M${rTot}" s="5"><f>SUBTOTAL(101,Tabela1[Ausentes (%)])</f><v>${avgAusPct.toFixed(4)}</v></c>`
    ].join('');
    const totalRowXml = `<row r="${rTot}" spans="1:15" customFormat="1">${totCells}</row>`;

    const newSheetData = r1Xml + r2Xml + dataRowsXml.join('') + totalRowXml;

    // 3. Update xl/worksheets/sheet1.xml
    const sheet1File = zipInstance.file('xl/worksheets/sheet1.xml');
    if (sheet1File) {
      let sheet1Str = await sheet1File.async('text');
      sheet1Str = sheet1Str.replace(/<dimension ref="[A-Z0-9:]+"\/>/, `<dimension ref="A1:M${totalRowIdx}"/>`);
      sheet1Str = sheet1Str.replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${newSheetData}</sheetData>`);
      zipInstance.file('xl/worksheets/sheet1.xml', sheet1Str);
    }

    // 4. Remove calcChain.xml for clean recalculation in Excel
    zipInstance.remove('xl/calcChain.xml');
    const contentTypesFile = zipInstance.file('[Content_Types].xml');
    if (contentTypesFile) {
      let ctStr = await contentTypesFile.async('text');
      ctStr = ctStr.replace(
        /<Override PartName="\/xl\/calcChain\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.calcChain\+xml"\/>/,
        ''
      );
      zipInstance.file('[Content_Types].xml', ctStr);
    }
    const wbRelsFile = zipInstance.file('xl/_rels/workbook.xml.rels');
    if (wbRelsFile) {
      let relsStr = await wbRelsFile.async('text');
      relsStr = relsStr.replace(/<Relationship [^>]*Target="calcChain\.xml"[^>]*\/>/, '');
      zipInstance.file('xl/_rels/workbook.xml.rels', relsStr);
    }

    // 5. Generate and download binary blob
    const blob = await zipInstance.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fullFileName = `${fileName}_${timestamp}.xlsx`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fullFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Fallback exporter using SheetJS if JSZip or template manipulation is not available.
   */
  static exportWithSheetJS(columns, rows, fileName = 'SAEP - Prova Objetiva') {
    if (!window.XLSX) {
      throw new Error('Biblioteca XLSX indisponível para exportação.');
    }

    // Build worksheet with Banner in Row 1, Headers in Row 2, Data in Rows 3..N+2, Totals in Row N+3
    const aoa = [
      ['                    SAEP - Prova Objetiva'], // Row 1
      columns, // Row 2
      ...rows.map((row) =>
        columns.map((col) => {
          const v = row[col];
          return v !== undefined && v !== null ? v : '';
        })
      )
    ];

    const worksheet = window.XLSX.utils.aoa_to_sheet(aoa);

    // Merge Row 1 across all 13 columns A1:M1
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];

    // Row heights
    worksheet['!rows'] = [{ hpt: 82.5 }, { hpt: 16.5 }];

    // Column widths matching modelo final po.xlsx (13 columns)
    worksheet['!cols'] = [
      { wch: 31.3 }, // A: DR
      { wch: 29.3 }, // B: Escola
      { wch: 45.9 }, // C: Curso
      { wch: 16.3 }, // D: Categoria
      { wch: 24.0 }, // E: Modalidade
      { wch: 20.7 }, // F: Turma
      { wch: 23.7 }, // G: Alunos
      { wch: 28.4 }, // H: Alunos Aptos/Agendados
      { wch: 34.0 }, // I: Alunos Inaptos/Não Agendados
      { wch: 18.9 }, // J: Presentes
      { wch: 22.0 }, // K: Presentes (%)
      { wch: 21.9 }, // L: Ausentes
      { wch: 26.3 }  // M: Ausentes (%)
    ];

    const numRows = rows.length;
    // Autofilter for data range
    worksheet['!autofilter'] = { ref: `A2:M${numRows + 2}` };

    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Worksheet');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fullFileName = `${fileName}_${timestamp}.xlsx`;

    window.XLSX.writeFile(workbook, fullFileName);
  }

  /**
   * Generates and downloads a CSV file from the macro data with UTF-8 BOM.
   * @param {string[]} columns - Exact ordered column headers (13 columns)
   * @param {Array<Record<string, any>>} rows - Processed rows
   * @param {string} delimiter - Delimiter char (';' for PT-BR or ',')
   * @param {string} fileName - Desired file name
   */
  static exportToCSV(columns, rows, delimiter = ';', fileName = 'SAEP_Prova_Objetiva') {
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (
        stringValue.includes(delimiter) ||
        stringValue.includes('"') ||
        stringValue.includes('\n') ||
        stringValue.includes('\r')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headerLine = columns.map(escapeCSV).join(delimiter);
    const rowLines = rows.map((row) =>
      columns.map((col) => escapeCSV(row[col] !== undefined && row[col] !== null ? row[col] : '')).join(delimiter)
    );

    const csvContent = [headerLine, ...rowLines].join('\r\n');
    // Prepend UTF-8 Byte Order Mark (BOM) so Microsoft Excel opens it correctly with accents
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fullFileName = `${fileName}_${timestamp}.csv`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fullFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
