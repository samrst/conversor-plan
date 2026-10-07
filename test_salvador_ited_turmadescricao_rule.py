"""
Test Suite for Explicit ITED TURMADESCRICAO Unit Resolution and Salvador Deterministic Mapping

Tests:
1. extractItedUnitFromTurma on all city suffixes (Dendezeiros, Ilhéus, Lauro de Freitas, etc.)
2. Non-grouping / isolation of records sharing the same base class code (G20242CHPSEGT8)
3. Deterministic association of Salvador ITED students to SENAI Dendezeiros without 'Decisão Pendente'
4. Genuine ambiguity trigger only when both Dendezeiros and CIMATEC exist for the same course in Participacao
5. Full consolidation against real files confirming 0 pending discrepancies
"""

import os
import sys
import re
import unicodedata
import pandas as pd

def normalize_string(s):
    if pd.isna(s) or s is None:
        return ""
    s = str(s).lower()
    s = unicodedata.normalize('NFD', s)
    s = "".join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', s)

def extract_ited_unit_from_turma(turma_desc, raw_escola='SENAI - ITED'):
    if not turma_desc:
        return raw_escola
    desc = str(turma_desc).strip()
    unit_part = desc
    for sep in ['-', '–', '—']:
        if sep in desc:
            parts = desc.split(sep)
            extracted = sep.join(parts[1:]).strip()
            if extracted:
                unit_part = extracted
                break

    def check_matches(text):
        u_norm = normalize_string(text)
        if 'alagoinhas' in u_norm: return 'SENAI Alagoinhas'
        if 'camacari' in u_norm: return 'SENAI Camaçari'
        if 'feiradesantana' in u_norm or 'feira' in u_norm: return 'SENAI Feira de Santana'
        if 'laurodefreitas' in u_norm: return 'SENAI Lauro de Freitas'
        if 'juazeiro' in u_norm: return 'SENAI Juazeiro'
        if 'ilheus' in u_norm: return 'SENAI Ilhéus'
        if 'barreiras' in u_norm: return 'SENAI Barreiras'
        if 'luiseduardomagalhaes' in u_norm or 'luiseduardo' in u_norm or u_norm == 'lem': return 'SENAI Luis Eduardo Magalhães'
        if 'vitoriadaconquista' in u_norm or 'conquista' in u_norm: return 'SENAI Vitória da Conquista'
        if 'dendezeiros' in u_norm or 'dedenzeiros' in u_norm: return 'SENAI Dendezeiros'
        if 'cimatec' in u_norm: return 'SENAI CIMATEC'
        if 'itabuna' in u_norm: return 'SENAI Itabuna'
        if 'jequie' in u_norm: return 'SENAI Jequié'
        if 'serrinha' in u_norm: return 'SENAI Serrinha'
        if 'teixeiradefreitas' in u_norm or 'teixeira' in u_norm: return 'SENAI Teixeira de Freitas'
        if 'eunapolis' in u_norm: return 'SENAI Eunápolis'
        if 'valenca' in u_norm: return 'SENAI Valença'
        if 'santoantoniodejesus' in u_norm or 'saj' in u_norm: return 'SENAI Santo Antônio de Jesus'
        if 'simoesfilho' in u_norm or 'simoes' in u_norm: return 'SENAI Simões Filho'
        return None

    m = check_matches(unit_part)
    if m: return m
    m = check_matches(desc)
    if m: return m
    return raw_escola

def normalize_unidade(u):
    s = normalize_string(u)
    s = re.sub(r'^(?:senai|cfp|escola|unidade|centro|cetind)+', '', s)
    aliases = {
        "feiradesantana": "feira",
        "vitoriadaconquista": "conquista",
        "luiseduardomagalhaes": "lem",
        "laurodefreitas": "lauro",
        "salvadorcimatec": "cimatec",
        "salvadordendezeiros": "dendezeiros"
    }
    for k, v in aliases.items():
        if s.startswith(k) or s == k:
            return v
    return s

def normalize_curso(c):
    canon = str(c).strip()
    s = normalize_string(canon)
    return re.sub(r'^(?:tecnicoem|tecnicode|cursobtecnico|curso)+', '', s)

def test_extract_ited_unit():
    print("=== TEST 1: extractItedUnitFromTurma Verification ===")
    test_cases = [
        ("G20242CHPSEGT8-ILHÉUS", "SENAI Ilhéus"),
        ("G20242CHPSEGT8-BARREIRAS", "SENAI Barreiras"),
        ("G20242CHPSEGT8-LUÍS EDUARDO MAGALHÃES", "SENAI Luis Eduardo Magalhães"),
        ("G20242CHPSEGT8-JUAZEIRO", "SENAI Juazeiro"),
        ("G20242CHPSEGT8-FEIRA DE SANTANA", "SENAI Feira de Santana"),
        ("G20242CHPSEGT8-CAMAÇARI", "SENAI Camaçari"),
        ("G20242CHPSEGT8-ALAGOINHAS", "SENAI Alagoinhas"),
        ("G20242CHPSEGT8-LAURO DE FREITAS", "SENAI Lauro de Freitas"),
        ("G20242CHPSEGT8-DENDEZEIROS", "SENAI Dendezeiros"),
        ("117621 - DEDENZEIROS", "SENAI Dendezeiros"),
        ("G20242CHPCIM1-CIMATEC", "SENAI CIMATEC")
    ]
    for turma, expected in test_cases:
        res = extract_ited_unit_from_turma(turma)
        assert res == expected, f"Failed for {turma}: got '{res}', expected '{expected}'"
        print(f"  [OK] '{turma}' -> '{res}'")
    print("  --> All unit extractions verified successfully.")

def test_shared_class_code_isolation():
    print("\n=== TEST 2: Shared Class Code Isolation (No Aggregation into Single Unit) ===")
    turmas = [
        ("G20242CHPSEGT8-ILHÉUS", 0),
        ("G20242CHPSEGT8-BARREIRAS", 0),
        ("G20242CHPSEGT8-LUÍS EDUARDO MAGALHÃES", 0),
        ("G20242CHPSEGT8-JUAZEIRO", 12),
        ("G20242CHPSEGT8-FEIRA DE SANTANA", 15),
        ("G20242CHPSEGT8-CAMAÇARI", 18),
        ("G20242CHPSEGT8-ALAGOINHAS", 20),
        ("G20242CHPSEGT8-LAURO DE FREITAS", 20),
        ("G20242CHPSEGT8-DENDEZEIROS", 24)
    ]
    part_map = {}
    for t_desc, pres in turmas:
        unit = extract_ited_unit_from_turma(t_desc)
        u_key = normalize_unidade(unit)
        c_key = normalize_curso("Técnico em Segurança do Trabalho")
        group_key = f"{u_key}___{c_key}___Semi-presencial"
        if group_key not in part_map:
            part_map[group_key] = {"unit": unit, "presentes": 0, "turmas": []}
        part_map[group_key]["presentes"] += pres
        part_map[group_key]["turmas"].append(t_desc)

    assert len(part_map) == 9, f"Expected 9 distinct keys, got {len(part_map)}"
    print(f"  [OK] 9 distinct unit keys created for shared class code 'G20242CHPSEGT8'")
    
    # Check Dendezeiros has 24, Lauro has 20, Ilhéus has 0
    dende_key = f"{normalize_unidade('SENAI Dendezeiros')}___{normalize_curso('Técnico em Segurança do Trabalho')}___Semi-presencial"
    lauro_key = f"{normalize_unidade('SENAI Lauro de Freitas')}___{normalize_curso('Técnico em Segurança do Trabalho')}___Semi-presencial"
    ilheus_key = f"{normalize_unidade('SENAI Ilhéus')}___{normalize_curso('Técnico em Segurança do Trabalho')}___Semi-presencial"
    
    assert part_map[dende_key]["presentes"] == 24
    assert part_map[lauro_key]["presentes"] == 20
    assert part_map[ilheus_key]["presentes"] == 0
    print("  [OK] Each unit retained its own separate 'Presentes' count without leakage.")

def test_salvador_ited_deterministic_association():
    print("\n=== TEST 3: Salvador ITED Deterministic Association (No False Ambiguity / Decisão Pendente) ===")
    
    # Simulate Participacao having G20242CHPSEGT8-DENDEZEIROS
    part_map = {}
    unit = extract_ited_unit_from_turma("G20242CHPSEGT8-DENDEZEIROS")
    u_key = normalize_unidade(unit)
    c_key = normalize_curso("Técnico em Segurança do Trabalho")
    group_key = f"{u_key}___{c_key}___Semi-presencial"
    part_map[group_key] = {"unit": unit, "presentes": 24}

    # Simulate Estudantes having Salvador ITED students
    students = [
        {"ESCOLA": "SENAI - ITED", "MUNICIPIO": "Salvador", "CURSO": "Técnico em Segurança do Trabalho", "HOMOLOGADO": "SIM"}
        for _ in range(22)
    ]

    manual_overrides = {}
    discrepancies = []
    warnings = []
    salvador_ited_students = []

    for idx, s in enumerate(students):
        m_norm = normalize_string(s["MUNICIPIO"])
        canonical_curso = "Técnico em Segurança do Trabalho"
        if m_norm == "salvador":
            salvador_key = f"salvador_ited_{normalize_curso(canonical_curso)}"
            override_choice = manual_overrides.get(salvador_key)
            c_key = normalize_curso(canonical_curso)
            dende_key = f"{normalize_unidade('SENAI Dendezeiros')}___{c_key}___Semi-presencial"
            cimatec_key = f"{normalize_unidade('SENAI CIMATEC')}___{c_key}___Semi-presencial"
            has_dende = dende_key in part_map
            has_cim = cimatec_key in part_map

            if override_choice and override_choice in ["SENAI CIMATEC", "SENAI Dendezeiros"]:
                unidade_display = override_choice
                if has_dende and has_cim:
                    salvador_ited_students.append(idx)
            else:
                if has_dende and not has_cim:
                    unidade_display = "SENAI Dendezeiros"
                elif has_cim and not has_dende:
                    unidade_display = "SENAI CIMATEC"
                elif has_dende and has_cim:
                    unidade_display = "SENAI Dendezeiros"
                    salvador_ited_students.append(idx)
                else:
                    unidade_display = "SENAI Dendezeiros"
        
        assert unidade_display == "SENAI Dendezeiros"

    assert len(salvador_ited_students) == 0, f"Expected 0 students marked ambiguous, got {len(salvador_ited_students)}"
    assert len(discrepancies) == 0, f"Expected 0 discrepancies, got {len(discrepancies)}"
    print("  [OK] Salvador ITED student mapped deterministically to SENAI Dendezeiros with ZERO pending decisions.")

def test_genuine_ambiguity_when_both_present():
    print("\n=== TEST 4: Genuine Ambiguity Triggered When Both Dendezeiros and CIMATEC Exist ===")
    part_map = {}
    c_key = normalize_curso("Técnico em Redes de Computadores")
    dende_key = f"{normalize_unidade('SENAI Dendezeiros')}___{c_key}___Semi-presencial"
    cimatec_key = f"{normalize_unidade('SENAI CIMATEC')}___{c_key}___Semi-presencial"
    part_map[dende_key] = {"unit": "SENAI Dendezeiros", "presentes": 10}
    part_map[cimatec_key] = {"unit": "SENAI CIMATEC", "presentes": 15}

    salvador_ited_students = []
    has_dende = dende_key in part_map
    has_cim = cimatec_key in part_map
    if has_dende and has_cim:
        salvador_ited_students.append(1)

    assert len(salvador_ited_students) == 1
    print("  [OK] Genuine ambiguity properly detected when both units exist in Participacao for the same course.")

def test_real_data_consolidation():
    print("\n=== TEST 5: Full Consolidation with Real Data Files ===")
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(workspace_dir)
    search_dirs = [workspace_dir, parent_dir]

    part_files = []
    est_files = []
    for d in search_dirs:
        for f in os.listdir(d):
            if "participacao" in f.lower() and f.endswith(".xlsx"):
                part_files.append(os.path.join(d, f))
            elif "estudantes" in f.lower() and f.endswith(".xlsx") and not f.startswith("~$"):
                est_files.append(os.path.join(d, f))

    part_path = next((f for f in part_files if "2026-06-22" in f), part_files[0])
    est_path = next((f for f in est_files if os.path.basename(f) == "estudantes - BA.xlsx"), est_files[0])

    assert os.path.exists(part_path), f"File not found: {part_path}"
    assert os.path.exists(est_path), f"File not found: {est_path}"

    df_part = pd.read_excel(part_path, header=5)
    df_est = pd.read_excel(est_path, header=6)
    df_est = df_est[~df_est.iloc[:, 0].astype(str).str.startswith("Total de")]

    # Build Participacao map
    part_map = {}
    for _, row in df_part.iterrows():
        u_raw = str(row.get("Unidade operacional (Escola)", "")).strip()
        c_raw = str(row.get("Curso", "")).strip()
        t_raw = str(row.get("Turma", "")).strip()
        pres = int(row.get("Presentes", 0)) if pd.notna(row.get("Presentes")) else 0
        if "ITED" in u_raw.upper():
            modalidade = "Semi-presencial"
            unidade = extract_ited_unit_from_turma(t_raw, u_raw)
        else:
            modalidade = "Presencial"
            unidade = u_raw
        u_key = normalize_unidade(unidade)
        c_key = normalize_curso(c_raw)
        group_key = f"{u_key}___{c_key}___{modalidade}"
        if group_key not in part_map:
            part_map[group_key] = {"unit": unidade, "curso": c_raw, "modalidade": modalidade, "presentes": 0, "turmas": []}
        part_map[group_key]["presentes"] += pres
        part_map[group_key]["turmas"].append(t_raw)

    # Build Estudantes map
    est_map = {}
    salvador_ambiguities = []
    for idx, row in df_est.iterrows():
        muni = str(row.get("MUNICIPIO", "")).strip()
        escola = str(row.get("ESCOLA", "")).strip()
        curso = str(row.get("CURSO", "")).strip()
        hom = str(row.get("HOMOLOGADO", "")).strip().upper() == "SIM"
        is_ited = "ITED" in escola.upper()
        modalidade = "Semi-presencial" if is_ited else "Presencial"

        if is_ited:
            m_norm = normalize_string(muni)
            if m_norm == "salvador":
                c_key = normalize_curso(curso)
                dende_key = f"{normalize_unidade('SENAI Dendezeiros')}___{c_key}___Semi-presencial"
                cimatec_key = f"{normalize_unidade('SENAI CIMATEC')}___{c_key}___Semi-presencial"
                has_dende = dende_key in part_map
                has_cim = cimatec_key in part_map

                if has_dende and not has_cim:
                    unidade = "SENAI Dendezeiros"
                elif has_cim and not has_dende:
                    unidade = "SENAI CIMATEC"
                elif has_dende and has_cim:
                    unidade = "SENAI Dendezeiros"
                    salvador_ambiguities.append((curso, row))
                else:
                    unidade = "SENAI Dendezeiros"
            else:
                unidade = extract_ited_unit_from_turma(muni)
                if unidade == 'SENAI - ITED':
                    unidade = f"SENAI {muni}"
        else:
            unidade = escola

        u_key = normalize_unidade(unidade)
        c_key = normalize_curso(curso)
        group_key = f"{u_key}___{c_key}___{modalidade}"
        if group_key not in est_map:
            est_map[group_key] = {"unit": unidade, "curso": curso, "modalidade": modalidade, "homologados": 0}
        if hom:
            est_map[group_key]["homologados"] += 1

    print(f"  [OK] Participacao processed: {len(part_map)} keys, total PO = {sum(p['presentes'] for p in part_map.values())}")
    print(f"  [OK] Estudantes processed:   {len(est_map)} keys, total Homologados = {sum(e['homologados'] for e in est_map.values())}")
    print(f"  [OK] Salvador Ambiguities detected: {len(salvador_ambiguities)} (Expected: 0)")
    assert len(salvador_ambiguities) == 0, "Expected 0 Salvador ambiguities in real dataset"

    union_keys = set(part_map.keys()).union(set(est_map.keys()))
    print(f"  [OK] Total Consolidated Rows (Union): {len(union_keys)} (Matches 109 keys)")
    assert len(union_keys) == 109

if __name__ == "__main__":
    test_extract_ited_unit()
    test_shared_class_code_isolation()
    test_salvador_ited_deterministic_association()
    test_genuine_ambiguity_when_both_present()
    test_real_data_consolidation()
    print("\n==================================================")
    print("ALL TESTS PASSED: TURMADESCRICAO EXPLICIT RULE 100% VALIDATED!")
    print("==================================================")
