import openpyxl
import re

# Aptos turmas normalized
wb_aptos = openpyxl.load_workbook(r'C:\Users\sam.sampaio\Downloads\SAEP 2026-2_28_08_2026_BA.xlsx', data_only=True)
ws_est = wb_aptos['Estudante']
aptos_map = {}
for r in range(2, ws_est.max_row+1):
    desc = ws_est.cell(r, 6).value
    if desc:
        m = re.match(r'^([^\s\-]+)', str(desc).strip())
        code = m.group(1) if m else str(desc).strip()
        norm = re.sub(r'^(?:SAEP|[TBG])', '', code, flags=re.IGNORECASE).strip()
        aptos_map[norm] = desc

# IFTP turmas normalized
wb_iftp = openpyxl.load_workbook(r'C:\Users\sam.sampaio\Downloads\Alunos matriculados 2026 IFTP - SAEP 2026.2.xlsx', data_only=True)
ws_iftp = wb_iftp['Dados']
iftp_raw = set()
for r in range(2, ws_iftp.max_row+1):
    val = ws_iftp.cell(r, 9).value
    if val:
        iftp_raw.add(str(val).strip())

print(f"Aptos turmas normalizadas: {len(aptos_map)}")
print(f"IFTP códigos brutos: {len(iftp_raw)}")

exact_matches = 0
base_matches = 0
for iftp_code in sorted(list(iftp_raw)):
    base = re.sub(r'(?:EMB|EMP)$', '', iftp_code, flags=re.IGNORECASE)
    has_exact = iftp_code in aptos_map
    has_base = base in aptos_map
    if has_exact:
        exact_matches += 1
    if has_base:
        base_matches += 1
    aptos_desc = aptos_map.get(base, "-")
    print(f"IFTP Code: {iftp_code:<12} | Base: {base:<8} | Exato em Aptos? {str(has_exact):<5} | Base em Aptos? {str(has_base):<5} | Aptos desc: {aptos_desc}")

print(f"\nTotal IFTP: {len(iftp_raw)} | Correspondência Exata: {exact_matches} | Correspondência pela Base (sem EMB/EMP): {base_matches}")
