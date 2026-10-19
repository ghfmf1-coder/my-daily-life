"""Minimum source/security invariants for private admin operations."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
class AdminSecurityTests(unittest.TestCase):
    def test_auth_gate_present(self):
        html=(ROOT/'site-factory/sites/toolbox-admin/public/index.html').read_text()
        self.assertIn('id="adminGate"',html)
        self.assertIn('id="adminLoginForm"',html)
        self.assertIn('style="display:none"',html)
        self.assertRegex(html,r'src="\\./auth\\.js(?:\\?[^\"]+)?"')
        self.assertNotIn('src="./app.js" defer',html)
        self.assertIn("connect-src 'self' https://ytifxhpizractdeytrok.supabase.co",html)
    def test_cloud_save_hook_and_rls_client(self):
        root=ROOT/'site-factory/sites/toolbox-admin/public'
        auth=(root/'auth.js').read_text()
        app=(root/'app.js').read_text()
        self.assertIn('toolbox_admin_members',auth)
        self.assertIn('toolbox_admin_workspaces',auth)
        self.assertIn('version=eq.',auth)
        self.assertIn('TOOLBOX_CLOUD.save(state)',app)
        self.assertNotIn('service_role',auth)
if __name__=='__main__':unittest.main()
