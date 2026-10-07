/**
 * Model: Prova Prática (18 Columns Official Template)
 * Implements business rules, column definitions, file roles, and aggregation for Prova Prática.
 * 100% Client-side and deterministic.
 */

import { ColumnMatcher } from '../services/column-matcher.js';

export const PROVA_PRATICA_COLUMNS = [
  'Departamento Regional (DR)',
  'Unidade operacional (Escola)',
  'Curso',
  'Modalidade',
  'Prova Objetiva',
  'Alunos Homologados',
  'Provas Aplicadas',
  'Provas Aplicadas (%)',
  'Provas Não Aplicadas',
  'Provas Não Aplicadas (%)',
  'Total de Provas Geradas',
  'Tabulação Feita',
  'Tabulação Feita (%)',
  'Tabulação Pendente',
  'Tabulação Pendente (%)',
  'Total de Tabulação',
  'Confirmação Feita',
  'Confirmação Pendente'
];

/**
 * Robust string normalizer
 */
export function normalizeString(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Standardizes course names with official canonical title casing
 */
export function getCanonicalCurso(curso) {
  if (!curso) return '';
  const trimmed = String(curso).trim();
  const norm = normalizeString(trimmed);

  if (norm === 'tecnicoemautomacao' || norm === 'automacao' || norm === 'tecnicoemautomacaoindustrial' || norm === 'automacaoindustrial') {
    return 'Técnico em Automação Industrial';
  }

  const courseMap = {
    desenvolvimentodesistemas: 'Técnico em Desenvolvimento de Sistemas',
    tecnicoemdesenvolvimentodesistemas: 'Técnico em Desenvolvimento de Sistemas',
    administracao: 'Técnico em Administração',
    tecnicoemadministracao: 'Técnico em Administração',
    eletromecanica: 'Técnico em Eletromecânica',
    tecnicoemeletromecanica: 'Técnico em Eletromecânica',
    eletrotecnica: 'Técnico em Eletrotécnica',
    tecnicoemeletrotecnica: 'Técnico em Eletrotécnica',
    segurancadotrabalho: 'Técnico em Segurança do Trabalho',
    tecnicoemsegurancadotrabalho: 'Técnico em Segurança do Trabalho',
    logistica: 'Técnico em Logística',
    tecnicoemlogistica: 'Técnico em Logística',
    edificacoes: 'Técnico em Edificações',
    tecnicoemedificacoes: 'Técnico em Edificações',
    biotecnologia: 'Técnico em Biotecnologia',
    tecnicoembiotecnologia: 'Técnico em Biotecnologia',
    quimica: 'Técnico em Química',
    tecnicoemquimica: 'Técnico em Química',
    petroquimica: 'Técnico em Petroquímica',
    tecnicoempetroquimica: 'Técnico em Petroquímica',
    mecanica: 'Técnico em Mecânica',
    tecnicoemmecanica: 'Técnico em Mecânica',
    mecatronica: 'Técnico em Mecatrônica',
    tecnicoemmecatronica: 'Técnico em Mecatrônica',
    multimidia: 'Técnico em Multimídia',
    tecnicoemmultimidia: 'Técnico em Multimídia',
    redesdecomputadores: 'Técnico em Redes de Computadores',
    tecnicoemredesdecomputadores: 'Técnico em Redes de Computadores',
    refrigeracaoeclimatizacao: 'Técnico em Refrigeração e Climatização',
    tecnicoemrefrigeracaoeclimatizacao: 'Técnico em Refrigeração e Climatização',
    qualidade: 'Técnico em Qualidade',
    tecnicoemqualidade: 'Técnico em Qualidade',
    manutencaoautomotiva: 'Técnico em Manutenção Automotiva',
    tecnicoemmanutencaoautomotiva: 'Técnico em Manutenção Automotiva',
    planejamentoecontroledaproducao: 'Técnico em Planejamento e Controle da Produção',
    tecnicoemplanejamentoecontroledaproducao: 'Técnico em Planejamento e Controle da Produção',
    fabricacaomecanica: 'Técnico em Fabricação Mecânica',
    tecnicoemfabricacaomecanica: 'Técnico em Fabricação Mecânica',
    eletroeletronica: 'Técnico em Eletroeletrônica',
    tecnicoemeletroeletronica: 'Técnico em Eletroeletrônica'
  };

  return courseMap[norm] || trimmed;
}

/**
 * Normalizes course for grouping key
 */
export function normalizeCurso(curso) {
  if (!curso) return '';
  const canonical = getCanonicalCurso(curso);
  const s = normalizeString(canonical);
  return s.replace(/^(?:tecnicoem|tecnicode|cursobtecnico|curso)+/g, '');
}

/**
 * Normalizes operational unit name to standard slug
 */
export function normalizeUnidade(unidade) {
  if (!unidade) return '';
  let s = normalizeString(unidade);
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
}

/**
 * Checks if unit/escola is SENAI ITED
 */
export function isSenaiIted(escola) {
  if (!escola) return false;
  const norm = normalizeString(escola);
  return norm.includes('senaiited') || norm === 'ited' || norm.includes('ited');
}

/**
 * Maps ITED municipality to standard operational unit display name
 */
export function mapItedMunicipioToUnidade(municipio) {
  if (!municipio) return 'SENAI - ITED';
  const mNorm = normalizeString(municipio);
  if (mNorm === 'alagoinhas') return 'SENAI Alagoinhas';
  if (mNorm === 'camacari') return 'SENAI Camaçari';
  if (mNorm === 'feiradesantana' || mNorm === 'feira') return 'SENAI Feira de Santana';
  if (mNorm === 'laurodefreitas') return 'SENAI Lauro de Freitas';
  if (mNorm === 'juazeiro') return 'SENAI Juazeiro';
  if (mNorm === 'ilheus') return 'SENAI Ilhéus';
  if (mNorm === 'barreiras') return 'SENAI Barreiras';
  if (mNorm === 'luiseduardomagalhaes' || mNorm === 'luiseduardo') return 'SENAI Luis Eduardo Magalhães';
  if (mNorm === 'vitoriadaconquista' || mNorm === 'conquista') return 'SENAI Vitória da Conquista';
  if (mNorm === 'salvador') return 'SENAI Dendezeiros'; // Default ambiguous
  return `SENAI ${municipio}`;
}

/**
 * Extracts operational unit from ITED TURMADESCRICAO after hyphen or from text
 */
export function extractItedUnitFromTurma(turmaDesc, rawEscola = 'SENAI - ITED') {
  if (!turmaDesc) return rawEscola;
  const desc = String(turmaDesc).trim();

  // Extract segment after hyphen if present: e.g. "G20242CHPSEGT8-DENDEZEIROS" -> "DENDEZEIROS"
  let unitPart = desc;
  for (const sep of ['-', '–', '—']) {
    if (desc.includes(sep)) {
      const parts = desc.split(sep);
      const extracted = parts.slice(1).join(sep).trim();
      if (extracted) {
        unitPart = extracted;
        break;
      }
    }
  }

  const uNorm = normalizeString(unitPart);
  if (uNorm.includes('alagoinhas')) return 'SENAI Alagoinhas';
  if (uNorm.includes('camacari')) return 'SENAI Camaçari';
  if (uNorm.includes('feiradesantana') || uNorm.includes('feira')) return 'SENAI Feira de Santana';
  if (uNorm.includes('laurodefreitas')) return 'SENAI Lauro de Freitas';
  if (uNorm.includes('juazeiro')) return 'SENAI Juazeiro';
  if (uNorm.includes('ilheus')) return 'SENAI Ilhéus';
  if (uNorm.includes('barreiras')) return 'SENAI Barreiras';
  if (uNorm.includes('luiseduardomagalhaes') || uNorm.includes('luiseduardo') || uNorm === 'lem') return 'SENAI Luis Eduardo Magalhães';
  if (uNorm.includes('vitoriadaconquista') || uNorm.includes('conquista')) return 'SENAI Vitória da Conquista';
  if (uNorm.includes('dendezeiros') || uNorm.includes('dedenzeiros')) return 'SENAI Dendezeiros';
  if (uNorm.includes('cimatec')) return 'SENAI CIMATEC';

  // Fallback to full string check if unitPart was not matched
  const fullNorm = normalizeString(desc);
  if (fullNorm.includes('alagoinhas')) return 'SENAI Alagoinhas';
  if (fullNorm.includes('camacari')) return 'SENAI Camaçari';
  if (fullNorm.includes('feiradesantana') || fullNorm.includes('feira')) return 'SENAI Feira de Santana';
  if (fullNorm.includes('laurodefreitas')) return 'SENAI Lauro de Freitas';
  if (fullNorm.includes('juazeiro')) return 'SENAI Juazeiro';
  if (fullNorm.includes('ilheus')) return 'SENAI Ilhéus';
  if (fullNorm.includes('barreiras')) return 'SENAI Barreiras';
  if (fullNorm.includes('luiseduardomagalhaes') || fullNorm.includes('luiseduardo') || fullNorm === 'lem') return 'SENAI Luis Eduardo Magalhães';
  if (fullNorm.includes('vitoriadaconquista') || fullNorm.includes('conquista')) return 'SENAI Vitória da Conquista';
  if (fullNorm.includes('dendezeiros') || fullNorm.includes('dedenzeiros')) return 'SENAI Dendezeiros';
  if (fullNorm.includes('cimatec')) return 'SENAI CIMATEC';

  return rawEscola;
}

/**
 * Checks if a unit is compatible with Salvador (Dendezeiros, CIMATEC or Salvador)
 */
export function isSalvadorUnit(unidade) {
  if (!unidade) return false;
  const norm = normalizeUnidade(unidade);
  const rawNorm = normalizeString(unidade);
  return norm === 'dendezeiros' || norm === 'cimatec' || rawNorm.includes('dendezeiros') || rawNorm.includes('cimatec') || rawNorm.includes('salvador');
}

export const ProvaPraticaModel = {
  id: 'prova-pratica',
  name: 'Prova Prática',
  description: 'Consolidação de microdados de Estudantes (Homologados, Provas Geradas, Tabulação, Confirmação) e Participação (Prova Objetiva) por Unidade e Curso.',
  badge: 'Disponível',
  enabled: true,

  /**
   * Expected file roles and column requirements
   */
  fileRoles: {
    estudantes: {
      key: 'estudantes',
      label: 'Microdados de Estudantes',
      fileNamePattern: /estudante[s]?/i,
      required: true,
      description: 'Contém homologação, provas geradas, tabulação e confirmação dos estudantes.',
      fields: [
        {
          key: 'MUNICIPIO',
          label: 'Município',
          required: true,
          aliases: ['MUNICIPIO', 'CIDADE', 'DS_MUNICIPIO', 'NOME_MUNICIPIO']
        },
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
          key: 'HOMOLOGADO',
          label: 'Homologado (SIM/NÃO)',
          required: true,
          aliases: ['HOMOLOGADO', 'STATUS_HOMOLOGADO', 'HOMOLOGACAO', 'HOMOLOGAÇÃO']
        },
        {
          key: 'PROVA_GERADA',
          label: 'Prova Gerada / Aplicada (SIM/NÃO)',
          required: false,
          aliases: ['PROVA GERADA', 'PROVA_GERADA', 'PROVAGERADA', 'PROVA GERADA/APLICADA']
        },
        {
          key: 'TABULACAO',
          label: 'Tabulação (SIM/NÃO)',
          required: false,
          aliases: ['TABULAÇÃO', 'TABULACAO', 'STATUS_TABULACAO', 'TABULACAO_FEITA']
        },
        {
          key: 'CONFIRMACAO',
          label: 'Confirmação do Coordenador (SIM/NÃO)',
          required: false,
          aliases: ['CONFIRMACAO DO COORDENADOR', 'CONFIRMACAO_DO_COORDENADOR', 'CONFIRMACAO', 'CONFIRMAÇÃO', 'CONFIRMACAO_COORDENADOR']
        },
        {
          key: 'NOME',
          label: 'Nome do Estudante',
          required: false,
          aliases: ['NOME', 'NOME_ESTUDANTE', 'ALUNO', 'ESTUDANTE']
        }
      ]
    },
    participacao: {
      key: 'participacao',
      label: 'Relatório de Participação',
      fileNamePattern: /participa[cç][aã]o/i,
      required: true,
      description: 'Contém agendamento e presentes da Prova Objetiva por turma.',
      fields: [
        {
          key: 'ESCOLA',
          label: 'Unidade operacional (Escola)',
          required: true,
          aliases: ['UNIDADE OPERACIONAL (ESCOLA)', 'UNIDADE OPERACIONAL', 'ESCOLA', 'UNIDADE', 'DS_ESCOLA']
        },
        {
          key: 'CURSO',
          label: 'Curso',
          required: true,
          aliases: ['CURSO', 'CD_CURSO', 'DS_CURSO', 'NOME_CURSO', 'DESCRICAO_CURSO']
        },
        {
          key: 'TURMA',
          label: 'Turma',
          required: true,
          aliases: ['TURMA', 'TURMADESCRICAO', 'TURMA_DESCRICAO', 'COD_TURMA']
        },
        {
          key: 'PRESENTES',
          label: 'Presentes',
          required: true,
          aliases: ['PRESENTES', 'QTD_PRESENTES', 'TOTAL_PRESENTES']
        },
        {
          key: 'AUSENTES',
          label: 'Ausentes',
          required: false,
          aliases: ['AUSENTES', 'QTD_AUSENTES']
        }
      ]
    }
  },

  /**
   * Identifies file role from filename
   */
  identifyFileRole(fileName, headers = [], rawRows = []) {
    if (!fileName) return null;
    const lowerName = fileName.toLowerCase();

    if (lowerName.includes('participa')) {
      return 'participacao';
    }

    if (lowerName.includes('estudante')) {
      return 'estudantes';
    }

    // Content heuristics if filename is generic
    if (headers && headers.length > 0) {
      const normHeaders = headers.map(h => normalizeString(h));
      if (normHeaders.some(h => h.includes('homologado') || h.includes('provagerada') || h.includes('tabulacao'))) {
        return 'estudantes';
      }
      if (normHeaders.some(h => h.includes('presentes') && h.includes('ausentes'))) {
        return 'participacao';
      }
    }

    return null;
  },

  /**
   * Consolidation Engine for Prova Prática
   * @param {Record<string, { rows: Array<Record<string, any>>, mappings: Record<string, string>, manualClassOverrides?: Record<string, any> }>} loadedFiles
   * @param {Object} [options={}]
   * @returns {{ columns: string[], rows: Array<Record<string, any>>, kpis: Record<string, any>, warnings: string[], discrepancies: Array<any> }}
   */
  process(loadedFiles, options = {}) {
    const estudantesData = loadedFiles.estudantes;
    const participacaoData = loadedFiles.participacao;

    if (!estudantesData || !participacaoData) {
      throw new Error('A consolidação da Prova Prática requer as planilhas de "Estudantes" e "Participação".');
    }

    const manualOverrides = estudantesData.manualItedOverrides || estudantesData.manualClassOverrides || options.manualClassOverrides || options.manualItedOverrides || {};
    const warnings = [];
    const discrepancies = [];

    // Map fields
    const estMappings = estudantesData.mappings || {};
    const colMunicipio = estMappings.MUNICIPIO || 'MUNICIPIO';
    const colEscolaEst = estMappings.ESCOLA || 'ESCOLA';
    const colCursoEst = estMappings.CURSO || 'CURSO';
    const colHomologado = estMappings.HOMOLOGADO || 'HOMOLOGADO';

    // Progressive stage columns
    const colProvaGerada = estMappings.PROVA_GERADA || null;
    const colTabulacao = estMappings.TABULACAO || null;
    const colConfirmacao = estMappings.CONFIRMACAO || null;

    const firstEstRow = estudantesData.rows && estudantesData.rows.length > 0 ? estudantesData.rows[0] : {};
    const hasProvaGerada = !!colProvaGerada && (firstEstRow[colProvaGerada] !== undefined || (estudantesData.headers && estudantesData.headers.includes(colProvaGerada)));
    const hasTabulacao = !!colTabulacao && (firstEstRow[colTabulacao] !== undefined || (estudantesData.headers && estudantesData.headers.includes(colTabulacao)));
    const hasConfirmacao = !!colConfirmacao && (firstEstRow[colConfirmacao] !== undefined || (estudantesData.headers && estudantesData.headers.includes(colConfirmacao)));

    const partMappings = participacaoData.mappings || {};
    const colEscolaPart = partMappings.ESCOLA || 'Unidade operacional (Escola)';
    const colCursoPart = partMappings.CURSO || 'Curso';
    const colTurmaPart = partMappings.TURMA || 'Turma';
    const colPresentes = partMappings.PRESENTES || 'Presentes';

    // 1. Process Participacao rows grouped by (Unidade, Curso, Modalidade)
    const participacaoMap = new Map(); // key -> { unidadeDisplay, cursoDisplay, modalidadeDisplay, presentes: number, turmasCount: number, turmasList: [] }

    participacaoData.rows.forEach((r) => {
      const rawEscola = String(r[colEscolaPart] || '').trim();
      const rawCurso = String(r[colCursoPart] || '').trim();
      const rawTurma = String(r[colTurmaPart] || '').trim();
      if (!rawEscola && !rawCurso && !rawTurma) return;

      const canonicalCurso = getCanonicalCurso(rawCurso);
      let modalidade = 'Presencial';
      let unidadeDisplay = rawEscola;

      if (isSenaiIted(rawEscola)) {
        modalidade = 'Semi-presencial';
        unidadeDisplay = extractItedUnitFromTurma(rawTurma, rawEscola);
      }

      const uKey = normalizeUnidade(unidadeDisplay);
      const cKey = normalizeCurso(canonicalCurso);
      const groupKey = `${uKey}___${cKey}___${modalidade}`;

      let presentesVal = r[colPresentes];
      if (presentesVal === undefined || presentesVal === null || presentesVal === '') {
        presentesVal = 0;
      } else if (typeof presentesVal === 'string') {
        presentesVal = parseInt(presentesVal.replace(/\D/g, ''), 10) || 0;
      } else {
        presentesVal = parseInt(presentesVal, 10) || 0;
      }

      if (!participacaoMap.has(groupKey)) {
        participacaoMap.set(groupKey, {
          groupKey,
          unidadeDisplay,
          cursoDisplay: canonicalCurso,
          modalidadeDisplay: modalidade,
          presentes: 0,
          turmasCount: 0,
          turmasList: []
        });
      }

      const pGroup = participacaoMap.get(groupKey);
      pGroup.presentes += presentesVal;
      pGroup.turmasCount += 1;
      pGroup.turmasList.push({
        turma: rawTurma,
        presentes: presentesVal,
        escolaOrigem: rawEscola
      });
    });

    // 2. Process Estudantes rows grouped by (Unidade, Curso, Modalidade)
    const estudantesMap = new Map(); // key -> { homologados, aplicadas, tabFeita, tabPendente, confFeita, confPendente, totalEstudantes }

    // Identify Salvador ITED ambiguity cases
    const salvadorItedStudents = [];

    estudantesData.rows.forEach((r, idx) => {
      const rawEscola = String(r[colEscolaEst] || '').trim();
      const rawMunicipio = String(r[colMunicipio] || '').trim();
      const rawCurso = String(r[colCursoEst] || '').trim();

      // Check footer row
      if (rawMunicipio.toLowerCase().includes('total de') || rawEscola.toLowerCase().includes('total de')) {
        return;
      }
      if (!rawEscola && !rawCurso && !rawMunicipio) return;

      const canonicalCurso = getCanonicalCurso(rawCurso);
      let modalidade = 'Presencial';
      let unidadeDisplay = rawEscola;

      const isIted = isSenaiIted(rawEscola);
      if (isIted) {
        modalidade = 'Semi-presencial';
        const mNorm = normalizeString(rawMunicipio);

        if (mNorm === 'salvador') {
          const salvadorKey = `salvador_ited_${normalizeCurso(canonicalCurso)}`;
          const overrideChoice = manualOverrides[salvadorKey];
          const cKey = normalizeCurso(canonicalCurso);
          const dendeKey = `${normalizeUnidade('SENAI Dendezeiros')}___${cKey}___Semi-presencial`;
          const cimatecKey = `${normalizeUnidade('SENAI CIMATEC')}___${cKey}___Semi-presencial`;
          const hasDende = participacaoMap.has(dendeKey);
          const hasCim = participacaoMap.has(cimatecKey);

          if (overrideChoice && (overrideChoice === 'SENAI CIMATEC' || overrideChoice === 'SENAI Dendezeiros')) {
            unidadeDisplay = overrideChoice;
            if (hasDende && hasCim) {
              salvadorItedStudents.push({
                index: idx,
                curso: canonicalCurso,
                cursoKey: cKey,
                salvadorKey,
                row: r
              });
            }
          } else {
            if (hasDende && !hasCim) {
              unidadeDisplay = 'SENAI Dendezeiros';
            } else if (hasCim && !hasDende) {
              unidadeDisplay = 'SENAI CIMATEC';
            } else if (hasDende && hasCim) {
              // Genuine ambiguity: both units exist in Participação for this course
              unidadeDisplay = 'SENAI Dendezeiros';
              salvadorItedStudents.push({
                index: idx,
                curso: canonicalCurso,
                cursoKey: cKey,
                salvadorKey,
                row: r
              });
            } else {
              // Default fallback if neither exists in Participação
              unidadeDisplay = 'SENAI Dendezeiros';
            }
          }
        } else {
          unidadeDisplay = mapItedMunicipioToUnidade(rawMunicipio);
        }
      }

      const uKey = normalizeUnidade(unidadeDisplay);
      const cKey = normalizeCurso(canonicalCurso);
      const groupKey = `${uKey}___${cKey}___${modalidade}`;

      const rawHom = String(r[colHomologado] || '').trim().toUpperCase();
      const rawAp = hasProvaGerada ? String(r[colProvaGerada] || '').trim().toUpperCase() : '';
      const rawTab = hasTabulacao ? String(r[colTabulacao] || '').trim().toUpperCase() : '';
      const rawConf = hasConfirmacao ? String(r[colConfirmacao] || '').trim().toUpperCase() : '';

      const isHomologado = rawHom === 'SIM';
      const isProvaGerada = hasProvaGerada && rawAp === 'SIM';
      const isTabFeita = hasTabulacao && rawTab === 'SIM';
      const isTabPendente = hasTabulacao && (rawTab === 'NÃO' || rawTab === 'NAO');
      const isConfFeita = hasConfirmacao && rawConf === 'SIM';
      const isConfPendente = hasConfirmacao && (rawConf === 'NÃO' || rawConf === 'NAO');

      if (!estudantesMap.has(groupKey)) {
        estudantesMap.set(groupKey, {
          groupKey,
          unidadeDisplay,
          cursoDisplay: canonicalCurso,
          modalidadeDisplay: modalidade,
          totalEstudantes: 0,
          homologados: 0,
          aplicadas: 0,
          tabFeita: 0,
          tabPendente: 0,
          confFeita: 0,
          confPendente: 0,
          _isManualOverride: !!manualOverrides[`salvador_ited_${normalizeCurso(canonicalCurso)}`]
        });
      }

      const eGroup = estudantesMap.get(groupKey);
      eGroup.totalEstudantes += 1;

      if (isHomologado) {
        eGroup.homologados += 1;
        // Tabulation and Confirmation are counted within the universe of Homologados
        if (isTabFeita) eGroup.tabFeita += 1;
        else if (isTabPendente) eGroup.tabPendente += 1;

        if (isConfFeita) eGroup.confFeita += 1;
        else if (isConfPendente) eGroup.confPendente += 1;
      }

      if (isProvaGerada) {
        eGroup.aplicadas += 1;
      }
    });

    // 3. Register structured discrepancies for Salvador ITED ambiguity
    const salvadorByCourse = new Map();
    salvadorItedStudents.forEach(st => {
      if (!salvadorByCourse.has(st.cursoKey)) {
        salvadorByCourse.set(st.cursoKey, {
          curso: st.curso,
          cursoKey: st.cursoKey,
          salvadorKey: st.salvadorKey,
          count: 0
        });
      }
      salvadorByCourse.get(st.cursoKey).count += 1;
    });

    salvadorByCourse.forEach(sItem => {
      const partEvidence = [];
      participacaoMap.forEach(pGroup => {
        if (
          normalizeCurso(pGroup.cursoDisplay) === sItem.cursoKey &&
          pGroup.modalidadeDisplay === 'Semi-presencial' &&
          isSalvadorUnit(pGroup.unidadeDisplay)
        ) {
          pGroup.turmasList.forEach(t => {
            const tUnit = extractItedUnitFromTurma(t.turma, t.escolaOrigem);
            if (isSalvadorUnit(tUnit) || isSalvadorUnit(t.escolaOrigem)) {
              partEvidence.push(t);
            }
          });
        }
      });

      const hasDendezeirosEvidence = partEvidence.some(t => {
        const u = extractItedUnitFromTurma(t.turma, t.escolaOrigem);
        return normalizeUnidade(u) === 'dendezeiros' || normalizeString(t.turma || '').includes('dendezeiros');
      });

      const hasCimatecEvidence = partEvidence.some(t => {
        const u = extractItedUnitFromTurma(t.turma, t.escolaOrigem);
        return normalizeUnidade(u) === 'cimatec' || normalizeString(t.turma || '').includes('cimatec');
      });

      const hasOverride = !!manualOverrides[sItem.salvadorKey];
      discrepancies.push({
        id: sItem.salvadorKey,
        type: 'salvador_ited_ambiguity',
        source: {
          municipio: 'Salvador',
          escola: 'SENAI - ITED',
          curso: sItem.curso,
          modalidade: 'Semi-presencial',
          estudantesCount: sItem.count,
          evidenciasParticipacao: partEvidence
        },
        candidates: [
          {
            id: 'SENAI Dendezeiros',
            unidade: 'SENAI Dendezeiros',
            curso: sItem.curso,
            descricao: hasDendezeirosEvidence
              ? 'SENAI Dendezeiros (Identificado nas turmas da Participação com sufixo - DENDEZEIROS)'
              : 'SENAI Dendezeiros',
            isRecommended: hasDendezeirosEvidence && !hasCimatecEvidence
          },
          {
            id: 'SENAI CIMATEC',
            unidade: 'SENAI CIMATEC',
            curso: sItem.curso,
            descricao: hasCimatecEvidence
              ? 'SENAI CIMATEC (Identificado nas turmas da Participação com sufixo - CIMATEC)'
              : 'SENAI CIMATEC',
            isRecommended: hasCimatecEvidence && !hasDendezeirosEvidence
          }
        ],
        resolution: hasOverride ? manualOverrides[sItem.salvadorKey] : null,
        isResolved: hasOverride
      });

      if (!hasOverride) {
        warnings.push(`Salvador (SENAI - ITED): O curso "${sItem.curso}" possui ${sItem.count} alunos com ambiguidade entre SENAI CIMATEC e SENAI Dendezeiros. Decisão manual necessária.`);
      }
    });

    // 4. Build Union of all Keys: keys(Participacao) ∪ keys(Estudantes)
    const allKeys = new Set([...participacaoMap.keys(), ...estudantesMap.keys()]);
    const consolidatedRows = [];

    // Sort keys alphabetically by Unidade, then Curso, then Modalidade
    const sortedKeys = Array.from(allKeys).sort((a, b) => {
      const uA = (participacaoMap.get(a)?.unidadeDisplay || estudantesMap.get(a)?.unidadeDisplay || '').toLowerCase();
      const uB = (participacaoMap.get(b)?.unidadeDisplay || estudantesMap.get(b)?.unidadeDisplay || '').toLowerCase();
      if (uA !== uB) return uA.localeCompare(uB, 'pt-BR');

      const cA = (participacaoMap.get(a)?.cursoDisplay || estudantesMap.get(a)?.cursoDisplay || '').toLowerCase();
      const cB = (participacaoMap.get(b)?.cursoDisplay || estudantesMap.get(b)?.cursoDisplay || '').toLowerCase();
      if (cA !== cB) return cA.localeCompare(cB, 'pt-BR');

      const mA = participacaoMap.get(a)?.modalidadeDisplay || estudantesMap.get(a)?.modalidadeDisplay || '';
      const mB = participacaoMap.get(b)?.modalidadeDisplay || estudantesMap.get(b)?.modalidadeDisplay || '';
      return mA.localeCompare(mB, 'pt-BR');
    });

    let totalProvaObjetiva = 0;
    let totalHomologados = 0;
    let totalAplicadas = 0;
    let totalNaoAplicadas = 0;
    let totalProvasGeradas = 0;
    let totalTabFeita = 0;
    let totalTabPendente = 0;
    let totalTabulacao = 0;
    let totalConfFeita = 0;
    let totalConfPendente = 0;

    sortedKeys.forEach(k => {
      const pData = participacaoMap.get(k);
      const eData = estudantesMap.get(k);

      const dr = 'SENAI-BA';
      const unidade = (eData && eData.unidadeDisplay) || (pData && pData.unidadeDisplay) || '';
      const curso = (eData && eData.cursoDisplay) || (pData && pData.cursoDisplay) || '';
      const modalidade = (eData && eData.modalidadeDisplay) || (pData && pData.modalidadeDisplay) || 'Presencial';

      const provaObjetiva = pData ? pData.presentes : 0;
      const homologados = eData ? eData.homologados : 0;
      
      let aplicadas = 0;
      let naoAplicadas = 0;
      let totalGeradas = 0;
      let aplicadasPct = 0;
      let naoAplicadasPct = 0;

      if (hasProvaGerada) {
        aplicadas = eData ? eData.aplicadas : 0;
        naoAplicadas = Math.max(0, homologados - aplicadas);
        totalGeradas = aplicadas + naoAplicadas;
        aplicadasPct = totalGeradas > 0 ? aplicadas / totalGeradas : 0;
        naoAplicadasPct = totalGeradas > 0 ? naoAplicadas / totalGeradas : 0;
      }

      let tabFeita = 0;
      let tabPendente = 0;
      let totalTab = 0;
      let tabFeitaPct = 0;
      let tabPendentePct = 0;

      if (hasTabulacao) {
        tabFeita = eData ? eData.tabFeita : 0;
        tabPendente = eData ? eData.tabPendente : 0;
        totalTab = tabFeita + tabPendente;
        tabFeitaPct = totalTab > 0 ? tabFeita / totalTab : 0;
        tabPendentePct = totalTab > 0 ? tabPendente / totalTab : 0;
      }

      let confFeita = 0;
      let confPendente = 0;

      if (hasConfirmacao) {
        confFeita = eData ? eData.confFeita : 0;
        confPendente = eData ? eData.confPendente : 0;
      }

      totalProvaObjetiva += provaObjetiva;
      totalHomologados += homologados;
      totalAplicadas += aplicadas;
      totalNaoAplicadas += naoAplicadas;
      totalProvasGeradas += totalGeradas;
      totalTabFeita += tabFeita;
      totalTabPendente += tabPendente;
      totalTabulacao += totalTab;
      totalConfFeita += confFeita;
      totalConfPendente += confPendente;

      const isUnilateralPart = pData && !eData;
      const isUnilateralEst = eData && !pData;

      if (isUnilateralPart) {
        warnings.push(`Participação sem Estudantes: "${unidade}" - "${curso}" (${modalidade}) possui ${provaObjetiva} presentes mas não consta na base de estudantes.`);
      }

      if (isUnilateralEst && homologados > 0) {
        warnings.push(`Estudantes sem Participação: "${unidade}" - "${curso}" (${modalidade}) possui ${homologados} homologados mas 0 presentes na Prova Objetiva.`);
      }

      const rowObj = {
        'Departamento Regional (DR)': dr,
        'Unidade operacional (Escola)': unidade,
        'Curso': curso,
        'Modalidade': modalidade,
        'Prova Objetiva': provaObjetiva,
        'Alunos Homologados': homologados,
        'Provas Aplicadas': aplicadas,
        'Provas Aplicadas (%)': `${(aplicadasPct * 100).toFixed(1)}%`,
        'Provas Não Aplicadas': naoAplicadas,
        'Provas Não Aplicadas (%)': `${(naoAplicadasPct * 100).toFixed(1)}%`,
        'Total de Provas Geradas': totalGeradas,
        'Tabulação Feita': tabFeita,
        'Tabulação Feita (%)': `${(tabFeitaPct * 100).toFixed(1)}%`,
        'Tabulação Pendente': tabPendente,
        'Tabulação Pendente (%)': `${(tabPendentePct * 100).toFixed(1)}%`,
        'Total de Tabulação': totalTab,
        'Confirmação Feita': confFeita,
        'Confirmação Pendente': confPendente,

        // Internal UI metadata
        _groupKey: k,
        _isManualAssociation: (eData && eData._isManualOverride) || false,
        _hasWarning: isUnilateralPart || (isUnilateralEst && homologados > 0)
      };

      consolidatedRows.push(rowObj);
    });

    const distinctCursos = new Set(consolidatedRows.map(r => r['Curso'])).size;
    const distinctUnidades = new Set(consolidatedRows.map(r => r['Unidade operacional (Escola)'])).size;

    const kpis = {
      totalLinhas: consolidatedRows.length,
      totalCursos: distinctCursos,
      totalUnidades: distinctUnidades,
      totalHomologados,
      totalAplicadas,
      totalNaoAplicadas,
      totalProvasGeradas,
      totalTabuladas: totalTabFeita,
      totalTabPendente,
      totalTabulacao,
      totalConfirmadas: totalConfFeita,
      totalConfPendente,
      totalProvaObjetiva,
      percentualAplicadasGeral: totalProvasGeradas > 0 ? ((totalAplicadas / totalProvasGeradas) * 100).toFixed(1) : '0.0',
      percentualTabuladasGeral: totalTabulacao > 0 ? ((totalTabFeita / totalTabulacao) * 100).toFixed(1) : '0.0',
      percentualConfirmadasGeral: totalTabulacao > 0 ? ((totalConfFeita / totalTabulacao) * 100).toFixed(1) : '0.0'
    };

    return {
      columns: PROVA_PRATICA_COLUMNS,
      rows: consolidatedRows,
      kpis,
      stats: kpis,
      warnings,
      discrepancies
    };
  }
};
