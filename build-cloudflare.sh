#!/usr/bin/env bash
# Cloudflare Pages: publish ONLY explicitly approved Haruhankan public assets.
set -euo pipefail

node --check app.js
node --check config.js
node --check en/app/translate.js

# Regenerate deployment-specific search metadata without dropping localized pages.
python3 prepare_seo.py "https://my-daily-life.pages.dev"

mkdir -p dist/app dist/en/app
cp index.html landing.css styles.css app.js config.js icon.svg favicon.ico manifest.webmanifest privacy.html terms.html sitemap.xml robots.txt dist/
cp app/index.html dist/app/index.html
cp en/index.html dist/en/index.html
cp en/app/index.html en/app/translate.js dist/en/app/
cp 009bd80b09e04b4e82564b5ae044a4e7.txt dist/

# Fail loudly rather than serving the root SPA fallback for missing localized paths.
test -s dist/en/index.html
test -s dist/en/app/index.html
test -s dist/favicon.ico
grep -q 'my-daily-life.pages.dev/en/' dist/sitemap.xml
grep -q 'Disallow: /en/app/' dist/robots.txt

echo "Cloudflare Pages public bilingual assets prepared in dist/"
