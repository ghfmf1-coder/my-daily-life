#!/usr/bin/env bash
# Cloudflare Pages: publish only the public assets of my-daily-life.
set -euo pipefail

# Fail the deployment if JavaScript syntax is invalid.
node --check app.js
node --check config.js

# Cloudflare Pages uses a root URL, unlike the GitHub Pages repo path.
python3 prepare_seo.py "https://my-daily-life.pages.dev"

# Do not publish repository metadata, build scripts, or internal docs.
mkdir -p dist/app
cp index.html landing.css styles.css app.js config.js icon.svg manifest.webmanifest privacy.html terms.html sitemap.xml robots.txt dist/
cp app/index.html dist/app/index.html
cp 009bd80b09e04b4e82564b5ae044a4e7.txt dist/

echo "Cloudflare Pages public files prepared in dist/"
