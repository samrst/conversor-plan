import openpyxl
import xlrd
from collections import defaultdict
import unicodedata
import re

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

# 1. Load Aptos
wb_aptos = openpyxl.load_workbook(r'C:\Users\sam.sampaio\Downloads\SAEP 2026-2_28_08_2026_BA.xlsx', data_only=True)
ws_aptos = wb_aptos['Estudante']
headers_aptos = [ws_aptos.cell(1, c).value for c in range(1, ws_aptos.max_column + 1)]
rows_aptos = []
for r in range(2, ws_aptos.max_row + 1):
    vals = [ws_aptos.cell(r, c).value for c in range(1, ws_aptos.max_column + 1)]
    if any(v is not None and str(v).strip() != '' for v in vals):
        rows_aptos.append(dict(zip(headers_aptos, vals)))

# 2. Load CHP
wb_chp = xlrd.open_workbook(r'C:\Users\sam.sampaio\Downloads\Alunos Matriculados 26.1 CHP - SAEP 2026.2.xls')
ws_chp = wb_chp.sheet_by_name('Dados')
headers_chp = [ws_chp.cell_value(1, c) for c in range(ws_chp.ncols)]
rows_chp = []
for r in range(2, ws_chp.nrows):
    vals = [ws_chp.cell_value(r, c) for c in range(ws_chp.ncols)]
    if any(v is not None and str(v).strip() != '' for v in vals):
        rows_chp.append(dict(zip(headers_chp, vals)))

# 3. Load IFTP
wb_iftp = openpyxl.load_workbook(r'C:\Users\sam.sampaio\Downloads\Alunos matriculados 2026 IFTP - SAEP 2026.2.xlsx', data_only=True)
ws_iftp = wb_iftp['Dados']
headers_iftp = [ws_iftp.cell(1, c).value for c in range(1, ws_iftp.max_column + 1)]
rows_iftp = []
for r in range(2, ws_iftp.max_row + 1):
    vals = [ws_iftp.cell(r, c).value for c in range(1, ws_iftp.max_column + 1)]
    if any(v is not None and str(v).strip() != '' for v in vals):
        rows_iftp.append(dict(zip(headers_iftp, vals)))

# Find every turma in Aptos
aptos_turmas = defaultdict(list)
for r in rows_aptos:
    tcode = extract_turma_code(r.get('TURMADESCRICAO'))
    aptos_turmas[tcode].append(r)

print(f"Total unique turma codes in Aptos: {len(aptos_turmas)}")

# Check each turma code against CHP and IFTP
for tcode, arecs in aptos_turmas.items():
    chp_recs = [r for r in rows_chp if normalize_cod_turma(r.get('CODTURMA')) == tcode]
    iftp_recs = [r for r in rows_iftp if normalize_cod_turma(r.get('CODTURMA')) == tcode]
    
    if not chp_recs and not iftp_recs:
        print(f"\n[NO MATRICULADOS AT ALL IN FILES] Turma '{tcode}': {len(arecs)} aptos. Escola='{arecs[0].get('ESCOLA')}', Curso='{arecs[0].get('CURSO')}'")
    else:
        # Check units and courses
        u_aptos = set(r.get('ESCOLA') for r in arecs)
        c_aptos = set(r.get('CURSO') for r in arecs)
        u_chp = set(r.get('UNIDADE') or r.get('ESCOLA') for r in chp_recs)
        c_chp = set(r.get('CURSO') for r in chp_recs)
        u_iftp = set(r.get('UNIDADE') or r.get('ESCOLA') for r in iftp_recs)
        c_iftp = set(r.get('CURSO') for r in iftp_recs)
        
        # Check if course or unit differs
        if tcode in ['96225', '96226']:
            print(f"\n[AUTOMAÇÃO DIFFERENCE] Turma '{tcode}':")
            print(f"   Aptos: Units={u_aptos}, Courses={c_aptos}")
            print(f"   CHP:   Units={u_chp}, Courses={c_chp}")
