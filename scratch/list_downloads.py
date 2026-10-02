import os

# Let's inspect the .xls file using python binary parsing or xlrd/pyexcel/com/etc if available
downloads_dir = r"C:\Users\sam.sampaio\Downloads"

def inspect_all_downloads_excel():
    import glob
    files = glob.glob(os.path.join(downloads_dir, "*.xls*"))
    print(f"Total excel files found: {len(files)}")
    for f in sorted(files):
        print(f"{os.path.basename(f)} ({os.path.getsize(f)} bytes)")

if __name__ == '__main__':
    inspect_all_downloads_excel()
