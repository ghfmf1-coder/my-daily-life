import json, subprocess, unittest, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from factory import validate_site
CASES=[{"slug":"unit-price-calculator","cases":[[{"a":5000,"aq":500,"b":7200,"bq":900,"unit":100},[1000,800,"B"]]]},{"slug":"discount-coupon-calculator","cases":[[{"a":10000,"ar":20,"ac":1000,"as":3000,"b":9000,"br":10,"bc":0,"bs":0},[10000,8100,1900,"B"]]]},{"slug":"business-days-calculator","cases":[[{"start":"2026-11-23","end":"2026-11-29","include":"yes","holidays":"2026-11-25\n2026-11-25\n2026-11-28"},[5,1,4]]]},{"slug":"appliance-energy-calculator","cases":[[{"watts":1000,"hours":3,"days":30,"rate":200},[3,90,18000]]]},{"slug":"text-to-columns-converter","cases":[[{"input":"\"a,b\",c\nx,,y","delimiter":"comma"},["a,b\tc\nx\t\ty"]]]},{"slug":"dimensional-weight-calculator","cases":[[{"l":40,"w":30,"h":20,"kg":3,"divisor":5000},[24000,4.8,4.8]]]},{"slug":"recipe-serving-calculator","cases":[[{"from":2,"to":5,"items":"flour,200,g\negg,2,item"},[2.5,500,5]]]},{"slug":"file-transfer-time-calculator","cases":[[{"size":1,"unit":"GB","speed":100},[80,1.3333333333333333,0.022222222222222223]]]},{"slug":"fuel-cost-calculator","cases":[[{"distance":150,"economy":15,"price":1700,"mode":"metric"},[10,17000]]]}]
class ConsumerTools(unittest.TestCase):
    def test_draft_sources_and_core_examples(self):
        for spec in CASES:
            slug=spec['slug']
            with self.subTest(slug=slug):
                validate_site(slug)
                p=ROOT/'sites'/slug/'public'/'app.js'
                subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
                code="const assert=require('node:assert/strict');const {compute}=require(process.argv[1]);for(const [v,want] of JSON.parse(process.argv[2])){const got=compute(v).map(r=>r[1]);assert.equal(got.length,want.length);got.forEach((x,i)=>typeof x==='number'?assert.ok(Math.abs(x-want[i])<1e-8):assert.equal(x,want[i]));}"
                subprocess.run(['node','-e',code,str(p),json.dumps(spec['cases'])],check=True,capture_output=True)
    def test_pdf_source_only_not_functional_certification(self):
        validate_site('pdf-compressor')
        subprocess.run(['node','--check',str(ROOT/'sites'/'pdf-compressor'/'public'/'app.js')],check=True,capture_output=True)
