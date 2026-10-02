/**
 * File Reader Service
 * Reads Excel (.xlsx, .xls) and CSV files in-memory using SheetJS (XLSX).
 * Safe, 100% client-side, zero server transmission.
 */

export class FileReaderService {
  /**
   * Reads a File object and extracts sheet information and rows.
   * Dynamically locates the header row (handling leading blank/title rows)
   * and intelligently selects the best primarySheet based on content.
   * @param {File} file 
   * @param {string|null} fileRole 
   * @returns {Promise<{ fileName: string, fileSize: number, fileType: string, sheets: Array<{ name: string, headers: string[], rows: Array<Record<string, any>> }>, primarySheet: { name: string, headers: string[], rows: Array<Record<string, any>> } }>}
   */
  static async readFile(file, fileRole = null) {
    if (!window.XLSX) {
      throw new Error('A biblioteca SheetJS (XLSX) não foi carregada.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, {
            type: 'array',
            cellDates: true,
            cellText: false,
            raw: true
          });

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error(`O arquivo ${file.name} não contém planilhas válidas.`);
          }

          const parsedSheets = workbook.SheetNames.map((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            return FileReaderService.parseSheet(worksheet, sheetName);
          });

          const primarySheet = FileReaderService.findBestSheet(parsedSheets, fileRole);

          resolve({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || file.name.split('.').pop(),
            sheets: parsedSheets,
            primarySheet: primarySheet || { name: '', headers: [], rows: [] }
          });
        } catch (err) {
          reject(new Error(`Erro ao ler ${file.name}: ${err.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error(`Falha ao ler o arquivo ${file.name}.`));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parses a single worksheet, dynamically scanning the first rows to detect the true header row.
   * Handles empty leading rows (e.g. line 1 blank, line 2 headers) or summary title rows.
   * @param {Object} worksheet 
   * @param {string} sheetName 
   * @returns {{ name: string, headers: string[], rows: Array<Record<string, any>> }}
   */
  static parseSheet(worksheet, sheetName) {
    const rawRows = window.XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    });

    if (!rawRows || rawRows.length === 0) {
      return {
        name: sheetName,
        headers: [],
        rows: []
      };
    }

    // Domain keywords that indicate a real header row
    const domainKeywords = [
      'codturma', 'turmadescricao', 'turma', 'escola', 'curso',
      'unidade', 'cpf', 'nome', 'presentes', 'ausentes',
      'modalidade', 'turno', 'periodo', 'matriculado', 'estudante'
    ];

    let bestHeaderRowIdx = 0;
    let bestHeaderScore = -1;
    let bestHeaders = [];

    // Scan up to first 15 rows to find best candidate header row
    const scanLimit = Math.min(15, rawRows.length);
    for (let rIdx = 0; rIdx < scanLimit; rIdx++) {
      const row = rawRows[rIdx];
      if (!Array.isArray(row)) continue;

      const nonEmpties = row
        .map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''))
        .filter((s) => s.length > 0);

      if (nonEmpties.length === 0) continue;

      let kwMatches = 0;
      nonEmpties.forEach((cellStr) => {
        const lower = cellStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (domainKeywords.some((kw) => lower.includes(kw))) {
          kwMatches++;
        }
      });

      // Score based on column breadth and presence of recognized column keywords
      const score = nonEmpties.length + (kwMatches * 10);

      if (score > bestHeaderScore) {
        bestHeaderScore = score;
        bestHeaderRowIdx = rIdx;
        bestHeaders = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
        // Trim trailing empty header columns
        while (bestHeaders.length > 0 && bestHeaders[bestHeaders.length - 1] === '') {
          bestHeaders.pop();
        }
      }
    }

    // If no good header row was found, fall back to row 0
    if (bestHeaders.length === 0) {
      const firstRow = rawRows[0] || [];
      bestHeaders = firstRow
        .map((h) => (h !== undefined && h !== null ? String(h).trim() : ''))
        .filter((h) => h.length > 0);
      bestHeaderRowIdx = 0;
    }

    // Filter headers list for display (non-empty unique strings)
    const validHeaderList = bestHeaders.filter((h) => h.length > 0);

    // Build data objects from rows after the header row
    const dataRows = [];
    for (let rIdx = bestHeaderRowIdx + 1; rIdx < rawRows.length; rIdx++) {
      const row = rawRows[rIdx];
      if (!Array.isArray(row)) continue;

      const hasContent = row.some((c) => c !== undefined && c !== null && String(c).trim() !== '');
      if (!hasContent) continue;

      const rowObj = {};
      let filledFields = 0;

      bestHeaders.forEach((headerKey, colIdx) => {
        if (headerKey && headerKey.length > 0) {
          const val = colIdx < row.length ? row[colIdx] : '';
          rowObj[headerKey] = val;
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            filledFields++;
          }
        }
      });

      if (filledFields > 0) {
        dataRows.push(rowObj);
      }
    }

    return {
      name: sheetName,
      headers: validHeaderList,
      rows: dataRows
    };
  }

  /**
   * Intelligently selects the best sheet based on content, row count and expected file role.
   * @param {Array<{ name: string, headers: string[], rows: Array<Record<string, any>> }>} sheets 
   * @param {string|null} fileRole 
   * @returns {{ name: string, headers: string[], rows: Array<Record<string, any>> }}
   */
  static findBestSheet(sheets, fileRole = null) {
    if (!sheets || sheets.length === 0) {
      return { name: '', headers: [], rows: [] };
    }
    if (sheets.length === 1) {
      return sheets[0];
    }

    const roleKeywords = {
      aptos: ['turmadescricao', 'turma', 'escola', 'curso', 'cpf', 'estudante', 'aluno'],
      matriculados_chp: ['codturma', 'turma', 'unidade', 'curso', 'matriculado', 'situacao'],
      matriculados_iftp: ['codturma', 'turma', 'unidade', 'curso', 'matriculado', 'situacao'],
      participacao: ['presentes', 'ausentes', 'turmadescricao', 'turma', 'escola', 'curso']
    };

    const targetKeywords = roleKeywords[fileRole] || ['codturma', 'turmadescricao', 'turma', 'escola', 'curso'];

    let bestSheet = sheets[0];
    let bestScore = -Infinity;

    sheets.forEach((sheet) => {
      let score = 0;
      const lowerSheetName = (sheet.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Name bonuses / penalties
      if (/dados|estudante|aluno|microdado|base/i.test(lowerSheetName)) {
        score += 50;
      }
      if (/resumo|sumario|pivot|filtro/i.test(lowerSheetName)) {
        score -= 50;
      }

      // Header matches
      const cleanHeaders = (sheet.headers || []).map((h) =>
        String(h).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      );

      targetKeywords.forEach((kw) => {
        if (cleanHeaders.some((h) => h.includes(kw))) {
          score += 30;
        }
      });

      // Row count weight: real microdata sheets have significantly more rows than summary sheets
      const rowCount = Array.isArray(sheet.rows) ? sheet.rows.length : 0;
      score += Math.min(60, Math.floor(rowCount / 10));

      if (score > bestScore) {
        bestScore = score;
        bestSheet = sheet;
      }
    });

    return bestSheet;
  }

  /**
   * Helper to format file sizes nicely
   * @param {number} bytes 
   * @returns {string}
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
