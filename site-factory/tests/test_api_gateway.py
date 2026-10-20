import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/'api-registry'/'gateway'

class GatewaySourceTests(unittest.TestCase):
    def test_default_disabled(self):
        cfg=(ROOT/'wrangler.toml').read_text()
        self.assertIn('ENABLE_PROVIDER_CALLS = "false"',cfg)
    def test_admin_telemetry_requires_auth(self):
        js=(ROOT/'worker.js').read_text()
        self.assertIn("url.pathname==='/admin/usage'",js)
        self.assertIn('authenticate(request,env,true)',js)
        self.assertIn('env.USAGE.list(',js)
    def test_quota_upgrade_is_not_payment(self):
        js=(ROOT/'worker.js').read_text()
        self.assertIn("daily_limit_reached",js)
        self.assertIn("provider.status!=='connected'",js)
        self.assertIn("env.ENABLE_PROVIDER_CALLS!=='true'",js)
    def test_free_kst_quota_and_no_checkout(self):
        js=(ROOT/'worker.js').read_text()
        cfg=(ROOT/'wrangler.toml').read_text()
        self.assertIn('DAILY_VISITOR_LIMIT = "5"',cfg)
        self.assertIn('DAILY_SITE_LIMIT = "100"',cfg)
        self.assertIn('VISITOR_HASH_SECRET',js)
        self.assertIn('CF-Connecting-IP',js)
        self.assertIn('reset_at:quota.resetAt',js)
        self.assertIn("daily_limit_reached",js)
        self.assertNotIn('upgrade_url:',js)
    def test_no_arbitrary_proxy(self):
        js=(ROOT/'worker.js').read_text()
        self.assertIn("provider.status!=='connected'",js)
        self.assertIn("provider.id!=='usda-fooddata'",js)
        self.assertIn("env.USDA_API_KEY",js)
        self.assertNotIn('eval(',js)

if __name__=='__main__':unittest.main()
