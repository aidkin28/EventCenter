#!/usr/bin/env bash
set -euo pipefail

# ── Deploy Next.js standalone to Azure Local Git ────────────────
#
# Usage:
#   ./deploy.sh              # interactive, production build + push
#   ./deploy.sh -y           # auto-confirm all prompts
#   ./deploy.sh --dev        # use dev env (.env) instead of .env.production
#   ./deploy.sh --build-only # build standalone artifact, skip git/push (for local testing)
#   ./deploy.sh -y --dev     # auto + dev
#
# Requires:
#   AZURE_LOCAL_GIT_REMOTE_URL in .env (app-level) or ../../.env (root)

# ── Parse flags ─────────────────────────────────────────────────
AUTO_YES=false
USE_PROD_ENV=true
BUILD_ONLY=false

for arg in "$@"; do
  case "$arg" in
    -y|--yes)        AUTO_YES=true ;;
    --dev)           USE_PROD_ENV=false ;;
    --build-only)    BUILD_ONLY=true ;;
  esac
done

# ── Paths ───────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"

echo "=========================================="
echo "  Next.js Standalone → Azure Local Git"
echo "=========================================="
echo ""
echo "  App dir:    $APP_DIR"
echo "  Repo root:  $REPO_ROOT"
echo "  Prod env:   $USE_PROD_ENV"
echo "  Auto mode:  $AUTO_YES"
echo "  Build only: $BUILD_ONLY"

# ── Step 1: Load AZURE_LOCAL_GIT_REMOTE_URL ─────────────────────
echo ""
echo "Step 1: Loading configuration..."

AZURE_URL=""

# Check app-level .env first, then root .env
for envfile in "$APP_DIR/.env" "$APP_DIR/.env.local" "$REPO_ROOT/.env" "$REPO_ROOT/.env.local"; do
  if [ -f "$envfile" ] && [ -z "$AZURE_URL" ]; then
    val=$(grep -E '^AZURE_LOCAL_GIT_REMOTE_URL=' "$envfile" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
    if [ -n "$val" ]; then
      AZURE_URL="$val"
      echo "  Found AZURE_LOCAL_GIT_REMOTE_URL in $envfile"
    fi
  fi
done

# Also check env var directly
if [ -z "$AZURE_URL" ] && [ -n "${AZURE_LOCAL_GIT_REMOTE_URL:-}" ]; then
  AZURE_URL="$AZURE_LOCAL_GIT_REMOTE_URL"
  echo "  Found AZURE_LOCAL_GIT_REMOTE_URL in environment"
fi

# ── Step 2: Build ───────────────────────────────────────────────
echo ""
echo "Step 2: Building Next.js standalone..."

cd "$REPO_ROOT"

if [ "$USE_PROD_ENV" = true ]; then
  echo "  Running: pnpm --filter event-app build:standalone:prod"
  echo "  Env: ../../.env.production + STANDALONE=true"
  pnpm --filter event-app build:standalone:prod
else
  echo "  Running: pnpm --filter event-app build:standalone"
  echo "  Env: ../../.env + STANDALONE=true"
  pnpm --filter event-app build:standalone
fi

# ── Step 3: Locate standalone output ────────────────────────────
echo ""
echo "Step 3: Locating standalone artifact..."

STANDALONE_DIR="$APP_DIR/.next/standalone"

if [ ! -d "$STANDALONE_DIR" ]; then
  echo "ERROR: Standalone directory not found at $STANDALONE_DIR"
  echo "  Make sure next.config has output: 'standalone'"
  exit 1
fi

# In a monorepo, Next.js nests the app under the repo-relative path
# e.g., .next/standalone/apps/event-app/server.js
NESTED_PATH=""

if [ -f "$STANDALONE_DIR/server.js" ]; then
  echo "  Found server.js at standalone root"
elif [ -f "$STANDALONE_DIR/apps/event-app/server.js" ]; then
  NESTED_PATH="apps/event-app"
  echo "  Found server.js at $NESTED_PATH/server.js (monorepo layout)"
else
  # Search for it
  SERVER_JS=$(find "$STANDALONE_DIR" -name "server.js" -maxdepth 4 | head -1)
  if [ -n "$SERVER_JS" ]; then
    NESTED_PATH="${SERVER_JS#$STANDALONE_DIR/}"
    NESTED_PATH="${NESTED_PATH%/server.js}"
    echo "  Found server.js at $NESTED_PATH/server.js"
  else
    echo "ERROR: server.js not found anywhere in $STANDALONE_DIR"
    echo "  Build may have failed or standalone output is misconfigured."
    exit 1
  fi
fi

# ── Step 4: Copy static assets into standalone ──────────────────
echo ""
echo "Step 4: Assembling artifact..."

# Static assets must go alongside server.js
if [ -n "$NESTED_PATH" ]; then
  STATIC_TARGET="$STANDALONE_DIR/$NESTED_PATH"
else
  STATIC_TARGET="$STANDALONE_DIR"
fi

if [ -d "$APP_DIR/.next/static" ]; then
  echo "  Copying .next/static..."
  rm -rf "$STATIC_TARGET/.next/static"
  mkdir -p "$STATIC_TARGET/.next"
  cp -rL "$APP_DIR/.next/static" "$STATIC_TARGET/.next/static"
fi

if [ -d "$APP_DIR/public" ]; then
  echo "  Copying public..."
  rm -rf "$STATIC_TARGET/public"
  cp -rL "$APP_DIR/public" "$STATIC_TARGET/public"
fi

# Fix pnpm hoisting gaps — pnpm virtual store has modules but they aren't
# linked into node_modules/ where Node can resolve them. Copy everything
# from .pnpm/node_modules/* into the app-level node_modules.
PNPM_HOISTED="$STANDALONE_DIR/node_modules/.pnpm/node_modules"
if [ -d "$PNPM_HOISTED" ]; then
  echo "  Fixing pnpm hoisting gaps..."
  mkdir -p "$STATIC_TARGET/node_modules"
  for pkg in "$PNPM_HOISTED"/*; do
    pkgname=$(basename "$pkg")
    if [ ! -e "$STATIC_TARGET/node_modules/$pkgname" ]; then
      cp -rL "$pkg" "$STATIC_TARGET/node_modules/$pkgname"
      echo "    + $pkgname"
    fi
  done
  # Also handle scoped packages (@org/pkg)
  for scope in "$PNPM_HOISTED"/@*; do
    [ -d "$scope" ] || continue
    scopename=$(basename "$scope")
    mkdir -p "$STATIC_TARGET/node_modules/$scopename"
    for pkg in "$scope"/*; do
      pkgname=$(basename "$pkg")
      if [ ! -e "$STATIC_TARGET/node_modules/$scopename/$pkgname" ]; then
        cp -rL "$pkg" "$STATIC_TARGET/node_modules/$scopename/$pkgname"
        echo "    + $scopename/$pkgname"
      fi
    done
  done
fi

# ── Step 5: Resolve symlinks ────────────────────────────────────
echo ""
echo "Step 5: Checking for symlinks..."

SYMLINK_COUNT=$(find "$STANDALONE_DIR" -type l 2>/dev/null | wc -l | tr -d ' ')

if [ "$SYMLINK_COUNT" -gt 0 ]; then
  echo "  Found $SYMLINK_COUNT symlinks, resolving..."
  find "$STANDALONE_DIR" -type l | while read link; do
    target=$(readlink -f "$link" 2>/dev/null || python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$link")
    linkname=$(basename "$link")
    if [ -e "$target" ]; then
      rm -rf "$link"
      cp -rL "$target" "$link"
      echo "    Resolved: $linkname"
    else
      echo "    Broken symlink removed: $linkname"
      rm -f "$link"
    fi
  done
fi

REMAINING=$(find "$STANDALONE_DIR" -type l 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMAINING" -gt 0 ]; then
  echo "  WARNING: $REMAINING symlinks still remain!"
  find "$STANDALONE_DIR" -type l 2>/dev/null | head -10
  if [ "$AUTO_YES" = false ]; then
    read -p "  Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
      exit 1
    fi
  fi
else
  echo "  No symlinks remain"
fi

FILE_COUNT=$(find "$STANDALONE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
SIZE=$(du -sh "$STANDALONE_DIR" | cut -f1)
echo "  $FILE_COUNT files, $SIZE total"

# Determine startup command based on nesting
if [ -n "$NESTED_PATH" ]; then
  SERVER_JS_PATH="$NESTED_PATH/server.js"
else
  SERVER_JS_PATH="server.js"
fi
STARTUP_CMD="node $SERVER_JS_PATH"

if [ "$BUILD_ONLY" = true ]; then
  echo ""
  echo "=========================================="
  echo "  Build complete! (--build-only, skipping git/push)"
  echo "=========================================="
else
  # ── Step 6: Git init in standalone dir ──────────────────────────
  echo ""
  echo "Step 6: Initializing git in standalone artifact..."
  cd "$STANDALONE_DIR"

  # Always re-init since next build recreates .next/standalone from scratch
  rm -rf .git
  git init -b master

  # ── Step 7: Set up Azure remote ─────────────────────────────────
  echo ""
  echo "Step 7: Configuring Azure remote..."

  if [ -z "$AZURE_URL" ]; then
    if [ "$AUTO_YES" != true ]; then
      echo ""
      echo "AZURE_LOCAL_GIT_REMOTE_URL not found in .env."
      echo ""
      echo "To get your Azure Git URL:"
      echo "  1. Go to Azure Portal > Your App Service > Deployment Center"
      echo "  2. Select 'Local Git' as source"
      echo "  3. Copy the Git Clone URL"
      echo ""
      read -p "Enter your Azure Git URL (or Enter to skip push): " AZURE_URL
    fi
  fi

  # ── Step 8: Stage, commit, push ─────────────────────────────────
  echo ""
  echo "Step 8: Staging and committing..."

  # Stage all files
  git add -A

  # Commit with git author name + date
  GIT_AUTHOR=$(cd "$REPO_ROOT" && git config user.name 2>/dev/null || echo "deploy")
  COMMIT_MSG="${GIT_AUTHOR} $(date '+%Y-%m-%d %H:%M')"
  echo "  Committing: $COMMIT_MSG"
  git commit --allow-empty -m "$COMMIT_MSG"

  # Push to Azure (skip if no URL)
  if [ -n "$AZURE_URL" ]; then
    git remote add azure "$AZURE_URL"
    echo "  Remote 'azure' -> $AZURE_URL"
    echo ""
    echo "  Pushing to azure (master) --force..."
    git push azure master --force
  else
    echo ""
    echo "  No Azure URL provided — skipping push."
    echo "  To push manually later, run:"
    echo "    cd \"$STANDALONE_DIR\""
    echo "    git remote add azure <YOUR_AZURE_GIT_URL>"
    echo "    git push azure master --force"
  fi

  echo ""
  echo "=========================================="
  echo "  Deployment complete!"
  echo "=========================================="
fi

# ── Post-deploy info ────────────────────────────────────────────
ENV_REL_PATH=$(python3 -c "import os.path; print(os.path.relpath('$REPO_ROOT', '$STANDALONE_DIR'))")

echo ""
echo "=========================================="
echo "  Startup Command"
echo "=========================================="
echo ""
echo "  $STARTUP_CMD"
echo ""
echo "=========================================="
echo "  Test Locally"
echo "=========================================="
echo ""
echo "  The standalone server does not auto-load .env files."
echo "  Use Node's --env-file flag to pass environment variables:"
echo ""
echo "    cd \"$STANDALONE_DIR\""
echo "    node --env-file=$ENV_REL_PATH/.env $SERVER_JS_PATH                  # dev env"
echo "    node --env-file=$ENV_REL_PATH/.env.production $SERVER_JS_PATH       # prod env"
echo ""
echo "=========================================="
echo "  Azure App Settings (IMPORTANT)"
echo "=========================================="
echo ""
echo "  Set these in Azure Portal > App Service > Configuration > Application Settings:"
echo ""
echo "    SCM_DO_BUILD_DURING_DEPLOYMENT = false   *** MUST be false — we push pre-built artifacts ***"
echo "    ENABLE_ORYX_BUILD              = false   *** MUST be false — skip Azure's build pipeline ***"
echo "    HOSTNAME                       = 0.0.0.0"
echo "    PORT                           = 8080"
echo ""
echo "  Startup Command (General Settings > Startup Command):"
echo "    $STARTUP_CMD"
echo ""
echo "=========================================="
echo "  Troubleshooting"
echo "=========================================="
echo ""
echo "  If you see 'Cannot find module' errors at runtime (e.g. styled-jsx,"
echo "  @swc/helpers), pnpm's symlink-based node_modules may not be fully"
echo "  resolved in the standalone output. To fix, add to your repo root .npmrc:"
echo ""
echo "    node-linker=hoisted"
echo ""
echo "  Then run: rm -rf node_modules && pnpm install && rebuild."
echo ""
