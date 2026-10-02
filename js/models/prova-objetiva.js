/**
 * Model: Prova Objetiva (Updated for 13 Columns with Categoria and Official Template)
 * Implements business rules, column definitions, file roles, and aggregation for Prova Objetiva.
 */

import { ColumnMatcher } from '../services/column-matcher.js';

export const PROVA_OBJETIVA_COLUMNS = [
  'Departamento Regional (DR)',
  'Unidade operacional (Escola)',
  'Curso',
  'Categoria',
  'Modalidade',
  'Turma',
  'Alunos',
  'Alunos Aptos/Agendados',
  'Alunos Inaptos/Não Agendados',
  'Presentes',
  'Presentes (%)',
  'Ausentes',
  'Ausentes (%)'
];

export const ProvaObjetivaModel = {
  id: 'prova-objetiva',
  name: 'Prova Objetiva',
  description: 'Consolidação de microdados de alunos matriculados (CHP e IFTP), aptos e participação nas provas objetivas.',
  badge: 'Disponível',
  enabled: true,

  /**
   * Expected file roles and column requirements
   */
  fileRoles: {
    aptos: {
      key: 'aptos',
      label: 'Planilha Principal (Aptos)',
      fileNamePattern: /aptos/i,
      required: true,
      description: 'Contém os alunos aptos e descrição completa das turmas.',
      fields: [
        {
          key: 'ESCOLA',
          label: 'Escola / Unidade',
          required: true,
          aliases: ['ESCOLA', 'CD_ESCOLA', 'DS_ESCOLA', 'UNIDADE', 'UNIDADE_OPERACIONAL']
        },
        {
          key: 'CURSO',
          label: 'Curso',
          required: true,
          aliases: ['CURSO', 'CD_CURSO', 'DS_CURSO', 'NOME_CURSO', 'DESCRICAO_CURSO']
        },
        {
          key: 'TURMADESCRICAO',
          label: 'Turma (Descrição)',
          required: true,
          aliases: ['TURMADESCRICAO', 'TURMA_DESCRICAO', 'TURMA', 'COD_TURMA']
        }
      ]
    },
    matriculados_chp: {
      key: 'matriculados_chp',
      label: 'Matriculados CHP',
      fileNamePattern: /chp/i,
      category: 'CHP',
      required: true,
      description: 'Fornece a contagem de alunos matriculados da categoria CHP.',
      fields: [
        {
          key: 'UNIDADE',
          label: 'Unidade / Escola',
          required: false,
          aliases: ['UNIDADE', 'ESCOLA', 'CD_UNIDADE', 'DS_UNIDADE', 'UNIDADE_OPERACIONAL']
        },
        {
          key: 'CURSO',
          label: 'Curso',
          required: false,
          aliases: ['CURSO', 'CD_CURSO', 'DS_CURSO', 'NOME_CURSO', 'DESCRICAO_CURSO']
        },
        {
          key: 'CODTURMA',
          label: 'Código da Turma',
          required: true,
          aliases: ['CODTURMA', 'COD_TURMA', 'CODIGO_TURMA', 'TURMA']
        }
      ]
    },
    matriculados_iftp: {
      key: 'matriculados_iftp',
      label: 'Matriculados IFTP',
      fileNamePattern: /iftp/i,
      category: 'IFTP',
      required: true,
      description: 'Fornece a contagem de alunos matriculados da categoria IFTP.',
      fields: [
        {
          key: 'UNIDADE',
          label: 'Unidade / Escola',
          required: false,
          aliases: ['UNIDADE', 'ESCOLA', 'CD_UNIDADE', 'DS_UNIDADE', 'UNIDADE_OPERACIONAL']
        },
        {
          key: 'CURSO',
          label: 'Curso',
          required: false,
          aliases: ['CURSO', 'CD_CURSO', 'DS_CURSO', 'NOME_CURSO', 'DESCRICAO_CURSO']
        },
        {
          key: 'CODTURMA',
          label: 'Código da Turma',
          required: true,
          aliases: ['CODTURMA', 'COD_TURMA', 'CODIGO_TURMA', 'TURMA']
        }
      ]
    },
    participacao: {
      key: 'participacao',
      label: 'Participação / Presença',
      fileNamePattern: /participa[cç][aã]o/i,
      required: false,
      description: 'Opcional. Contém dados de alunos presentes e ausentes por turma.',
      fields: [
        {
          key: 'ESCOLA',
          label: 'Unidade / Escola',
          required: true,
          aliases: ['ESCOLA', 'UNIDADE', 'UNIDADE_OPERACIONAL', 'DS_ESCOLA']
        },
        {
          key: 'CURSO',
          label: 'Curso',
          required: true,
          aliases: ['CURSO', 'DS_CURSO', 'NOME_CURSO']
        },
        {
          key: 'TURMADESCRICAO',
          label: 'Turma',
          required: true,
          aliases: ['TURMADESCRICAO', 'TURMA_DESCRICAO', 'TURMA']
        },
        {
          key: 'PRESENTES',
          label: 'Presentes',
          required: true,
          aliases: ['PRESENTES', 'QTD_PRESENTES']
        },
        {
          key: 'AUSENTES',
          label: 'Ausentes',
          required: true,
          aliases: ['AUSENTES', 'QTD_AUSENTES']
        }
      ]
    }
  },

  /**
   * Identifies the role of a given file by its name.
   * Case-insensitive matching:
   * - Contains 'aptos' -> 'aptos'
   * - Contains 'chp' -> 'matriculados_chp'
   * - Contains 'iftp' -> 'matriculados_iftp'
   * - Contains 'participacao' / 'participação' -> 'participacao'
   * @param {string} fileName 
   * @returns {'aptos' | 'matriculados_chp' | 'matriculados_iftp' | 'participacao' | null}
   */
  identifyFileRole(fileName) {
    if (!fileName) return null;
    const cleanName = fileName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (/aptos/.test(cleanName)) return 'aptos';
    if (/chp/.test(cleanName)) return 'matriculados_chp';
    if (/iftp/.test(cleanName)) return 'matriculados_iftp';
    if (/participa/.test(cleanName)) return 'participacao';
    
    return null;
  },

  /**
   * Normalizes CODTURMA / Turma code in two conceptual steps:
   * 1. Removes only the specified prefixes at the start: T, B, G, SAEP (case-insensitive)
   * 2. Removes only the specified IFTP suffixes at the end: EMB, EMP (case-insensitive)
   * 
   * Examples:
   * "T1234" -> "1234"
   * "B1234" -> "1234"
   * "G1234" -> "1234"
   * "SAEP1234" -> "1234"
   * "92173EMB" -> "92173"
   * "92173EMP" -> "92173"
   * "92230EMB" -> "92230"
   * "92230EMP" -> "92230"
   * "92173emb" -> "92173"
   * "92173emp" -> "92173"
   * "G92173" -> "92173"
   * "1234" -> "1234"
   * @param {any} codTurma 
   * @returns {string}
   */
  normalizeCodTurma(codTurma) {
    if (codTurma === null || codTurma === undefined) return '';
    let str = String(codTurma).trim();
    if (!str) return '';

    // Step 1: Remove prefix T, B, G, SAEP (case-insensitive) only at the start
    str = str.replace(/^(?:saep|[tbg])[\s_-]*/i, '').trim();

    // Step 2: Remove suffix EMB, EMP (case-insensitive) only at the end
    str = str.replace(/[\s_-]*(?:emb|emp)$/i, '').trim();

    return str;
  },

  /**
   * Extracts the class code from TURMADESCRICAO (part before the hyphen if present)
   * and normalizes it by removing leading prefixes T, B, G, SAEP.
   * Examples:
   * "G1234 - Matutino" -> "1234"
   * "SAEP1234 - Lauro de Freitas" -> "1234"
   * "SAEP1234 - Matutino" -> "1234"
   * "T1234" -> "1234"
   * "B1234" -> "1234"
   * "1234" -> "1234"
   * "DS001 - Lauro de Freitas" -> "DS001"
   * @param {any} turmaDescricao 
   * @returns {string}
   */
  extractTurmaCode(turmaDescricao) {
    if (turmaDescricao === null || turmaDescricao === undefined) return '';
    const str = String(turmaDescricao).trim();
    if (!str) return '';

    let rawCode = str;
    for (const sep of ['-', '–', '—']) {
      if (rawCode.includes(sep)) {
        rawCode = rawCode.split(sep)[0].trim();
        break;
      }
    }
    return this.normalizeCodTurma(rawCode);
  },

  /**
   * Returns the visual display name for Turma (only the normalized general code)
   * @param {string} turmaDescricao 
   * @returns {string}
   */
  getTurmaDisplay(turmaDescricao) {
    return this.extractTurmaCode(turmaDescricao);
  },

  /**
   * Checks if school is SENAI ITED
   * @param {string} escola 
   * @returns {boolean}
   */
  isSenaiIted(escola) {
    if (!escola) return false;
    const norm = ColumnMatcher.normalizeString(escola);
    return norm.includes('senaiited') || norm === 'ited';
  },

  /**
   * Extracts the operational unit according to Section 11:
   * If ESCOLA = SENAI ITED, extract unit from part AFTER the hyphen in TURMADESCRICAO
   * (e.g. "DS001 - Lauro de Freitas" -> "Lauro de Freitas")
   * Otherwise returns ESCOLA.
   * @param {string} escola 
   * @param {string} turmaDescricao 
   * @returns {string}
   */
  getUnidadeOperacional(escola, turmaDescricao) {
    const rawEscola = (escola || '').trim();
    if (this.isSenaiIted(rawEscola)) {
      const desc = (turmaDescricao || '').trim();
      if (desc.includes('-')) {
        const parts = desc.split('-');
        const extracted = parts.slice(1).join('-').trim();
        if (extracted) return extracted;
      }
      if (desc.includes('–')) { // En-dash
        const parts = desc.split('–');
        const extracted = parts.slice(1).join('–').trim();
        if (extracted) return extracted;
      }
      if (desc.includes('—')) { // Em-dash
        const parts = desc.split('—');
        const extracted = parts.slice(1).join('—').trim();
        if (extracted) return extracted;
      }
      return desc || rawEscola;
    }
    return rawEscola;
  },

  /**
   * Modalidade rule according to Section 12:
   * ESCOLA = SENAI ITED -> Semipresencial
   * ESCOLA ≠ SENAI ITED -> Presencial
   * @param {string} escola 
   * @returns {'Semipresencial' | 'Presencial'}
   */
  getModalidade(escola) {
    return this.isSenaiIted(escola) ? 'Semipresencial' : 'Presencial';
  },

  /**
   * Normalizes an Operational Unit name for deterministic composite key matching.
   * Strips generic prefixes (SENAI, CFP, ESCOLA, UNIDADE, CENTRO, CETIND) and maps canonical regional aliases.
   * @param {string} unidade 
   * @returns {string}
   */
  normalizeUnidade(unidade) {
    if (!unidade) return '';
    let s = ColumnMatcher.normalizeString(unidade);
    s = s.replace(/^(?:senai|cfp|escola|unidade|centro|cetind)+/g, '');

    const canonical = {
      feiradesantana: 'feira',
      feiradesantanabest: 'feira',
      feiraserrinha: 'feira',
      vitoriadaconquista: 'conquista',
      luiseduardomagalhaes: 'lem',
      luiseduardo: 'lem',
      salvadorcimatec: 'cimatec',
      salvadordendezeiros: 'dendezeiros'
    };
    for (const [k, v] of Object.entries(canonical)) {
      if (s.startsWith(k) || s === k) {
        return v;
      }
    }
    return s;
  },

  /**
   * Returns the canonical course name.
   * Explicitly standardizes "Técnico em Automação" to "Técnico em Automação Industrial".
   * For all other courses, returns the original course string trimmed.
   * @param {string} curso 
   * @returns {string}
   */
  getCanonicalCurso(curso) {
    if (!curso) return '';
    const trimmed = String(curso).trim();
    const norm = ColumnMatcher.normalizeString(trimmed);
    if (norm === 'tecnicoemautomacao' || norm === 'automacao' || norm === 'tecnicoemautomacaoindustrial' || norm === 'automacaoindustrial') {
      return 'Técnico em Automação Industrial';
    }
    return trimmed;
  },

  /**
   * Normalizes a Course name for deterministic composite key matching.
   * Canonicalizes course names first, then strips generic prefixes (tecnico em, tecnico de, curso).
   * @param {string} curso 
   * @returns {string}
   */
  normalizeCurso(curso) {
    if (!curso) return '';
    const canonical = this.getCanonicalCurso(curso);
    let s = ColumnMatcher.normalizeString(canonical);
    s = s.replace(/^(?:tecnicoem|tecnicode|cursobtecnico|curso)+/g, '');
    return s;
  },

  /**
   * Creates a deterministic composite key from Unidade + Curso + TurmaCode.
   * @param {string} unidade 
   * @param {string} curso 
   * @param {string} turmaCode 
   * @returns {string}
   */
  makeCompositeKey(unidade, curso, turmaCode) {
    const u = this.normalizeUnidade(unidade);
    const c = this.normalizeCurso(curso);
    const t = this.normalizeCodTurma(turmaCode);
    return `${u}___${c}___${t}`;
  },

  /**
   * Helper to build index for a Matriculados file with composite key (Unidade + Curso + Turma)
   * @param {Object} fileData 
   * @returns {{ byComposite: Map, byTurmaOnly: Map }}
   */
  buildMatriculadosIndex(fileData) {
    const byComposite = new Map();
    const byTurmaOnly = new Map();

    if (!fileData || !fileData.rows) return { byComposite, byTurmaOnly };

    const mappings = fileData.mappings || {};
    const colCodTurma = mappings.CODTURMA;
    const colUnidade = mappings.UNIDADE || mappings.ESCOLA;
    const colCurso = mappings.CURSO;

    if (!colCodTurma) return { byComposite, byTurmaOnly };

    for (const row of fileData.rows) {
      const rawCode = row[colCodTurma];
      if (rawCode !== undefined && rawCode !== null && String(rawCode).trim() !== '') {
        const rawUnidade = colUnidade ? (row[colUnidade] || '') : '';
        const rawCurso = colCurso ? (row[colCurso] || '') : '';
        const canonicalCurso = this.getCanonicalCurso(rawCurso);

        const compKey = this.makeCompositeKey(rawUnidade, canonicalCurso, rawCode);
        byComposite.set(compKey, (byComposite.get(compKey) || 0) + 1);

        const normTurma = this.normalizeCodTurma(rawCode);
        byTurmaOnly.set(normTurma, (byTurmaOnly.get(normTurma) || 0) + 1);
      }
    }

    return { byComposite, byTurmaOnly };
  },

  /**
   * Looks up matriculados count in an index using composite key (Unidade + Curso + TurmaCode)
   * @param {{ byComposite: Map, byTurmaOnly: Map }} index 
   * @param {string} unidade 
   * @param {string} curso 
   * @param {string} turmaCode 
   * @returns {number}
   */
  lookupMatriculadosCount(index, unidade, curso, turmaCode) {
    if (!index || !turmaCode) return 0;
    const compKey = this.makeCompositeKey(unidade, curso, turmaCode);
    if (index.byComposite && index.byComposite.has(compKey)) {
      return index.byComposite.get(compKey);
    }
    return 0;
  },

  /**
   * Processes all loaded files and produces the 13-column macro dataset.
   * @param {Record<string, { rows: Array<Record<string, any>>, mappings: Record<string, string> }>} loadedFiles 
   * @returns {{ columns: string[], rows: Array<Record<string, any>>, warnings: string[], stats: Object }}
   */
  process(loadedFiles) {
    const warnings = [];

    // 1. Validate required files exist
    const aptosData = loadedFiles.aptos;
    const matriculadosChpData = loadedFiles.matriculados_chp;
    const matriculadosIftpData = loadedFiles.matriculados_iftp;
    const participacaoData = loadedFiles.participacao;

    if (!aptosData || !aptosData.rows || aptosData.rows.length === 0) {
      throw new Error('Arquivo de Aptos (Planilha Principal) não foi carregado ou está vazio.');
    }
    if (!matriculadosChpData || !matriculadosChpData.rows || matriculadosChpData.rows.length === 0) {
      throw new Error('Arquivo de Matriculados CHP não foi carregado ou está vazio.');
    }
    if (!matriculadosIftpData || !matriculadosIftpData.rows || matriculadosIftpData.rows.length === 0) {
      throw new Error('Arquivo de Matriculados IFTP não foi carregado ou está vazio.');
    }

    // 2. Validate mandatory mapped columns
    const aptosMap = aptosData.mappings || {};
    const colEscola = aptosMap.ESCOLA;
    const colCurso = aptosMap.CURSO;
    const colTurma = aptosMap.TURMADESCRICAO;

    const missingAptosCols = ['ESCOLA', 'CURSO', 'TURMADESCRICAO'].filter((k) => !aptosMap[k]);
    if (missingAptosCols.length > 0) {
      throw new Error(`Colunas obrigatórias não mapeadas no arquivo de Aptos: ${missingAptosCols.join(', ')}`);
    }

    if (!matriculadosChpData.mappings || !matriculadosChpData.mappings.CODTURMA) {
      throw new Error('Coluna Código da Turma (CODTURMA) não mapeada no arquivo de Matriculados CHP.');
    }
    if (!matriculadosIftpData.mappings || !matriculadosIftpData.mappings.CODTURMA) {
      throw new Error('Coluna Código da Turma (CODTURMA) não mapeada no arquivo de Matriculados IFTP.');
    }

    // 3. Build Matriculados Indexes for CHP and IFTP with Composite Keys
    const indexChp = this.buildMatriculadosIndex(matriculadosChpData);
    const indexIftp = this.buildMatriculadosIndex(matriculadosIftpData);

    // 4. Build Participação Index if provided
    const participacaoIndex = new Map();

    if (participacaoData && participacaoData.rows && participacaoData.rows.length > 0) {
      const partMap = participacaoData.mappings || {};
      const pEscola = partMap.ESCOLA;
      const pCurso = partMap.CURSO;
      const pTurma = partMap.TURMADESCRICAO;
      const pPresentes = partMap.PRESENTES;
      const pAusentes = partMap.AUSENTES;

      for (const row of participacaoData.rows) {
        const u = row[pEscola] || '';
        const c = row[pCurso] || '';
        const t = row[pTurma] || '';

        const parseNum = (val) => {
          if (val === undefined || val === null || val === '') return 0;
          const num = Number(String(val).replace(',', '.').replace(/[^0-9.]/g, ''));
          return isNaN(num) ? 0 : num;
        };

        const pres = parseNum(row[pPresentes]);
        const aus = parseNum(row[pAusentes]);

        const compKey = this.makeCompositeKey(u, c, t);
        const compShortKey = this.makeCompositeKey(u, c, this.extractTurmaCode(t));

        participacaoIndex.set(compKey, { presentes: pres, ausentes: aus });
        if (!participacaoIndex.has(compShortKey)) {
          participacaoIndex.set(compShortKey, { presentes: pres, ausentes: aus });
        }
      }
    }

    // 5. Group Aptos records by unique Class (Unidade Operacional + Canonical Curso + TURMADESCRICAO)
    const classGroups = new Map();

    for (const row of aptosData.rows) {
      const rawEscola = String(row[colEscola] || '').trim();
      const rawCurso = String(row[colCurso] || '').trim();
      const rawTurmaDesc = String(row[colTurma] || '').trim();

      const unidadeOperacional = this.getUnidadeOperacional(rawEscola, rawTurmaDesc);
      const canonicalCurso = this.getCanonicalCurso(rawCurso);
      const groupKey = `${unidadeOperacional}___${canonicalCurso}___${rawTurmaDesc}`;

      if (!classGroups.has(groupKey)) {
        classGroups.set(groupKey, {
          escolaRaw: rawEscola,
          unidadeOperacional: unidadeOperacional,
          curso: canonicalCurso,
          turmaDescricao: rawTurmaDesc,
          records: []
        });
      }

      classGroups.get(groupKey).records.push(row);
    }

    // 6. Aggregate each group considering the Categoria dimension (CHP and IFTP)
    const macroRows = [];
    let totalMatriculados = 0;
    let totalAptosAgendados = 0;
    let totalInaptosNaoAgendados = 0;
    let totalPresentes = 0;
    let totalAusentes = 0;

    for (const group of classGroups.values()) {
      const { escolaRaw, unidadeOperacional, curso, turmaDescricao, records } = group;

      const dr = 'SENAI-BA';
      const cursoFinal = this.getCanonicalCurso(curso);
      const modalidade = this.getModalidade(escolaRaw);
      const turmaFinal = this.getTurmaDisplay(turmaDescricao);
      const turmaCode = this.extractTurmaCode(turmaDescricao);

      // Total aptos records for this class
      const aptosCount = records.length;

      // Check enrollment in both categories with composite key (Unidade + Curso + TurmaCode)
      const countChp = this.lookupMatriculadosCount(indexChp, unidadeOperacional, cursoFinal, turmaCode);
      const countIftp = this.lookupMatriculadosCount(indexIftp, unidadeOperacional, cursoFinal, turmaCode);

      // Determine which categories this class belongs to
      const categoriesToEmit = [];
      if (countChp > 0) categoriesToEmit.push({ cat: 'CHP', alunos: countChp });
      if (countIftp > 0) categoriesToEmit.push({ cat: 'IFTP', alunos: countIftp });

      // Fallback: If neither has > 0 enrolled students, emit CHP with warning
      if (categoriesToEmit.length === 0) {
        warnings.push(`Turma "${turmaFinal}" (${turmaDescricao}) na unidade "${unidadeOperacional}" não encontrou alunos matriculados em CHP nem IFTP.`);
        categoriesToEmit.push({ cat: 'CHP', alunos: 0 });
      }

      // Lookup Participação for this class (Unidade + Curso + Turma)
      let presentes = 0;
      let ausentes = 0;

      if (participacaoData && participacaoData.rows && participacaoData.rows.length > 0) {
        const partKey = this.makeCompositeKey(unidadeOperacional, cursoFinal, turmaCode);
        const partFullKey = this.makeCompositeKey(unidadeOperacional, cursoFinal, turmaDescricao);

        if (participacaoIndex.has(partKey)) {
          const pData = participacaoIndex.get(partKey);
          presentes = pData.presentes;
          ausentes = pData.ausentes;
        } else if (participacaoIndex.has(partFullKey)) {
          const pData = participacaoIndex.get(partFullKey);
          presentes = pData.presentes;
          ausentes = pData.ausentes;
        } else {
          warnings.push(`Turma "${turmaFinal}" na unidade "${unidadeOperacional}" não encontrada na planilha de Participação. Presentes e ausentes definidos como 0.`);
        }
      }

      // Percentage calculation based on Alunos Aptos/Agendados
      let presentesPct = '0%';
      let ausentesPct = '0%';

      if (aptosCount > 0) {
        const pCalc = (presentes / aptosCount) * 100;
        const aCalc = (ausentes / aptosCount) * 100;
        presentesPct = `${Number.isInteger(pCalc) ? pCalc : pCalc.toFixed(1)}%`;
        ausentesPct = `${Number.isInteger(aCalc) ? aCalc : aCalc.toFixed(1)}%`;
      }

      // Generate distinct record for each category
      for (const { cat, alunos } of categoriesToEmit) {
        const inaptosNaoAgendados = Math.max(0, alunos - aptosCount);

        totalMatriculados += alunos;
        totalAptosAgendados += aptosCount;
        totalInaptosNaoAgendados += inaptosNaoAgendados;
        totalPresentes += presentes;
        totalAusentes += ausentes;

        macroRows.push({
          'Departamento Regional (DR)': dr,
          'Unidade operacional (Escola)': unidadeOperacional,
          'Curso': cursoFinal,
          'Categoria': cat,
          'Modalidade': modalidade,
          'Turma': turmaFinal,
          'Alunos': alunos,
          'Alunos Aptos/Agendados': aptosCount,
          'Alunos Inaptos/Não Agendados': inaptosNaoAgendados,
          'Presentes': presentes,
          'Presentes (%)': presentesPct,
          'Ausentes': ausentes,
          'Ausentes (%)': ausentesPct
        });
      }
    }

    // Sort rows: Unidade, Curso, Categoria, Turma
    macroRows.sort((a, b) => {
      const uComp = a['Unidade operacional (Escola)'].localeCompare(b['Unidade operacional (Escola)']);
      if (uComp !== 0) return uComp;
      const cComp = a['Curso'].localeCompare(b['Curso']);
      if (cComp !== 0) return cComp;
      const catComp = a['Categoria'].localeCompare(b['Categoria']);
      if (catComp !== 0) return catComp;
      return a['Turma'].localeCompare(b['Turma']);
    });

    const taxaPresencaGeral = totalAptosAgendados > 0 ? ((totalPresentes / totalAptosAgendados) * 100).toFixed(1) + '%' : '0%';

    return {
      columns: PROVA_OBJETIVA_COLUMNS,
      rows: macroRows,
      warnings,
      stats: {
        totalTurmas: macroRows.length,
        totalMatriculados,
        totalAptosAgendados,
        totalInaptosNaoAgendados,
        totalPresentes,
        totalAusentes,
        taxaPresencaGeral
      }
    };
  }
};
