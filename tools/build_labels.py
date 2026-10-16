"""Extract original WITS HS92 headings without inventing HS4 descriptions."""
import argparse
import json
from pathlib import Path
import xlrd

root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--source',type=Path,default=root.parent/'trade_development_master_20261016')
args=p.parse_args()
book=xlrd.open_workbook(str(args.source/'data/raw/reference_classifications/HSProducts.xls'))
sheet=book.sheet_by_index(0)
labels={}
for row in range(1,sheet.nrows):
    nomenclature,tier,code,name=sheet.row_values(row)
    code=str(code).strip()
    if nomenclature=='H0' and code.isdigit() and len(code) in [2,4,6]:
        labels[code]=name
(root/'data/hs-labels.json').write_text(json.dumps(labels,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'Extracted {len(labels)} HS92 labels')
