#!/usr/bin/env bash
#
# Publish to GitHub Pages under a pseudonymous account.
#
#   scripts/publish.sh <account> [repo]
#
# Examples:
#   scripts/publish.sh ontherecordproject                    # user site, root URL
#   scripts/publish.sh ontherecordproject on-the-record      # project repo, subpath
#
# Run this ONLY with an account that is not tied to your name. The repository
# contains the site's source, so a public repo under a named account makes the
# site attributable via GitHub code search. See DEPLOY.md.

set -euo pipefail
cd "$(dirname "$0")/.."

ACCOUNT="${1:-}"
REPO="${2:-${ACCOUNT}.github.io}"

if [ -z "$ACCOUNT" ]; then
  echo "usage: scripts/publish.sh <account> [repo]" >&2
  exit 1
fi

# A repo named ACCOUNT.github.io serves from the root; anything else serves
# from /REPO/ and needs the prefix compiled in.
if [ "$REPO" = "${ACCOUNT}.github.io" ]; then
  BASE=""
  URL="https://${ACCOUNT}.github.io"
else
  BASE="/${REPO}"
  URL="https://${ACCOUNT}.github.io/${REPO}"
fi

echo "account : $ACCOUNT"
echo "repo    : $REPO"
echo "url     : $URL"
echo "basePath: ${BASE:-(none)}"
echo

# Keep commit metadata pseudonymous regardless of any global git config.
git config user.name "On the Record"
git config user.email "noreply@example.com"

echo "==> Rebuilding data and site"
npm run data:all
BASE_PATH="$BASE" npm run build

echo "==> Verifying no identifying strings in the build"
if grep -rqI -E "$(whoami)|/Users/" out/ 2>/dev/null; then
  echo "REFUSING TO PUBLISH: identifying strings found in out/" >&2
  exit 1
fi
echo "    clean"

# Pages needs this or it runs the output through Jekyll, which drops _next/.
touch out/.nojekyll

echo "==> Committing"
git add -A
git commit -q -m "Publish site" || echo "    nothing new to commit"

echo "==> Pushing to $ACCOUNT/$REPO"
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${ACCOUNT}/${REPO}.git"
git push -u origin main

cat <<EOF

Pushed. Two things left, in the repo's Settings > Pages:

  1. Source: "GitHub Actions", or "Deploy from a branch" -> main -> /out
  2. Wait ~1 minute, then open: $URL

If the page loads unstyled, the basePath is wrong for this repo name — rerun
this script with the exact repo name as the second argument.
EOF
