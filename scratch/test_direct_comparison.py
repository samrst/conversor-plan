import openpyxl
import xlrd
import os
import re
from collections import defaultdict

# 1. Load Aptos (using 'Estudante' vs using 'Interlocutor Estadual')
aptos_file = r'C:\Users\sam.sampaio\Downloads\SAEP 2026-2_28_08_2026_BA.xlsx'
wb_aptos = openpyxl.load_workbook(aptos_file, data_only=True)

# 2. Load IFTP
iftp_file = r'C:\Users\sam.sampaio\Downloads\Alunos matriculados 2026 IFTP - SAEP 2026.2.xlsx'
wb_iftp = openpyxl.load_workbook(iftp_file, data_only=True)

# 3. Load CHP
chp_file = r'C:\Users\sam.sampaio\Downloads\Alunos Matriculados 26.1 CHP - SAEP 2026.2.xls'
wb_chp = xlrd.open_workbook(chp_file)

def normalize_turma_code(val):
    if not val:
        return ''
    s = str(val).strip()
    s = re.sub(r'^(?:SAEP|[TBG])', '', s, flags=re.IGNORECASE)
    return s.strip()

def extract_turma_code_aptos(val):
    if not val:
        return ''
    s = str(val).strip()
    m = re.match(r'^([^\s\-]+)', s)
    if m:
        return m.group(1).strip()
    return s

print("=== VERIFICANDO O COMPORTAMENTO COM A IMPLEMENTAÇÃO ATUAL (SHEET[0]) ===")
print(f"IFTP Sheet[0] name: '{wb_iftp.sheetnames[0]}', Max rows: {wb_iftp['Planilha1'].max_row}")
print(f"CHP Sheet[0] name: '{wb_chp.sheet_names()[0]}', Nrows: {wb_chp.sheet_by_name('Resumo').nrows}")
print(f"Aptos Sheet[0] name: '{wb_aptos.sheetnames[0]}', Max rows: {wb_aptos['Interlocutor Estadual'].max_row}")

# Build Matriculados Index using correct 'Dados' sheets
matriculados_index = defaultdict(lambda: {'total': 0, 'rows': []})

# IFTP 'Dados'
ws_iftp = wb_iftp['Dados']
headers_iftp = [ws_iftp.cell(1, c).value for c in range(1, ws_iftp.max_column + 1)]
c_codturma_iftp = headers_iftp.index('CODTURMA') + 1
for r in range(2, ws_iftp.max_row + 1):
    val = ws_iftp.cell(r, c_codturma_iftp).value
    if val:
        norm = normalize_turma_code(val)
        matriculados_index[norm]['total'] += 1
        matriculados_index[norm]['rows'].append(('IFTP', val, norm))

# CHP 'Dados'
ws_chp = wb_chp.sheet_by_name('Dados')
headers_chp = ws_chp.row_values(1)
c_codturma_chp = headers_chp.index('CODTURMA')
for r in range(2, ws_chp.nrows):
    val = ws_chp.cell_value(r, c_codturma_chp)
    if val:
        norm = normalize_turma_code(val)
        matriculados_index[norm]['total'] += 1
        matriculados_index[norm]['rows'].append(('CHP', val, norm))

print(f"\nTotal de turmas únicas no índice de Matriculados ('Dados'): {len(matriculados_index)}")

# Check Aptos 'Estudante' rows against Matriculados Index
ws_aptos = wb_aptos['Estudante']
headers_aptos = [ws_aptos.cell(1, c).value for c in range(1, ws_aptos.max_column + 1)]
c_turma_aptos = headers_aptos.index('TURMADESCRICAO') + 1

turma_stats = defaultdict(lambda: {'count_aptos': 0, 'sample_desc': ''})
for r in range(2, ws_aptos.max_row + 1):
    val = ws_aptos.cell(r, c_turma_aptos).value
    if val:
        extracted = extract_turma_code_aptos(val)
        norm = normalize_turma_code(extracted)
        turma_stats[norm]['count_aptos'] += 1
        turma_stats[norm]['sample_desc'] = val

print("\n=== COMPARAÇÃO DIRETA DE 10 TURMAS DE APTOS COM MATRICULADOS ===")
print(f"{'TURMADESCRICAO':<40} | {'Código Extraído':<18} | {'Normalizado':<15} | {'Matriculados Count':<18} | {'Status'}")
print("-" * 110)

matched_turmas = 0
unmatched_turmas = 0
examples = []

for norm, data in list(turma_stats.items()):
    desc = data['sample_desc']
    extracted = extract_turma_code_aptos(desc)
    mat_count = matriculados_index[norm]['total'] if norm in matriculados_index else 0
    status = "SIM (OK)" if mat_count > 0 else "NÃO (0)"
    if mat_count > 0:
        matched_turmas += 1
    else:
        unmatched_turmas += 1
    examples.append((desc, extracted, norm, mat_count, status))

for desc, extracted, norm, mat_count, status in examples[:15]:
    print(f"{desc[:38]:<40} | {extracted:<18} | {norm:<15} | {mat_count:<18} | {status}")

print(f"\nResumo no total de turmas de Aptos:")
print(f"Turmas com correspondência em Matriculados: {matched_turmas}")
print(f"Turmas sem correspondência em Matriculados: {unmatched_turmas}")
