import os
import openpyxl
import pandas as pd

downloads_dir = r"C:\Users\sam.sampaio\Downloads"

def inspect_xlsx(filename):
    path = os.path.join(downloads_dir, filename)
    print(f"\n=================================================================")
    print(f"FILE: {filename} (Size: {os.path.getsize(path)} bytes)")
    print(f"=================================================================")
    wb = openpyxl.load_workbook(path, data_only=True)
    print("Sheets in workbook:", wb.sheetnames)
    for sname in wb.sheetnames:
        ws = wb[sname]
        print(f"\n--- Sheet: '{sname}' (max_row={ws.max_row}, max_column={ws.max_column}) ---")
        # Print top 5 rows
        for r in range(1, min(10, ws.max_row + 1)):
            row_vals = [ws.cell(r, c).value for c in range(1, min(25, ws.max_column + 1))]
            if any(v is not None for v in row_vals):
                print(f"Row {r:2d}: {row_vals}")

if __name__ == '__main__':
    # 1. Inspect IFTP
    inspect_xlsx("Alunos matriculados 2026 IFTP - SAEP 2026.2.xlsx")
    # 2. Inspect Aptos
    inspect_xlsx("SAEP 2026-2_28_08_2026_BA.xlsx")
    inspect_xlsx("SAEP 2026-2_01_09_2026_BA - FINAL.xlsx")
