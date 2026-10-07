/**
 * Demo Data Generator
 * Provides realistic test spreadsheets for 1-click demonstration of Prova Objetiva conversion,
 * including both CHP and IFTP Matriculados categories.
 */

export class DemoDataService {
  /**
   * Generates sample in-memory datasets representing the 4 files for Prova Objetiva:
   * 1. Aptos (Principal)
   * 2. Matriculados CHP
   * 3. Matriculados IFTP
   * 4. Participação (Opcional)
   */
  static getDemoDatasets() {
    // 1. Aptos (Principal) Dataset
    const aptosHeaders = ['ESCOLA', 'CURSO', 'TURMADESCRICAO'];
    const aptosRows = [
      // Turma ELE01: SENAI Dendezeiros - Eletrotécnica (CHP)
      { ESCOLA: 'SENAI Dendezeiros', CURSO: 'Técnico em Eletrotécnica', TURMADESCRICAO: 'ELE01 - Matutino' },
      { ESCOLA: 'SENAI Dendezeiros', CURSO: 'Técnico em Eletrotécnica', TURMADESCRICAO: 'ELE01 - Matutino' },
      { ESCOLA: 'SENAI Dendezeiros', CURSO: 'Técnico em Eletrotécnica', TURMADESCRICAO: 'ELE01 - Matutino' },
      { ESCOLA: 'SENAI Dendezeiros', CURSO: 'Técnico em Eletrotécnica', TURMADESCRICAO: 'ELE01 - Matutino' },

      // Turma DS001: SENAI ITED - Desenvolvimento de Sistemas (ITED school -> Lauro de Freitas, CHP)
      { ESCOLA: 'SENAI ITED', CURSO: 'Técnico em Desenvolvimento de Sistemas', TURMADESCRICAO: 'DS001 - Lauro de Freitas' },
      { ESCOLA: 'SENAI ITED', CURSO: 'Técnico em Desenvolvimento de Sistemas', TURMADESCRICAO: 'DS001 - Lauro de Freitas' },
      { ESCOLA: 'SENAI ITED', CURSO: 'Técnico em Desenvolvimento de Sistemas', TURMADESCRICAO: 'DS001 - Lauro de Freitas' },
      { ESCOLA: 'SENAI ITED', CURSO: 'Técnico em Desenvolvimento de Sistemas', TURMADESCRICAO: 'DS001 - Lauro de Freitas' },
      { ESCOLA: 'SENAI ITED', CURSO: 'Técnico em Desenvolvimento de Sistemas', TURMADESCRICAO: 'DS001 - Lauro de Freitas' },

      // Turma RC002: SENAI ITED - Redes de Computadores (ITED school -> Feira de Santana, IFTP)
      { ESCOLA: 'SENAI ITED', CURSO: 'Técnico em Redes de Computadores', TURMADESCRICAO: 'RC002 - Feira de Santana' },
      { ESCOLA: 'SENAI ITED', CURSO: 'Técnico em Redes de Computadores', TURMADESCRICAO: 'RC002 - Feira de Santana' },
      { ESCOLA: 'SENAI ITED', CURSO: 'Técnico em Redes de Computadores', TURMADESCRICAO: 'RC002 - Feira de Santana' },

      // Turma MEC01: SENAI Cimatec - Mecatrônica (IFTP)
      { ESCOLA: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', TURMADESCRICAO: 'MEC01 - Noturno' },
      { ESCOLA: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', TURMADESCRICAO: 'MEC01 - Noturno' },
      { ESCOLA: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', TURMADESCRICAO: 'MEC01 - Noturno' },
      { ESCOLA: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', TURMADESCRICAO: 'MEC01 - Noturno' },
      { ESCOLA: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', TURMADESCRICAO: 'MEC01 - Noturno' }
    ];

    // 2. Matriculados CHP Dataset
    const chpHeaders = ['UNIDADE', 'CURSO', 'CODTURMA', 'MATRICULA', 'NOME_ALUNO'];
    const chpRows = [
      // 5 enrolled for Turma ELE01 in CHP (4 aptos, 1 inapto)
      { UNIDADE: 'SENAI Dendezeiros', CURSO: 'Técnico em Eletrotécnica', CODTURMA: 'ELE01', MATRICULA: 'CHP-ELE-01', NOME_ALUNO: 'Aluno 1 CHP Eletrotécnica' },
      { UNIDADE: 'SENAI Dendezeiros', CURSO: 'Técnico em Eletrotécnica', CODTURMA: 'ELE01', MATRICULA: 'CHP-ELE-02', NOME_ALUNO: 'Aluno 2 CHP Eletrotécnica' },
      { UNIDADE: 'SENAI Dendezeiros', CURSO: 'Técnico em Eletrotécnica', CODTURMA: 'ELE01', MATRICULA: 'CHP-ELE-03', NOME_ALUNO: 'Aluno 3 CHP Eletrotécnica' },
      { UNIDADE: 'SENAI Dendezeiros', CURSO: 'Técnico em Eletrotécnica', CODTURMA: 'ELE01', MATRICULA: 'CHP-ELE-04', NOME_ALUNO: 'Aluno 4 CHP Eletrotécnica' },
      { UNIDADE: 'SENAI Dendezeiros', CURSO: 'Técnico em Eletrotécnica', CODTURMA: 'ELE01', MATRICULA: 'CHP-ELE-05', NOME_ALUNO: 'Aluno 5 CHP Eletrotécnica' },

      // 6 enrolled for Turma DS001 in CHP (5 aptos, 1 inapto)
      { UNIDADE: 'Lauro de Freitas', CURSO: 'Técnico em Desenvolvimento de Sistemas', CODTURMA: 'DS001', MATRICULA: 'CHP-DS-01', NOME_ALUNO: 'Aluno 1 CHP Desenvolvimento' },
      { UNIDADE: 'Lauro de Freitas', CURSO: 'Técnico em Desenvolvimento de Sistemas', CODTURMA: 'DS001', MATRICULA: 'CHP-DS-02', NOME_ALUNO: 'Aluno 2 CHP Desenvolvimento' },
      { UNIDADE: 'Lauro de Freitas', CURSO: 'Técnico em Desenvolvimento de Sistemas', CODTURMA: 'DS001', MATRICULA: 'CHP-DS-03', NOME_ALUNO: 'Aluno 3 CHP Desenvolvimento' },
      { UNIDADE: 'Lauro de Freitas', CURSO: 'Técnico em Desenvolvimento de Sistemas', CODTURMA: 'DS001', MATRICULA: 'CHP-DS-04', NOME_ALUNO: 'Aluno 4 CHP Desenvolvimento' },
      { UNIDADE: 'Lauro de Freitas', CURSO: 'Técnico em Desenvolvimento de Sistemas', CODTURMA: 'DS001', MATRICULA: 'CHP-DS-05', NOME_ALUNO: 'Aluno 5 CHP Desenvolvimento' },
      { UNIDADE: 'Lauro de Freitas', CURSO: 'Técnico em Desenvolvimento de Sistemas', CODTURMA: 'DS001', MATRICULA: 'CHP-DS-06', NOME_ALUNO: 'Aluno 6 CHP Desenvolvimento' }
    ];

    // 3. Matriculados IFTP Dataset
    const iftpHeaders = ['UNIDADE', 'CURSO', 'CODTURMA', 'MATRICULA', 'NOME_ALUNO'];
    const iftpRows = [
      // 4 enrolled for Turma RC002 in IFTP (3 aptos, 1 inapto)
      { UNIDADE: 'Feira de Santana', CURSO: 'Técnico em Redes de Computadores', CODTURMA: 'RC002', MATRICULA: 'IFTP-RC-01', NOME_ALUNO: 'Aluno 1 IFTP Redes' },
      { UNIDADE: 'Feira de Santana', CURSO: 'Técnico em Redes de Computadores', CODTURMA: 'RC002', MATRICULA: 'IFTP-RC-02', NOME_ALUNO: 'Aluno 2 IFTP Redes' },
      { UNIDADE: 'Feira de Santana', CURSO: 'Técnico em Redes de Computadores', CODTURMA: 'RC002', MATRICULA: 'IFTP-RC-03', NOME_ALUNO: 'Aluno 3 IFTP Redes' },
      { UNIDADE: 'Feira de Santana', CURSO: 'Técnico em Redes de Computadores', CODTURMA: 'RC002', MATRICULA: 'IFTP-RC-04', NOME_ALUNO: 'Aluno 4 IFTP Redes' },

      // 7 enrolled for Turma MEC01 in IFTP (5 aptos, 2 inaptos)
      { UNIDADE: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', CODTURMA: 'MEC01', MATRICULA: 'IFTP-MEC-01', NOME_ALUNO: 'Aluno 1 IFTP Mecatrônica' },
      { UNIDADE: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', CODTURMA: 'MEC01', MATRICULA: 'IFTP-MEC-02', NOME_ALUNO: 'Aluno 2 IFTP Mecatrônica' },
      { UNIDADE: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', CODTURMA: 'MEC01', MATRICULA: 'IFTP-MEC-03', NOME_ALUNO: 'Aluno 3 IFTP Mecatrônica' },
      { UNIDADE: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', CODTURMA: 'MEC01', MATRICULA: 'IFTP-MEC-04', NOME_ALUNO: 'Aluno 4 IFTP Mecatrônica' },
      { UNIDADE: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', CODTURMA: 'MEC01', MATRICULA: 'IFTP-MEC-05', NOME_ALUNO: 'Aluno 5 IFTP Mecatrônica' },
      { UNIDADE: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', CODTURMA: 'MEC01', MATRICULA: 'IFTP-MEC-06', NOME_ALUNO: 'Aluno 6 IFTP Mecatrônica' },
      { UNIDADE: 'SENAI Cimatec', CURSO: 'Técnico em Mecatrônica Industrial', CODTURMA: 'MEC01', MATRICULA: 'IFTP-MEC-07', NOME_ALUNO: 'Aluno 7 IFTP Mecatrônica' }
    ];

    // 4. Participação Dataset (Presentes / Ausentes)
    const participacaoHeaders = ['ESCOLA', 'CURSO', 'TURMADESCRICAO', 'PRESENTES', 'AUSENTES'];
    const participacaoRows = [
      {
        ESCOLA: 'SENAI Dendezeiros',
        CURSO: 'Técnico em Eletrotécnica',
        TURMADESCRICAO: 'ELE01 - Matutino',
        PRESENTES: 3,
        AUSENTES: 1
      },
      {
        ESCOLA: 'Lauro de Freitas',
        CURSO: 'Técnico em Desenvolvimento de Sistemas',
        TURMADESCRICAO: 'DS001 - Lauro de Freitas',
        PRESENTES: 4,
        AUSENTES: 1
      },
      {
        ESCOLA: 'Feira de Santana',
        CURSO: 'Técnico em Redes de Computadores',
        TURMADESCRICAO: 'RC002 - Feira de Santana',
        PRESENTES: 3,
        AUSENTES: 0
      },
      {
        ESCOLA: 'SENAI Cimatec',
        CURSO: 'Técnico em Mecatrônica Industrial',
        TURMADESCRICAO: 'MEC01 - Noturno',
        PRESENTES: 4,
        AUSENTES: 1
      }
    ];

    return {
      aptos: {
        fileName: 'MICRODADOS_APTOS_2026.xlsx',
        fileSize: 24500,
        headers: aptosHeaders,
        rows: aptosRows
      },
      matriculados_chp: {
        fileName: 'ALUNOS_MATRICULADOS_CHP_2026.xlsx',
        fileSize: 18200,
        headers: chpHeaders,
        rows: chpRows
      },
      matriculados_iftp: {
        fileName: 'ALUNOS_MATRICULADOS_IFTP_2026.xlsx',
        fileSize: 19100,
        headers: iftpHeaders,
        rows: iftpRows
      },
      participacao: {
        fileName: 'PARTICIPAÇÃO_PROVAS_2026.xlsx',
        fileSize: 12400,
        headers: participacaoHeaders,
        rows: participacaoRows
      }
    };
  }

  /**
   * Generates sample in-memory datasets representing the 2 files for Prova Prática:
   * 1. Participação (RelatorioParticipacaoTurmasProvas)
   * 2. Estudantes (estudantes - BA)
   */
  static getDemoDatasetsPP() {
    const partHeaders = [
      'Departamento Regional (DR)',
      'Unidade operacional (Escola)',
      'Curso',
      'Turma',
      'Agendamento (horário de Brasília)',
      'Presentes',
      'Presentes (%)',
      'Ausentes',
      'Ausentes (%)',
      'Total'
    ];
    const partRows = [
      {
        'Departamento Regional (DR)': 'SENAI-BA',
        'Unidade operacional (Escola)': 'SENAI Dendezeiros',
        'Curso': 'Técnico em Eletrotécnica',
        'Turma': 'ELE-01-DENDEZEIROS',
        'Agendamento (horário de Brasília)': '10/11/2026 08:00',
        'Presentes': 15,
        'Presentes (%)': '100%',
        'Ausentes': 0,
        'Ausentes (%)': '0%',
        'Total': 15
      },
      {
        'Departamento Regional (DR)': 'SENAI-BA',
        'Unidade operacional (Escola)': 'SENAI Feira de Santana',
        'Curso': 'Técnico em Eletromecânica',
        'Turma': 'EM-02-FEIRA',
        'Agendamento (horário de Brasília)': '10/11/2026 08:00',
        'Presentes': 12,
        'Presentes (%)': '92.3%',
        'Ausentes': 1,
        'Ausentes (%)': '7.7%',
        'Total': 13
      },
      {
        'Departamento Regional (DR)': 'SENAI-BA',
        'Unidade operacional (Escola)': 'SENAI Lauro de Freitas',
        'Curso': 'Técnico em Desenvolvimento de Sistemas',
        'Turma': 'DS-03-LAURO',
        'Agendamento (horário de Brasília)': '10/11/2026 08:00',
        'Presentes': 20,
        'Presentes (%)': '100%',
        'Ausentes': 0,
        'Ausentes (%)': '0%',
        'Total': 20
      },
      {
        'Departamento Regional (DR)': 'SENAI-BA',
        'Unidade operacional (Escola)': 'SENAI - ITED',
        'Curso': 'Técnico em Redes de Computadores',
        'Turma': '117621 - DEDENZEIROS',
        'Agendamento (horário de Brasília)': '10/11/2026 08:00',
        'Presentes': 8,
        'Presentes (%)': '100%',
        'Ausentes': 0,
        'Ausentes (%)': '0%',
        'Total': 8
      }
    ];

    const estHeaders = [
      'MUNICIPIO',
      'ESCOLA',
      'NOME',
      'PROVA GERADA',
      'TABULAÇÃO',
      'CURSO',
      'HOMOLOGADO',
      'CONFIRMACAO DO COORDENADOR'
    ];
    const estRows = [
      // Dendezeiros - Eletrotecnica
      { MUNICIPIO: 'Salvador', ESCOLA: 'SENAI Dendezeiros', NOME: 'Aluno 1', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'SIM', CURSO: 'Técnico em Eletrotécnica', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'SIM' },
      { MUNICIPIO: 'Salvador', ESCOLA: 'SENAI Dendezeiros', NOME: 'Aluno 2', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'SIM', CURSO: 'Técnico em Eletrotécnica', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'SIM' },
      { MUNICIPIO: 'Salvador', ESCOLA: 'SENAI Dendezeiros', NOME: 'Aluno 3', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'NÃO', CURSO: 'Técnico em Eletrotécnica', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'NÃO' },
      { MUNICIPIO: 'Salvador', ESCOLA: 'SENAI Dendezeiros', NOME: 'Aluno 4 (Inapto)', 'PROVA GERADA': 'NÃO', 'TABULAÇÃO': 'NÃO', CURSO: 'Técnico em Eletrotécnica', HOMOLOGADO: 'NÃO', 'CONFIRMACAO DO COORDENADOR': 'NÃO' },

      // Feira de Santana - Eletromecanica
      { MUNICIPIO: 'Feira de Santana', ESCOLA: 'SENAI Feira de Santana', NOME: 'Aluno 5', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'SIM', CURSO: 'Técnico em Eletromecânica', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'SIM' },
      { MUNICIPIO: 'Feira de Santana', ESCOLA: 'SENAI Feira de Santana', NOME: 'Aluno 6', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'SIM', CURSO: 'Técnico em Eletromecânica', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'SIM' },
      { MUNICIPIO: 'Feira de Santana', ESCOLA: 'SENAI Feira de Santana', NOME: 'Aluno 7', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'SIM', CURSO: 'Técnico em Eletromecânica', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'SIM' },

      // ITED Lauro de Freitas
      { MUNICIPIO: 'Lauro de Freitas', ESCOLA: 'SENAI - ITED', NOME: 'Aluno 8', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'SIM', CURSO: 'Técnico em Desenvolvimento de Sistemas', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'SIM' },
      { MUNICIPIO: 'Lauro de Freitas', ESCOLA: 'SENAI - ITED', NOME: 'Aluno 9', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'SIM', CURSO: 'Técnico em Desenvolvimento de Sistemas', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'SIM' },

      // ITED Salvador (Ambíguo para resolução manual)
      { MUNICIPIO: 'Salvador', ESCOLA: 'SENAI - ITED', NOME: 'Aluno 10', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'SIM', CURSO: 'Técnico em Redes de Computadores', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'SIM' },
      { MUNICIPIO: 'Salvador', ESCOLA: 'SENAI - ITED', NOME: 'Aluno 11', 'PROVA GERADA': 'SIM', 'TABULAÇÃO': 'SIM', CURSO: 'Técnico em Redes de Computadores', HOMOLOGADO: 'SIM', 'CONFIRMACAO DO COORDENADOR': 'SIM' }
    ];

    return {
      participacao: {
        fileName: 'RelatorioParticipacaoTurmasProvas_DEMO.xlsx',
        fileSize: 15400,
        headers: partHeaders,
        rows: partRows
      },
      estudantes: {
        fileName: 'estudantes - BA_DEMO.xlsx',
        fileSize: 21600,
        headers: estHeaders,
        rows: estRows
      }
    };
  }
}
