import os
import openpyxl
import xlrd
from collections import defaultdict
import re
import unicodedata

downloads_path = r'C:\Users\sam.sampaio\Downloads'
all_files = os.listdir(downloads_path)
print("Files in Downloads:")
for f in sorted(all_files):
    if any(ext in f.lower() for ext in ['.xls', '.xlsx', '.csv']):
        print(f"  - {f}")

# Check for participacao files
part_files = [f for f in all_files if 'participa' in f.lower() or 'presen' in f.lower()]
print(f"\nParticipacao files found: {part_files}")
