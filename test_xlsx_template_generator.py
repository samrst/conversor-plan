import zipfile
import xml.etree.ElementTree as ET
import openpyxl
import re

def generate_xlsx_from_template(template_path, output_path, rows_data):
    """
    Injects dynamic rows into 'modelo final po.xlsx' (13 columns: A to M).
    Preserves all styles, drawings (image1.png), table definitions, 
    subtotal formulas, column widths, and auxiliary sheets.
    """
    with zipfile.ZipFile(template_path, 'r') as zin:
        file_map = {item.filename: zin.read(item.filename) for item in zin.infolist()}
        
    num_rows = len(rows_data)
    total_row_idx = num_rows + 3 # Header is row 2, data is rows 3 to num_rows + 2, totals is num_rows + 3
    
    # 1. Update table1.xml
    table1_xml = file_map['xl/tables/table1.xml'].decode('utf-8')
    table1_xml = re.sub(r'ref="A2:M\d+"', f'ref="A2:M{total_row_idx}"', table1_xml)
    table1_xml = re.sub(r'<autoFilter ref="A2:M\d+"', f'<autoFilter ref="A2:M{total_row_idx - 1}"', table1_xml)
    file_map['xl/tables/table1.xml'] = table1_xml.encode('utf-8')
    
    # 2. Build sheet1.xml sheetData
    # Header row 1 (Banner)
    r1_xml = '<row r="1" spans="1:14" s="12" customFormat="1" ht="82.5" customHeight="1"><c r="A1" s="11" t="inlineStr"><is><t xml:space="preserve">                    SAEP - Prova Objetiva</t></is></c></row>'
    
    # Header row 2 (Table columns - 13 columns: A2 to M2)
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
    
    # Data rows (rows 3 to num_rows + 2)
    data_rows_xml = []
    
    tot_alunos = sum(int(r.get('Alunos', r.get('Alunos ', 0)) or 0) for r in rows_data)
    tot_aptos_agendados = sum(int(r.get('Alunos Aptos/Agendados', 0) or 0) for r in rows_data)
    tot_inaptos_nao_agendados = sum(int(r.get('Alunos Inaptos/Não Agendados', 0) or 0) for r in rows_data)
    tot_presentes = sum(int(r.get('Presentes', 0) or 0) for r in rows_data)
    tot_ausentes = sum(int(r.get('Ausentes', 0) or 0) for r in rows_data)
    avg_pres_pct = (tot_presentes / tot_aptos_agendados) if tot_aptos_agendados > 0 else 0
    avg_aus_pct = (tot_ausentes / tot_aptos_agendados) if tot_aptos_agendados > 0 else 0

    for idx, row in enumerate(rows_data):
        r_num = idx + 3
        dr = str(row.get('Departamento Regional (DR)', 'SENAI-BA') or 'SENAI-BA')
        unidade = str(row.get('Unidade operacional (Escola)', '') or '')
        curso = str(row.get('Curso', '') or '')
        categoria = str(row.get('Categoria', 'CHP') or 'CHP')
        modalidade = str(row.get('Modalidade', 'Presencial') or 'Presencial')
        turma = str(row.get('Turma', '') or '')
        alunos = int(row.get('Alunos', row.get('Alunos ', 0)) or 0)
        aptos_agendados = int(row.get('Alunos Aptos/Agendados', 0) or 0)
        inaptos_nao_agendados = int(row.get('Alunos Inaptos/Não Agendados', 0) or 0)
        presentes = int(row.get('Presentes', 0) or 0)
        ausentes = int(row.get('Ausentes', 0) or 0)
        
        pres_pct = row.get('Presentes (%)', 0)
        if isinstance(pres_pct, str) and '%' in pres_pct:
            try: pres_pct = float(pres_pct.replace('%', '').replace(',', '.').strip()) / 100.0
            except: pres_pct = 0.0
        elif isinstance(pres_pct, (int, float)) and pres_pct > 1.0:
            pres_pct = pres_pct / 100.0
            
        aus_pct = row.get('Ausentes (%)', 0)
        if isinstance(aus_pct, str) and '%' in aus_pct:
            try: aus_pct = float(aus_pct.replace('%', '').replace(',', '.').strip()) / 100.0
            except: aus_pct = 0.0
        elif isinstance(aus_pct, (int, float)) and aus_pct > 1.0:
            aus_pct = aus_pct / 100.0
            
        row_c = []
        row_c.append(f'<c r="A{r_num}" t="inlineStr"><is><t>{escape_xml(dr)}</t></is></c>')
        row_c.append(f'<c r="B{r_num}" t="inlineStr"><is><t>{escape_xml(unidade)}</t></is></c>')
        row_c.append(f'<c r="C{r_num}" t="inlineStr"><is><t>{escape_xml(curso)}</t></is></c>')
        row_c.append(f'<c r="D{r_num}" t="inlineStr"><is><t>{escape_xml(categoria)}</t></is></c>')
        row_c.append(f'<c r="E{r_num}" t="inlineStr"><is><t>{escape_xml(modalidade)}</t></is></c>')
        row_c.append(f'<c r="F{r_num}" t="inlineStr"><is><t>{escape_xml(turma)}</t></is></c>')
        row_c.append(f'<c r="G{r_num}" s="7"><v>{alunos}</v></c>')
        row_c.append(f'<c r="H{r_num}" s="5"><v>{aptos_agendados}</v></c>')
        row_c.append(f'<c r="I{r_num}" s="9"><v>{inaptos_nao_agendados}</v></c>')
        row_c.append(f'<c r="J{r_num}" s="5"><v>{presentes}</v></c>')
        row_c.append(f'<c r="K{r_num}" s="5"><v>{pres_pct:.4f}</v></c>')
        row_c.append(f'<c r="L{r_num}" s="5"><v>{ausentes}</v></c>')
        row_c.append(f'<c r="M{r_num}" s="5"><v>{aus_pct:.4f}</v></c>')
        
        data_rows_xml.append(f'<row r="{r_num}" spans="1:14" ht="15.75" customHeight="1">{"".join(row_c)}</row>')

    # Total row (row r_tot = total_row_idx)
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
    
    # Replace in sheet1.xml
    sheet1_str = file_map['xl/worksheets/sheet1.xml'].decode('utf-8')
    sheet1_str = re.sub(r'<dimension ref="[A-Z0-9:]+"/>', f'<dimension ref="A1:M{total_row_idx}"/>', sheet1_str)
    sheet1_str = re.sub(r'<sheetData>.*?</sheetData>', f'<sheetData>{new_sheet_data}</sheetData>', sheet1_str, flags=re.DOTALL)
    file_map['xl/worksheets/sheet1.xml'] = sheet1_str.encode('utf-8')
    
    # Clean calcChain if present
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
            
    print(f"Generated {output_path} successfully!")

def escape_xml(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&apos;')
