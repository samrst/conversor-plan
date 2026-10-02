"""
Comprehensive Functional Test Suite for Consolidador de Macrodados
Validates:
1. All 8 mandatory consolidation cases (CHP, IFTP, Split Categories, Aptos/Agendados, Inaptos, Participacao, Mapeamento Manual, ITED).
2. Mandatory Turma Normalization Rules (T, B, G, SAEP prefix stripping; EMB, EMP suffix stripping).
3. Section 10 Mandatory Composite Key Tests:
   - Caso 1: Mesma turma, unidades diferentes -> Linhas separadas (nunca somar)
   - Caso 2: Mesma turma e unidade, cursos diferentes -> Linhas separadas
   - Caso 3: IFTP EMB + EMP na mesma unidade + curso -> Somar para a mesma turma
   - Caso 4: IFTP EMB / EMP em unidades diferentes -> Linhas separadas (nunca somar entre unidades)
   - Caso 5: Prefixos T/B/G/SAEP -> Associam somente quando Unidade + Curso forem iguais
4. Mandatory Course Canonicalization (Técnico em Automação -> Técnico em Automação Industrial):
   - Turmas 96225 e 96226 encontram os respectivos registros no CHP
   - Coluna Curso exibe "Técnico em Automação Industrial"
   - Cursos diferentes (Mecatrônica, Eletrotécnica, etc.) permanecem inalterados
"""

import re
import unicodedata

def normalize_string(s):
    if not s: return ''
    nfd = unicodedata.normalize('NFD', str(s))
    no_accents = ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', no_accents.lower())

def normalize_cod_turma(cod):
    if not cod: return ''
    s = str(cod).strip()
    if not s: return ''
    # Step 1: Remove prefix T, B, G, SAEP (case-insensitive) only at the start
    s = re.sub(r'^(?:saep|[tbg])[\s_-]*', '', s, flags=re.IGNORECASE).strip()
    # Step 2: Remove suffix EMB, EMP (case-insensitive) only at the end
    s = re.sub(r'[\s_-]*(?:emb|emp)$', '', s, flags=re.IGNORECASE).strip()
    return s

def extract_turma_code(turma_desc):
    if not turma_desc: return ''
    s = str(turma_desc).strip()
    if not s: return ''
    raw_code = s
    for sep in ['-', '–', '—']:
        if sep in raw_code:
            raw_code = raw_code.split(sep)[0].strip()
            break
    return normalize_cod_turma(raw_code)

def get_turma_display(turma_desc):
    return extract_turma_code(turma_desc)

def is_senai_ited(escola):
    if not escola: return False
    norm = normalize_string(escola)
    return 'senaiited' in norm or norm == 'ited'

def get_unidade_operacional(escola, turma_desc):
    raw_escola = (escola or '').strip()
    if is_senai_ited(raw_escola):
        desc = (turma_desc or '').strip()
        for sep in ['-', '–', '—']:
            if sep in desc:
                parts = desc.split(sep)
                extracted = sep.join(parts[1:]).strip()
                if extracted:
                    return extracted
        return desc or raw_escola
    return raw_escola

def normalize_unidade(unidade):
    if not unidade: return ''
    s = normalize_string(unidade)
    s = re.sub(r'^(?:senai|cfp|escola|unidade|centro|cetind)+', '', s)
    canonical = {
        'feiradesantana': 'feira',
        'feiradesantanabest': 'feira',
        'feiraserrinha': 'feira',
        'vitoriadaconquista': 'conquista',
        'luiseduardomagalhaes': 'lem',
        'luiseduardo': 'lem',
        'salvadorcimatec': 'cimatec',
        'salvadordendezeiros': 'dendezeiros'
    }
    for k, v in canonical.items():
        if s.startswith(k) or s == k:
            return v
    return s

def get_canonical_curso(curso):
    if not curso: return ''
    trimmed = str(curso).strip()
    norm = normalize_string(trimmed)
    if norm in ['tecnicoemautomacao', 'automacao', 'tecnicoemautomacaoindustrial', 'automacaoindustrial']:
        return 'Técnico em Automação Industrial'
    return trimmed

def normalize_curso(curso):
    if not curso: return ''
    canonical = get_canonical_curso(curso)
    s = normalize_string(canonical)
    s = re.sub(r'^(?:tecnicoem|tecnicode|cursobtecnico|curso)+', '', s)
    return s

def make_composite_key(unidade, curso, turma_code):
    u = normalize_unidade(unidade)
    c = normalize_curso(curso)
    t = normalize_cod_turma(turma_code)
    return f"{u}___{c}___{t}"

# Consolidation Engine Simulator (strictly matches js/models/prova-objetiva.js)
def consolidate_prova_objetiva(aptos_rows, mat_chp_rows=None, mat_iftp_rows=None, part_rows=None, custom_mappings=None):
    if mat_chp_rows is None: mat_chp_rows = []
    if mat_iftp_rows is None: mat_iftp_rows = []
    if custom_mappings is None: custom_mappings = {}

    # File role column mappings
    map_aptos = custom_mappings.get('aptos', {})
    col_aptos_escola = map_aptos.get('ESCOLA', 'ESCOLA')
    col_aptos_curso = map_aptos.get('CURSO', 'CURSO')
    col_aptos_turma = map_aptos.get('TURMADESCRICAO', 'TURMADESCRICAO')

    map_chp = custom_mappings.get('matriculados_chp', {})
    col_chp_turma = map_chp.get('CODTURMA', 'CODTURMA')
    col_chp_unidade = map_chp.get('UNIDADE', 'UNIDADE') if map_chp.get('UNIDADE') else ('ESCOLA' if 'ESCOLA' in (mat_chp_rows[0] if mat_chp_rows else {}) else 'UNIDADE')
    col_chp_curso = map_chp.get('CURSO', 'CURSO')

    map_iftp = custom_mappings.get('matriculados_iftp', {})
    col_iftp_turma = map_iftp.get('CODTURMA', 'CODTURMA')
    col_iftp_unidade = map_iftp.get('UNIDADE', 'UNIDADE') if map_iftp.get('UNIDADE') else ('ESCOLA' if 'ESCOLA' in (mat_iftp_rows[0] if mat_iftp_rows else {}) else 'UNIDADE')
    col_iftp_curso = map_iftp.get('CURSO', 'CURSO')

    # Index matriculados by Composite Key (Unidade + Curso Canônico + Turma)
    def index_matriculados(rows, turma_col, unidade_col, curso_col):
        idx = {}
        for r in rows:
            cod = str(r.get(turma_col, '')).strip()
            if not cod: continue
            u = str(r.get(unidade_col, '')).strip()
            c = str(r.get(curso_col, '')).strip()
            can_c = get_canonical_curso(c)
            comp_key = make_composite_key(u, can_c, cod)
            idx[comp_key] = idx.get(comp_key, 0) + 1
        return idx

    chp_index = index_matriculados(mat_chp_rows, col_chp_turma, col_chp_unidade, col_chp_curso)
    iftp_index = index_matriculados(mat_iftp_rows, col_iftp_turma, col_iftp_unidade, col_iftp_curso)

    # Index participacao if provided
    part_index = {}
    if part_rows:
        map_part = custom_mappings.get('participacao', {})
        col_part_esc = map_part.get('ESCOLA', 'ESCOLA')
        col_part_cur = map_part.get('CURSO', 'CURSO')
        col_part_tur = map_part.get('TURMADESCRICAO', 'TURMADESCRICAO')
        col_part_pres = map_part.get('PRESENTES', 'PRESENTES')
        col_part_aus = map_part.get('AUSENTES', 'AUSENTES')

        for r in part_rows:
            raw_esc = str(r.get(col_part_esc, '')).strip()
            raw_tur = str(r.get(col_part_tur, '')).strip()
            unidade = get_unidade_operacional(raw_esc, raw_tur)
            curso = get_canonical_curso(str(r.get(col_part_cur, '')).strip())
            turma = extract_turma_code(raw_tur)

            key = make_composite_key(unidade, curso, turma)
            full_key = make_composite_key(unidade, curso, raw_tur)
            pres = int(r.get(col_part_pres, 0) or 0)
            aus = int(r.get(col_part_aus, 0) or 0)

            if key not in part_index:
                part_index[key] = {'presentes': 0, 'ausentes': 0}
            part_index[key]['presentes'] += pres
            part_index[key]['ausentes'] += aus

            if full_key not in part_index:
                part_index[full_key] = {'presentes': pres, 'ausentes': aus}

    # Step 5: Group Aptos by unique class (Unidade Operacional + Canonical Curso + TURMADESCRICAO)
    class_groups = {}
    for r in aptos_rows:
        raw_escola = str(r.get(col_aptos_escola, '')).strip()
        raw_curso = str(r.get(col_aptos_curso, '')).strip()
        raw_turma_desc = str(r.get(col_aptos_turma, '')).strip()

        unidade = get_unidade_operacional(raw_escola, raw_turma_desc)
        canonical_curso = get_canonical_curso(raw_curso)
        group_key = f"{unidade}___{canonical_curso}___{raw_turma_desc}"

        if group_key not in class_groups:
            class_groups[group_key] = {
                'escola_raw': raw_escola,
                'unidade': unidade,
                'curso': canonical_curso,
                'turma_desc': raw_turma_desc,
                'records': []
            }
        class_groups[group_key]['records'].append(r)

    # Step 6: Process groups and lookup Matriculados with composite keys
    output_rows = []

    for g in class_groups.values():
        unidade = g['unidade']
        curso = g['curso']
        curso_final = get_canonical_curso(curso)
        turma_desc = g['turma_desc']
        aptos_count = len(g['records'])
        turma_code = extract_turma_code(turma_desc)
        modalidade = 'Semipresencial' if is_senai_ited(g['escola_raw']) else 'Presencial'

        comp_key = make_composite_key(unidade, curso_final, turma_code)
        count_chp = chp_index.get(comp_key, 0)
        count_iftp = iftp_index.get(comp_key, 0)

        categories_to_emit = []
        if count_chp > 0:
            categories_to_emit.append(('CHP', count_chp))
        if count_iftp > 0:
            categories_to_emit.append(('IFTP', count_iftp))
        if not categories_to_emit:
            # Fallback if both 0
            if mat_iftp_rows and not mat_chp_rows:
                categories_to_emit.append(('IFTP', 0))
            else:
                categories_to_emit.append(('CHP', 0))

        # Look up participation
        p_info = part_index.get(comp_key, {'presentes': 0, 'ausentes': 0})
        presentes = p_info['presentes'] if aptos_count > 0 else 0
        ausentes = p_info['ausentes'] if aptos_count > 0 else 0

        pres_pct = f"{(presentes / aptos_count * 100):.1f}%" if aptos_count > 0 else "0.0%"
        aus_pct = f"{(ausentes / aptos_count * 100):.1f}%" if aptos_count > 0 else "0.0%"

        for cat, alunos in categories_to_emit:
            inaptos = max(0, alunos - aptos_count)
            output_rows.append({
                'Departamento Regional (DR)': 'SENAI-BA',
                'Unidade operacional (Escola)': unidade,
                'Curso': curso_final,
                'Categoria': cat,
                'Modalidade': modalidade,
                'Turma': turma_code,
                'Alunos': alunos,
                'Alunos Aptos/Agendados': aptos_count,
                'Alunos Inaptos/Não Agendados': inaptos,
                'Presentes': presentes,
                'Presentes (%)': pres_pct,
                'Ausentes': ausentes,
                'Ausentes (%)': aus_pct
            })

    # Sort
    output_rows.sort(key=lambda r: (
        r['Unidade operacional (Escola)'],
        r['Curso'],
        r['Categoria'],
        r['Turma']
    ))

    return output_rows


# =========================================================================
# TEST SUITE: 8 MANDATORY SPECIFICATION CASES
# =========================================================================

def test_caso_1_chp():
    print("--- Test 1: Caso 1 — CHP ---")
    aptos = [{"ESCOLA": "SENAI Dendezeiros", "CURSO": "Eletrotécnica", "TURMADESCRICAO": "ELE01 - Matutino"}]
    mat_chp = [{"UNIDADE": "SENAI Dendezeiros", "CURSO": "Eletrotécnica", "CODTURMA": "ELE01"}] * 3
    
    res = consolidate_prova_objetiva(aptos, mat_chp_rows=mat_chp, mat_iftp_rows=[])
    assert len(res) == 1
    assert res[0]['Categoria'] == 'CHP'
    assert res[0]['Alunos'] == 3
    print("  [PASS] Caso 1: Categoria CHP preenchida corretamente.")


def test_caso_2_iftp():
    print("--- Test 2: Caso 2 — IFTP ---")
    aptos = [{"ESCOLA": "SENAI Dendezeiros", "CURSO": "Eletrotécnica", "TURMADESCRICAO": "ELE01 - Matutino"}]
    mat_iftp = [{"UNIDADE": "SENAI Dendezeiros", "CURSO": "Eletrotécnica", "CODTURMA": "ELE01"}] * 2
    
    res = consolidate_prova_objetiva(aptos, mat_chp_rows=[], mat_iftp_rows=mat_iftp)
    assert len(res) == 1
    assert res[0]['Categoria'] == 'IFTP'
    assert res[0]['Alunos'] == 2
    print("  [PASS] Caso 2: Categoria IFTP preenchida corretamente.")


def test_caso_3_duas_categorias():
    print("--- Test 3: Caso 3 — Duas categorias (CHP + IFTP) ---")
    aptos = [
        {"ESCOLA": "SENAI Dendezeiros", "CURSO": "Eletrotécnica", "TURMADESCRICAO": "ELE01 - Matutino"},
        {"ESCOLA": "SENAI Dendezeiros", "CURSO": "Eletrotécnica", "TURMADESCRICAO": "ELE01 - Matutino"}
    ]
    mat_chp = [{"UNIDADE": "SENAI Dendezeiros", "CURSO": "Eletrotécnica", "CODTURMA": "ELE01"}] * 3
    mat_iftp = [{"UNIDADE": "SENAI Dendezeiros", "CURSO": "Eletrotécnica", "CODTURMA": "ELE01"}] * 2

    res = consolidate_prova_objetiva(aptos, mat_chp, mat_iftp)
    assert len(res) == 2, f"Expected 2 distinct rows for CHP and IFTP, got {len(res)}"
    
    cats = {r['Categoria']: r for r in res}
    assert 'CHP' in cats and 'IFTP' in cats
    assert cats['CHP']['Alunos'] == 3
    assert cats['IFTP']['Alunos'] == 2
    assert cats['CHP']['Turma'] == 'ELE01'
    assert cats['IFTP']['Turma'] == 'ELE01'
    print("  [PASS] Caso 3: Registros de CHP e IFTP permanecem estritamente separados.")


def test_caso_4_aptos_agendados_no_scheduling_dependency():
    print("--- Test 4: Caso 4 — Alunos Aptos/Agendados ---")
    aptos = [
        {"ESCOLA": "SENAI Cimatec", "CURSO": "Mecatrônica", "TURMADESCRICAO": "MEC01", "DATAAGENDAMENTO": "2026-10-15", "HORAAGENDAMENTO": "08:00"},
        {"ESCOLA": "SENAI Cimatec", "CURSO": "Mecatrônica", "TURMADESCRICAO": "MEC01", "DATAAGENDAMENTO": "", "HORAAGENDAMENTO": ""},
        {"ESCOLA": "SENAI Cimatec", "CURSO": "Mecatrônica", "TURMADESCRICAO": "MEC01", "DATAAGENDAMENTO": "N/A", "HORAAGENDAMENTO": "N/A"}
    ]
    mat_chp = [{"UNIDADE": "SENAI Cimatec", "CURSO": "Mecatrônica", "CODTURMA": "MEC01"}] * 5

    res = consolidate_prova_objetiva(aptos, mat_chp, [])
    assert len(res) == 1
    assert res[0]['Alunos Aptos/Agendados'] == 3, f"Expected 3, got {res[0]['Alunos Aptos/Agendados']}"
    print("  [PASS] Caso 4: Quantidade Aptos/Agendados provém da base Aptos sem segregação por agendamento.")


def test_caso_5_inaptos_nao_agendados_formula():
    print("--- Test 5: Caso 5 — Inaptos/Não Agendados ---")
    aptos = [{"ESCOLA": "SENAI Ilhéus", "CURSO": "Informática", "TURMADESCRICAO": "INF01"}] * 7
    mat_chp = [{"UNIDADE": "SENAI Ilhéus", "CURSO": "Informática", "CODTURMA": "INF01"}] * 10

    res = consolidate_prova_objetiva(aptos, mat_chp, [])
    assert len(res) == 1
    assert res[0]['Alunos'] == 10
    assert res[0]['Alunos Aptos/Agendados'] == 7
    assert res[0]['Alunos Inaptos/Não Agendados'] == 3, f"Expected 10 - 7 = 3, got {res[0]['Alunos Inaptos/Não Agendados']}"
    print("  [PASS] Caso 5: Alunos Inaptos/Não Agendados = Alunos - Alunos Aptos/Agendados (10 - 7 = 3).")


def test_caso_6_participacao_ausente():
    print("--- Test 6: Caso 6 — Participação ausente ---")
    aptos = [{"ESCOLA": "SENAI Feira", "CURSO": "Logística", "TURMADESCRICAO": "LOG01"}] * 4
    mat_chp = [{"UNIDADE": "SENAI Feira", "CURSO": "Logística", "CODTURMA": "LOG01"}] * 5

    res = consolidate_prova_objetiva(aptos, mat_chp, [], part_rows=None)
    assert len(res) == 1
    assert res[0]['Presentes'] == 0
    assert res[0]['Ausentes'] == 0
    assert res[0]['Presentes (%)'] == '0.0%'
    assert res[0]['Ausentes (%)'] == '0.0%'
    print("  [PASS] Caso 6: Participação ausente gera Presentes=0, Ausentes=0 e Percentuais=0.0%.")


def test_caso_7_mapeamento_manual():
    print("--- Test 7: Caso 7 — Mapeamento manual ---")
    aptos_custom = [{"ESCOLA": "SENAI Cimatec", "NOME_DO_CURSO_CUSTOM": "Desenvolvimento Web Fullstack", "TURMADESCRICAO": "DEV01"}]
    mat_chp = [{"UNIDADE": "SENAI Cimatec", "CURSO": "Desenvolvimento Web Fullstack", "CODTURMA": "DEV01"}]

    custom_map = {
        'aptos': {
            'ESCOLA': 'ESCOLA',
            'CURSO': 'NOME_DO_CURSO_CUSTOM',
            'TURMADESCRICAO': 'TURMADESCRICAO'
        }
    }

    res = consolidate_prova_objetiva(aptos_custom, mat_chp, [], custom_mappings=custom_map)
    assert len(res) == 1
    assert res[0]['Curso'] == 'Desenvolvimento Web Fullstack'
    print("  [PASS] Caso 7: Mapeamento manual de coluna personalizada utilizado com sucesso.")


def test_caso_8_ited():
    print("--- Test 8: Caso 8 — Regra ITED ---")
    aptos = [{"ESCOLA": "SENAI ITED", "CURSO": "Técnico em Desenvolvimento de Sistemas", "TURMADESCRICAO": "DS001 - Lauro de Freitas"}]
    mat_chp = [{"UNIDADE": "Lauro de Freitas", "CURSO": "Desenvolvimento de Sistemas", "CODTURMA": "DS001"}] * 20

    res = consolidate_prova_objetiva(aptos, mat_chp, [])
    assert len(res) == 1
    assert res[0]['Turma'] == 'DS001'
    assert res[0]['Unidade operacional (Escola)'] == 'Lauro de Freitas'
    assert res[0]['Modalidade'] == 'Semipresencial'
    assert res[0]['Alunos'] == 20
    print("  [PASS] Caso 8: ITED produz Turma=DS001, Unidade=Lauro de Freitas e Modalidade=Semipresencial.")


# =========================================================================
# SECTION 10: MANDATORY COMPOSITE KEY TEST CASES
# =========================================================================

def test_section_10_caso_1_mesma_turma_unidades_diferentes():
    print("\n--- Section 10: Caso 1 — Mesma turma, unidades diferentes ---")
    aptos = [
        {"ESCOLA": "Unidade A", "CURSO": "Curso X", "TURMADESCRICAO": "96380"}
    ] * 18 + [
        {"ESCOLA": "Unidade B", "CURSO": "Curso X", "TURMADESCRICAO": "96380"}
    ] * 25

    mat_chp = (
        [{"UNIDADE": "Unidade A", "CURSO": "Curso X", "CODTURMA": "96380"}] * 20 +
        [{"UNIDADE": "Unidade B", "CURSO": "Curso X", "CODTURMA": "96380"}] * 30
    )

    res = consolidate_prova_objetiva(aptos, mat_chp_rows=mat_chp, mat_iftp_rows=[])
    assert len(res) == 2, f"Expected 2 separate rows, got {len(res)}"
    
    rows_by_unit = {r['Unidade operacional (Escola)']: r for r in res}
    assert 'Unidade A' in rows_by_unit
    assert 'Unidade B' in rows_by_unit
    assert rows_by_unit['Unidade A']['Alunos'] == 20, f"Expected 20, got {rows_by_unit['Unidade A']['Alunos']}"
    assert rows_by_unit['Unidade B']['Alunos'] == 30, f"Expected 30, got {rows_by_unit['Unidade B']['Alunos']}"
    assert rows_by_unit['Unidade A']['Alunos Aptos/Agendados'] == 18
    assert rows_by_unit['Unidade B']['Alunos Aptos/Agendados'] == 25
    print("  [PASS] Caso 1: Mesma turma em unidades diferentes gerou duas linhas distintas (20 e 30 alunos, nunca 50).")


def test_section_10_caso_2_mesma_turma_unidade_cursos_diferentes():
    print("\n--- Section 10: Caso 2 — Mesma turma e unidade, cursos diferentes ---")
    aptos = [
        {"ESCOLA": "Unidade A", "CURSO": "Curso X", "TURMADESCRICAO": "96380"}
    ] * 18 + [
        {"ESCOLA": "Unidade A", "CURSO": "Curso Y", "TURMADESCRICAO": "96380"}
    ] * 12

    mat_chp = (
        [{"UNIDADE": "Unidade A", "CURSO": "Curso X", "CODTURMA": "96380"}] * 20 +
        [{"UNIDADE": "Unidade A", "CURSO": "Curso Y", "CODTURMA": "96380"}] * 15
    )

    res = consolidate_prova_objetiva(aptos, mat_chp_rows=mat_chp, mat_iftp_rows=[])
    assert len(res) == 2, f"Expected 2 separate rows, got {len(res)}"

    rows_by_course = {r['Curso']: r for r in res}
    assert 'Curso X' in rows_by_course
    assert 'Curso Y' in rows_by_course
    assert rows_by_course['Curso X']['Alunos'] == 20
    assert rows_by_course['Curso Y']['Alunos'] == 15
    print("  [PASS] Caso 2: Mesma turma e unidade com cursos diferentes gerou duas linhas distintas (20 e 15 alunos).")


def test_section_10_caso_3_iftp_emb_emp_mesma_unidade():
    print("\n--- Section 10: Caso 3 — IFTP EMB + EMP mesma combinação de Unidade + Curso ---")
    aptos = [
        {"ESCOLA": "Unidade A", "CURSO": "Curso X", "TURMADESCRICAO": "G92173"}
    ] * 20

    mat_iftp = (
        [{"UNIDADE": "Unidade A", "CURSO": "Curso X", "CODTURMA": "92173EMB"}] * 11 +
        [{"UNIDADE": "Unidade A", "CURSO": "Curso X", "CODTURMA": "92173EMP"}] * 14
    )

    res = consolidate_prova_objetiva(aptos, mat_chp_rows=[], mat_iftp_rows=mat_iftp)
    assert len(res) == 1, f"Expected 1 row, got {len(res)}"
    assert res[0]['Unidade operacional (Escola)'] == 'Unidade A'
    assert res[0]['Curso'] == 'Curso X'
    assert res[0]['Turma'] == '92173'
    assert res[0]['Categoria'] == 'IFTP'
    assert res[0]['Alunos'] == 25, f"Expected 25 (11 + 14), got {res[0]['Alunos']}"
    assert res[0]['Alunos Aptos/Agendados'] == 20
    assert res[0]['Alunos Inaptos/Não Agendados'] == 5
    print("  [PASS] Caso 3: IFTP 92173EMB (11) + 92173EMP (14) na mesma unidade somados para 25 alunos.")


def test_section_10_caso_4_iftp_emb_emp_unidades_diferentes():
    print("\n--- Section 10: Caso 4 — IFTP EMB/EMP em unidades diferentes ---")
    aptos = [
        {"ESCOLA": "Unidade A", "CURSO": "Curso X", "TURMADESCRICAO": "92173"}
    ] * 22 + [
        {"ESCOLA": "Unidade B", "CURSO": "Curso X", "TURMADESCRICAO": "92173"}
    ] * 12

    mat_iftp = (
        [{"UNIDADE": "Unidade A", "CURSO": "Curso X", "CODTURMA": "92173EMB"}] * 11 +
        [{"UNIDADE": "Unidade A", "CURSO": "Curso X", "CODTURMA": "92173EMP"}] * 14 +
        [{"UNIDADE": "Unidade B", "CURSO": "Curso X", "CODTURMA": "92173EMB"}] * 8 +
        [{"UNIDADE": "Unidade B", "CURSO": "Curso X", "CODTURMA": "92173EMP"}] * 7
    )

    res = consolidate_prova_objetiva(aptos, mat_chp_rows=[], mat_iftp_rows=mat_iftp)
    assert len(res) == 2, f"Expected 2 rows, got {len(res)}"

    rows_by_unit = {r['Unidade operacional (Escola)']: r for r in res}
    assert 'Unidade A' in rows_by_unit
    assert 'Unidade B' in rows_by_unit
    assert rows_by_unit['Unidade A']['Alunos'] == 25, f"Expected 25, got {rows_by_unit['Unidade A']['Alunos']}"
    assert rows_by_unit['Unidade B']['Alunos'] == 15, f"Expected 15, got {rows_by_unit['Unidade B']['Alunos']}"
    print("  [PASS] Caso 4: IFTP em unidades diferentes gerou Unidade A = 25 e Unidade B = 15 (nunca somou 40).")


def test_section_10_caso_5_prefixos():
    print("\n--- Section 10: Caso 5 — Prefixos G, B, T, SAEP com chave composta ---")
    aptos_u1 = [{"ESCOLA": "SENAI Feira", "CURSO": "Logística", "TURMADESCRICAO": "G96380 - Matutino"}] * 10
    aptos_u2 = [{"ESCOLA": "SENAI Camaçari", "CURSO": "Logística", "TURMADESCRICAO": "B96380 - Noturno"}] * 10
    aptos_u3 = [{"ESCOLA": "SENAI ITED", "CURSO": "Logística", "TURMADESCRICAO": "SAEP96380 - Lauro de Freitas"}] * 10

    mat_chp = (
        [{"UNIDADE": "SENAI Feira de Santana", "CURSO": "Logística", "CODTURMA": "96380"}] * 15 +
        [{"UNIDADE": "SENAI Camaçari", "CURSO": "Logística", "CODTURMA": "T96380"}] * 18 +
        [{"UNIDADE": "SENAI Lauro de Freitas", "CURSO": "Logística", "CODTURMA": "96380"}] * 22
    )

    res = consolidate_prova_objetiva(aptos_u1 + aptos_u2 + aptos_u3, mat_chp_rows=mat_chp, mat_iftp_rows=[])
    assert len(res) == 3, f"Expected 3 rows, got {len(res)}"

    u_feira = [r for r in res if 'feira' in r['Unidade operacional (Escola)'].lower()][0]
    u_camacari = [r for r in res if 'camaçari' in r['Unidade operacional (Escola)'].lower() or 'camacari' in r['Unidade operacional (Escola)'].lower()][0]
    u_lauro = [r for r in res if 'lauro' in r['Unidade operacional (Escola)'].lower()][0]

    assert u_feira['Alunos'] == 15, f"Expected 15, got {u_feira['Alunos']}"
    assert u_camacari['Alunos'] == 18, f"Expected 18, got {u_camacari['Alunos']}"
    assert u_lauro['Alunos'] == 22, f"Expected 22, got {u_lauro['Alunos']}"

    assert u_feira['Turma'] == '96380'
    assert u_camacari['Turma'] == '96380'
    assert u_lauro['Turma'] == '96380'
    print("  [PASS] Caso 5: Prefixos associados perfeitamente com Unidade + Curso.")


# =========================================================================
# MANDATORY COURSE CANONICALIZATION TESTS (Técnico em Automação -> Técnico em Automação Industrial)
# =========================================================================

def test_course_canonicalization_rules():
    print("\n--- Test: Course Canonicalization Rules ---")
    # 1. "Técnico em Automação" canonicalizes to "Técnico em Automação Industrial"
    assert get_canonical_curso("Técnico em Automação") == "Técnico em Automação Industrial"
    assert get_canonical_curso("TÉCNICO EM AUTOMAÇÃO") == "Técnico em Automação Industrial"
    assert get_canonical_curso("Automação") == "Técnico em Automação Industrial"
    
    # 2. "Técnico em Automação Industrial" remains "Técnico em Automação Industrial"
    assert get_canonical_curso("Técnico em Automação Industrial") == "Técnico em Automação Industrial"
    assert get_canonical_curso("TÉCNICO EM AUTOMAÇÃO INDUSTRIAL") == "Técnico em Automação Industrial"
    
    # 3. Other courses remain completely untouched
    assert get_canonical_curso("Técnico em Mecatrônica") == "Técnico em Mecatrônica"
    assert get_canonical_curso("Técnico em Eletrotécnica") == "Técnico em Eletrotécnica"
    assert get_canonical_curso("Técnico em Desenvolvimento de Sistemas") == "Técnico em Desenvolvimento de Sistemas"
    assert get_canonical_curso("Técnico em Mecânica") == "Técnico em Mecânica"
    print("  [PASS] Course canonicalization: Automação standardizes to 'Técnico em Automação Industrial' and others are preserved.")


def test_automacao_turmas_96225_96226_matching():
    print("\n--- Test: Turmas 96225 and 96226 Matching with Canonical Course ---")
    # Aptos has "Técnico em Automação" for G96225 (20 aptos) and G96226 (10 aptos) at SENAI Dendezeiros
    aptos_96225 = [{"ESCOLA": "SENAI Dendezeiros", "CURSO": "Técnico em Automação", "TURMADESCRICAO": "G96225"}] * 20
    aptos_96226 = [{"ESCOLA": "SENAI Dendezeiros", "CURSO": "Técnico em Automação", "TURMADESCRICAO": "G96226"}] * 10
    
    # CHP has "Técnico em Automação Industrial" at DENDEZEIROS (27 for 96225, 15 for 96226)
    mat_chp_96225 = [{"UNIDADE": "DENDEZEIROS", "CURSO": "Técnico em Automação Industrial", "CODTURMA": "96225"}] * 27
    mat_chp_96226 = [{"UNIDADE": "DENDEZEIROS", "CURSO": "Técnico em Automação Industrial", "CODTURMA": "96226"}] * 15

    res = consolidate_prova_objetiva(aptos_96225 + aptos_96226, mat_chp_rows=mat_chp_96225 + mat_chp_96226, mat_iftp_rows=[])
    assert len(res) == 2, f"Expected 2 consolidated rows, got {len(res)}"
    
    r_96225 = [r for r in res if r['Turma'] == '96225'][0]
    r_96226 = [r for r in res if r['Turma'] == '96226'][0]
    
    # Check course name in output
    assert r_96225['Curso'] == 'Técnico em Automação Industrial', f"Expected 'Técnico em Automação Industrial', got '{r_96225['Curso']}'"
    assert r_96226['Curso'] == 'Técnico em Automação Industrial', f"Expected 'Técnico em Automação Industrial', got '{r_96226['Curso']}'"
    
    # Check student counts
    assert r_96225['Alunos'] == 27, f"Expected 27 alunos for 96225, got {r_96225['Alunos']}"
    assert r_96225['Alunos Aptos/Agendados'] == 20
    assert r_96225['Alunos Inaptos/Não Agendados'] == 7
    
    assert r_96226['Alunos'] == 15, f"Expected 15 alunos for 96226, got {r_96226['Alunos']}"
    assert r_96226['Alunos Aptos/Agendados'] == 10
    assert r_96226['Alunos Inaptos/Não Agendados'] == 5

    print("  [PASS] Turmas 96225 (27 alunos) and 96226 (15 alunos) matched perfectly with output Curso='Técnico em Automação Industrial'.")


if __name__ == '__main__':
    print("=================================================================")
    print("=== EXECUTING COMPREHENSIVE FUNCTIONAL & CANONICALIZATION TESTS ===")
    print("=================================================================")
    test_caso_1_chp()
    test_caso_2_iftp()
    test_caso_3_duas_categorias()
    test_caso_4_aptos_agendados_no_scheduling_dependency()
    test_caso_5_inaptos_nao_agendados_formula()
    test_caso_6_participacao_ausente()
    test_caso_7_mapeamento_manual()
    test_caso_8_ited()

    # Section 10 tests
    test_section_10_caso_1_mesma_turma_unidades_diferentes()
    test_section_10_caso_2_mesma_turma_unidade_cursos_diferentes()
    test_section_10_caso_3_iftp_emb_emp_mesma_unidade()
    test_section_10_caso_4_iftp_emb_emp_unidades_diferentes()
    test_section_10_caso_5_prefixos()

    # Canonicalization tests
    test_course_canonicalization_rules()
    test_automacao_turmas_96225_96226_matching()

    print("\n>>> ALL FUNCTIONAL & CANONICALIZATION TESTS PASSED WITH 100% SUCCESS! <<<")
