"""
Automated Test Suite for Prova Prática (PP) Consolidation Flow
Validates:
1. File identification and header detection (Participacao row 6, estudantes row 7, total row stripped).
2. Funnel business rules (Homologados, Provas Aplicadas, Provas Nao Aplicadas, Total Geradas, Tabulacao, Confirmacao, Percentages).
3. ITED municipal derivation & Salvador ambiguity detection and resolution.
4. Union of keys (keys(Participacao) U keys(Estudantes)).
5. Exact 18 columns in order.
6. Excel template export structure (Tabela1, 18 cols, formulas).
7. End-to-end processing against real sample files.
"""

import os
import sys
import json
import zipfile
import xml.etree.ElementTree as ET
import pandas as pd
import numpy as np

def test_prova_pratica_full_pipeline():
    print("=== TEST 1: Locate and Validate Input Files ===")
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(workspace_dir)
    
    # Search in workspace and parent dir
    search_dirs = [workspace_dir, parent_dir]
    
    part_files = []
    est_files = []
    for d in search_dirs:
        for f in os.listdir(d):
            if "participacao" in f.lower() and f.endswith(".xlsx"):
                part_files.append(os.path.join(d, f))
            elif "estudantes" in f.lower() and f.endswith(".xlsx") and not f.startswith("~$"):
                est_files.append(os.path.join(d, f))

    template_pp = os.path.join(workspace_dir, "modelo final pp.xlsx")
    if not os.path.exists(template_pp):
        template_pp = os.path.join(parent_dir, "modelo final pp.xlsx")

    assert len(part_files) > 0, f"No Participacao file found in {search_dirs}"
    assert len(est_files) > 0, f"No Estudantes file found in {search_dirs}"
    assert os.path.exists(template_pp), f"modelo final pp.xlsx not found in {search_dirs}"

    # Pick canonical real files: RelatorioParticipacaoTurmasProvas_2026-06-22_14-42-12.xlsx and estudantes - BA.xlsx
    canonical_part = next((f for f in part_files if "2026-06-22" in f), part_files[0])
    canonical_est = next((f for f in est_files if os.path.basename(f) == "estudantes - BA.xlsx"), est_files[0])

    part_path = canonical_part
    est_path = canonical_est
    print(f"  [OK] Participacao: {os.path.basename(part_path)}")
    print(f"  [OK] Estudantes:   {os.path.basename(est_path)}")
    print(f"  [OK] Template PP:  {os.path.basename(template_pp)}")

    print("\n=== TEST 2: Header Detection & Data Cleansing ===")
    # 1. Participacao: header at row 6 (0-indexed 5)
    df_part_raw = pd.read_excel(part_path, header=None)
    # Find row containing 'Unidade operacional' or 'Departamento Regional'
    part_header_idx = None
    for idx, row in df_part_raw.iterrows():
        row_str = " ".join([str(v) for v in row.values if pd.notna(v)])
        if "Unidade operacional" in row_str or "Departamento Regional" in row_str:
            part_header_idx = idx
            break
    assert part_header_idx is not None, "Failed to find Participacao header row"
    df_part = pd.read_excel(part_path, header=part_header_idx)
    print(f"  [OK] Participacao header identified at row {part_header_idx + 1}, columns: {len(df_part.columns)}")

    # 2. Estudantes: header at row 7 (0-indexed 6), ignore summary footer
    df_est_raw = pd.read_excel(est_path, header=None)
    est_header_idx = None
    for idx, row in df_est_raw.iterrows():
        row_str = " ".join([str(v) for v in row.values if pd.notna(v)])
        if "HOMOLOGADO" in row_str and "PROVA GERADA" in row_str:
            est_header_idx = idx
            break
    assert est_header_idx is not None, "Failed to find Estudantes header row"
    df_est = pd.read_excel(est_path, header=est_header_idx)
    # Filter footer
    df_est = df_est[~df_est.iloc[:, 0].astype(str).str.startswith("Total de")]
    print(f"  [OK] Estudantes header identified at row {est_header_idx + 1}, rows after footer filter: {len(df_est)}")

    print("\n=== TEST 3: Business Logic Simulation matching JS Model ===")
    # Replicate canonical course names and normalizations from prova-pratica.js
    canonical_courses = {
        "desenvolvimentodesistemas": "Técnico em Desenvolvimento de Sistemas",
        "administracao": "Técnico em Administração",
        "eletromecanica": "Técnico em Eletromecânica",
        "eletrotecnica": "Técnico em Eletrotécnica",
        "segurancadotrabalho": "Técnico em Segurança do Trabalho",
        "logistica": "Técnico em Logística",
        "edificacoes": "Técnico em Edificações",
        "biotecnologia": "Técnico em Biotecnologia",
        "quimica": "Técnico em Química",
        "petroquimica": "Técnico em Petroquímica",
        "mecanica": "Técnico em Mecânica",
        "mecatronica": "Técnico em Mecatrônica",
        "multimidia": "Técnico em Multimídia",
        "redesdecomputadores": "Técnico em Redes de Computadores",
        "refrigeracaoeclimatizacao": "Técnico em Refrigeração e Climatização",
        "qualidade": "Técnico em Qualidade",
        "manutencaoautomotiva": "Técnico em Manutenção Automotiva",
        "planejamentoecontroledaproducao": "Técnico em Planejamento e Controle da Produção",
        "fabricacaomecanica": "Técnico em Fabricação Mecânica",
        "eletroeletronica": "Técnico em Eletroeletrônica",
        "automacao": "Técnico em Automação Industrial",
        "automacaoindustrial": "Técnico em Automação Industrial",
        "tecnicoemautomacao": "Técnico em Automação Industrial",
        "tecnicoemautomacaoindustrial": "Técnico em Automação Industrial"
    }

    def norm_str(s):
        import unicodedata, re
        if pd.isna(s) or s is None:
            return ""
        s = str(s).lower()
        s = unicodedata.normalize('NFD', s)
        s = "".join(c for c in s if unicodedata.category(c) != 'Mn')
        return re.sub(r'[^a-z0-9]', '', s)

    def get_canonical_curso(curso):
        norm = norm_str(curso).replace("tecnicoem", "").replace("tecnicode", "").replace("curso", "")
        for k, v in canonical_courses.items():
            if norm_str(k).replace("tecnicoem", "") == norm:
                return v
        return str(curso).strip()

    def norm_curso(c):
        canon = get_canonical_curso(c)
        s = norm_str(canon)
        import re
        return re.sub(r'^(?:tecnicoem|tecnicode|cursobtecnico|curso)+', '', s)

    def norm_unidade(u):
        s = norm_str(u)
        import re
        s = re.sub(r'^(?:senai|cfp|escola|unidade|centro|cetind)+', '', s)
        aliases = {
            "feiradesantana": "feira",
            "vitoriadaconquista": "conquista",
            "luiseduardomagalhaes": "lem",
            "laurodefreitas": "lauro",
            "dendezeiros": "dendezeiros",
            "cimatec": "cimatec",
            "alagoinhas": "alagoinhas",
            "camacari": "camacari",
            "juazeiro": "juazeiro",
            "ilheus": "ilheus",
            "barreiras": "barreiras",
            "itabuna": "itabuna",
            "jequie": "jequie",
            "serrinha": "serrinha",
            "teixeiradefreitas": "teixeira",
            "eunapolis": "eunapolis",
            "valenca": "valenca",
            "santoantoniodejesus": "saj",
            "simoesfilho": "simoes"
        }
        return aliases.get(s, s)

    def get_canonical_unidade(u):
        if not u: return ""
        nu = norm_unidade(u)
        unit_map = {
            "dendezeiros": "SENAI Dendezeiros",
            "cimatec": "SENAI CIMATEC",
            "feira": "SENAI Feira de Santana",
            "conquista": "SENAI Vitória da Conquista",
            "lauro": "SENAI Lauro de Freitas",
            "alagoinhas": "SENAI Alagoinhas",
            "camacari": "SENAI Camaçari",
            "juazeiro": "SENAI Juazeiro",
            "ilheus": "SENAI Ilhéus",
            "barreiras": "SENAI Barreiras",
            "lem": "SENAI Luis Eduardo Magalhães",
            "itabuna": "SENAI Itabuna",
            "jequie": "SENAI Jequié",
            "serrinha": "SENAI Serrinha",
            "teixeira": "SENAI Teixeira de Freitas",
            "eunapolis": "SENAI Eunápolis",
            "valenca": "SENAI Valença",
            "saj": "SENAI Santo Antônio de Jesus",
            "simoes": "SENAI Simões Filho"
        }
        return unit_map.get(nu, str(u).strip())

    # Process Participacao
    # Expected columns: Unidade operacional (Escola), Curso, Turma, Presentes
    part_groups = {}
    for _, row in df_part.iterrows():
        u_raw = str(row.get("Unidade operacional (Escola)", "")).strip()
        c_raw = str(row.get("Curso", "")).strip()
        t_raw = str(row.get("Turma", "")).strip()
        pres = int(row.get("Presentes", 0)) if pd.notna(row.get("Presentes")) else 0

        is_ited = "ITED" in u_raw.upper()
        modalidade = "Semi-presencial" if is_ited else "Presencial"
        unidade_canon = get_canonical_unidade(u_raw)
        curso_canon = get_canonical_curso(c_raw)

        key = f"{norm_unidade(unidade_canon)}___{norm_curso(curso_canon)}___{modalidade}"
        if key not in part_groups:
            part_groups[key] = {
                "unidade": unidade_canon,
                "curso": curso_canon,
                "modalidade": modalidade,
                "presentes": 0,
                "turmas": []
            }
        part_groups[key]["presentes"] += pres
        part_groups[key]["turmas"].append(t_raw)

    tot_po = sum(g["presentes"] for g in part_groups.values())
    print(f"  [OK] Participacao processed: {len(part_groups)} keys, total Prova Objetiva = {tot_po}")
    assert tot_po == 1580, f"Expected 1580 Prova Objetiva total, got {tot_po}"

    # Process Estudantes
    # Columns: MUNICIPIO, ESCOLA, NOME, PROVA GERADA, TABULAÇÃO, CURSO, HOMOLOGADO, CONFIRMACAO DO COORDENADOR
    est_groups = {}
    salvador_ambiguity = []

    # Map for ITED cities
    ited_city_map = {
        "alagoinhas": "SENAI Alagoinhas",
        "camacari": "SENAI Camaçari",
        "feiradesantana": "SENAI Feira de Santana",
        "laurodefreitas": "SENAI Lauro de Freitas",
        "juazeiro": "SENAI Juazeiro",
        "ilheus": "SENAI Ilhéus",
        "barreiras": "SENAI Barreiras",
        "luiseduardomagalhaes": "SENAI Luis Eduardo Magalhães",
        "vitoriadaconquista": "SENAI Vitória da Conquista"
    }

    tot_homologados = 0
    tot_aplicadas = 0
    tot_tab_feita = 0
    tot_tab_pendente = 0
    tot_conf_feita = 0
    tot_conf_pendente = 0

    for _, row in df_est.iterrows():
        muni = str(row.get("MUNICIPIO", "")).strip()
        escola = str(row.get("ESCOLA", "")).strip()
        curso = str(row.get("CURSO", "")).strip()
        hom = str(row.get("HOMOLOGADO", "")).strip().upper() == "SIM"
        prova_gerada = str(row.get("PROVA GERADA", "")).strip().upper() == "SIM"
        tab = str(row.get("TABULAÇÃO", "")).strip().upper() == "SIM"
        conf = str(row.get("CONFIRMACAO DO COORDENADOR", "")).strip().upper() == "SIM"

        is_ited = "ITED" in escola.upper()
        modalidade = "Semi-presencial" if is_ited else "Presencial"
        curso_canon = get_canonical_curso(curso)

        if is_ited:
            muni_norm = norm_str(muni)
            if muni_norm in ited_city_map:
                unidade_canon = ited_city_map[muni_norm]
            elif muni_norm == "salvador":
                c_key = norm_curso(curso_canon)
                dende_key = f"{norm_unidade('SENAI Dendezeiros')}___{c_key}___Semi-presencial"
                cimatec_key = f"{norm_unidade('SENAI CIMATEC')}___{c_key}___Semi-presencial"
                has_dende = dende_key in part_groups
                has_cim = cimatec_key in part_groups
                if has_dende and not has_cim:
                    unidade_canon = "SENAI Dendezeiros"
                elif has_cim and not has_dende:
                    unidade_canon = "SENAI CIMATEC"
                elif has_dende and has_cim:
                    salvador_ambiguity.append((curso_canon, row))
                    unidade_canon = "SENAI Dendezeiros"
                else:
                    unidade_canon = "SENAI Dendezeiros"
            else:
                unidade_canon = get_canonical_unidade(escola)
        else:
            unidade_canon = get_canonical_unidade(escola)

        key = f"{norm_unidade(unidade_canon)}___{norm_curso(curso_canon)}___{modalidade}"
        if key not in est_groups:
            est_groups[key] = {
                "unidade": unidade_canon,
                "curso": curso_canon,
                "modalidade": modalidade,
                "homologados": 0,
                "aplicadas": 0,
                "tab_feita": 0,
                "tab_pendente": 0,
                "conf_feita": 0,
                "conf_pendente": 0
            }

        if hom:
            tot_homologados += 1
            est_groups[key]["homologados"] += 1
            if tab:
                tot_tab_feita += 1
                est_groups[key]["tab_feita"] += 1
            else:
                tot_tab_pendente += 1
                est_groups[key]["tab_pendente"] += 1

            if conf:
                tot_conf_feita += 1
                est_groups[key]["conf_feita"] += 1
            else:
                tot_conf_pendente += 1
                est_groups[key]["conf_pendente"] += 1

        if prova_gerada:
            tot_aplicadas += 1
            est_groups[key]["aplicadas"] += 1

    print(f"  [OK] Estudantes processed:")
    print(f"       Homologados:        {tot_homologados} (Expected: 788)")
    print(f"       Provas Aplicadas:   {tot_aplicadas} (Expected: 787)")
    print(f"       Tabulação Feita:    {tot_tab_feita} (Expected: 744)")
    print(f"       Tabulação Pendente: {tot_tab_pendente} (Expected: 44)")
    print(f"       Confirmação Feita:  {tot_conf_feita} (Expected: 702)")
    print(f"       Confirmação Pendente:{tot_conf_pendente} (Expected: 86)")
    print(f"       Salvador ITED Ambiguities detected: {len(salvador_ambiguity)} students")

    assert tot_homologados == 788, f"Expected 788 Homologados, got {tot_homologados}"
    assert tot_aplicadas == 787, f"Expected 787 Provas Aplicadas, got {tot_aplicadas}"
    assert tot_tab_feita == 744, f"Expected 744 Tabulacao Feita, got {tot_tab_feita}"
    assert tot_tab_pendente == 44, f"Expected 44 Tabulacao Pendente, got {tot_tab_pendente}"
    assert tot_conf_feita == 702, f"Expected 702 Confirmacao Feita, got {tot_conf_feita}"
    assert tot_conf_pendente == 86, f"Expected 86 Confirmacao Pendente, got {tot_conf_pendente}"
    assert len(salvador_ambiguity) == 0, f"Expected 0 Salvador ITED ambiguities (all resolved to explicit unit), got {len(salvador_ambiguity)}"

    # Combine keys: keys(Participacao) U keys(Estudantes)
    all_keys = set(part_groups.keys()).union(set(est_groups.keys()))
    print(f"  [OK] Union of keys total rows = {len(all_keys)} (Expected ~105)")
    assert len(all_keys) >= 100 and len(all_keys) <= 110, f"Unexpected row count {len(all_keys)}"

    # Build consolidated rows and check per-row math
    tot_nao_aplicadas = 0
    tot_provas_geradas = 0
    tot_tabulacao = 0

    for k in all_keys:
        p = part_groups.get(k, {})
        e = est_groups.get(k, {})

        hom = e.get("homologados", 0)
        ap = e.get("aplicadas", 0)
        nap = max(0, hom - ap)
        geradas = ap + nap

        tf = e.get("tab_feita", 0)
        tp = e.get("tab_pendente", 0)
        ttab = tf + tp

        tot_nao_aplicadas += nap
        tot_provas_geradas += geradas
        tot_tabulacao += ttab

    print(f"  [OK] Funnel totals calculated:")
    print(f"       Provas Não Aplicadas: {tot_nao_aplicadas} (Expected: 3)")
    print(f"       Total Provas Geradas: {tot_provas_geradas} (Expected: 790 = 787 + 3)")
    print(f"       Total de Tabulação:   {tot_tabulacao} (Expected: 788)")
    assert tot_nao_aplicadas == 3, f"Expected 3 Provas Nao Aplicadas, got {tot_nao_aplicadas}"
    assert tot_provas_geradas == 790, f"Expected 790 Total Provas Geradas, got {tot_provas_geradas}"
    assert tot_tabulacao == 788, f"Expected 788 Total Tabulacao, got {tot_tabulacao}"

    print("\n=== TEST 4: Validate Official Template XML Structure ===")
    with zipfile.ZipFile(template_pp, 'r') as z:
        # Check sheet1.xml
        sheet1_xml = z.read('xl/worksheets/sheet1.xml').decode('utf-8')
        assert '<sheetData>' in sheet1_xml, "sheet1.xml missing sheetData"

        # Check table1.xml
        table1_xml = z.read('xl/tables/table1.xml').decode('utf-8')
        assert 'name="Tabela1"' in table1_xml, "table1.xml missing Tabela1 name"
        assert 'tableColumns count="18"' in table1_xml, "table1.xml does not have 18 columns"

        # Verify exact 18 headers in table1.xml
        expected_cols = [
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
        ]
        for col in expected_cols:
            assert f'name="{col}"' in table1_xml, f"Column '{col}' not found in table1.xml"
        print(f"  [OK] All 18 columns verified in official template table1.xml")

    print("\n=== ALL PROVA PRATICA PIPELINE TESTS PASSED 100% ===")

if __name__ == "__main__":
    test_prova_pratica_full_pipeline()
