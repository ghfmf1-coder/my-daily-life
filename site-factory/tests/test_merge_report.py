import importlib.util
import unittest
from pathlib import Path
SRC=Path(__file__).resolve().parents[1]/'monitoring'/'merge_report.py'
spec=importlib.util.spec_from_file_location('merge_health',SRC)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
class MergeTests(unittest.TestCase):
    def test_green_report(self):
        report=mod.assemble({'sites':[{'slug':'a','status':'pass','failures':[]}]},
                            {'checks':[{'name':'UI','status':'pass'}]},True)
        self.assertEqual(report['status'],'pass')
        self.assertEqual(report['summary']['browserPassed'],1)
    def test_fails_closed_when_artifacts_are_missing(self):
        report=mod.assemble(None,None,False)
        self.assertEqual(report['status'],'fail')
        self.assertEqual(report['summary']['issues'],3)
    def test_failures_are_scoped(self):
        report=mod.assemble({'sites':[{'slug':'csv','status':'fail','failures':['HTTP 500']}]},
                            {'checks':[{'name':'CSV smoke','status':'fail','detail':'no rows'}]},True)
        self.assertEqual([x['scope'] for x in report['issues']],['csv','browser:CSV smoke'])
if __name__=='__main__':unittest.main()
