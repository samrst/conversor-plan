"""
Test: Real Spreadsheets Processing & SheetJS Reader Simulation with Composite Key and Course Canonicalization
Validates:
1. Automatic sheet selection for real workbooks:
   - Aptos: selects 'Estudante'
   - CHP: selects 'Dados' (header at row 2)
   - IFTP: selects 'Dados' (header at row 1)
2. CODTURMA extraction and normalization (prefixes T, B, G, SAEP + suffixes EMB, EMP).
3. Course Canonicalization:
   - 'Técnico em Automação' -> 'Técnico em Automação Industrial'
   - Turmas 96225 (27 alunos) and 96226 (15 alunos) in Dendezeiros matched with CHP
   - 125 matched classes out of 126 (only 93629 without match as it does not exist in CHP/IFTP)
   - Total 2.843 enrolled students associated
4. Multi-unit class isolation (e.g. 20251CHPELET7 in 9 units) and EMB/EMP aggregation.
"""

import openpyxl
import xlrd
import os
import re
import unicodedata
from collections import defaultdict

def normalize_string(s):
    if not s: return ''
    nfd = unicodedata.normalize('NFD', str(s))
    no_accents = ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', no_accents.lower())

def normalize_cod_turma(cod):
    if not cod: return ''
    s = str(cod).strip()
    if not s: return ''
    s = re.sub(r'^(?:saep|[tbg])[\s_-]*', '', s, flags=re.IGNORECASE).strip()
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

def parse_sheet_simulation(raw_rows, sheet_name):
    """Simulates FileReaderService.parseSheet"""
    if not raw_rows:
        return {'name': sheet_name, 'headers': [], 'rows': []}

    domain_keywords = [
        'codturma', 'turmadescricao', 'turma', 'escola', 'curso',
        'unidade', 'cpf', 'nome', 'presentes', 'ausentes',
        'modalidade', 'turno', 'periodo', 'matriculado', 'estudante'
    ]

    best_header_row_idx = 0
    best_header_score = -1
    best_headers = []

    scan_limit = min(15, len(raw_rows))
    for r_idx in range(scan_limit):
        row = raw_rows[r_idx]
        non_empties = [str(c).strip() for c in row if c is not None and str(c).strip() != '']
        if not non_empties:
            continue

        kw_matches = sum(1 for cell in non_empties if any(kw in cell.lower() for kw in domain_keywords))
        score = len(non_empties) + (kw_matches * 10)

        if score > best_header_score:
            best_header_score = score
            best_header_row_idx = r_idx
            best_headers = [str(c).strip() if c is not None else '' for c in row]
            while best_headers and best_headers[-1] == '':
                best_headers.pop()

    valid_headers = [h for h in best_headers if h]
    data_rows = []
    for r_idx in range(best_header_row_idx + 1, len(raw_rows)):
        row = raw_rows[r_idx]
        if not any(c is not None and str(c).strip() != '' for c in row):
            continue
        row_obj = {}
        for c_idx, h in enumerate(best_headers):
            if h:
                row_obj[h] = row[c_idx] if c_idx < len(row) else ''
        data_rows.append(row_obj)

    return {
        'name': sheet_name,
        'headers': valid_headers,
        'rows': data_rows,
        'header_row_idx': best_header_row_idx
    }

def find_best_sheet_simulation(parsed_sheets, file_role):
    """Simulates FileReaderService.findBestSheet"""
    if not parsed_sheets:
        return {'name': '', 'headers': [], 'rows': []}
    if len(parsed_sheets) == 1:
        return parsed_sheets[0]

    role_keywords = {
        'aptos': ['turmadescricao', 'turma', 'escola', 'curso', 'cpf', 'estudante', 'aluno'],
        'matriculados_chp': ['codturma', 'turma', 'unidade', 'curso', 'matriculado', 'situacao'],
        'matriculados_iftp': ['codturma', 'turma', 'unidade', 'curso', 'matriculado', 'situacao'],
        'participacao': ['presentes', 'ausentes', 'turmadescricao', 'turma', 'escola', 'curso']
    }
    target_kws = role_keywords.get(file_role, ['codturma', 'turmadescricao', 'turma', 'escola', 'curso'])

    best_sheet = parsed_sheets[0]
    best_score = -float('inf')

    for sheet in parsed_sheets:
        score = 0
        name_lower = sheet['name'].lower()
        if any(w in name_lower for w in ['dados', 'estudante', 'aluno', 'microdado', 'base']):
            score += 50
        if any(w in name_lower for w in ['resumo', 'sumario', 'pivot', 'filtro']):
            score -= 50

        clean_headers = [h.lower() for h in sheet['headers']]
        for kw in target_kws:
            if any(kw in h for h in clean_headers):
                score += 30

        score += min(60, len(sheet['rows']) // 10)
        if score > best_score:
            best_score = score
            best_sheet = sheet

    return best_sheet


def test_real_file_reading():
    print("\n--- 1. Test: Real File Reading & Automatic Sheet/Header Selection ---")

    # Aptos
    aptos_path = r'C:\Users\sam.sampaio\Downloads\SAEP 2026-2_28_08_2026_BA.xlsx'
    wb_aptos = openpyxl.load_workbook(aptos_path, data_only=True)
    aptos_sheets = []
    for sname in wb_aptos.sheetnames:
        ws = wb_aptos[sname]
        raw_rows = [[ws.cell(r, c).value for c in range(1, ws.max_column + 1)] for r in range(1, ws.max_row + 1)]
        aptos_sheets.append(parse_sheet_simulation(raw_rows, sname))

    best_aptos = find_best_sheet_simulation(aptos_sheets, 'aptos')
    assert best_aptos['name'] == 'Estudante', f"Expected Aptos sheet 'Estudante', got '{best_aptos['name']}'"
    assert 'TURMADESCRICAO' in best_aptos['headers'], "Aptos headers must contain TURMADESCRICAO"
    assert 'ESCOLA' in best_aptos['headers'], "Aptos headers must contain ESCOLA"
    assert 'CURSO' in best_aptos['headers'], "Aptos headers must contain CURSO"
    assert len(best_aptos['rows']) > 2000, f"Expected >2000 rows in Estudante, got {len(best_aptos['rows'])}"
    print(f"  [PASS] Aptos file: selected sheet '{best_aptos['name']}' with {len(best_aptos['rows'])} rows and {len(best_aptos['headers'])} headers.")

    # CHP
    chp_path = r'C:\Users\sam.sampaio\Downloads\Alunos Matriculados 26.1 CHP - SAEP 2026.2.xls'
    wb_chp = xlrd.open_workbook(chp_path)
    chp_sheets = []
    for sname in wb_chp.sheet_names():
        ws = wb_chp.sheet_by_name(sname)
        raw_rows = [ws.row_values(r) for r in range(ws.nrows)]
        chp_sheets.append(parse_sheet_simulation(raw_rows, sname))

    best_chp = find_best_sheet_simulation(chp_sheets, 'matriculados_chp')
    assert best_chp['name'] == 'Dados', f"Expected CHP sheet 'Dados', got '{best_chp['name']}'"
    assert best_chp['header_row_idx'] == 1, f"Expected CHP header at row 2 (index 1), got {best_chp['header_row_idx']}"
    assert 'CODTURMA' in best_chp['headers'], "CHP headers must contain CODTURMA"
    assert len(best_chp['rows']) > 2000, f"Expected >2000 rows in CHP Dados, got {len(best_chp['rows'])}"
    print(f"  [PASS] CHP file: selected sheet '{best_chp['name']}' (Header detected at row 2) with {len(best_chp['rows'])} rows and CODTURMA.")

    # IFTP
    iftp_path = r'C:\Users\sam.sampaio\Downloads\Alunos matriculados 2026 IFTP - SAEP 2026.2.xlsx'
    wb_iftp = openpyxl.load_workbook(iftp_path, data_only=True)
    iftp_sheets = []
    for sname in wb_iftp.sheetnames:
        ws = wb_iftp[sname]
        raw_rows = [[ws.cell(r, c).value for c in range(1, ws.max_column + 1)] for r in range(1, ws.max_row + 1)]
        iftp_sheets.append(parse_sheet_simulation(raw_rows, sname))

    best_iftp = find_best_sheet_simulation(iftp_sheets, 'matriculados_iftp')
    assert best_iftp['name'] == 'Dados', f"Expected IFTP sheet 'Dados', got '{best_iftp['name']}'"
    assert best_iftp['header_row_idx'] == 0, f"Expected IFTP header at row 1 (index 0), got {best_iftp['header_row_idx']}"
    assert 'CODTURMA' in best_iftp['headers'], "IFTP headers must contain CODTURMA"
    assert len(best_iftp['rows']) > 500, f"Expected >500 rows in IFTP Dados, got {len(best_iftp['rows'])}"
    print(f"  [PASS] IFTP file: selected sheet '{best_iftp['name']}' with {len(best_iftp['rows'])} rows and CODTURMA.")


def test_real_consolidation_results():
    print("\n--- 2. Test: Complete Real Consolidation with Canonical Course & Composite Key ---")
    
    # Load sheets
    wb_aptos = openpyxl.load_workbook(r'C:\Users\sam.sampaio\Downloads\SAEP 2026-2_28_08_2026_BA.xlsx', data_only=True)
    raw_aptos = [[wb_aptos['Estudante'].cell(r, c).value for c in range(1, wb_aptos['Estudante'].max_column + 1)] for r in range(1, wb_aptos['Estudante'].max_row + 1)]
    aptos_parsed = parse_sheet_simulation(raw_aptos, 'Estudante')

    wb_chp = xlrd.open_workbook(r'C:\Users\sam.sampaio\Downloads\Alunos Matriculados 26.1 CHP - SAEP 2026.2.xls')
    raw_chp = [wb_chp.sheet_by_name('Dados').row_values(r) for r in range(wb_chp.sheet_by_name('Dados').nrows)]
    chp_parsed = parse_sheet_simulation(raw_chp, 'Dados')

    wb_iftp = openpyxl.load_workbook(r'C:\Users\sam.sampaio\Downloads\Alunos matriculados 2026 IFTP - SAEP 2026.2.xlsx', data_only=True)
    raw_iftp = [[wb_iftp['Dados'].cell(r, c).value for c in range(1, wb_iftp['Dados'].max_column + 1)] for r in range(1, wb_iftp['Dados'].max_row + 1)]
    iftp_parsed = parse_sheet_simulation(raw_iftp, 'Dados')

    # Index CHP by Composite Key (Unidade + Canonical Curso + Turma)
    index_chp = defaultdict(int)
    for r in chp_parsed['rows']:
        c = r.get('CODTURMA')
        u = r.get('UNIDADE') or r.get('ESCOLA') or ''
        cur = r.get('CURSO') or ''
        if c:
            can_c = get_canonical_curso(cur)
            comp_key = make_composite_key(u, can_c, c)
            index_chp[comp_key] += 1

    # Index IFTP by Composite Key (Unidade + Canonical Curso + Turma)
    index_iftp = defaultdict(int)
    for r in iftp_parsed['rows']:
        c = r.get('CODTURMA')
        u = r.get('UNIDADE') or r.get('ESCOLA') or ''
        cur = r.get('CURSO') or ''
        if c:
            can_c = get_canonical_curso(cur)
            comp_key = make_composite_key(u, can_c, c)
            index_iftp[comp_key] += 1

    # Group Aptos by (Unidade Operacional + Canonical Curso + TURMADESCRICAO)
    class_groups = defaultdict(list)
    for r in aptos_parsed['rows']:
        raw_escola = str(r.get('ESCOLA', '')).strip()
        raw_curso = str(r.get('CURSO', '')).strip()
        raw_turma = str(r.get('TURMADESCRICAO', '')).strip()
        unidade_op = get_unidade_operacional(raw_escola, raw_turma)
        can_curso = get_canonical_curso(raw_curso)
        class_groups[(unidade_op, can_curso, raw_turma)].append(r)

    results = []
    for (unidade_op, can_curso, turma_desc), recs in class_groups.items():
        turma_code = extract_turma_code(turma_desc)
        aptos_count = len(recs)
        
        comp_key = make_composite_key(unidade_op, can_curso, turma_code)
        count_chp = index_chp.get(comp_key, 0)
        count_iftp = index_iftp.get(comp_key, 0)

        cats = []
        if count_chp > 0:
            cats.append(('CHP', count_chp))
        if count_iftp > 0:
            cats.append(('IFTP', count_iftp))
        if not cats:
            cats.append(('CHP', 0))

        for cat, alunos in cats:
            results.append({
                'Unidade': unidade_op,
                'Curso': can_curso,
                'Turma': turma_code,
                'Categoria': cat,
                'Alunos': alunos,
                'Aptos': aptos_count
            })

    total_alunos = sum(r['Alunos'] for r in results)
    matched_classes = sum(1 for r in results if r['Alunos'] > 0)
    print(f"  [PASS] Consolidated {len(results)} rows across {len(class_groups)} distinct classes. Matched classes with Alunos > 0: {matched_classes}. Total Alunos: {total_alunos}.")
    assert len(class_groups) == 126, f"Expected 126 class groups, got {len(class_groups)}"
    assert matched_classes == 125, f"Expected 125 matched classes, got {matched_classes}"
    assert total_alunos == 2843, f"Expected total Alunos == 2843, got {total_alunos}"

    # Specific assertions on critical turmas
    # 1. 96225 at Dendezeiros: 27 students in CHP, Course='Técnico em Automação Industrial'
    r_96225 = [r for r in results if r['Turma'] == '96225']
    assert len(r_96225) == 1
    assert r_96225[0]['Curso'] == 'Técnico em Automação Industrial'
    assert r_96225[0]['Alunos'] == 27, f"Expected 27 alunos for 96225, got {r_96225[0]['Alunos']}"
    assert r_96225[0]['Aptos'] == 20
    print(f"  -> Turma 96225 in Dendezeiros matched: {r_96225[0]['Alunos']} alunos (Aptos: {r_96225[0]['Aptos']}), Curso='{r_96225[0]['Curso']}'.")

    # 2. 96226 at Dendezeiros: 15 students in CHP, Course='Técnico em Automação Industrial'
    r_96226 = [r for r in results if r['Turma'] == '96226']
    assert len(r_96226) == 1
    assert r_96226[0]['Curso'] == 'Técnico em Automação Industrial'
    assert r_96226[0]['Alunos'] == 15, f"Expected 15 alunos for 96226, got {r_96226[0]['Alunos']}"
    assert r_96226[0]['Aptos'] == 10
    print(f"  -> Turma 96226 in Dendezeiros matched: {r_96226[0]['Alunos']} alunos (Aptos: {r_96226[0]['Aptos']}), Curso='{r_96226[0]['Curso']}'.")

    # 3. 20251CHPELET7 exists in 9 different units in CHP (totaling 180 across all units, but individual per unit)
    r_elet7 = [r for r in results if r['Turma'] == '20251CHPELET7']
    print(f"  -> Found {len(r_elet7)} distinct rows for class '20251CHPELET7' across different units:")
    for r in r_elet7:
        print(f"     - Unidade '{r['Unidade']}': {r['Alunos']} alunos (Aptos: {r['Aptos']})")
    assert len(r_elet7) == 9, f"Expected 9 distinct unit rows for 20251CHPELET7, got {len(r_elet7)}"

    # 4. IFTP class 97360 (G97360 in Aptos -> 97360EMB + 97360EMP in IFTP)
    r_97360 = [r for r in results if r['Turma'] == '97360']
    assert len(r_97360) >= 1
    assert r_97360[0]['Categoria'] == 'IFTP'
    assert r_97360[0]['Alunos'] == 38, f"Expected 38 alunos in IFTP 97360, got {r_97360[0]['Alunos']}"

    # 5. SAEP class 96380 (SAEP96380 - Lauro de Freitas -> B96380/96380 in Lauro de Freitas)
    r_saep = [r for r in results if r['Turma'] == '96380']
    assert len(r_saep) >= 1
    assert r_saep[0]['Categoria'] == 'CHP'
    assert r_saep[0]['Alunos'] == 22, f"Expected 22 alunos in SAEP 96380, got {r_saep[0]['Alunos']}"


if __name__ == '__main__':
    print("=================================================================")
    print("=== EXECUTING REAL SPREADSHEETS PROCESSING VALIDATION ===")
    print("=================================================================")
    test_real_file_reading()
    test_real_consolidation_results()
    print("\n>>> ALL REAL SPREADSHEET TESTS PASSED WITH 100% SUCCESS! <<<")
