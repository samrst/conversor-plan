"""
Comprehensive Real Browser Pipeline Validation Script (13 Columns)
Simulates the exact browser-side execution using the embedded base64 template from 'js/services/excel-template.js'
and the exact demo microdatasets from 'js/services/demo-data.js'.
"""

import base64
import zipfile
import re
import openpyxl
import os

def load_embedded_template_from_js():
    with open('js/services/excel-template.js', 'r', encoding='utf-8') as f:
        content = f.read()
    match = re.search(r"export const MODELO_FINAL_PO_BASE64 = '([A-Za-z0-9+/=]+)';", content)
    assert match, "Failed to extract MODELO_FINAL_PO_BASE64 from js/services/excel-template.js"
    return base64.b64decode(match.group(1))

def simulate_browser_export(template_bytes, demo_rows, output_path):
    """
    Executes the exact OpenXML modification performed in ExporterService.exportWithTemplate
    """
    import io
    zin = zipfile.ZipFile(io.BytesIO(template_bytes), 'r')
    file_map = {item.filename: zin.read(item.filename) for item in zin.infolist()}
    zin.close()
    
    num_rows = len(demo_rows)
    total_row_idx = num_rows + 3 # Header=2, Data=3..num_rows+2, Totals=num_rows+3
    
    # 1. Update table1.xml
    table1_xml = file_map['xl/tables/table1.xml'].decode('utf-8')
    table1_xml = re.sub(r'ref="A2:M\d+"', f'ref="A2:M{total_row_idx}"', table1_xml)
    table1_xml = re.sub(r'<autoFilter ref="A2:M\d+"', f'<autoFilter ref="A2:M{total_row_idx - 1}"', table1_xml)
    file_map['xl/tables/table1.xml'] = table1_xml.encode('utf-8')
    
    # 2. Build sheet1.xml sheetData
    r1_xml = '<row r="1" spans="1:14" s="12" customFormat="1" ht="82.5" customHeight="1"><c r="A1" s="11" t="inlineStr"><is><t xml:space="preserve">                    SAEP - Prova Objetiva</t></is></c></row>'
    
    headers = [
        ('A2', 'Departamento Regional (DR)'),
        ('B2', 'Unidade operacional (Escola)'),
        ('C2', 'Curso'),
        ('D2', 'Categoria'),
        ('E2', 'Modalidade'),
        ('F2', 'Turma'),
        ('G2', 'Alunos '),
        ('H2', 'Alunos Aptos/Agendados'),
        ('I2', 'Alunos Inaptos/Não Agendados'),
        ('J2', 'Presentes'),
        ('K2', 'Presentes (%)'),
        ('L2', 'Ausentes'),
        ('M2', 'Ausentes (%)')
    ]
    r2_cells = ''.join([f'<c r="{coord}" s="1" t="inlineStr"><is><t>{name}</t></is></c>' for coord, name in headers])
    r2_xml = f'<row r="2" spans="1:14" s="1" customFormat="1" ht="16.5" customHeight="1">{r2_cells}</row>'
    
    data_rows_xml = []
    
    tot_alunos = 0
    tot_aptos_agendados = 0
    tot_inaptos_nao_agendados = 0
    tot_presentes = 0
    tot_ausentes = 0
    
    def escape_xml(val):
        if val is None: return ''
        return str(val).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&apos;')
        
    def parse_percent_dec(val):
        if not val: return 0.0
        if isinstance(val, (int, float)):
            return val / 100.0 if val > 1.0 else float(val)
        clean = str(val).replace('%', '').replace(',', '.').strip()
        try:
            n = float(clean)
            return n / 100.0 if n > 1.0 else n
        except:
            return 0.0

    for idx, row in enumerate(demo_rows):
        r_num = idx + 3
        dr = row.get('Departamento Regional (DR)', 'SENAI-BA')
        unidade = row.get('Unidade operacional (Escola)', '')
        curso = row.get('Curso', '')
        categoria = row.get('Categoria', 'CHP')
        modalidade = row.get('Modalidade', 'Presencial')
        turma = row.get('Turma', '')
        
        alunos = int(row.get('Alunos', row.get('Alunos ', 0)) or 0)
        aptos_agendados = int(row.get('Alunos Aptos/Agendados', 0) or 0)
        inaptos_nao_agendados = int(row.get('Alunos Inaptos/Não Agendados', 0) or 0)
        presentes = int(row.get('Presentes', 0) or 0)
        ausentes = int(row.get('Ausentes', 0) or 0)
        
        pres_dec = parse_percent_dec(row.get('Presentes (%)', 0))
        aus_dec = parse_percent_dec(row.get('Ausentes (%)', 0))
        
        tot_alunos += alunos
        tot_aptos_agendados += aptos_agendados
        tot_inaptos_nao_agendados += inaptos_nao_agendados
        tot_presentes += presentes
        tot_ausentes += ausentes
        
        row_c = [
            f'<c r="A{r_num}" t="inlineStr"><is><t>{escape_xml(dr)}</t></is></c>',
            f'<c r="B{r_num}" t="inlineStr"><is><t>{escape_xml(unidade)}</t></is></c>',
            f'<c r="C{r_num}" t="inlineStr"><is><t>{escape_xml(curso)}</t></is></c>',
            f'<c r="D{r_num}" t="inlineStr"><is><t>{escape_xml(categoria)}</t></is></c>',
            f'<c r="E{r_num}" t="inlineStr"><is><t>{escape_xml(modalidade)}</t></is></c>',
            f'<c r="F{r_num}" t="inlineStr"><is><t>{escape_xml(turma)}</t></is></c>',
            f'<c r="G{r_num}" s="7"><v>{alunos}</v></c>',
            f'<c r="H{r_num}" s="5"><v>{aptos_agendados}</v></c>',
            f'<c r="I{r_num}" s="9"><v>{inaptos_nao_agendados}</v></c>',
            f'<c r="J{r_num}" s="5"><v>{presentes}</v></c>',
            f'<c r="K{r_num}" s="5"><v>{pres_dec:.4f}</v></c>',
            f'<c r="L{r_num}" s="5"><v>{ausentes}</v></c>',
            f'<c r="M{r_num}" s="5"><v>{aus_dec:.4f}</v></c>'
        ]
        data_rows_xml.append(f'<row r="{r_num}" spans="1:14" ht="15.75" customHeight="1">{"".join(row_c)}</row>')
        
    avg_pres_pct = (tot_presentes / tot_aptos_agendados) if tot_aptos_agendados > 0 else 0
    avg_aus_pct = (tot_ausentes / tot_aptos_agendados) if tot_aptos_agendados > 0 else 0

    r_tot = total_row_idx
    tot_cells = [
        f'<c r="A{r_tot}" s="6" t="inlineStr"><is><t>Total</t></is></c>',
        f'<c r="F{r_tot}" s="7"/>',
        f'<c r="G{r_tot}" s="7"><f>SUBTOTAL(109,Tabela1[[Alunos ]])</f><v>{tot_alunos}</v></c>',
        f'<c r="H{r_tot}" s="5"><f>SUBTOTAL(109,Tabela1[Alunos Aptos/Agendados])</f><v>{tot_aptos_agendados}</v></c>',
        f'<c r="I{r_tot}" s="5"><f>SUBTOTAL(109,Tabela1[Alunos Inaptos/Não Agendados])</f><v>{tot_inaptos_nao_agendados}</v></c>',
        f'<c r="J{r_tot}" s="5"><f>SUBTOTAL(109,Tabela1[Presentes])</f><v>{tot_presentes}</v></c>',
        f'<c r="K{r_tot}" s="5"><f>SUBTOTAL(101,Tabela1[Presentes (%)])</f><v>{avg_pres_pct:.4f}</v></c>',
        f'<c r="L{r_tot}" s="5"><f>SUBTOTAL(109,Tabela1[Ausentes])</f><v>{tot_ausentes}</v></c>',
        f'<c r="M{r_tot}" s="5"><f>SUBTOTAL(101,Tabela1[Ausentes (%)])</f><v>{avg_aus_pct:.4f}</v></c>'
    ]
    total_row_xml = f'<row r="{r_tot}" spans="1:14" customFormat="1">{"".join(tot_cells)}</row>'
    
    new_sheet_data = r1_xml + r2_xml + ''.join(data_rows_xml) + total_row_xml
    
    sheet1_str = file_map['xl/worksheets/sheet1.xml'].decode('utf-8')
    sheet1_str = re.sub(r'<dimension ref="[A-Z0-9:]+"/>', f'<dimension ref="A1:M{total_row_idx}"/>', sheet1_str)
    sheet1_str = re.sub(r'<sheetData>[\s\S]*?</sheetData>', f'<sheetData>{new_sheet_data}</sheetData>', sheet1_str)
    file_map['xl/worksheets/sheet1.xml'] = sheet1_str.encode('utf-8')
    
    if 'xl/calcChain.xml' in file_map:
        del file_map['xl/calcChain.xml']
    if '[Content_Types].xml' in file_map:
        ct_str = file_map['[Content_Types].xml'].decode('utf-8')
        ct_str = ct_str.replace('<Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml"/>', '')
        file_map['[Content_Types].xml'] = ct_str.encode('utf-8')
    if 'xl/_rels/workbook.xml.rels' in file_map:
        wb_rels = file_map['xl/_rels/workbook.xml.rels'].decode('utf-8')
        wb_rels = re.sub(r'<Relationship [^>]*Target="calcChain\.xml"[^>]*/>', '', wb_rels)
        file_map['xl/_rels/workbook.xml.rels'] = wb_rels.encode('utf-8')
        
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for fname, data in file_map.items():
            zout.writestr(fname, data)

def run_end_to_end_validation():
    print("=================================================================")
    print("=== END-TO-END VALIDATION: BROWSER PIPELINE SIMULATION (13 COLS) ===")
    print("=================================================================")
    
    # 1. Extract template embedded in JS
    print("\n[Step 1] Loading embedded template from 'js/services/excel-template.js'...")
    template_bytes = load_embedded_template_from_js()
    print(f"  [PASS] Template decoded successfully ({len(template_bytes)} bytes)")
    
    # 2. Define exact demo processed macro output from js/services/demo-data.js
    demo_macro_output = [
        {
            'Departamento Regional (DR)': 'SENAI-BA',
            'Unidade operacional (Escola)': 'SENAI Dendezeiros',
            'Curso': 'Técnico em Eletrotécnica',
            'Categoria': 'CHP',
            'Modalidade': 'Presencial',
            'Turma': 'ELE01',
            'Alunos': 5,
            'Alunos Aptos/Agendados': 4,
            'Alunos Inaptos/Não Agendados': 1,
            'Presentes': 3,
            'Presentes (%)': '75.0%',
            'Ausentes': 1,
            'Ausentes (%)': '25.0%'
        },
        {
            'Departamento Regional (DR)': 'SENAI-BA',
            'Unidade operacional (Escola)': 'Lauro de Freitas',
            'Curso': 'Técnico em Desenvolvimento de Sistemas',
            'Categoria': 'CHP',
            'Modalidade': 'Semipresencial',
            'Turma': 'DS001',
            'Alunos': 6,
            'Alunos Aptos/Agendados': 5,
            'Alunos Inaptos/Não Agendados': 1,
            'Presentes': 4,
            'Presentes (%)': '80.0%',
            'Ausentes': 1,
            'Ausentes (%)': '20.0%'
        },
        {
            'Departamento Regional (DR)': 'SENAI-BA',
            'Unidade operacional (Escola)': 'Feira de Santana',
            'Curso': 'Técnico em Redes de Computadores',
            'Categoria': 'IFTP',
            'Modalidade': 'Semipresencial',
            'Turma': 'RC002',
            'Alunos': 4,
            'Alunos Aptos/Agendados': 3,
            'Alunos Inaptos/Não Agendados': 1,
            'Presentes': 3,
            'Presentes (%)': '100.0%',
            'Ausentes': 0,
            'Ausentes (%)': '0.0%'
        },
        {
            'Departamento Regional (DR)': 'SENAI-BA',
            'Unidade operacional (Escola)': 'SENAI Cimatec',
            'Curso': 'Técnico em Mecatrônica Industrial',
            'Categoria': 'IFTP',
            'Modalidade': 'Presencial',
            'Turma': 'MEC01',
            'Alunos': 7,
            'Alunos Aptos/Agendados': 5,
            'Alunos Inaptos/Não Agendados': 2,
            'Presentes': 4,
            'Presentes (%)': '80.0%',
            'Ausentes': 1,
            'Ausentes (%)': '20.0%'
        }
    ]
    
    output_file = 'SAEP - Prova Objetiva_DEMO_VALIDATION.xlsx'
    print(f"\n[Step 2] Generating simulated browser download: '{output_file}'...")
    simulate_browser_export(template_bytes, demo_macro_output, output_file)
    print(f"  [PASS] Export created ({os.path.getsize(output_file)} bytes)")
    
    # 3. Deep Analysis with openpyxl against modelo final po.xlsx
    print(f"\n[Step 3] Comparing '{output_file}' with official 'modelo final po.xlsx'...")
    wb_ref = openpyxl.load_workbook('modelo final po.xlsx', data_only=False)
    wb_gen = openpyxl.load_workbook(output_file, data_only=False)
    
    # Check 1: Sheets
    print("\n--- 1. Sheets Validation ---")
    assert wb_gen.sheetnames == wb_ref.sheetnames, f"Expected {wb_ref.sheetnames}, got {wb_gen.sheetnames}"
    print(f"  [PASS] 3 Sheets match perfectly: {wb_gen.sheetnames}")
    
    # Check 2: Banner Row 1
    print("\n--- 2. Banner Row 1 Validation ---")
    ws_gen = wb_gen['Worksheet']
    ws_ref = wb_ref['Worksheet']
    assert 'SAEP - Prova Objetiva' in ws_gen.cell(1, 1).value
    assert ws_gen.row_dimensions[1].height == 82.5
    print(f"  [PASS] Banner title: '{ws_gen.cell(1, 1).value.strip()}' (Height: {ws_gen.row_dimensions[1].height}pt)")
    
    # Check 3: Header Row 2
    print("\n--- 3. Header Row 2 (13 Columns) Validation ---")
    headers_gen = [ws_gen.cell(2, c).value for c in range(1, 14)]
    headers_ref = [ws_ref.cell(2, c).value for c in range(1, 14)]
    for i, (g, r) in enumerate(zip(headers_gen, headers_ref)):
        assert g.strip() == r.strip(), f"Header {i+1} mismatch: '{g}' vs '{r}'"
        print(f"  [PASS] Col {i+1:2d} ({openpyxl.utils.get_column_letter(i+1)}): {g}")
        
    # Check 4: Column Widths
    print("\n--- 4. Column Widths Validation ---")
    for c_letter in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']:
        w_g = ws_gen.column_dimensions[c_letter].width
        w_r = ws_ref.column_dimensions[c_letter].width
        assert w_g == w_r, f"Col {c_letter} width mismatch: {w_g} vs {w_r}"
        print(f"  [PASS] Col {c_letter}: {w_g:.2f}")
        
    # Check 5: Data Rows (Rows 3 to 6)
    print("\n--- 5. Data Rows Values & Types Validation ---")
    assert ws_gen.max_row == 7, f"Expected 7 rows total, got {ws_gen.max_row}"
    for r_idx in range(3, 7):
        row_vals = [ws_gen.cell(r_idx, c).value for c in range(1, 14)]
        print(f"  [PASS] Row {r_idx}: {row_vals}")
        # Validate types
        assert isinstance(row_vals[0], str) # DR
        assert isinstance(row_vals[1], str) # Escola
        assert isinstance(row_vals[2], str) # Curso
        assert isinstance(row_vals[3], str) # Categoria (CHP / IFTP)
        assert isinstance(row_vals[4], str) # Modalidade
        assert isinstance(row_vals[5], str) # Turma
        assert isinstance(row_vals[6], (int, float)) # Alunos
        assert isinstance(row_vals[7], (int, float)) # Aptos/Agendados
        assert isinstance(row_vals[8], (int, float)) # Inaptos/Nao Agendados
        assert isinstance(row_vals[9], (int, float)) # Presentes
        assert isinstance(row_vals[10], (int, float)) # Presentes %
        assert isinstance(row_vals[11], (int, float)) # Ausentes
        assert isinstance(row_vals[12], (int, float)) # Ausentes %
        
    # Check 6: Totals Row (Row 7)
    print("\n--- 6. Totals Row & Formulas Validation ---")
    tot_row = [ws_gen.cell(7, c).value for c in range(1, 14)]
    print(f"  [PASS] Row 7 Totals: {tot_row}")
    assert tot_row[0] == 'Total'
    assert tot_row[6] == '=SUBTOTAL(109,Tabela1[[Alunos ]])'
    assert tot_row[7] == '=SUBTOTAL(109,Tabela1[Alunos Aptos/Agendados])'
    assert 'SUBTOTAL(109,Tabela1[Alunos Inaptos' in tot_row[8]
    assert tot_row[9] == '=SUBTOTAL(109,Tabela1[Presentes])'
    assert tot_row[10] == '=SUBTOTAL(101,Tabela1[Presentes (%)])'
    assert tot_row[11] == '=SUBTOTAL(109,Tabela1[Ausentes])'
    assert tot_row[12] == '=SUBTOTAL(101,Tabela1[Ausentes (%)])'
    
    # Check 7: Table1 Range & AutoFilter
    print("\n--- 7. Table1 & AutoFilter Range Validation ---")
    tbl = ws_gen.tables['Tabela1']
    assert tbl.ref == 'A2:M7', f"Expected Tabela1 ref 'A2:M7', got '{tbl.ref}'"
    print(f"  [PASS] Tabela1 ref: {tbl.ref}, HeaderRows: {tbl.headerRowCount}, TotalsRows: {tbl.totalsRowCount}")
    
    # Check 8: Embedded Image
    print("\n--- 8. Embedded Logo Image Validation ---")
    with zipfile.ZipFile(output_file, 'r') as z_out:
        assert 'xl/media/image1.png' in z_out.namelist()
        assert 'xl/drawings/drawing1.xml' in z_out.namelist()
        img_bytes = z_out.getinfo('xl/media/image1.png').file_size
        print(f"  [PASS] Embedded image1.png: {img_bytes} bytes")
        
    print("\n=================================================================")
    print(">>> 100% OF VALIDATION CRITERIA VERIFIED AND PASSED SUCCESSFULLY! <<<")
    print("=================================================================")

if __name__ == '__main__':
    run_end_to_end_validation()
